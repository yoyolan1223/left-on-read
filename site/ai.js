// 給塑膠怪 / Left on Read — reply drafting. Works offline with hand-written drafts; with a Claude API key it writes real ones.
import { BUSY, CHANNELS } from './data.js';
import { L, EN } from './i18n.js';

const H = 36e5;
export const TONES = EN ? { short: 'Short', warm: 'Warm', formal: 'Formal' } : { short: '簡短', warm: '溫暖', formal: '正式' };

export const lastTheirs = (th) => [...th.msgs].reverse().find((m) => m.who === 'them');
export const needsReply = (th) => th.msgs.length && th.msgs[th.msgs.length - 1].who === 'them';

export function intentOf(th) {
  const m = lastTheirs(th);
  const text = m ? m.text : '';
  if (th.rel === 'cold' || /職缺|推薦你|opportunity|opening|open to a chat/i.test(text)) return 'decline';
  if (/約|聊聊|call|meet|時間|方便嗎|在家嗎|邀請|上節目|有空嗎|find a time|will you be home|invite you|do you have time|catch up/i.test(text)) return 'meeting';
  if (/早安|午安|晚安|平安|喜樂|good morning|good night|peaceful and happy/i.test(text)) return 'greeting';
  if (/報價|付款|合約|試辦|確認|quote|installment|invoice|contract|pilot|reply by/i.test(text)) return 'work';
  if (/[?？]/.test(text)) return 'question';
  return 'casual';
}
const intent = (risk, zh, en) => ({ risk, get label() { return L(zh, en); } });
export const INTENT = {
  meeting: intent('high', '約時間', 'Scheduling'), work: intent('high', '工作回覆', 'Work reply'),
  decline: intent('mid', '婉拒', 'Decline'), question: intent('mid', '回答問題', 'Answer'),
  greeting: intent('low', '問候', 'Greeting'), casual: intent('low', '閒聊', 'Chat'),
};

// Anything with a work or stranger contact is never "low risk", however casual it sounds.
export function riskOf(th) {
  const r = INTENT[intentOf(th)].risk;
  return r === 'low' && (th.rel === 'work' || th.rel === 'cold') ? 'mid' : r;
}

// Next free slots from the (fake) calendar, weekdays 10–18.
export function freeSlots(n = 3, now = Date.now()) {
  const out = [];
  const W = '日一二三四五六';
  for (let d = 1; d <= 9 && out.length < n; d++) {
    const day = new Date(now + d * 24 * H);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    for (const h of [10, 14, 16]) {
      const busy = BUSY.some(([bd, s, e]) => bd === d % 5 && h >= s && h < e);
      if (busy) continue;
      const start = new Date(day); start.setHours(h, 0, 0, 0);
      const en = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${h}:00`;
      out.push({ at: start.getTime(), label: EN ? en : `${start.getMonth() + 1}/${start.getDate()}（${W[start.getDay()]}）${h}:00`, en: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${h}:00` });
      if (out.length >= n) break;
      break; // one slot per day reads more naturally
    }
  }
  return out;
}

// Hand-written drafts for the demo threads — {s1}/{s2} become time slots.
const DEMO_EN = {
  mom: { short: "Yes! Home around 7", warm: "Yes, I'll be home for dinner ~ thanks Mom 🐟 Around 7. Need me to pick anything up?", formal: "I'll be home for dinner around 7. Thank you, Mom." },
  amy: {
    short: 'Sure! Would {s1} or {s2} (Taipei time) work?',
    warm: "Hi Amy, thanks so much for reading the deck — made my day! I'd love to chat. Would {s1} or {s2} (Taipei time) work for you?",
    formal: "Hi Amy, thank you for your interest in Sprout. I'd be glad to schedule a 30-minute call. I'm available {s1} or {s2} (GMT+8). Please let me know which suits you best.",
  },
  chen: {
    short: 'Hi Daniel — yes to both: two installments are fine, and a one-month pilot works. Details by Wednesday.',
    warm: "Hi Daniel, thanks to you and the team for taking the time! Good news on both:\n1) The 50-seat plan can be paid in two installments\n2) We can start with a one-month pilot to see how your team uses it\nI'll send the updated quote and pilot plan by Wednesday. Happy to talk anytime 🙏",
    formal: 'Dear Daniel,\nThank you for your evaluation. Regarding your questions:\n1. The 50-seat plan may be paid in two installments.\n2. A one-month pilot can be arranged.\nThe revised quote and pilot plan will follow by Wednesday.',
  },
  kevin: {
    short: 'Sounds great! Does {s1} or {s2} work?',
    warm: "Hey Kevin! Long time no see — thanks for thinking of us 🙌 Workplace mental-health courses sound like a great fit. Does {s1} or {s2} work? Video call or coffee, either's good.",
    formal: "Hi Kevin, thank you for reaching out — I'd be glad to explore working together. I'm free {s1} or {s2}; let me know what suits you.",
  },
  landlord: { short: "Sure, I'll be home Wed at 2. Rent's on the way too 🙏", warm: "Hi Mr. Lin ~ I'll be home Wednesday at 2 for the repair, thanks for arranging it! I'll send the rent on the 1st as usual 🙏", formal: "Hello Mr. Lin, I'll be home next Wednesday at 2pm, and the rent will be paid at the start of the month. Thank you." },
  joy: { short: "Got it! Will look tonight and get back to you tomorrow 🙏", warm: "Got it! Thank you Joy, and for the vertical version too 🥹 I'll look properly tonight and send notes by tomorrow noon ~", formal: 'Received version 2, thank you. I will send feedback by tomorrow noon.' },
  book: { short: "I can! I'll take chapter 5 🙋‍♀️", warm: "I can ~ I'll lead chapter 5 🙋‍♀️ Will post my notes in the group before Thursday!", formal: "I'll lead chapter 5 this week and share notes before Thursday." },
  podcast: {
    short: 'Hi Iris, thanks for the invite! {s1} or {s2} works, remote is perfect.',
    warm: "Hi Iris! Thank you for the invite — so glad the idea behind Sprout resonated 😊 I'd love to come on. {s1} or {s2} both work, and the studio is fine too!",
    formal: 'Dear Iris, thank you for the invitation; it would be an honour to join the show. I am available {s1} or {s2}, at whichever location suits you.',
  },
  an: { short: 'Hahaha really', warm: "Hahaha really?! It's been forever — how are you? Let's grab dinner soon ~", formal: "Haha thanks, how have you been?" },
  aunt: { short: 'Morning Aunt May 🌷', warm: 'Good morning Aunt May ~ wishing you a healthy, happy day too 🌷☀️', formal: 'Good morning, Aunt May. Wishing you well.' },
  hr: {
    short: "Thanks Tina, I'm not looking to move right now. Let's stay in touch 🙏",
    warm: "Hi Tina, thanks for thinking of me! I'm all-in on my startup right now so not looking, but I appreciate it — let's stay in touch 🙏",
    formal: 'Dear Tina, thank you for the referral. I am focused on my company and not considering a move at this time.',
  },
};

const DEMO = {
  mom: { short: '會！大概 7 點到', warm: '會回去吃～謝謝媽 🐟 我大概 7 點到，要幫忙買什麼嗎？', formal: '會回家吃晚餐，預計 7 點到，謝謝媽。' },
  amy: {
    short: 'Sure! Would {s1en} or {s2en} (Taipei time) work?',
    warm: "Hi Amy, thanks so much for reading the deck — made my day! I'd love to chat. Would {s1en} or {s2en} (Taipei time) work for you?",
    formal: "Hi Amy, thank you for your interest in Sprout. I'd be glad to schedule a 30-minute call. I'm available {s1en} or {s2en} (GMT+8). Please let me know which suits you best.",
  },
  chen: {
    short: '陳經理您好，兩點都可以：可分兩期付款，也可以先試辦一個月。細節我週三前整理給您。',
    warm: '陳經理您好，謝謝您和團隊花時間討論！兩個問題都沒問題：\n1) 50 人方案可以分兩期付款\n2) 可以先試辦一個月，看看同仁的使用狀況\n我週三前把調整後的報價和試辦流程寄給您，有任何想法都歡迎直接跟我說 🙏',
    formal: '陳經理您好：\n感謝貴公司的評估。針對您的兩點詢問：\n一、50 人方案可採兩期付款；\n二、可先進行為期一個月之試辦。\n修正版報價與試辦規劃將於週三前寄送，敬請參考。',
  },
  kevin: {
    short: '好啊！{s1} 或 {s2} 你方便嗎？',
    warm: '嗨 Kevin！好久不見～謝謝你想到我們 🙌 職場心理健康的課程超有興趣，{s1} 或 {s2} 你方便嗎？線上或約咖啡都可以。',
    formal: 'Kevin 你好，謝謝你的邀請，很期待聊聊合作的可能。我 {s1} 或 {s2} 有空，看你哪個時間方便。',
  },
  landlord: { short: '好的，週三 2 點我在家，房租也會記得轉 🙏', warm: '林先生好～週三下午 2 點我會在家等師傅，謝謝您安排！房租我月初會準時轉過去 🙏', formal: '林先生您好，下週三下午 2 點我在家，房租也會於月初匯款，謝謝。' },
  joy: { short: '收到！今晚看，明天回你 🙏', warm: '收到！謝謝 Joy 還多做了直式版本 🥹 我今晚仔細看，明天中午前回你意見～', formal: '收到第二版，謝謝。我會在明天中午前提供回饋。' },
  book: { short: '我可以！第 5 章我來 🙋‍♀️', warm: '我可以～第 5 章我來導讀 🙋‍♀️ 週四前把重點整理丟群組！', formal: '這週第 5 章由我負責導讀，會在週四前分享重點整理。' },
  podcast: {
    short: 'Iris 你好，謝謝邀請！{s1} 或 {s2} 可以，線上錄音就好。',
    warm: 'Iris 你好！謝謝你的邀請，也很開心你喜歡小芽的理念 😊 我很樂意上節目，{s1} 或 {s2} 我都可以，去錄音室也沒問題！',
    formal: 'Iris 您好，感謝您的邀約，很榮幸能參與節目。我於 {s1} 或 {s2} 皆可配合錄音，地點以貴節目方便為主。',
  },
  an: { short: '哈哈哈真的嗎', warm: '哈哈哈真的嗎！我們好久沒見了，最近過得怎樣？找天吃飯吧～', formal: '哈哈謝謝，最近好嗎？' },
  aunt: { short: '二姨早安 🌷', warm: '二姨早安～您也平安健康、天天開心 🌷☀️', formal: '二姨早安，祝您平安健康。' },
  hr: {
    short: '謝謝 Tina，我目前沒有轉職計畫，之後再聯絡 🙏',
    warm: 'Hi Tina，謝謝你想到我！我目前全心在創業，暫時沒有轉職打算，但很感謝這個機會，之後有需要再聯絡 🙏',
    formal: 'Tina 您好，感謝您的推薦。目前我專注於創業，暫無轉職規劃，再次感謝。',
  },
};

function fill(text, slots) {
  const [a, b] = slots;
  return text.replace('{s1}', a?.label || '').replace('{s2}', b?.label || '')
    .replace('{s1en}', a?.en || '').replace('{s2en}', b?.en || '');
}

const isEnglish = (s) => (s.match(/[A-Za-z]/g) || []).length > s.replace(/\s/g, '').length * 0.6;

function generic(th, intent, slots) {
  const who = th.name;
  const last = lastTheirs(th);
  if (EN || (last && isEnglish(last.text))) {
    return {
      meeting: { short: 'Sure! Would {s1en} or {s2en} work?', warm: `Hi ${who}, happy to! Would {s1en} or {s2en} (Taipei time) work for you?`, formal: `Hi ${who}, thank you. I'm available {s1en} or {s2en} (GMT+8). Please let me know what suits you.` },
      decline: { short: "Thanks, I'll pass this time 🙏", warm: `Thanks so much for thinking of me, ${who}! I'll pass for now, but let's stay in touch.`, formal: `Hi ${who}, thank you for reaching out. I'm unable to take this on at the moment.` },
      greeting: { short: 'Morning!', warm: 'Good morning! Hope your day goes smoothly ☀️', formal: 'Good morning, wishing you well.' },
      work: { short: "Got it, I'll confirm and get back to you.", warm: `Thanks ${who}! I'll check and get back to you in a day or two ~`, formal: `Hi ${who}, received — I'll confirm and reply shortly.` },
      question: { short: 'Good question, let me think and get back to you!', warm: `Hi ${who}, let me think about it and reply later today ~`, formal: "Thanks for the question — I'll reply shortly." },
    }[intent] || { short: 'Great, thanks!', warm: 'Awesome, thank you! Talk soon 😊', formal: 'Thank you — looking forward to it.' };
  }
  const t = {
    meeting: { short: '好啊，{s1} 或 {s2} 可以嗎？', warm: `嗨 ${who}，謝謝你！{s1} 或 {s2} 我都可以，看你方便～`, formal: `${who} 您好，我 {s1} 或 {s2} 有空，請問哪個時間方便？` },
    decline: { short: '謝謝，我這次先不用 🙏', warm: `謝謝 ${who} 想到我！這次先婉拒，之後有機會再聊 🙏`, formal: `${who} 您好，感謝您的邀請，這次恕無法參與。` },
    greeting: { short: '早安～', warm: '早安！祝你今天順順的 ☀️', formal: '早安，祝平安順心。' },
    work: { short: '收到，我確認後回覆您。', warm: `謝謝 ${who}！我這兩天確認好就回你～`, formal: `${who} 您好，已收到，確認後將盡快回覆。` },
    question: { short: '好問題，我想一下再跟你說！', warm: `嗨 ${who}，我想一下，今天晚點回你喔～`, formal: '收到您的問題，稍後回覆。' },
    casual: { short: '哈哈 👍', warm: '哈哈真的！最近好嗎？', formal: '謝謝你的訊息 😊' },
  }[intent];
  return t;
}

// → { short, warm, formal, slots, source }
export async function draftReplies(th, settings) {
  const intent = intentOf(th);
  const slots = intent === 'meeting' ? freeSlots(3) : [];
  if (settings.apiKey) {
    try {
      return { ...(await claudeDrafts(th, intent, slots, settings)), slots, source: 'claude' };
    } catch (err) {
      console.warn('[plastic] Claude draft failed, using templates', err);
    }
  }
  // Pre-written drafts only fit the opening message of each demo thread.
  const base = (!th.msgs.some((m) => m.via) && (EN ? DEMO_EN : DEMO)[th.id]) || generic(th, intent, slots);
  const out = {};
  for (const k of Object.keys(TONES)) out[k] = fill(base[k], slots);
  return { ...out, slots, source: 'template' };
}

// ── Claude ──────────────────────────────────────────────────────
let clientPromise;
async function client(apiKey) {
  if (!clientPromise || clientPromise.key !== apiKey) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk/+esm')
      .then(({ default: Anthropic }) => new Anthropic({ apiKey, dangerouslyAllowBrowser: true }));
    clientPromise.key = apiKey;
  }
  return clientPromise;
}

async function ask(settings, system, user) {
  const c = await client(settings.apiKey);
  const res = await c.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') throw new Error('refused');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

const SYSTEM_EN = (s) => `You are ${s.myName || 'the user'}'s messaging assistant.${s.myBio ? ` About the user: ${s.myBio}.` : ''}
Draft replies for the user, who will review them before sending.
- Reply in the language the other person used.
- Write like a real person texting: short and casual on LINE / Instagram; a bit fuller for email / LinkedIn. No canned openers like "I hope this message finds you well".
- Don't invent promises, numbers or facts the user hasn't stated; where the user needs to decide, keep it noncommittal.
- Output JSON only, nothing else.`;

const SYSTEM = (s) => EN ? SYSTEM_EN(s) : `你是 ${s.myName || '使用者'} 的訊息小幫手。${s.myBio ? `關於使用者：${s.myBio}。` : ''}
幫使用者擬回覆草稿，使用者會在送出前確認。
- 用對方使用的語言回覆（對方寫英文就回英文，寫中文就用台灣繁體中文）。
- 像真人傳訊息：LINE／IG 口語、短；Email／LinkedIn 可以完整一點。不要「親愛的」「希望這封訊息找到你一切安好」這類罐頭開場。
- 不要編造使用者沒說過的承諾、數字或事實；需要使用者決定的地方寫成保守、可以之後補充的說法。
- 只輸出 JSON，不要其他文字。`;

async function claudeDrafts(th, intent, slots, settings) {
  if (EN) {
    const history = th.msgs.slice(-8).map((m) => `${m.who === 'me' ? 'Me' : m.from || th.name}: ${m.text}`).join('\n');
    const user = `Platform: ${CHANNELS[th.channel].name}
From: ${th.name}${th.sub ? ` (${th.sub})` : ''}
${th.subject ? `Subject: ${th.subject}\n` : ''}Conversation:
${history}
${slots.length ? `\nThey want to meet. My free slots: ${slots.map((s) => s.label).join(', ')} (Taipei time). Offer two of them.` : ''}
Write three versions of the reply as JSON: {"short": "...", "warm": "...", "formal": "..."}`;
    const out = await ask(settings, SYSTEM(settings), user);
    if (!out.short || !out.warm || !out.formal) throw new Error('bad json');
    return out;
  }
  const history = th.msgs.slice(-8).map((m) => `${m.who === 'me' ? '我' : m.from || th.name}：${m.text}`).join('\n');
  const user = `平台：${CHANNELS[th.channel].name}
對方：${th.name}${th.sub ? `（${th.sub}）` : ''}
${th.subject ? `主旨：${th.subject}\n` : ''}對話：
${history}
${slots.length ? `\n對方想約時間。我空的時段：${slots.map((s) => s.label).join('、')}（台北時間），請在回覆中提供其中兩個。` : ''}
請擬三個版本的回覆，輸出 JSON：{"short": "簡短版", "warm": "溫暖版", "formal": "正式版"}`;
  const out = await ask(settings, SYSTEM(settings), user);
  if (!out.short || !out.warm || !out.formal) throw new Error('bad json');
  return out;
}

// ── Cold outreach ──────────────────────────────────────────────
export async function draftOutreach(target, goal, settings) {
  if (settings.apiKey) {
    try {
      const out = await ask(settings, SYSTEM(settings), EN ? `Write a first cold-outreach message.
Recipient: ${target.name}${target.role ? `, ${target.role}` : ''}${target.company ? `, ${target.company}` : ''}
Platform: ${CHANNELS[target.channel]?.name || target.channel}
My goal: ${goal}
Requirements: 60–110 words; first sentence says why them specifically (no generic flattery); one small concrete ask (e.g. a 15-minute call); not salesy.
Output JSON: {"message": "..."}` : `幫我寫一則陌生開發的第一封訊息。
對象：${target.name}${target.role ? `，${target.role}` : ''}${target.company ? `，${target.company}` : ''}
平台：${CHANNELS[target.channel]?.name || target.channel}
我的目的：${goal}
要求：80–150 字、第一句說明為什麼找他（跟他有關，不要泛泛地稱讚）、只提一個具體的小請求（例如 15 分鐘通話）、不要推銷感。
輸出 JSON：{"message": "..."}`);
      if (out.message) return out.message;
    } catch (err) {
      console.warn('[plastic] Claude outreach failed, using template', err);
    }
  }
  if (EN) {
    const me = settings.myName || 'I';
    const at = [target.role, target.company].filter(Boolean).join(' at ');
    return `Hi ${target.name}, I'm ${me}${settings.myBio ? `, ${settings.myBio}` : ''}.\n` +
      `Given your work${at ? ` as ${at}` : ''}, I'd love your take: ${goal}.\n` +
      `Would you have 15 minutes in the next two weeks? Totally fine if not — thank you either way 🙏`;
  }
  const me = settings.myName || '我';
  const at = [target.company, target.role].filter(Boolean).join(' 的 ');
  return `${target.name} 您好，我是${me}${settings.myBio ? `，${settings.myBio}` : ''}。\n` +
    `注意到您在${at || '這個領域'}，想請教您的看法：${goal}。\n` +
    `不知道您這兩週有沒有 15 分鐘，讓我簡單分享、也聽聽您的建議？完全不方便也沒關係，謝謝您 🙏`;
}

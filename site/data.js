// 給塑膠怪 / Left on Read — demo inbox. All people, companies and messages are made up.
import { L, EN } from './i18n.js';

const ch = (name, short, color, status, zh, en) => ({ name, short, color, status, get note() { return L(zh, en); } });
export const CHANNELS = {
  line:     ch('LINE', 'L', '#06C755', 'business', '只開放 LINE 官方帳號（Messaging API），個人帳號無法串接', 'Official Accounts only (Messaging API); personal LINE has no API'),
  ig:       ch('Instagram', 'IG', '#E1306C', 'business', '需要切換成專業帳號，透過 Meta Instagram Messaging API', 'Needs a professional account, via the Meta Instagram Messaging API'),
  messenger:ch('Messenger', 'M', '#7B61FF', 'business', '只開放粉絲專頁收件匣（Meta Graph API）', 'Facebook Page inboxes only (Meta Graph API)'),
  whatsapp: ch('WhatsApp', 'W', '#25D366', 'business', '需 WhatsApp Business 號碼（Cloud API）', 'Needs a WhatsApp Business number (Cloud API)'),
  linkedin: ch('LinkedIn', 'in', '#0A66C2', 'closed', '訊息 API 只開放給官方合作夥伴', 'The messaging API is for official partners only'),
  gmail:    ch('Gmail', 'G', '#EA4335', 'open', 'Gmail API 可完整串接（讀取、草稿、寄出）', 'Fully supported by the Gmail API (read, draft, send)'),
  telegram: ch('Telegram', 'T', '#27A7E7', 'open', '可用個人帳號 API（TDLib）完整串接', 'Fully supported for personal accounts (TDLib)'),
  slack:    ch('Slack', 'S', '#4A154B', 'open', 'Slack API 可完整串接', 'Fully supported by the Slack API'),
};

const H = 36e5, D = 24 * H;

// The demo user. Settings start from this.
export const ME = EN
  ? { name: 'Sam', bio: 'Founder of Sprout, an employee wellbeing app' }
  : { name: '小米', bio: '員工身心健康 App「小芽 Sprout」的創辦人' };

// who: them | me. `ago` in ms before now.
export function buildThreads(now = Date.now()) {
  const t = (ago) => now - ago;
  if (EN) return [
    { id: 'mom', name: 'Mom', channel: 'whatsapp', rel: 'family', hue: 12, msgs: [
      { who: 'me', text: "I'll be working late today", at: t(28 * H) },
      { who: 'them', text: 'OK, get home safe', at: t(27 * H) },
      { who: 'them', text: "Coming home for dinner tonight? I got the fish you like", at: t(3 * H) },
    ], autoReply: "Great, I'll cook for you too ❤️ What time will you be here?" },
    { id: 'amy', name: 'Amy Lin', sub: 'Seed VC · Investor', channel: 'whatsapp', rel: 'work', hue: 200, msgs: [
      { who: 'them', text: 'Hi Sam! Read the Sprout deck, really interesting. Could we do a 30-min call next week?', at: t(6 * H) },
    ], autoReply: 'Perfect, Thursday works. Sending the invite now 🙌' },
    { id: 'chen', name: 'Daniel Chen', sub: 'Bluewave Tech · HR', channel: 'gmail', rel: 'work', hue: 160, subject: 'Re: Sprout pricing for 50 seats', msgs: [
      { who: 'me', text: 'Hi Daniel, attached is the quote for Sprout. Let me know if you have any questions.', at: t(3 * D) },
      { who: 'them', text: 'Thanks, we discussed it internally. Two questions: 1) can the 50-seat plan be paid in two installments? 2) could we run a one-month pilot first? Please reply by Thursday. Thanks!', at: t(22 * H) },
    ] },
    { id: 'kevin', name: 'Kevin Wang', sub: 'Former colleague · now at LearnLab', channel: 'linkedin', rel: 'work', hue: 220, msgs: [
      { who: 'them', text: "Hey Sam! Saw you're building Sprout, very cool. We're planning workplace mental-health courses — want to find a time to talk about working together?", at: t(2 * D + 4 * H) },
    ] },
    { id: 'landlord', name: 'Mr. Lin (landlord)', channel: 'line', rel: 'life', hue: 40, msgs: [
      { who: 'them', text: "Reminder: next month's rent", at: t(20 * H) },
      { who: 'them', text: 'Also the AC repair guy is coming next Wednesday at 2pm — will you be home?', at: t(20 * H - 60e3) },
    ] },
    { id: 'joy', name: 'Joy', sub: 'Designer', channel: 'ig', rel: 'work', hue: 320, msgs: [
      { who: 'me', text: 'Could the green in the logo be a tiny bit brighter?', at: t(4 * D) },
      { who: 'them', text: "Version 2 is up! Brightened it and added a vertical version too — take a look when you can ~", at: t(2 * D) },
    ] },
    { id: 'book', name: 'Psych book club', sub: 'Group · 12 people', channel: 'messenger', rel: 'group', hue: 260, msgs: [
      { who: 'them', from: 'Fiona', text: "Who's leading chapter 5 this week?", at: t(26 * H) },
      { who: 'them', from: 'Jay', text: 'I did it last time 🙋‍♂️', at: t(25 * H) },
      { who: 'them', from: 'Fiona', text: '@Sam can you?', at: t(24 * H) },
    ] },
    { id: 'podcast', name: 'Grown-up Psychology podcast', sub: 'Host Iris', channel: 'gmail', rel: 'work', hue: 280, subject: 'Podcast invite: chatting about Sprout', msgs: [
      { who: 'them', text: "Hi Sam, I'm Iris, host of the Grown-up Psychology podcast. I love the idea behind Sprout and would like to invite you on the show for a 40-minute chat — remote, or at our studio downtown. Do you have time in October?", at: t(3 * D) },
    ] },
    { id: 'an', name: 'Annie', sub: 'College friend', channel: 'ig', rel: 'friend', hue: 100, msgs: [
      { who: 'them', text: '(replied to your story) hahaha this is SO you', at: t(5 * D) },
    ], autoReply: "Haha really?? We haven't seen each other in forever!" },
    { id: 'aunt', name: 'Aunt May', channel: 'whatsapp', rel: 'family', hue: 30, msgs: [
      { who: 'them', text: '🌸 Good morning 🌸 Wishing you a peaceful and happy day ☀️', at: t(8 * H) },
    ] },
    { id: 'hr', name: 'Recruiter Tina', sub: 'LinkedIn recruiter', channel: 'linkedin', rel: 'cold', hue: 190, msgs: [
      { who: 'them', text: "Hi, my client has a product manager opening with a very competitive package. Would you be open to a chat?", at: t(4 * D) },
    ] },
    { id: 'leo', name: 'Leo', sub: 'Friend', channel: 'telegram', rel: 'friend', hue: 140, msgs: [
      { who: 'them', text: 'Still on for the hike Saturday?', at: t(30 * H) },
      { who: 'me', text: "Yes! 8am at the station", at: t(29 * H) },
    ] },
  ];
  return [
    { id: 'mom', name: '媽媽', channel: 'line', rel: 'family', hue: 12, msgs: [
      { who: 'me', text: '今天會晚一點下班', at: t(28 * H) },
      { who: 'them', text: '好 路上小心', at: t(27 * H) },
      { who: 'them', text: '晚上回來吃飯嗎？我買了你愛吃的魚', at: t(3 * H) },
    ], autoReply: '好～那我煮你的份 ❤️ 幾點到？' },
    { id: 'amy', name: 'Amy Lin', sub: 'Seed VC · 投資人', channel: 'whatsapp', rel: 'work', hue: 200, msgs: [
      { who: 'them', text: 'Hi! Read the Sprout deck, really interesting. Could we do a 30-min call next week?', at: t(6 * H) },
    ], autoReply: 'Perfect, Thursday works. Sending the invite now 🙌' },
    { id: 'chen', name: '陳經理', sub: '藍海科技 · 人資部', channel: 'gmail', rel: 'work', hue: 160, subject: 'Re: 小芽 50 人方案報價', msgs: [
      { who: 'me', text: '陳經理您好，附上方案報價單，請參考。', at: t(3 * D) },
      { who: 'them', text: '收到，內部討論過了。想確認兩件事：1) 50 人方案能不能分兩期付款 2) 可以先試辦一個月嗎？麻煩週四前回覆，謝謝。', at: t(22 * H) },
    ] },
    { id: 'kevin', name: 'Kevin 王', sub: '前同事 · 現在在學習平台 LearnLab', channel: 'linkedin', rel: 'work', hue: 220, msgs: [
      { who: 'them', text: '嗨小米！看到你在做小芽，很酷。我們最近在規劃職場心理健康的課程，想約個時間聊聊有沒有合作機會？', at: t(2 * D + 4 * H) },
    ] },
    { id: 'landlord', name: '房東 林先生', channel: 'line', rel: 'life', hue: 40, msgs: [
      { who: 'them', text: '下個月房租記得喔', at: t(20 * H) },
      { who: 'them', text: '另外冷氣師傅下週三下午 2 點來修，你在家嗎？', at: t(20 * H - 60e3) },
    ] },
    { id: 'joy', name: 'Joy', sub: '設計師', channel: 'ig', rel: 'work', hue: 320, msgs: [
      { who: 'me', text: 'logo 的綠色可以再亮一點點嗎？', at: t(4 * D) },
      { who: 'them', text: '第二版給你了！這次有調亮，也多做了一個直式版本，有空看一下～', at: t(2 * D) },
    ] },
    { id: 'book', name: '心理學讀書會', sub: '群組 · 12 人', channel: 'messenger', rel: 'group', hue: 260, msgs: [
      { who: 'them', from: '小魚', text: '這週誰負責導讀第 5 章？', at: t(26 * H) },
      { who: 'them', from: '阿哲', text: '上次是我了 🙋‍♂️', at: t(25 * H) },
      { who: 'them', from: '小魚', text: '@小米 你可以嗎？', at: t(24 * H) },
    ] },
    { id: 'podcast', name: '《大人的心理課》Podcast', sub: '主持人 Iris', channel: 'gmail', rel: 'work', hue: 280, subject: '節目邀約：聊聊小芽', msgs: [
      { who: 'them', text: '小米你好，我是 Podcast《大人的心理課》的主持人 Iris。很喜歡小芽的理念，想邀請你上節目聊 40 分鐘，錄音可以線上或到我們在松山的錄音室。請問 10 月有方便的時間嗎？', at: t(3 * D) },
    ] },
    { id: 'an', name: '小安', sub: '大學同學', channel: 'ig', rel: 'friend', hue: 100, msgs: [
      { who: 'them', text: '（回覆了你的限時動態）哈哈哈這也太像你了吧', at: t(5 * D) },
    ], autoReply: '真的嗎哈哈哈 我們好久沒見了！' },
    { id: 'aunt', name: '二姨', channel: 'line', rel: 'family', hue: 30, msgs: [
      { who: 'them', text: '🌸早安🌸 平安喜樂 健康快樂 ☀️', at: t(8 * H) },
    ] },
    { id: 'hr', name: 'Recruiter Tina', sub: 'LinkedIn 獵頭', channel: 'linkedin', rel: 'cold', hue: 190, msgs: [
      { who: 'them', text: 'Hi，我們客戶有個產品經理職缺，薪資待遇很有競爭力，想跟你聊聊看有沒有興趣？', at: t(4 * D) },
    ] },
    { id: 'leo', name: 'Leo', sub: '朋友', channel: 'telegram', rel: 'friend', hue: 140, msgs: [
      { who: 'them', text: '週六爬山還去嗎？', at: t(30 * H) },
      { who: 'me', text: '去！8 點捷運站見', at: t(29 * H) },
    ] },
  ];
}

// Fake calendar: busy blocks over the next 7 days, [dayOffset, startHour, endHour].
export const BUSY = [[0, 10, 12], [0, 14, 15], [1, 9, 11], [1, 13, 17], [2, 10, 11], [3, 15, 18], [4, 9, 12], [4, 14, 16]];

export const REL = EN
  ? { family: 'Family', work: 'Work', life: 'Life', group: 'Group', friend: 'Friend', cold: 'Stranger' }
  : { family: '家人', work: '工作', life: '生活', group: '群組', friend: '朋友', cold: '陌生' };

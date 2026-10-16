// 給塑膠怪 / Left on Read — app
import { L, EN, switchLang } from './i18n.js';
import { CHANNELS, REL, ME, buildThreads } from './data.js';
import { TONES, INTENT, intentOf, riskOf, needsReply, lastTheirs, draftReplies, draftOutreach } from './ai.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const H = 36e5;

// ── Persistence ───────────────────────────────────────────────
const KEY = EN ? 'plastic.v1.en' : 'plastic.v1'; // each language has its own demo inbox
const fresh = () => ({
  sent: {}, outbox: [], outreach: [], coldThreads: [], events: [], connected: {},
  settings: { apiKey: '', myName: ME.name, myBio: ME.bio, autopilot: 'off', perContact: {} },
});
let store;
try { store = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || 'null') }; } catch { store = fresh(); }
store.settings = { ...fresh().settings, ...store.settings };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode */ } };

// Demo threads are rebuilt relative to "now"; what you sent is layered on top.
const baseThreads = buildThreads();
function threads() {
  return baseThreads.concat(store.coldThreads).map((t) => {
    const extra = store.sent[t.id] || [];
    return { ...t, msgs: t.msgs.concat(extra).sort((a, b) => a.at - b.at) };
  });
}
const threadById = (id) => threads().find((t) => t.id === id);

// ── UI state ──────────────────────────────────────────────────
const ui = { tab: 'inbox', id: null, filter: 'reply', channel: 'all', tone: 'warm', drafts: {}, loading: {}, invite: true, mobileChat: false };

// ── 小塑 the plastic bag ───────────────────────────────────────
// load: how many people you're leaving hanging. More = heavier bag.
function bag(load = 0, size = 64) {
  const mood = load === 0 ? 'light' : load <= 3 ? 'ok' : 'heavy';
  const ink = '#2B3A4A';
  const eyes = {
    light: `<path d="M31 40q3-4 6 0M45 40q3-4 6 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    ok: `<circle cx="34" cy="40" r="2.4" fill="${ink}"/><circle cx="48" cy="40" r="2.4" fill="${ink}"/>`,
    heavy: `<path d="M30.5 37.5l6 2M51.5 37.5l-6 2" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="42" r="2.2" fill="${ink}"/><circle cx="48" cy="42" r="2.2" fill="${ink}"/>`,
  }[mood];
  const mouth = {
    light: `<path d="M36 46q5 5 10 0z" fill="${ink}"/>`,
    ok: `<path d="M37.5 47q3.5 2.5 7 0" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    heavy: `<path d="M37 50q4-3 8 0" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M58 30q2.5 4 0 6q-2.5-2 0-6z" fill="#7CC4FF"/>`,
  }[mood];
  // Unread "bubbles" pile up inside the bag.
  const colors = ['#FFB547', '#7CC4FF', '#FF7A9C', '#6FD3A5', '#B59CFF'];
  let pile = '';
  for (let i = 0; i < Math.min(load, 10); i++) {
    const row = Math.floor(i / 4), col = i % 4;
    const x = 22 + col * 10 + (row % 2) * 5, y = 76 - row * 8;
    pile += `<rect x="${x}" y="${y}" width="10" height="7" rx="3.5" fill="${colors[i % 5]}" opacity=".85"/>`;
  }
  const id = 'bagclip' + size + load;
  const body = 'M16 26H66L70 78Q41 92 12 78Z';
  return `<svg class="bag bag-${mood}" viewBox="0 0 82 92" width="${size}" height="${size * 92 / 82}" aria-hidden="true">
<defs><clipPath id="${id}"><path d="${body}"/></clipPath>
<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#F4FAFF"/><stop offset="1" stop-color="#E2EFFA"/></linearGradient></defs>
<path d="M24 27C19 8 37 6 35 25M47 25C45 6 63 8 58 27" fill="none" stroke="#A9C3DA" stroke-width="3.2" stroke-linecap="round"/>
<path d="${body}" fill="url(#${id}g)"/>
<g clip-path="url(#${id})">${pile}</g>
<path d="${body}" fill="none" stroke="#A9C3DA" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M22 34l3 30M58 36l-2 26" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
${eyes}${mouth}
<circle cx="28" cy="47" r="3" fill="#FF9DB0" opacity=".45"/><circle cx="54" cy="47" r="3" fill="#FF9DB0" opacity=".45"/>
</svg>`;
}

// ── Helpers ───────────────────────────────────────────────────
function waitText(ms) {
  const h = ms / H;
  if (h < 1) return L('剛剛', 'just now');
  if (h < 24) return Math.floor(h) + L(' 小時', 'h');
  return Math.floor(h / 24) + L(' 天', 'd');
}
function clock(ts) {
  const d = new Date(ts), now = new Date();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === now.toDateString()) return hm;
  const days = Math.round((now - d) / (24 * H));
  return days <= 1 ? L('昨天', 'Yesterday') : days < 7 ? L(`${days} 天前`, `${days}d ago`) : `${d.getMonth() + 1}/${d.getDate()}`;
}
const REL_W = { work: 1.5, family: 1.3, life: 1.2, friend: 1, group: .8, cold: .4 };
const INTENT_W = { work: 12, meeting: 10, question: 6, decline: 0, casual: 0, greeting: -4 };
// Who should you answer first: relationship + what they want + a deadline, then (a little) how long they've waited.
function priority(t) {
  const m = lastTheirs(t);
  const days = (Date.now() - m.at) / (24 * H);
  const deadline = /前回覆|盡快|麻煩.*前|急|asap|deadline|reply by|by (mon|tues|wednes|thurs|fri)day/i.test(m.text) ? 10 : 0;
  return (REL_W[t.rel] || 1) * 10 + INTENT_W[intentOf(t)] + Math.min(days, 5) * 2 + deadline;
}

function chan(c, big = false) {
  const ch = CHANNELS[c];
  return `<span class="ch ${big ? 'big' : ''}" style="--c:${ch.color}" title="${ch.name}">${ch.short}</span>`;
}
function avatar(t, size = 44) {
  const init = t.name.replace(/^[《(]/, '').slice(0, t.name.match(/^[A-Za-z]/) ? 1 : 1);
  return `<span class="av" style="--h:${t.hue};--s:${size}px">${esc(init)}${chan(t.channel)}</span>`;
}

let toastT;
function toast(html, load = 0) {
  const el = $('#toast');
  el.innerHTML = `${bag(load, 30)}<span>${html}</span>`;
  el.classList.add('in');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('in'), 3200);
}

// ── Sending (mock) ────────────────────────────────────────────
function send(threadId, text, how = 'manual') {
  const now = Date.now();
  (store.sent[threadId] = store.sent[threadId] || []).push({ who: 'me', text, at: now, via: how });
  delete ui.drafts[threadId];
  save();
  const th = threadById(threadId);
  const base = baseThreads.find((t) => t.id === threadId);
  // Some demo friends answer back, so it feels alive.
  if (base && base.autoReply && !store.sent[threadId].some((m) => m.who === 'them')) {
    setTimeout(() => {
      store.sent[threadId].push({ who: 'them', text: base.autoReply, at: Date.now() });
      save(); render();
      toast(`<b>${esc(th.name)}</b>${L(' 回你了：', ' replied: ')}${esc(base.autoReply.slice(0, L(18, 34)))}`, pending().length);
    }, 3500);
  }
}
const pending = () => threads().filter(needsReply);

// ── Rendering ─────────────────────────────────────────────────
function render() {
  document.querySelectorAll('.rail-btn').forEach((b) => b.classList.toggle('on', b.dataset.tab === ui.tab));
  $('#outboxDot').textContent = store.outbox.length || '';
  $('#outboxDot').hidden = !store.outbox.length;
  $('#railBag').innerHTML = bag(pending().length, 40);
  $('#app').dataset.tab = ui.tab;
  $('#app').classList.toggle('chat-open', ui.mobileChat);
  if (ui.tab === 'inbox') { renderList(); renderChat(); }
  else { $('#list').innerHTML = ''; ({ outbox: renderOutbox, outreach: renderOutreach, settings: renderSettings })[ui.tab](); }
  document.querySelectorAll('#main textarea').forEach(autosize);
}

function autosize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight + 2, 320) + 'px';
}

function renderList() {
  const all = threads();
  const waiting = all.filter(needsReply).sort((a, b) => priority(b) - priority(a));
  const oldest = waiting.slice().sort((a, b) => lastTheirs(a).at - lastTheirs(b).at)[0];
  let shown = ui.filter === 'reply' ? waiting : ui.filter === 'them' ? all.filter((t) => !needsReply(t)) : all;
  if (ui.channel !== 'all') shown = shown.filter((t) => t.channel === ui.channel);
  if (ui.filter !== 'reply') shown = shown.slice().sort((a, b) => b.msgs[b.msgs.length - 1].at - a.msgs[a.msgs.length - 1].at);

  const say = !waiting.length ? L('大家都回完了！我好輕，要飄起來了～', "Everyone's answered! I'm so light I could float away ~")
    : waiting.length <= 3 ? L(`還有 ${waiting.length} 個人在等你，快好了！`, `${waiting.length} people still waiting — almost there!`)
    : L(`你正在塑膠 <b>${waiting.length}</b> 個人，袋子好重……<br>最久的是 <b>${esc(oldest.name)}</b>，等了 ${waitText(Date.now() - lastTheirs(oldest).at)}。`,
      `You've left <b>${waiting.length}</b> people on read. This bag is heavy…<br><b>${esc(oldest.name)}</b> has waited longest: ${waitText(Date.now() - lastTheirs(oldest).at)}.`);
  const usedChannels = [...new Set(all.map((t) => t.channel))];

  $('#list').innerHTML = `
    <header class="l-head">
      <div class="meter">
        <div class="meter-bag">${bag(waiting.length, 58)}</div>
        <div class="meter-txt"><p>${say}</p>
          ${waiting.length ? `<button class="pill" data-act="draftAll">✨ ${L('全部幫我擬好', 'Draft them all')}</button>` : ''}</div>
      </div>
      <div class="seg" role="tablist">
        <button class="${ui.filter === 'reply' ? 'on' : ''}" data-act="filter" data-v="reply">${L('要回', 'To reply')} <b>${waiting.length}</b></button>
        <button class="${ui.filter === 'them' ? 'on' : ''}" data-act="filter" data-v="them">${L('等對方', 'Waiting on them')}</button>
        <button class="${ui.filter === 'all' ? 'on' : ''}" data-act="filter" data-v="all">${L('全部', 'All')}</button>
      </div>
      <div class="chans">
        <button class="${ui.channel === 'all' ? 'on' : ''}" data-act="channel" data-v="all">${L('全部平台', 'All apps')}</button>
        ${usedChannels.map((c) => `<button class="${ui.channel === c ? 'on' : ''}" data-act="channel" data-v="${c}">${chan(c)}${CHANNELS[c].name}</button>`).join('')}
      </div>
    </header>
    <ol class="threads">
      ${shown.map((t) => {
        const last = t.msgs[t.msgs.length - 1];
        const nr = needsReply(t);
        const wait = nr ? Date.now() - last.at : 0;
        const auto = store.settings.perContact[t.id];
        return `<li class="th ${ui.id === t.id ? 'sel' : ''} ${nr ? 'nr' : ''}" data-act="open" data-id="${t.id}" role="button" tabindex="0">
          ${avatar(t)}
          <div class="th-body">
            <div class="th-top"><b>${esc(t.name)}</b>${auto ? `<span class="auto">${L('自動', 'Auto')}</span>` : ''}<span class="time">${clock(last.at)}</span></div>
            <div class="th-snip">${last.who === 'me' ? L('你：', 'You: ') : last.from ? esc(last.from) + L('：', ': ') : ''}${esc(t.subject && last.who === 'them' ? t.subject + ' — ' + last.text : last.text)}</div>
            ${nr ? `<div class="th-tags"><span class="wait ${wait > 2 * 24 * H ? 'hot' : wait > 12 * H ? 'warm' : ''}">${L('塑了 ', 'Left ')}${waitText(wait)}</span><span class="tag">${INTENT[intentOf(t)].label}</span><span class="tag mute">${REL[t.rel]}</span>${ui.drafts[t.id] ? `<span class="tag ok">${L('草稿好了', 'Draft ready')}</span>` : ''}</div>` : ''}
          </div>
        </li>`;
      }).join('') || `<li class="empty">${bag(0, 70)}<p>${ui.filter === 'reply' ? L('沒有人在等你回，太棒了！', 'Nobody is waiting on you. Amazing!') : L('這裡空空的', 'Nothing here')}</p></li>`}
    </ol>`;
}

async function ensureDraft(th) {
  if (ui.drafts[th.id] || ui.loading[th.id]) return;
  ui.loading[th.id] = true;
  const d = await draftReplies(th, store.settings);
  ui.loading[th.id] = false;
  ui.drafts[th.id] = { ...d, edited: null };
  if (ui.id === th.id) renderChat();
  if (ui.tab === 'inbox') renderList();
}

function renderChat() {
  const main = $('#main');
  const th = ui.id && threadById(ui.id);
  if (!th) {
    const n = pending().length;
    main.innerHTML = `<div class="blank">${bag(n, 120)}<h2>${n ? L(`有 ${n} 個人在等你`, `${n} people are waiting on you`) : L('全部回完了', 'All caught up')}</h2>
      <p>${n ? L('從左邊挑一個開始。每則我都先幫你擬好，送出前一定給你看。', "Pick one on the left. I'll draft each reply, and you always see it before it goes out.") : L('去喝杯水吧。袋子空空的感覺真好。', 'Go get some water. An empty bag feels great.')}</p></div>`;
    return;
  }
  const nr = needsReply(th);
  if (nr) ensureDraft(th);
  const d = ui.drafts[th.id];
  const intent = intentOf(th);
  const auto = !!store.settings.perContact[th.id];
  const evs = store.events.filter((e) => e.threadId === th.id);

  let lastDay = '';
  const bubbles = th.msgs.map((m, i) => {
    const day = new Date(m.at).toDateString();
    const sep = day !== lastDay ? `<div class="day">${clock(m.at).includes(':') ? L('今天', 'Today') : clock(m.at)}</div>` : '';
    lastDay = day;
    const next = th.msgs[i + 1];
    const tail = !next || next.who !== m.who ? 'tail' : '';
    return `${sep}<div class="msg ${m.who} ${tail}">
      ${m.from && m.who === 'them' && (i === 0 || th.msgs[i - 1].from !== m.from) ? `<div class="from">${esc(m.from)}</div>` : ''}
      <div class="bubble">${esc(m.text).replace(/\n/g, '<br>')}</div>
      ${m.who === 'me' && tail ? `<div class="meta">${m.via === 'auto' ? L('小塑自動送出 · ', 'Auto-sent by Baggy · ') : ''}${L(`已透過 ${CHANNELS[th.channel].name} 送出`, `Sent via ${CHANNELS[th.channel].name}`)}</div>` : ''}
    </div>`;
  }).join('');

  const text = d ? (d.edited ?? d[ui.tone]) : '';
  main.innerHTML = `
    <header class="c-head">
      <button class="back" data-act="back" aria-label="${L('返回', 'Back')}">‹</button>
      ${avatar(th, 40)}
      <div class="c-who"><b>${esc(th.name)}</b><small>${th.sub ? esc(th.sub) + ' · ' : ''}${CHANNELS[th.channel].name}</small></div>
      <label class="auto-tgl" title="${L('開啟後，小塑會直接回覆這個人（不用確認）', 'When on, Baggy replies to this person directly (no review)')}">
        <input type="checkbox" data-act="perContact" ${auto ? 'checked' : ''}><span></span>${L('自動回這個人', 'Auto-reply to them')}
      </label>
    </header>
    <div class="c-body" id="cbody">
      ${th.subject ? `<div class="subject">✉️ ${esc(th.subject)}</div>` : ''}
      ${bubbles}
      ${evs.map((e) => `<div class="event">📅 ${L('已在行事曆預留', 'Held on your calendar:')} <b>${esc(e.label)}</b>${L(`（等 ${esc(th.name)} 確認）`, ` (waiting for ${esc(th.name)} to confirm)`)}</div>`).join('')}
    </div>
    ${nr ? `
      <section class="draft ${d ? '' : 'loading'}">
        <div class="d-head">
          ${bag(0, 28)}
          <span class="d-title">${d ? `${L('小塑幫你擬好了', 'Baggy drafted a reply')}${d.source === 'claude' ? '<em>Claude</em>' : ''}` : L('小塑正在想怎麼回…', 'Baggy is thinking…')}</span>
          <span class="tag">${INTENT[intent].label}</span>
          ${d ? `<div class="tones">${Object.entries(TONES).map(([k, v]) => `<button class="${ui.tone === k && d.edited == null ? 'on' : ''}" data-act="tone" data-v="${k}">${v}</button>`).join('')}</div>` : ''}
        </div>
        ${d ? `
          <textarea id="draftText" rows="${Math.min(7, Math.max(2, text.split('\n').length + Math.floor(text.length / 38)))}">${esc(text)}</textarea>
          ${d.slots.length ? `<label class="invite"><input type="checkbox" data-act="invite" ${ui.invite ? 'checked' : ''}> ${L('同時在行事曆預留', 'Also hold')} <b>${esc(d.slots[0].label)}</b>${L('，對方確認後寄出邀請', ' on my calendar and send an invite once they confirm')}</label>` : ''}
          <div class="d-foot">
            <button class="ghost" data-act="redraft">${L('換一個說法', 'Try another way')}</button>
            <button class="ghost" data-act="queue">${L('放進待確認', 'Save for review')}</button>
            <button class="send" data-act="sendDraft">${L('送出', 'Send')} ↑</button>
          </div>` : '<div class="shimmer"></div><div class="shimmer short"></div>'}
      </section>` : `
      <form class="composer" data-act="compose">
        <input name="msg" placeholder="${L(`${CHANNELS[th.channel].name} 訊息`, `${CHANNELS[th.channel].name} message`)}" autocomplete="off">
        <button class="send round" aria-label="${L('送出', 'Send')}">↑</button>
      </form>`}`;
  const ta = $('#draftText');
  if (ta) autosize(ta);
  const body = $('#cbody');
  body.scrollTop = body.scrollHeight;
}

function renderOutbox() {
  const main = $('#main');
  const items = store.outbox;
  main.innerHTML = `
    <div class="page">
      <header class="p-head">
        <div><h1>${L('送出前確認', 'Review before sending')}</h1><p>${L('小塑擬好的回覆都在這裡，看過再送。改一改也可以。', 'Every reply Baggy drafted waits here. Read it, tweak it, then send.')}</p></div>
        ${items.length ? `<button class="send" data-act="sendAll">${L(`全部送出（${items.length}）`, `Send all (${items.length})`)}</button>` : ''}
      </header>
      ${store.settings.autopilot !== 'off' ? `<div class="note">🛫 ${L('自動駕駛：', 'Autopilot: ')}${store.settings.autopilot === 'safe' ? L('問候、閒聊這類低風險的訊息會直接送出，其他的在這裡等你', 'low-risk messages like greetings and small talk go out directly; everything else waits here') : L('全部直接送出（到設定可以關掉）', 'everything goes out directly (turn it off in Settings)')}</div>` : ''}
      <ol class="queue">
        ${items.map((o) => {
          const th = threadById(o.threadId) || o.thread;
          const last = th && th.msgs && lastTheirs(th);
          return `<li class="q">
            <div class="q-head">${th ? avatar(th, 36) : ''}<b>${esc(th ? th.name : o.name)}</b><span class="tag">${esc(o.label)}</span>
              ${o.risk === 'high' ? `<span class="tag warn">${L('重要，請看仔細', 'Important — read carefully')}</span>` : ''}</div>
            ${last ? `<blockquote>${esc(last.text)}</blockquote>` : ''}
            <textarea data-oid="${o.id}" rows="${Math.min(6, 2 + Math.floor(o.text.length / 40))}">${esc(o.text)}</textarea>
            <div class="d-foot"><button class="ghost" data-act="drop" data-oid="${o.id}">${L('不送了', "Don't send")}</button><button class="send" data-act="sendOne" data-oid="${o.id}">${L('送出', 'Send')} ↑</button></div>
          </li>`;
        }).join('') || `<li class="empty">${bag(0, 90)}<p>${L('沒有待確認的訊息。<br>到「訊息」按「全部幫我擬好」試試看。', 'Nothing to review.<br>Try “Draft them all” in Messages.')}</p></li>`}
      </ol>
    </div>`;
}

// Made-up people and companies.
const SAMPLE_TARGETS = EN ? `Jamie Park, Chief People Officer, Northstar Robotics, linkedin
Marcus Chen, Head of People, Brightpath, linkedin
Priya Shah, Benefits Lead, Harbor Bank, gmail` : `林佳穎, 人資長, 晨星電子, linkedin
Marcus Chen, Head of People, Brightpath, linkedin
王大明, 福委會主委, 和光金控, gmail`;

function renderOutreach() {
  $('#main').innerHTML = `
    <div class="page">
      <header class="p-head"><div><h1>${L('陌生開發', 'Cold outreach')}</h1><p>${L('貼上名單，小塑幫每個人寫一封「看得出來是寫給他」的第一封訊息。全部都會先進待確認。', 'Paste a list and Baggy writes each person a first message that is clearly written for them. Everything goes to review first.')}</p></div></header>
      <div class="outreach">
        <form class="card" data-act="outreach">
          <label class="field"><span>${L('名單（一行一個：姓名, 職稱, 公司, 平台）', 'List (one per line: name, title, company, platform)')}</span>
            <textarea name="targets" rows="5">${esc(store.outreachDraft?.targets ?? SAMPLE_TARGETS)}</textarea></label>
          <label class="field"><span>${L('你想請他做什麼？', 'What do you want to ask them?')}</span>
            <input name="goal" value="${esc(store.outreachDraft?.goal ?? L('想了解貴公司怎麼照顧員工心理健康，也分享我們的員工身心健康方案', 'how your company supports employee mental health, and whether Sprout could help'))}"></label>
          <label class="field row"><input type="checkbox" name="follow" checked> ${L('3 天沒回，自動擬一則溫和的追蹤訊息（一樣先給你確認）', 'No reply in 3 days → draft a gentle follow-up (also reviewed first)')}</label>
          <button class="send wide">✨ ${L('幫我寫', 'Write them')}</button>
        </form>
        <div class="cards">
          ${store.outreach.map((o) => `
            <div class="card o">
              <div class="q-head"><span class="av sm" style="--h:${o.hue};--s:32px">${esc(o.name.slice(0, 1))}${chan(o.channel)}</span>
                <b>${esc(o.name)}</b><small>${esc([o.role, o.company].filter(Boolean).join(' · '))}</small>
                <span class="tag ${o.status === 'queued' ? 'ok' : ''}">${o.status === 'queued' ? L('已放進待確認', 'In review') : L('草稿', 'Draft')}</span></div>
              <p>${esc(o.message).replace(/\n/g, '<br>')}</p>
            </div>`).join('') || `<div class="empty">${bag(1, 80)}<p>${L('寫好的開發訊息會出現在這裡', 'Your outreach messages will show up here')}</p></div>`}
        </div>
      </div>
    </div>`;
}

function renderSettings() {
  const s = store.settings;
  const statusText = { open: L('可以串接', 'Supported'), business: L('限商業帳號', 'Business accounts only'), closed: L('未開放', 'Not available') };
  $('#main').innerHTML = `
    <div class="page">
      <header class="p-head"><div><h1>${L('設定', 'Settings')}</h1><p>${L('現在是示範資料。下面是每個平台實際上能不能串接。', "This is demo data. Below is what each platform actually allows.")}</p></div></header>
      <section class="card">
        <h3>${L('連結帳號', 'Connected accounts')}</h3>
        <ul class="conn">${Object.entries(CHANNELS).map(([k, c]) => `
          <li>${chan(k, true)}<div><b>${c.name}</b><span class="st st-${c.status}">${statusText[c.status]}</span><small>${c.note}</small></div>
            <button class="${store.connected[k] ? 'ghost' : 'send'}" data-act="connect" data-v="${k}" ${c.status === 'closed' ? 'disabled' : ''}>${store.connected[k] ? L('已連結（示範）', 'Connected (demo)') : c.status === 'closed' ? L('無法連結', 'Unavailable') : L('連結', 'Connect')}</button></li>`).join('')}</ul>
      </section>
      <section class="card">
        <h3>${L('自動駕駛（bypass 確認）', 'Autopilot (skip review)')}</h3>
        <div class="radios">
          ${[['off', L('關閉', 'Off'), L('每一則都先給我看（建議）', 'Show me every message first (recommended)')], ['safe', L('只放行低風險的', 'Low-risk only'), L('問候、閒聊直接送；工作、約時間、金錢相關還是要我確認', 'Greetings and small talk go straight out; work, scheduling and money still need my OK')], ['all', L('全部直接送', 'Send everything'), L('小塑擬好就送出。可能會說錯話，小心使用', 'Baggy sends as soon as it drafts. It can say the wrong thing — use with care')]].map(([v, h, p]) => `
            <label class="radio ${s.autopilot === v ? 'on' : ''}"><input type="radio" name="ap" value="${v}" data-act="autopilot" ${s.autopilot === v ? 'checked' : ''}><div><b>${h}</b><small>${p}</small></div></label>`).join('')}
        </div>
        <p class="fine">${L('也可以在對話右上角，針對單一聯絡人開「自動回這個人」。', 'You can also turn on “Auto-reply to them” for a single contact at the top right of a chat.')}</p>
      </section>
      <section class="card">
        <h3>${L('讓小塑認識你', 'Tell Baggy about you')}</h3>
        <label class="field"><span>${L('名字', 'Name')}</span><input data-set="myName" value="${esc(s.myName)}"></label>
        <label class="field"><span>${L('一句話介紹你自己（擬回覆和開發信時會用到）', 'One line about you (used in replies and outreach)')}</span><input data-set="myBio" value="${esc(s.myBio)}"></label>
      </section>
      <section class="card">
        <h3>${L('AI 擬稿', 'AI drafting')}</h3>
        <label class="field"><span>${L('Claude API 金鑰（選填，只存在這台電腦的瀏覽器）', 'Claude API key (optional, stored only in this browser)')}</span>
          <input type="password" data-set="apiKey" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
        <p class="fine">${L('沒填的話，示範對話用預先寫好的草稿。填了之後改用 Claude Opus 5.5 即時擬稿（有開啟拒答時自動改用備用模型）。正式版金鑰應該放在後端，不要放在瀏覽器。', 'Without a key, the demo uses pre-written drafts. With one, Claude Opus 5.5 drafts live (falling back to another model if it declines). In a real product the key belongs on a server, not in the browser.')}</p>
      </section>
      <section class="card">
        <h3>${L('語言', 'Language')}</h3>
        <button class="ghost" data-act="lang">${L('Switch to English', '切換成中文')}</button>
      </section>
      <button class="ghost" data-act="reset">${L('重設示範資料', 'Reset demo data')}</button>
    </div>`;
}

// ── Actions ───────────────────────────────────────────────────
function currentDraftText() {
  const el = $('#draftText');
  return el ? el.value.trim() : '';
}

async function draftAll() {
  const list = pending().filter((t) => !store.outbox.some((o) => o.threadId === t.id))
    .sort((a, b) => priority(b) - priority(a));
  toast(L(`小塑開始幫 ${list.length} 個人擬回覆…`, `Baggy is drafting replies for ${list.length} people…`), list.length);
  let auto = 0, queued = 0;
  for (const th of list) {
    const d = ui.drafts[th.id] || await draftReplies(th, store.settings);
    ui.drafts[th.id] = { ...d, edited: null };
    const intent = intentOf(th);
    const risk = riskOf(th);
    const text = d.warm;
    const ap = store.settings.autopilot;
    if (store.settings.perContact[th.id] || ap === 'all' || (ap === 'safe' && risk === 'low')) {
      send(th.id, text, 'auto'); auto++;
    } else {
      store.outbox.push({ id: 'o' + Date.now().toString(36) + th.id, threadId: th.id, text, label: INTENT[intent].label, risk });
      queued++;
    }
  }
  save();
  render();
  toast(L(`擬好了！${queued ? `${queued} 則在「待確認」等你` : ''}${auto ? `${queued ? '，' : ''}${auto} 則已自動送出` : ''}`,
    `Done! ${queued ? `${queued} waiting in Review` : ''}${auto ? `${queued ? ', ' : ''}${auto} auto-sent` : ''}`), pending().length);
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('#langBtn')) { switchLang(); return; }
  const tabBtn = e.target.closest('.rail-btn');
  if (tabBtn) { ui.tab = tabBtn.dataset.tab; ui.mobileChat = false; render(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'FORM' || (el.tagName === 'INPUT' && el.type !== 'checkbox')) return;
  const act = el.dataset.act;
  switch (act) {
    case 'filter': ui.filter = el.dataset.v; renderList(); break;
    case 'channel': ui.channel = el.dataset.v; renderList(); break;
    case 'open': ui.id = el.dataset.id; ui.mobileChat = true; render(); break;
    case 'back': ui.mobileChat = false; render(); break;
    case 'tone': ui.drafts[ui.id].edited = null; ui.tone = el.dataset.v; renderChat(); break;
    case 'redraft': {
      const order = Object.keys(TONES);
      ui.tone = order[(order.indexOf(ui.tone) + 1) % order.length];
      if (store.settings.apiKey) { delete ui.drafts[ui.id]; }
      else ui.drafts[ui.id].edited = null;
      renderChat();
      break;
    }
    case 'sendDraft': {
      const text = currentDraftText();
      if (!text) return;
      const d = ui.drafts[ui.id];
      if (d?.slots?.length && ui.invite) store.events.push({ threadId: ui.id, at: d.slots[0].at, label: d.slots[0].label });
      store.outbox = store.outbox.filter((o) => o.threadId !== ui.id);
      send(ui.id, text);
      render();
      const left = pending().length;
      toast(left ? L(`送出了！袋子輕了一點，還有 ${left} 個人`, `Sent! The bag got lighter — ${left} to go`) : L('全部回完了！袋子空空的好輕鬆 🎈', 'All caught up! The bag is empty 🎈'), left);
      break;
    }
    case 'queue': {
      const th = threadById(ui.id);
      const intent = intentOf(th);
      store.outbox = store.outbox.filter((o) => o.threadId !== ui.id);
      store.outbox.push({ id: 'o' + Date.now().toString(36), threadId: ui.id, text: currentDraftText(), label: INTENT[intent].label, risk: riskOf(th) });
      save(); render();
      toast(L('放進「待確認」了，等你有空一起送', 'Saved to Review — send them together when you have a moment'));
      break;
    }
    case 'draftAll': draftAll(); break;
    case 'sendOne': case 'drop': {
      const o = store.outbox.find((x) => x.id === el.dataset.oid);
      if (!o) return;
      if (act === 'sendOne') {
        const text = document.querySelector(`textarea[data-oid="${o.id}"]`).value.trim();
        sendOutboxItem(o, text);
      }
      store.outbox = store.outbox.filter((x) => x.id !== o.id);
      save(); render();
      if (act === 'sendOne') toast(L('送出了！', 'Sent!'), pending().length);
      break;
    }
    case 'sendAll': {
      if (!confirm(L(`確定要送出 ${store.outbox.length} 則訊息嗎？`, `Send ${store.outbox.length} messages?`))) return;
      const n = store.outbox.length;
      for (const o of store.outbox) {
        const ta = document.querySelector(`textarea[data-oid="${o.id}"]`);
        sendOutboxItem(o, ta ? ta.value.trim() : o.text);
      }
      store.outbox = [];
      save(); render();
      toast(L(`送出 ${n} 則！`, `Sent ${n}! `) + (pending().length ? '' : L('袋子空了 🎈', 'The bag is empty 🎈')), pending().length);
      break;
    }
    case 'connect': {
      const k = el.dataset.v;
      store.connected[k] = !store.connected[k];
      save(); render();
      if (store.connected[k]) toast(L(`${CHANNELS[k].name}：示範版不會真的連線。正式版會走 OAuth 授權。`, `${CHANNELS[k].name}: the demo doesn't really connect. The real version would use OAuth.`));
      break;
    }
    case 'reset':
      if (confirm(L('重設所有示範資料？', 'Reset all demo data?'))) { localStorage.removeItem(KEY); location.reload(); }
      break;
    case 'lang': switchLang(); break;
  }
});

function sendOutboxItem(o, text) {
  if (o.cold && !store.coldThreads.some((t) => t.id === o.threadId)) {
    store.coldThreads.push({ ...o.thread, msgs: [] });
  }
  send(o.threadId, text, 'queue');
  const oc = store.outreach.find((x) => x.threadId === o.threadId);
  if (oc) oc.status = 'sent';
}

document.addEventListener('change', (e) => {
  const act = e.target.dataset.act;
  if (act === 'perContact') {
    store.settings.perContact[ui.id] = e.target.checked;
    save(); renderList();
    toast(e.target.checked ? L('之後這個人的訊息，小塑會直接回（不用確認）', "From now on Baggy replies to this person directly (no review)") : L('改回送出前先確認', 'Back to reviewing before sending'));
  }
  if (act === 'invite') ui.invite = e.target.checked;
  if (act === 'autopilot') { store.settings.autopilot = e.target.value; save(); render(); }
  if (e.target.dataset.set) { store.settings[e.target.dataset.set] = e.target.value.trim(); save(); if (e.target.dataset.set === 'apiKey') ui.drafts = {}; }
});

document.addEventListener('input', (e) => {
  if (e.target.tagName === 'TEXTAREA' && e.target.closest('#main')) autosize(e.target);
  if (e.target.id === 'draftText' && ui.drafts[ui.id]) ui.drafts[ui.id].edited = e.target.value;
  if (e.target.dataset.oid) {
    const o = store.outbox.find((x) => x.id === e.target.dataset.oid);
    if (o) { o.text = e.target.value; save(); }
  }
});

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.dataset.act === 'compose') {
    const text = f.elements.msg.value.trim();
    if (!text) return;
    send(ui.id, text); render();
  }
  if (f.dataset.act === 'outreach') {
    const goal = f.elements.goal.value.trim();
    const raw = f.elements.targets.value;
    store.outreachDraft = { targets: raw, goal };
    const targets = raw.split('\n').map((l) => l.split(/[,，]/).map((x) => x.trim())).filter((p) => p[0])
      .map(([name, role, company, channel]) => ({ name, role, company, channel: CHANNELS[(channel || '').toLowerCase()] ? channel.toLowerCase() : 'linkedin' }));
    const btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = L('小塑寫信中…', 'Baggy is writing…');
    store.outreach = [];
    for (const t of targets) {
      const message = await draftOutreach(t, goal, store.settings);
      const id = 'cold-' + t.name.replace(/\s+/g, '').toLowerCase();
      const hue = [...t.name].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 0);
      const thread = { id, name: t.name, sub: [t.role, t.company].filter(Boolean).join(' · '), channel: t.channel, rel: 'cold', hue, msgs: [] };
      store.outreach.push({ ...t, hue, message, threadId: id, status: 'queued' });
      store.outbox = store.outbox.filter((o) => o.threadId !== id);
      store.outbox.push({ id: 'o' + Date.now().toString(36) + id, threadId: id, cold: true, thread, name: t.name, text: message, label: L('陌生開發', 'Outreach'), risk: 'high' });
    }
    save(); render();
    toast(L(`寫好 ${targets.length} 封了，都放在「待確認」`, `${targets.length} written — all waiting in Review`));
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[role=button][data-act]')) e.target.click();
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.id === 'draftText') document.querySelector('[data-act=sendDraft]')?.click();
});

// Open the most urgent conversation on wide screens.
if (matchMedia('(min-width: 900px)').matches) {
  const first = pending().sort((a, b) => priority(b) - priority(a))[0];
  if (first) ui.id = first.id;
}
render();

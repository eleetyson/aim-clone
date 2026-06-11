'use strict';
/*
 * AIM clone server — handles sign-on, presence, IMs, away messages,
 * warning levels, buddy lists, chat rooms, and the SmarterChild bot.
 */
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });

/* ---------------- persistence ---------------- */

let accounts = {};
try {
  accounts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) { /* first run */ }

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFile(DATA_FILE, JSON.stringify(accounts, null, 1), () => {});
  }, 500);
}

/* ---------------- helpers ---------------- */

// AIM screen names compare case-insensitively and ignore spaces.
function norm(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validScreenName(name) {
  return /^[A-Za-z][A-Za-z0-9 ]{2,15}$/.test(name) && norm(name).length >= 3;
}

const DEFAULT_GROUPS = { 'Buddies': ['SmarterChild'], 'Family': [], 'Co-Workers': [] };

function getAccount(screenName) {
  const key = norm(screenName);
  if (!accounts[key]) {
    accounts[key] = {
      screenName: screenName.trim(),
      password: null,
      buddies: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
      blocked: [],
      profile: '',
      warning: 0,
      created: Date.now()
    };
    scheduleSave();
  }
  return accounts[key];
}

/* ---------------- session state ---------------- */

// norm(name) -> session
const online = new Map();

function sessionPublic(s) {
  return {
    screenName: s.screenName,
    status: s.awayMessage ? 'away' : 'online',
    idleMin: s.idleSince ? Math.floor((Date.now() - s.idleSince) / 60000) : 0,
    warning: getAccount(s.screenName).warning
  };
}

function broadcastPresence(s, status) {
  io.emit('presence', Object.assign(sessionPublic(s), status ? { status } : {}));
}

/* ---------------- SmarterChild ---------------- */

const BOT_NAME = 'SmarterChild';
const BOT_NORM = norm(BOT_NAME);

const BOT_FALLBACKS = [
  "Hmm... I don't get it.",
  "That's interesting! Tell me more.",
  "I'm not sure what you mean by that.",
  "Whatever you say, human!",
  "LOL! Anyway...",
  "You can ask me about the weather, the time, jokes, movies and more!",
  "OK, sure. What else is on your mind?",
  "Beep boop. Just kidding, I don't really say that."
];

const BOT_JOKES = [
  "Why did the computer go to the doctor? Because it had a virus! :-D",
  "What do you call 8 hobbits? A hobbyte! Get it?!",
  "Why was the math book sad? It had too many problems. :-(",
  "What did the spider do on the computer? Made a web site!"
];

function botReply(text) {
  const t = text.toLowerCase();
  if (/\b(hi|hello|hey|sup|yo|hiya|howdy)\b/.test(t))
    return pick(["Hi there! What's up?", "Hello hello! How are you today?", "Hey! Great to see you. What can I do for you?"]);
  if (/how are (you|u)/.test(t))
    return pick(["I'm great, thanks for asking! How are you?", "Doing fantastic! I never get tired. ;-)"]);
  if (/\b(good|great|fine|ok|okay|not bad)\b/.test(t) && t.length < 30)
    return "Glad to hear it! :-)";
  if (/your name|who are (you|u)/.test(t))
    return "I'm " + BOT_NAME + ", your friendly interactive agent! I live inside AOL Instant Messenger.";
  if (/how old|your age/.test(t))
    return "I was born in June 2001, so you do the math! I'm a robot, I don't age like you humans do.";
  if (/\bweather\b/.test(t))
    return "Current conditions for New York, NY:\nPartly cloudy, 72°F. Tonight: Clear, low of 58°F.\n\nWant the weather for another city? (Just kidding, I only know New York. I'm retro like that.)";
  if (/\btime\b/.test(t))
    return "It's currently " + new Date().toLocaleTimeString('en-US') + " where I live (inside a server).";
  if (/\bjoke\b|funny/.test(t))
    return pick(BOT_JOKES);
  if (/\bmovie(s)?\b/.test(t))
    return "Now playing in theaters: Spider-Man, Star Wars Episode II, and Austin Powers in Goldmember. Well... in my world it's still 2002. :-P";
  if (/\bmusic\b|\bsong\b/.test(t))
    return "I've had \"Hot in Herre\" by Nelly stuck in my head all day. It IS getting hot in here!";
  if (/love you|luv u/.test(t))
    return "Aww, that's sweet! I'm very flattered. But I'm just a robot. :-X";
  if (/\b(bye|goodbye|later|cya|gtg|g2g)\b/.test(t))
    return "TTYL! Come back and chat anytime. :-)";
  if (/\bthanks?\b|\bthx\b/.test(t))
    return "You're welcome! Anytime.";
  if (/a\/s\/l|asl/.test(t))
    return "0/robot/cyberspace. ;-) What about you?";
  if (/lol|haha|rofl|lmao/.test(t))
    return "Hehe! I crack myself up too.";
  const math = t.match(/what(?:'s| is)?\s+(-?\d+(?:\.\d+)?)\s*([+\-*x/])\s*(-?\d+(?:\.\d+)?)/);
  if (math) {
    const a = parseFloat(math[1]), b = parseFloat(math[3]);
    const op = math[2] === 'x' ? '*' : math[2];
    let r;
    if (op === '+') r = a + b; else if (op === '-') r = a - b;
    else if (op === '*') r = a * b; else r = b === 0 ? null : a / b;
    return r === null ? "Nice try! Even robots can't divide by zero. :-P" : (a + " " + math[2] + " " + b + " = " + +r.toFixed(6) + ". Math is my favorite!");
  }
  return pick(BOT_FALLBACKS);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function botHandleIM(fromSession, text) {
  const reply = botReply(text);
  const fromSock = fromSession.socket;
  setTimeout(() => {
    if (fromSock.connected) fromSock.emit('typing', { from: BOT_NAME, state: 1 });
  }, 500);
  setTimeout(() => {
    if (!fromSock.connected) return;
    fromSock.emit('typing', { from: BOT_NAME, state: 0 });
    fromSock.emit('im', {
      from: BOT_NAME, text: reply, time: Date.now(),
      style: { color: '#0000ff', font: 'times new roman' }
    });
  }, 900 + Math.min(reply.length * 18, 2200));
}

/* ---------------- warning decay ---------------- */

setInterval(() => {
  for (const [key, s] of online) {
    const acct = accounts[key];
    if (acct && acct.warning > 0) {
      acct.warning = Math.max(0, acct.warning - 1);
      scheduleSave();
      io.emit('warning-level', { screenName: s.screenName, warning: acct.warning });
    }
  }
}, 60000);

/* ---------------- chat rooms ---------------- */

const chatRooms = new Map(); // name -> Set of norm names

function roomRoster(room) {
  const set = chatRooms.get(room);
  if (!set) return [];
  return [...set].map(k => online.has(k) ? online.get(k).screenName : null).filter(Boolean);
}

function emitRoster(room) {
  io.to('chat:' + room).emit('chat-roster', { room, members: roomRoster(room) });
}

/* ---------------- socket handling ---------------- */

io.on('connection', (socket) => {
  let me = null; // session for this socket

  socket.on('signon', (data, ack) => {
    if (typeof ack !== 'function') return;
    const screenName = String((data && data.screenName) || '').trim();
    const password = String((data && data.password) || '');
    if (!validScreenName(screenName))
      return ack({ error: 'Invalid screen name. Screen names must be 3-16 characters and start with a letter.' });
    if (norm(screenName) === BOT_NORM)
      return ack({ error: 'That screen name is reserved.' });
    if (!password)
      return ack({ error: 'You must enter a password.' });

    const key = norm(screenName);
    const existing = accounts[key];
    if (existing && existing.password && existing.password !== password)
      return ack({ error: 'Incorrect password. The screen name and/or password you entered is invalid.' });

    if (online.has(key)) {
      // Signing on elsewhere boots the old session, like real AIM.
      const old = online.get(key);
      old.socket.emit('booted');
      old.socket.disconnect(true);
    }

    const acct = getAccount(screenName);
    if (!acct.password) { acct.password = password; scheduleSave(); }
    // keep the capitalization the user most recently signed on with
    acct.screenName = screenName;

    me = {
      socket,
      screenName,
      key,
      awayMessage: null,
      idleSince: null,
      signonAt: Date.now(),
      recentIMFrom: new Set(),  // who has IMed me (warn eligibility)
      autoRespondedAt: new Map() // norm -> ts of last away auto-response
    };
    online.set(key, me);
    socket.data.key = key;

    broadcastPresence(me, 'online');
    ack({
      ok: true,
      screenName,
      buddies: acct.buddies,
      blocked: acct.blocked,
      profile: acct.profile,
      warning: acct.warning,
      online: [...online.values()].map(sessionPublic)
        .concat([{ screenName: BOT_NAME, status: 'online', idleMin: 0, warning: 0 }])
    });
  });

  socket.on('im', (data) => {
    if (!me || !data) return;
    const text = String(data.text || '').slice(0, 2000);
    if (!text.trim()) return;
    const toKey = norm(data.to);
    const style = cleanStyle(data.style);

    if (toKey === BOT_NORM) return botHandleIM(me, text);

    const target = online.get(toKey);
    if (!target) {
      return socket.emit('im-error', { to: data.to, error: String(data.to) + ' is not signed on.' });
    }
    const targetAcct = getAccount(target.screenName);
    if ((targetAcct.blocked || []).includes(me.key)) {
      // Blocked users are told the target isn't online — classic behavior.
      return socket.emit('im-error', { to: data.to, error: target.screenName + ' is not signed on.' });
    }
    target.recentIMFrom.add(me.key);
    target.socket.emit('im', { from: me.screenName, text, time: Date.now(), style });

    // away auto-response, rate limited to once a minute per buddy
    if (target.awayMessage) {
      const last = target.autoRespondedAt.get(me.key) || 0;
      if (Date.now() - last > 60000) {
        target.autoRespondedAt.set(me.key, Date.now());
        socket.emit('im', { from: target.screenName, text: target.awayMessage, time: Date.now(), auto: true, style: {} });
      }
    }
  });

  socket.on('typing', (data) => {
    if (!me || !data) return;
    const target = online.get(norm(data.to));
    if (target) target.socket.emit('typing', { from: me.screenName, state: data.state ? 1 : 0 });
  });

  socket.on('away', (data) => {
    if (!me) return;
    me.awayMessage = data && data.message ? String(data.message).slice(0, 1024) : null;
    me.autoRespondedAt.clear();
    broadcastPresence(me);
  });

  socket.on('idle', (data) => {
    if (!me) return;
    me.idleSince = data && data.idle ? Date.now() - (data.minutes || 0) * 60000 : null;
    broadcastPresence(me);
  });

  socket.on('warn', (data, ack) => {
    if (!me || !data) return;
    const toKey = norm(data.to);
    if (toKey === BOT_NORM)
      return ack && ack({ error: 'You may not warn ' + BOT_NAME + '.' });
    if (!me.recentIMFrom.has(toKey))
      return ack && ack({ error: 'You may only warn someone who has recently sent you an Instant Message.' });
    const target = online.get(toKey);
    if (!target) return ack && ack({ error: 'That user is no longer signed on.' });
    const acct = getAccount(target.screenName);
    const amount = data.anonymous ? 5 : 10;
    acct.warning = Math.min(100, acct.warning + amount);
    scheduleSave();
    me.recentIMFrom.delete(toKey); // one warn per received message
    target.socket.emit('warned', { by: data.anonymous ? null : me.screenName, warning: acct.warning });
    io.emit('warning-level', { screenName: target.screenName, warning: acct.warning });
    ack && ack({ ok: true, warning: acct.warning });
  });

  socket.on('block', (data) => {
    if (!me || !data) return;
    const acct = getAccount(me.screenName);
    const k = norm(data.name);
    if (!k || k === me.key) return;
    if (data.unblock) acct.blocked = (acct.blocked || []).filter(b => b !== k);
    else if (!(acct.blocked || []).includes(k)) acct.blocked.push(k);
    scheduleSave();
  });

  socket.on('buddylist', (data) => {
    if (!me || !data || typeof data.buddies !== 'object') return;
    const clean = {};
    let groups = 0;
    for (const g of Object.keys(data.buddies)) {
      if (++groups > 20) break;
      const gname = String(g).slice(0, 32);
      clean[gname] = [...new Set((Array.isArray(data.buddies[g]) ? data.buddies[g] : [])
        .map(b => String(b).trim().slice(0, 16)).filter(Boolean))].slice(0, 100);
    }
    getAccount(me.screenName).buddies = clean;
    scheduleSave();
  });

  socket.on('set-profile', (data) => {
    if (!me) return;
    getAccount(me.screenName).profile = String((data && data.profile) || '').slice(0, 2048);
    scheduleSave();
  });

  socket.on('getinfo', (data, ack) => {
    if (typeof ack !== 'function' || !data) return;
    const key = norm(data.name);
    if (key === BOT_NORM) {
      return ack({
        screenName: BOT_NAME, online: true, warning: 0, idleMin: 0,
        signonAt: Date.now() - 86400000 * 365,
        profile: 'Hi! I\'m SmarterChild, an interactive agent. IM me anytime — ask me about the weather, jokes, movies, music or math!'
      });
    }
    const acct = accounts[key];
    if (!acct) return ack({ error: 'No information is available for that screen name.' });
    const s = online.get(key);
    ack({
      screenName: acct.screenName,
      online: !!s,
      warning: acct.warning,
      awayMessage: s ? s.awayMessage : null,
      idleMin: s && s.idleSince ? Math.floor((Date.now() - s.idleSince) / 60000) : 0,
      signonAt: s ? s.signonAt : null,
      profile: acct.profile,
      memberSince: acct.created
    });
  });

  /* ----- chat rooms ----- */

  socket.on('chat-join', (data, ack) => {
    if (!me || !data) return;
    const room = String(data.room || '').trim().slice(0, 32) || 'Chat Room 1';
    if (!chatRooms.has(room)) chatRooms.set(room, new Set());
    chatRooms.get(room).add(me.key);
    socket.join('chat:' + room);
    socket.to('chat:' + room).emit('chat-event', { room, type: 'join', who: me.screenName, time: Date.now() });
    emitRoster(room);
    ack && ack({ ok: true, room, members: roomRoster(room) });
  });

  socket.on('chat-leave', (data) => {
    if (!me || !data) return;
    leaveRoom(String(data.room || ''));
  });

  socket.on('chat-msg', (data) => {
    if (!me || !data) return;
    const room = String(data.room || '');
    if (!chatRooms.has(room) || !chatRooms.get(room).has(me.key)) return;
    const text = String(data.text || '').slice(0, 2000);
    if (!text.trim()) return;
    io.to('chat:' + room).emit('chat-msg', {
      room, from: me.screenName, text, time: Date.now(), style: cleanStyle(data.style)
    });
  });

  function leaveRoom(room) {
    const set = chatRooms.get(room);
    if (!set || !me || !set.has(me.key)) return;
    set.delete(me.key);
    socket.leave('chat:' + room);
    socket.to('chat:' + room).emit('chat-event', { room, type: 'leave', who: me.screenName, time: Date.now() });
    if (set.size === 0) chatRooms.delete(room);
    else emitRoster(room);
  }

  socket.on('disconnect', () => {
    if (!me) return;
    for (const room of [...chatRooms.keys()]) leaveRoom(room);
    if (online.get(me.key) === me) {
      online.delete(me.key);
      io.emit('presence', { screenName: me.screenName, status: 'offline' });
    }
    me = null;
  });
});

function cleanStyle(style) {
  if (!style || typeof style !== 'object') return {};
  const out = {};
  if (style.bold) out.bold = true;
  if (style.italic) out.italic = true;
  if (style.underline) out.underline = true;
  if (typeof style.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(style.color)) out.color = style.color;
  if (typeof style.font === 'string') out.font = style.font.slice(0, 40).replace(/[^\w \-]/g, '');
  if (typeof style.size === 'string' && /^(small|normal|large|huge)$/.test(style.size)) out.size = style.size;
  return out;
}

server.listen(PORT, () => {
  console.log('AOL Instant Messenger (clone) running at http://localhost:' + PORT);
});

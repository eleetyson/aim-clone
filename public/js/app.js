'use strict';
/* =====================================================================
   AOL Instant Messenger clone — client application
   ===================================================================== */

/* ---------------- helpers ---------------- */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function norm(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function timeStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(d.getMinutes()).padStart(2, '0') + ':' +
         String(d.getSeconds()).padStart(2, '0') + ' ' + ap;
}

/* ---------------- smileys ---------------- */

function smileySVG(type) {
  const face = '<circle cx="8" cy="8" r="7" fill="#ffd93b" stroke="#b8860b" stroke-width="1"/>';
  let eyes = '<circle cx="5.5" cy="6" r="1" fill="#000"/><circle cx="10.5" cy="6" r="1" fill="#000"/>';
  let mouth = '';
  switch (type) {
    case 'smile': mouth = '<path d="M4.5 9.5 Q8 13 11.5 9.5" fill="none" stroke="#000" stroke-width="1.2"/>'; break;
    case 'frown': mouth = '<path d="M4.5 12 Q8 8.8 11.5 12" fill="none" stroke="#000" stroke-width="1.2"/>'; break;
    case 'wink':
      eyes = '<circle cx="10.5" cy="6" r="1" fill="#000"/><path d="M4 6 L7 6" stroke="#000" stroke-width="1.2"/>';
      mouth = '<path d="M4.5 9.5 Q8 13 11.5 9.5" fill="none" stroke="#000" stroke-width="1.2"/>'; break;
    case 'grin': mouth = '<path d="M4 9 Q8 14 12 9 Z" fill="#fff" stroke="#000" stroke-width="1"/>'; break;
    case 'tongue':
      mouth = '<path d="M4.5 9.5 Q8 12 11.5 9.5" fill="none" stroke="#000" stroke-width="1.2"/>' +
              '<path d="M8 10.6 Q8 14 10 13.2 Q11 12.8 10.5 10.4" fill="#e57373" stroke="#a33" stroke-width=".7"/>'; break;
    case 'oh': mouth = '<ellipse cx="8" cy="11" rx="1.8" ry="2.4" fill="#000"/>'; break;
    case 'cool':
      eyes = '<rect x="3" y="4.6" width="4.4" height="2.6" rx="1" fill="#000"/>' +
             '<rect x="8.6" y="4.6" width="4.4" height="2.6" rx="1" fill="#000"/>' +
             '<path d="M3 5.2 L13 5.2" stroke="#000" stroke-width="1"/>';
      mouth = '<path d="M5 10.5 Q8 12.8 11 10.5" fill="none" stroke="#000" stroke-width="1.2"/>'; break;
    case 'cry':
      mouth = '<path d="M4.5 12 Q8 9 11.5 12" fill="none" stroke="#000" stroke-width="1.2"/>' +
              '<path d="M5.5 7 Q5 10 4.5 12.5" stroke="#3aa0ff" stroke-width="1.4" fill="none"/>'; break;
    case 'sealed': mouth = '<path d="M5 10.5 L7 12 M7 10.5 L5 12 M7.5 10.5 L9.5 12 M9.5 10.5 L7.5 12 M10 10.5 L12 12 M12 10.5 L10 12" stroke="#000" stroke-width="1"/>'; break;
    default: mouth = '<path d="M5 11 L11 11" stroke="#000" stroke-width="1.2"/>';
  }
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' + face + eyes + mouth + '</svg>');
}

const EMOTICONS = [
  [':-)', 'smile'], [':)', 'smile'], [':-(', 'frown'], [':(', 'frown'],
  [';-)', 'wink'], [';)', 'wink'], [':-D', 'grin'], [':D', 'grin'],
  [':-P', 'tongue'], [':-p', 'tongue'], [':P', 'tongue'],
  [':-O', 'oh'], [':-o', 'oh'], ['8-)', 'cool'], [":'(", 'cry'], [':-X', 'sealed']
];
const EMO_RE = new RegExp('(' + EMOTICONS.map(e =>
  e[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
const EMO_MAP = Object.fromEntries(EMOTICONS);
const SMILEY_CACHE = {};
function smileyImg(type) {
  if (!SMILEY_CACHE[type]) SMILEY_CACHE[type] = smileySVG(type);
  const img = document.createElement('img');
  img.src = SMILEY_CACHE[type];
  img.className = 'im-smiley';
  return img;
}

const URL_RE = /(https?:\/\/[^\s<>"]+)/g;

// Build message body safely: text nodes + smiley imgs + clickable links.
function renderRich(text) {
  const frag = document.createDocumentFragment();
  for (const part of String(text).split(URL_RE)) {
    if (/^https?:\/\//.test(part)) {
      const a = document.createElement('a');
      a.href = part; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = part;
      frag.appendChild(a);
      continue;
    }
    for (const piece of part.split(EMO_RE)) {
      if (EMO_MAP[piece]) frag.appendChild(smileyImg(EMO_MAP[piece]));
      else if (piece) frag.appendChild(document.createTextNode(piece));
    }
  }
  return frag;
}

/* ---------------- tiny toolbar icons ---------------- */

const ICONS = {
  im: '<svg viewBox="0 0 24 24"><path d="M3 4 h18 v12 h-10 l-5 5 v-5 h-3 z" fill="#fffbe6" stroke="#555" stroke-width="1.4"/><path d="M7 8 h10 M7 11 h7" stroke="#777" stroke-width="1.4"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M2 4 h13 v9 h-7 l-4 4 v-4 h-2 z" fill="#fffbe6" stroke="#555" stroke-width="1.3"/><path d="M9 9 h13 v9 h-3 v4 l-4 -4 h-6 z" fill="#cfe4ff" stroke="#555" stroke-width="1.3"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#cfe4ff" stroke="#33c" stroke-width="1.4"/><path d="M12 10.5 v6" stroke="#003" stroke-width="2.4"/><circle cx="12" cy="7.2" r="1.5" fill="#003"/></svg>',
  setup: '<svg viewBox="0 0 24 24"><path d="M9 15 L4 20 l-1 -1 5 -5 z" fill="#888" stroke="#444"/><path d="M20 7 a5 5 0 0 1 -7 5 l-3 -3 a5 5 0 0 1 5 -7 l-2.5 2.5 1 2 2 1 z" fill="#bbb" stroke="#444" stroke-width="1.2"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3 L22 20 H2 Z" fill="#ffd200" stroke="#a80" stroke-width="1.3"/><path d="M12 9 v5" stroke="#000" stroke-width="2.2"/><circle cx="12" cy="17" r="1.3" fill="#000"/></svg>',
  block: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#c00" stroke-width="2.6"/><path d="M5.6 5.6 L18.4 18.4" stroke="#c00" stroke-width="2.6"/></svg>',
  add: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4" fill="#fc9" stroke="#963"/><path d="M3 20 q6 -7 12 0 z" fill="#39c" stroke="#036"/><path d="M18 6 v8 M14 10 h8" stroke="#090" stroke-width="2.4"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M2 6 h20 v13 h-20 z" fill="#fffbe6" stroke="#555" stroke-width="1.4"/><path d="M2 6 l10 8 10 -8" fill="none" stroke="#555" stroke-width="1.4"/></svg>',
  person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.5" fill="#ffd200" stroke="#a80"/><path d="M4 21 q8 -9 16 0 z" fill="#ffd200" stroke="#a80"/></svg>',
  smiley: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#ffd93b" stroke="#b8860b" stroke-width="1.3"/><circle cx="8.5" cy="9.5" r="1.4" fill="#000"/><circle cx="15.5" cy="9.5" r="1.4" fill="#000"/><path d="M7 14 Q12 19 17 14" fill="none" stroke="#000" stroke-width="1.6"/></svg>',
  note: '<svg viewBox="0 0 16 16"><path d="M2 1 h9 l3 3 v11 h-12 z" fill="#fff8c0" stroke="#998a00"/><path d="M11 1 v3 h3" fill="none" stroke="#998a00"/><path d="M4 6 h8 M4 8.5 h8 M4 11 h6" stroke="#aa9" stroke-width="1"/></svg>',
  man: '<svg viewBox="0 0 16 16"><circle cx="9.6" cy="2.6" r="1.9" fill="#ffd200" stroke="#b8860b" stroke-width=".5"/><g fill="none" stroke="#ffd200" stroke-width="2.1" stroke-linecap="round"><path d="M8.5 5.2 Q8 7.2 7 8.6"/><path d="M8.2 5.6 L10.6 6.8 L13 5.8"/><path d="M8.4 5.8 L5.8 6.6 L4 5.4"/><path d="M7 8.6 L9.6 10.6 L10 13.8"/><path d="M7.1 8.7 L5.4 11.2 L2.6 12.2"/></g></svg>'
};
function iconEl(name) {
  const span = el('span');
  span.innerHTML = ICONS[name];
  return span.firstChild;
}

/* ---------------- preferences ---------------- */

const PREFS_KEY = 'aim_prefs';
let prefs = { names: [], passwords: {}, lastName: '', savePassword: false, autoLogin: false, sounds: true, timestamps: true };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) {}
function savePrefs() { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
SND.setEnabled(prefs.sounds);

/* ---------------- state ---------------- */

const state = {
  signedOn: false,
  screenName: '',
  buddies: {},            // group -> [names]
  blocked: [],
  profile: '',
  warning: 0,
  awayMessage: null,
  presence: new Map(),    // norm -> {screenName, status, idleMin, warning}
  groupCollapsed: {},
  signonAt: 0
};

const imWindows = new Map();   // norm -> im window object
const chatWindows = new Map(); // room -> chat window object
let buddyListWin = null;
let signonWin = null;
let infoWins = 0;

const socket = io({ autoConnect: false });

function allBuddies() {
  const out = [];
  for (const g of Object.keys(state.buddies)) out.push(...state.buddies[g]);
  return out;
}
function isBuddy(name) {
  const k = norm(name);
  return allBuddies().some(b => norm(b) === k);
}
function presenceOf(name) {
  return state.presence.get(norm(name)) || null;
}
function syncBuddyList() {
  socket.emit('buddylist', { buddies: state.buddies });
  renderBuddyTree();
}

/* =====================================================================
   Generic classic dialogs
   ===================================================================== */

function classicDialog(title, buildBody, buttons, opts) {
  const win = WM.create({
    title, width: (opts && opts.width) || 280,
    icon: 'img/aim.svg', minimizable: false, taskbar: false,
    x: opts && opts.x, y: opts && opts.y
  });
  const pad = el('div', 'dlg-pad');
  buildBody(pad, win);
  win.body.appendChild(pad);
  const btnRow = el('div', 'dlg-buttons');
  for (const b of buttons) {
    const btn = el('button', 'btn' + (b.default ? ' default' : ''), b.label);
    btn.addEventListener('click', () => {
      if (!b.action || b.action(win) !== false) win.close();
    });
    btnRow.appendChild(btn);
  }
  win.body.appendChild(btnRow);
  return win;
}

function classicAlert(title, text, onOk) {
  SND.error();
  return classicDialog(title, (pad) => {
    pad.appendChild(el('div', 'dlg-text', text));
  }, [{ label: 'OK', default: true, action: () => { if (onOk) onOk(); } }]);
}

function classicConfirm(title, text, onYes) {
  return classicDialog(title, (pad) => {
    pad.appendChild(el('div', 'dlg-text', text));
  }, [
    { label: 'Yes', default: true, action: () => onYes() },
    { label: 'No' }
  ]);
}

function classicPrompt(title, label, initial, onOk) {
  let input;
  const win = classicDialog(title, (pad) => {
    pad.appendChild(el('div', 'dlg-text', label));
    input = el('input');
    input.type = 'text';
    input.value = initial || '';
    input.style.width = '100%';
    pad.appendChild(input);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { onOk(input.value.trim()); win.close(); }
    });
  }, [
    { label: 'OK', default: true, action: () => onOk(input.value.trim()) },
    { label: 'Cancel' }
  ]);
  input.focus();
  return win;
}

/* =====================================================================
   Sign-on window
   ===================================================================== */

function showSignon(prefillError) {
  if (signonWin) { signonWin.focus(); return; }
  document.getElementById('tray-aim').style.display = 'none';

  const win = WM.create({
    title: 'Sign On', width: 230, icon: 'img/aim.svg',
    x: Math.round(WM.desktop.clientWidth / 2 - 115),
    y: Math.round(WM.desktop.clientHeight / 2 - 170),
    onClose: () => { signonWin = null; }
  });
  signonWin = win;

  const body = el('div', 'signon-body');

  const top = el('div', 'signon-top');
  const logo = el('div', 'signon-logo');
  const manImg = document.createElement('img');
  manImg.src = 'img/aim.svg'; manImg.width = 54; manImg.height = 54; manImg.alt = '';
  logo.appendChild(manImg);
  const wordWrap = el('div');
  wordWrap.appendChild(el('span', 'aol-word', 'AOL'));
  wordWrap.appendChild(el('span', 'tagline', 'Instant Messenger™'));
  logo.appendChild(wordWrap);
  top.appendChild(logo);
  body.appendChild(top);

  const form = el('div', 'signon-form');

  const fld1 = el('div', 'fld');
  fld1.appendChild(el('div', null, 'Screen Name'));
  const snInput = el('input');
  snInput.type = 'text';
  snInput.maxLength = 16;
  snInput.setAttribute('list', 'sn-list');
  snInput.value = prefs.lastName || '';
  const dl = el('datalist');
  dl.id = 'sn-list';
  for (const n of prefs.names) dl.appendChild(new Option(n, n));
  fld1.appendChild(snInput);
  fld1.appendChild(dl);
  form.appendChild(fld1);

  const links1 = el('div', 'signon-links');
  const getSn = el('span', 'link', 'Get a Screen Name');
  getSn.addEventListener('click', () => classicAlert('Get a Screen Name',
    'Good news: registration is instant! Just type any screen name and password and click Sign On — the name is yours.'));
  links1.appendChild(getSn);
  form.appendChild(links1);

  const fld2 = el('div', 'fld');
  fld2.appendChild(el('div', null, 'Password'));
  const pwInput = el('input');
  pwInput.type = 'password';
  if (prefs.savePassword && prefs.lastName && prefs.passwords[norm(prefs.lastName)])
    pwInput.value = prefs.passwords[norm(prefs.lastName)];
  fld2.appendChild(pwInput);
  form.appendChild(fld2);

  const links2 = el('div', 'signon-links');
  const forgot = el('span', 'link', 'Forgot Password?');
  forgot.addEventListener('click', () => classicAlert('Forgot Password?',
    'Have you tried "password123"? (This is a clone — if you forgot it, pick a new screen name.)'));
  links2.appendChild(forgot);
  form.appendChild(links2);

  const checks = el('div', 'signon-checks');
  const savePwLbl = el('label');
  const savePwCb = el('input'); savePwCb.type = 'checkbox'; savePwCb.checked = !!prefs.savePassword;
  savePwLbl.appendChild(savePwCb);
  savePwLbl.appendChild(document.createTextNode('Save password'));
  const autoLbl = el('label');
  const autoCb = el('input'); autoCb.type = 'checkbox'; autoCb.checked = !!prefs.autoLogin;
  autoLbl.appendChild(autoCb);
  autoLbl.appendChild(document.createTextNode('Auto-login'));
  checks.appendChild(savePwLbl);
  checks.appendChild(autoLbl);
  form.appendChild(checks);
  body.appendChild(form);

  const errDiv = el('div', 'signon-error');
  if (prefillError) { errDiv.textContent = prefillError; errDiv.style.display = 'block'; }
  body.appendChild(errDiv);

  // connecting view (hidden until sign-on)
  const connWrap = el('div');
  connWrap.style.display = 'none';
  const connStatus = el('div', 'connect-status', 'Connecting...');
  const track = el('div', 'progress-track');
  const fill = el('div', 'progress-fill');
  track.appendChild(fill);
  connWrap.appendChild(connStatus);
  connWrap.appendChild(track);
  body.appendChild(connWrap);

  const btns = el('div', 'signon-buttons');
  const helpBtn = el('button', 'btn', 'Help');
  helpBtn.addEventListener('click', () => classicAlert('Help',
    'Welcome to AOL Instant Messenger!\n\nEnter any screen name and password to create an account instantly, then sign on. Open this page in another browser window with a different screen name to chat with yourself — or just IM SmarterChild.'));
  const setupBtn = el('button', 'btn', 'Setup');
  setupBtn.addEventListener('click', () => {
    WM.popupMenu(setupBtn.getBoundingClientRect().left, setupBtn.getBoundingClientRect().top - 8, [
      { label: (SND.enabled ? '✓ ' : '') + 'Sounds', action: () => { prefs.sounds = !prefs.sounds; SND.setEnabled(prefs.sounds); savePrefs(); } },
      { label: 'Clear saved screen names', action: () => { prefs.names = []; prefs.passwords = {}; savePrefs(); dl.innerHTML = ''; } }
    ]);
  });
  const signBtn = el('button', 'btn default', 'Sign On');
  btns.appendChild(helpBtn);
  btns.appendChild(setupBtn);
  btns.appendChild(signBtn);
  body.appendChild(btns);
  body.appendChild(el('div', 'signon-version', 'Version: 5.2.3292'));

  win.body.appendChild(body);

  function doSignon() {
    SND.unlock();
    const screenName = snInput.value.trim();
    const password = pwInput.value;
    errDiv.style.display = 'none';
    if (!screenName || !password) {
      errDiv.textContent = 'You must enter a screen name and password.';
      errDiv.style.display = 'block';
      SND.error();
      return;
    }
    form.style.display = 'none';
    btns.style.display = 'none';
    errDiv.style.display = 'none';
    connWrap.style.display = 'block';
    win.setTitle('Sign On — ' + screenName);

    const steps = [
      ['Connecting...', 20],
      ['Verifying name and password...', 55],
      ['Starting services...', 85]
    ];
    let i = 0;
    connStatus.textContent = steps[0][0];
    fill.style.width = steps[0][1] + '%';
    const stepTimer = setInterval(() => {
      i++;
      if (i < steps.length) {
        connStatus.textContent = steps[i][0];
        fill.style.width = steps[i][1] + '%';
      }
    }, 450);

    socket.connect();
    const finish = () => new Promise(r => setTimeout(r, 1100));
    socket.once('connect', () => {
      socket.emit('signon', { screenName, password }, async (res) => {
        clearInterval(stepTimer);
        if (res.error) {
          socket.disconnect();
          connWrap.style.display = 'none';
          form.style.display = '';
          btns.style.display = '';
          errDiv.textContent = res.error;
          errDiv.style.display = 'block';
          win.setTitle('Sign On');
          SND.error();
          return;
        }
        fill.style.width = '100%';
        connStatus.textContent = 'Done.';
        // remember screen name / password prefs
        prefs.lastName = res.screenName;
        if (!prefs.names.includes(res.screenName)) prefs.names.unshift(res.screenName);
        prefs.names = prefs.names.slice(0, 8);
        prefs.savePassword = savePwCb.checked;
        prefs.autoLogin = autoCb.checked && savePwCb.checked;
        if (savePwCb.checked) prefs.passwords[norm(res.screenName)] = password;
        else delete prefs.passwords[norm(res.screenName)];
        savePrefs();
        await finish();
        onSignedOn(res);
        win.close();
      });
    });
  }

  signBtn.addEventListener('click', doSignon);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSignon(); });
  snInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pwInput.focus(); });
  snInput.focus();
  return win;
}

/* =====================================================================
   Signed-on lifecycle
   ===================================================================== */

function onSignedOn(res) {
  state.signedOn = true;
  state.screenName = res.screenName;
  state.buddies = res.buddies || {};
  state.blocked = res.blocked || [];
  state.profile = res.profile || '';
  state.warning = res.warning || 0;
  state.awayMessage = null;
  state.signonAt = Date.now();
  state.presence.clear();
  for (const p of res.online || []) state.presence.set(norm(p.screenName), p);
  document.getElementById('tray-aim').style.display = '';
  SND.doorOpen();
  showBuddyList();
  startIdleWatch();
}

function signOff() {
  if (!state.signedOn) return;
  state.signedOn = false;
  socket.disconnect();
  SND.doorSlam();
  for (const w of [...imWindows.values()]) w.win.close();
  for (const w of [...chatWindows.values()]) w.win.close();
  imWindows.clear();
  chatWindows.clear();
  if (buddyListWin) { const b = buddyListWin; buddyListWin = null; b.close(); }
  stopIdleWatch();
  document.getElementById('tray-aim').style.display = 'none';
  showSignon();
}

socket.on('booted', () => {
  state.signedOn = false;
  for (const w of [...imWindows.values()]) w.win.close();
  for (const w of [...chatWindows.values()]) w.win.close();
  imWindows.clear();
  chatWindows.clear();
  if (buddyListWin) { const b = buddyListWin; buddyListWin = null; b.close(); }
  stopIdleWatch();
  classicAlert('Connection Lost',
    'You have been disconnected because you signed on from another location.',
    () => showSignon());
});

socket.on('disconnect', () => {
  if (!state.signedOn) return;
  state.signedOn = false;
  classicAlert('Connection Lost', 'Your connection to the AIM service has been lost. Please sign on again.', () => {
    for (const w of [...imWindows.values()]) w.win.close();
    for (const w of [...chatWindows.values()]) w.win.close();
    imWindows.clear();
    chatWindows.clear();
    if (buddyListWin) { const b = buddyListWin; buddyListWin = null; b.close(); }
    stopIdleWatch();
    showSignon();
  });
});

/* =====================================================================
   Buddy list window
   ===================================================================== */

const BANNER_ADS = [
  ['AOL 9.0 Optimized', 'So easy to use, no wonder it’s #1'],
  ['FREE for 1000 Hours!', 'Try AOL today — CD shipped to your door'],
  ['You’ve Got Pictures℠', 'Share photos with friends & family'],
  ['Upgrade to AIM 5.2', 'Now with Buddy Icons and File Transfer!'],
  ['AOL Search', 'Find it fast on the World Wide Web']
];

function showBuddyList() {
  const win = WM.create({
    title: state.screenName + "'s Buddy List",
    width: 190, height: 420, icon: 'img/aim.svg',
    x: WM.desktop.clientWidth - 230, y: 30,
    onClose: () => {
      if (buddyListWin) {  // closed via X — sign off like the real thing asked to
        buddyListWin = null;
        signOff();
      }
    }
  });
  buddyListWin = win;

  /* menubar */
  const mbar = el('div', 'menubar');
  const mMyAim = el('span', null, 'My AIM');
  const mPeople = el('span', null, 'People');
  const mHelp = el('span', null, 'Help');
  mbar.appendChild(mMyAim); mbar.appendChild(mPeople); mbar.appendChild(mHelp);
  win.body.appendChild(mbar);

  mMyAim.addEventListener('click', () => {
    const r = mMyAim.getBoundingClientRect();
    WM.popupMenu(r.left, r.bottom, [
      state.awayMessage
        ? { label: "I'm Back", action: () => setAway(null) }
        : { label: 'Away Message...', action: showAwayDialog },
      'sep',
      { label: 'Edit Profile...', action: showEditProfile },
      { label: 'Sounds', checked: SND.enabled, action: () => { prefs.sounds = !prefs.sounds; SND.setEnabled(prefs.sounds); savePrefs(); } },
      { label: 'Show Timestamps', checked: prefs.timestamps, action: () => { prefs.timestamps = !prefs.timestamps; savePrefs(); } },
      'sep',
      { label: 'Sign Off', action: signOff }
    ], mMyAim);
  });

  mPeople.addEventListener('click', () => {
    const r = mPeople.getBoundingClientRect();
    WM.popupMenu(r.left, r.bottom, [
      { label: 'Send Instant Message...', action: () => classicPrompt('Send Instant Message', 'Enter the screen name of the person you want to IM:', '', (n) => { if (n) openIM(n); }) },
      { label: 'Buddy Chat...', action: promptJoinChat },
      { label: 'Get Buddy Info...', action: () => classicPrompt('Get Buddy Info', 'Enter a screen name:', '', (n) => { if (n) showGetInfo(n); }) },
      'sep',
      { label: 'Block...', action: () => classicPrompt('Block', 'Enter the screen name to block:', '', (n) => { if (n) blockUser(n); }) },
      { label: 'Unblock...', action: () => classicPrompt('Unblock', 'Enter the screen name to unblock:', '', (n) => { if (n) { socket.emit('block', { name: n, unblock: true }); state.blocked = state.blocked.filter(b => b !== norm(n)); } }) }
    ], mPeople);
  });

  mHelp.addEventListener('click', () => {
    const r = mHelp.getBoundingClientRect();
    WM.popupMenu(r.left, r.bottom, [
      { label: 'About AOL Instant Messenger...', action: () => classicAlert('About AOL Instant Messenger',
        'AOL Instant Messenger™ (clone)\nVersion: 5.2.3292\n\nA loving recreation of the classic 2000s messenger. Not affiliated with AOL.\n\nIM SmarterChild to say hi!') }
    ], mHelp);
  });

  /* ad banner */
  const banner = el('div', 'bl-banner');
  let adIdx = Math.floor(Math.random() * BANNER_ADS.length);
  function setAd() {
    banner.innerHTML = '';
    const txt = el('div');
    txt.appendChild(el('b', null, BANNER_ADS[adIdx][0]));
    txt.appendChild(el('small', null, BANNER_ADS[adIdx][1]));
    banner.appendChild(txt);
    adIdx = (adIdx + 1) % BANNER_ADS.length;
  }
  setAd();
  win.adTimer = setInterval(setAd, 15000);
  win.body.appendChild(banner);

  /* tabs */
  const tabs = el('div', 'tabs');
  const tabOnline = el('div', 'tab sel', 'Online');
  const tabSetup = el('div', 'tab', 'List Setup');
  tabs.appendChild(tabOnline); tabs.appendChild(tabSetup);
  win.body.appendChild(tabs);

  const panel = el('div', 'tab-panel');
  const tree = el('div', 'bl-tree');
  panel.appendChild(tree);

  const setupBtns = el('div', 'bl-setup-btns');
  const addBuddyBtn = el('button', 'btn', 'Add Buddy');
  const addGroupBtn = el('button', 'btn', 'Add Group');
  const delBtn = el('button', 'btn', 'Delete');
  setupBtns.appendChild(addBuddyBtn); setupBtns.appendChild(addGroupBtn); setupBtns.appendChild(delBtn);
  setupBtns.style.display = 'none';
  panel.appendChild(setupBtns);
  win.body.appendChild(panel);

  let mode = 'online';
  let selected = null; // {type:'buddy'|'group', group, name}

  tabOnline.addEventListener('click', () => {
    mode = 'online'; selected = null;
    tabOnline.classList.add('sel'); tabSetup.classList.remove('sel');
    setupBtns.style.display = 'none';
    renderBuddyTree();
  });
  tabSetup.addEventListener('click', () => {
    mode = 'setup'; selected = null;
    tabSetup.classList.add('sel'); tabOnline.classList.remove('sel');
    setupBtns.style.display = '';
    renderBuddyTree();
  });

  addBuddyBtn.addEventListener('click', () => {
    const group = (selected && selected.group) || Object.keys(state.buddies)[0] || 'Buddies';
    classicPrompt('Add Buddy', 'Enter the screen name of the buddy to add to "' + group + '":', '', (n) => {
      if (!n) return;
      if (!state.buddies[group]) state.buddies[group] = [];
      if (!isBuddy(n)) { state.buddies[group].push(n); syncBuddyList(); }
    });
  });
  addGroupBtn.addEventListener('click', () => {
    classicPrompt('Add Group', 'Enter a name for the new group:', '', (n) => {
      if (n && !state.buddies[n]) { state.buddies[n] = []; syncBuddyList(); }
    });
  });
  delBtn.addEventListener('click', () => {
    if (!selected) return classicAlert('Delete', 'Select a buddy or group to delete first.');
    if (selected.type === 'group') {
      classicConfirm('Delete Group', 'Delete the group "' + selected.group + '" and all buddies in it?', () => {
        delete state.buddies[selected.group];
        selected = null;
        syncBuddyList();
      });
    } else {
      state.buddies[selected.group] = state.buddies[selected.group].filter(b => b !== selected.name);
      selected = null;
      syncBuddyList();
    }
  });

  /* bottom toolbar */
  const toolbar = el('div', 'bl-toolbar');
  function tool(label, icon, action) {
    const b = el('button', 'bl-tool');
    b.appendChild(iconEl(icon));
    b.appendChild(el('span', null, label));
    b.addEventListener('click', action);
    toolbar.appendChild(b);
  }
  tool('IM', 'im', () => {
    if (selected && selected.type === 'buddy') openIM(selected.name);
    else classicPrompt('Send Instant Message', 'Enter the screen name of the person you want to IM:', '', (n) => { if (n) openIM(n); });
  });
  tool('Chat', 'chat', promptJoinChat);
  tool('Info', 'info', () => {
    if (selected && selected.type === 'buddy') showGetInfo(selected.name);
    else classicPrompt('Get Buddy Info', 'Enter a screen name:', '', (n) => { if (n) showGetInfo(n); });
  });
  tool('Setup', 'setup', () => tabSetup.click());
  win.body.appendChild(toolbar);

  const status = el('div', 'bl-status');
  win.body.appendChild(status);

  /* tree renderer (stored on win so presence handlers can call it) */
  win.renderTree = () => {
    tree.innerHTML = '';
    const groups = Object.keys(state.buddies);

    function buddyRow(name, group) {
      const p = presenceOf(name);
      const isOnline = !!p && p.status !== 'offline';
      const row = el('div', 'bl-buddy' +
        (p && p.status === 'away' ? ' away' : '') +
        (!isOnline ? ' offline' : ''));
      if (p && p.status === 'away') {
        const ic = el('span', 'bicon');
        ic.innerHTML = ICONS.note;
        row.appendChild(ic);
      } else if (isOnline) {
        const ic = el('span', 'bicon');
        ic.innerHTML = ICONS.man;
        row.appendChild(ic);
      }
      row.appendChild(el('span', 'bname', (p && p.screenName) || name));
      if (p && p.idleMin > 0) row.appendChild(el('span', 'bidle', p.idleMin + 'm'));
      if (selected && selected.type === 'buddy' && selected.name === name && selected.group === group)
        row.classList.add('selected');
      row.addEventListener('click', () => {
        selected = { type: 'buddy', name, group };
        win.renderTree();
      });
      row.addEventListener('dblclick', () => openIM(name));
      return row;
    }

    function groupRow(label, key, count) {
      const g = el('div', 'bl-group');
      const collapsed = !!state.groupCollapsed[key];
      const tw = el('span', 'twisty', collapsed ? '▸' : '▾');
      g.appendChild(tw);
      g.appendChild(document.createTextNode(label + (count != null ? ' (' + count + ')' : '')));
      g.addEventListener('click', () => {
        state.groupCollapsed[key] = !collapsed;
        win.renderTree();
      });
      if (mode === 'setup') {
        g.addEventListener('click', () => { selected = { type: 'group', group: key }; });
        if (selected && selected.type === 'group' && selected.group === key)
          g.style.background = 'var(--sel)', g.style.color = '#fff';
      }
      return { g, collapsed };
    }

    if (mode === 'online') {
      const offline = [];
      let totalOnline = 0, total = 0;
      for (const group of groups) {
        const members = state.buddies[group];
        const onlineMembers = [];
        for (const b of members) {
          const p = presenceOf(b);
          if (p && p.status !== 'offline') onlineMembers.push(b);
          else offline.push(b);
        }
        totalOnline += onlineMembers.length;
        total += members.length;
        const { g, collapsed } = groupRow(group, group, onlineMembers.length + '/' + members.length);
        tree.appendChild(g);
        if (!collapsed) for (const b of onlineMembers) tree.appendChild(buddyRow(b, group));
      }
      const { g, collapsed } = groupRow('Offline', '__offline__', offline.length + '/' + total);
      tree.appendChild(g);
      if (!collapsed) for (const b of offline) tree.appendChild(buddyRow(b, '__offline__'));
    } else {
      for (const group of groups) {
        const { g, collapsed } = groupRow(group, group, state.buddies[group].length);
        tree.appendChild(g);
        if (!collapsed) for (const b of state.buddies[group]) tree.appendChild(buddyRow(b, group));
      }
    }

    status.innerHTML = '';
    if (state.awayMessage) {
      const n = el('span', 'away-note', 'You are away');
      n.title = state.awayMessage;
      status.appendChild(n);
    } else if (state.warning > 0) {
      status.appendChild(el('span', null, 'Warning level: ' + state.warning + '%'));
    } else {
      status.appendChild(el('span', null, 'Online: ' + timeStr(state.signonAt)));
    }
  };

  win.renderTree();

  const origClose = win.onClose;
  win.onClose = () => {
    clearInterval(win.adTimer);
    if (origClose) origClose();
  };
}

function renderBuddyTree() {
  if (buddyListWin && buddyListWin.renderTree) buddyListWin.renderTree();
}

/* =====================================================================
   Presence handling
   ===================================================================== */

socket.on('presence', (p) => {
  const k = norm(p.screenName);
  const prev = state.presence.get(k);
  const wasOnline = prev && prev.status !== 'offline';
  if (p.status === 'offline') state.presence.delete(k);
  else state.presence.set(k, p);

  if (k !== norm(state.screenName) && isBuddy(p.screenName)) {
    if (!wasOnline && p.status !== 'offline') SND.doorOpen();
    if (wasOnline && p.status === 'offline') SND.doorSlam();
  }

  const w = imWindows.get(k);
  if (w) {
    if (p.status === 'offline' && wasOnline)
      addSysMsg(w, p.screenName + ' signed off at ' + timeStr() + '.');
    if (!wasOnline && p.status !== 'offline' && w.sawOffline) {
      addSysMsg(w, p.screenName + ' signed on at ' + timeStr() + '.');
      w.sawOffline = false;
    }
    if (p.status === 'offline') w.sawOffline = true;
  }
  renderBuddyTree();
});

socket.on('warning-level', (data) => {
  const k = norm(data.screenName);
  const p = state.presence.get(k);
  if (p) p.warning = data.warning;
  if (k === norm(state.screenName)) {
    state.warning = data.warning;
    renderBuddyTree();
  }
});

socket.on('warned', (data) => {
  state.warning = data.warning;
  renderBuddyTree();
  classicAlert('Warning', 'You have just been warned' +
    (data.by ? ' by ' + data.by : ' anonymously') +
    '.\nYour warning level is now ' + data.warning + '%.');
});

/* =====================================================================
   Away messages
   ===================================================================== */

const AWAY_PRESETS = [
  'I am away from my computer right now.',
  'brb',
  'Out to lunch. Back in a bit!',
  'Sleeping... zzzzz',
  'Doing homework :-(',
  'On the phone',
  'Gone fishin’'
];

function showAwayDialog() {
  let sel, ta;
  classicDialog('Away Message', (pad) => {
    pad.appendChild(el('div', 'dlg-text', 'Select or type an away message. Buddies who IM you will receive it automatically.'));
    sel = el('select', 'away-presets');
    for (const p of AWAY_PRESETS) sel.appendChild(new Option(p, p));
    pad.appendChild(sel);
    ta = el('textarea', 'away-text');
    ta.value = AWAY_PRESETS[0];
    pad.appendChild(ta);
    sel.addEventListener('change', () => { ta.value = sel.value; });
  }, [
    { label: 'OK', default: true, action: () => setAway(ta.value.trim() || AWAY_PRESETS[0]) },
    { label: 'Cancel' }
  ], { width: 300 });
}

function setAway(message) {
  state.awayMessage = message;
  socket.emit('away', { message });
  renderBuddyTree();
  if (message) {
    // away "note" window like classic AIM
    if (!setAway.win) {
      setAway.win = classicDialog('Away Message', (pad) => {
        pad.appendChild(el('div', 'dlg-text', message));
      }, [{ label: "I'm Back", default: true, action: () => { setAway(null); return false; } }],
      { width: 240, x: 40, y: WM.desktop.clientHeight - 180 });
      const orig = setAway.win.onClose;
      setAway.win.onClose = () => { setAway.win = null; if (orig) orig(); };
    }
  } else if (setAway.win) {
    const w = setAway.win;
    setAway.win = null;
    w.close();
  }
}

/* =====================================================================
   IM windows
   ===================================================================== */

const FONT_CHOICES = ['Times New Roman', 'Arial', 'Courier New', 'Comic Sans MS', 'Verdana', 'Georgia', 'Impact'];
const COLOR_CHOICES = ['#000000', '#7f7f7f', '#ff0000', '#ff7f00', '#ffcc00', '#009900', '#0000ff', '#9900cc',
                       '#ffffff', '#663300', '#990000', '#ff9999', '#999900', '#00cc99', '#000099', '#ff00ff'];
const SIZE_MAP = { small: '11px', normal: '14px', large: '18px', huge: '24px' };

function openIM(buddyName, opts) {
  const k = norm(buddyName);
  if (!k || k === norm(state.screenName)) return null;
  if (imWindows.has(k)) {
    const w = imWindows.get(k);
    if (!opts || !opts.background) w.win.focus();
    return w;
  }

  const p = presenceOf(buddyName);
  const display = (p && p.screenName) || buddyName;
  const w = {
    buddy: display,
    key: k,
    style: { bold: false, italic: false, underline: false, color: '#000000', font: 'Times New Roman', size: 'normal' },
    typingState: 0,
    sawOffline: false
  };

  const win = WM.create({
    title: display + ' - Instant Message',
    width: 400, height: 330, icon: 'img/aim.svg',
    onClose: () => {
      if (w.typingState) socket.emit('typing', { to: display, state: 0 });
      imWindows.delete(k);
    }
  });
  w.win = win;

  const history = el('div', 'im-history');
  win.body.appendChild(history);
  w.history = history;

  /* format toolbar */
  const tb = el('div', 'im-toolbar');
  const fontSel = el('select');
  fontSel.style.width = '110px';
  for (const f of FONT_CHOICES) fontSel.appendChild(new Option(f, f));
  tb.appendChild(fontSel);
  const sizeSel = el('select');
  for (const s of ['small', 'normal', 'large', 'huge']) sizeSel.appendChild(new Option(s, s));
  sizeSel.value = 'normal';
  tb.appendChild(sizeSel);
  tb.appendChild(el('span', 'fmt-sep'));

  function fmtToggle(label, prop, styleAttr) {
    const b = el('button', 'fmt-btn', label);
    b.style.cssText = styleAttr;
    b.addEventListener('click', () => {
      w.style[prop] = !w.style[prop];
      b.classList.toggle('on', w.style[prop]);
      applyInputStyle();
      input.focus();
    });
    tb.appendChild(b);
    return b;
  }
  fmtToggle('B', 'bold', 'font-weight:bold');
  fmtToggle('I', 'italic', 'font-style:italic');
  fmtToggle('U', 'underline', 'text-decoration:underline');
  tb.appendChild(el('span', 'fmt-sep'));

  const colorBtn = el('button', 'fmt-btn');
  colorBtn.title = 'Font color';
  colorBtn.appendChild(el('span', null, 'A'));
  const chip = el('span', 'fmt-color-chip');
  chip.style.background = w.style.color;
  colorBtn.appendChild(document.createElement('br'));
  colorBtn.appendChild(chip);
  colorBtn.style.lineHeight = '8px';
  colorBtn.addEventListener('click', () => {
    const r = colorBtn.getBoundingClientRect();
    const pop = el('div', 'color-pop');
    for (const c of COLOR_CHOICES) {
      const cb = el('button');
      cb.style.background = c;
      cb.addEventListener('click', () => {
        w.style.color = c;
        chip.style.background = c;
        pop.remove();
        applyInputStyle();
        input.focus();
      });
      pop.appendChild(cb);
    }
    document.body.appendChild(pop);
    pop.style.left = r.left + 'px';
    pop.style.top = (r.top - 60) + 'px';
    setTimeout(() => document.addEventListener('mousedown', function h(e) {
      if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', h); }
    }), 0);
  });
  tb.appendChild(colorBtn);

  const smileyBtn = el('button', 'fmt-btn');
  smileyBtn.title = 'Insert smiley';
  smileyBtn.appendChild(iconEl('smiley'));
  smileyBtn.querySelector('svg').style.cssText = 'width:14px;height:14px';
  smileyBtn.addEventListener('click', () => {
    const r = smileyBtn.getBoundingClientRect();
    const pop = el('div', 'smiley-pop');
    for (const [code, type] of [[':-)', 'smile'], [':-(', 'frown'], [';-)', 'wink'], [':-D', 'grin'],
                                [':-P', 'tongue'], [':-O', 'oh'], ['8-)', 'cool'], [":'(", 'cry']]) {
      const b = el('button');
      b.title = code;
      const img = document.createElement('img');
      img.src = smileySVG(type);
      b.appendChild(img);
      b.addEventListener('click', () => {
        input.textContent += (input.textContent && !input.textContent.endsWith(' ') ? ' ' : '') + code + ' ';
        pop.remove();
        input.focus();
        placeCaretAtEnd(input);
      });
      pop.appendChild(b);
    }
    document.body.appendChild(pop);
    pop.style.left = r.left + 'px';
    pop.style.top = (r.top - 64) + 'px';
    setTimeout(() => document.addEventListener('mousedown', function h(e) {
      if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', h); }
    }), 0);
  });
  tb.appendChild(smileyBtn);
  win.body.appendChild(tb);

  /* input */
  const input = el('div', 'im-input');
  input.contentEditable = 'true';
  input.spellcheck = false;
  win.body.appendChild(input);
  w.input = input;

  fontSel.addEventListener('change', () => { w.style.font = fontSel.value; applyInputStyle(); input.focus(); });
  sizeSel.addEventListener('change', () => { w.style.size = sizeSel.value; applyInputStyle(); input.focus(); });

  function applyInputStyle() {
    input.style.fontFamily = w.style.font;
    input.style.fontSize = SIZE_MAP[w.style.size];
    input.style.fontWeight = w.style.bold ? 'bold' : 'normal';
    input.style.fontStyle = w.style.italic ? 'italic' : 'normal';
    input.style.textDecoration = w.style.underline ? 'underline' : 'none';
    input.style.color = w.style.color;
  }
  applyInputStyle();

  /* typing line */
  const typing = el('div', 'im-typing');
  win.body.appendChild(typing);
  w.typingEl = typing;

  /* bottom actions */
  const bottom = el('div', 'im-bottom');
  function action(label, icon, fn) {
    const b = el('button', 'im-action');
    b.appendChild(iconEl(icon));
    b.appendChild(el('span', null, label));
    b.addEventListener('click', fn);
    bottom.appendChild(b);
    return b;
  }
  action('Warn', 'warn', () => {
    classicConfirm('Warn', 'Warn ' + w.buddy + '? Warning a user increases their warning level, which limits how fast they can send messages.', () => {
      socket.emit('warn', { to: w.buddy }, (res) => {
        if (res && res.error) classicAlert('Warn', res.error);
        else if (res) addSysMsg(w, 'You have warned ' + w.buddy + '. Their warning level is now ' + res.warning + '%.', 'im-warn');
      });
    });
  });
  action('Block', 'block', () => {
    classicConfirm('Block', 'Are you sure you want to block ' + w.buddy + '? They will not be able to send you Instant Messages and you will appear offline to them.', () => blockUser(w.buddy));
  });
  action('Add Buddy', 'add', () => {
    if (isBuddy(w.buddy)) return classicAlert('Add Buddy', w.buddy + ' is already on your Buddy List.');
    if (!state.buddies['Buddies']) state.buddies['Buddies'] = [];
    state.buddies['Buddies'].push(w.buddy);
    syncBuddyList();
    addSysMsg(w, w.buddy + ' has been added to your Buddy List.');
  });
  action('Get Info', 'info', () => showGetInfo(w.buddy));
  const sendBtn = action('Send', 'send', doSend);
  sendBtn.classList.add('im-send');
  win.body.appendChild(bottom);

  /* typing notifications out */
  let typingTimer = null;
  input.addEventListener('input', () => {
    const has = input.textContent.trim().length > 0;
    if (has && !w.typingState) {
      w.typingState = 1;
      socket.emit('typing', { to: w.buddy, state: 1 });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      if (w.typingState) {
        w.typingState = 0;
        socket.emit('typing', { to: w.buddy, state: 0 });
      }
    }, 4000);
    if (!has && w.typingState) {
      w.typingState = 0;
      socket.emit('typing', { to: w.buddy, state: 0 });
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  function doSend() {
    const text = input.innerText.replace(/\n+$/, '');
    if (!text.trim()) return;
    socket.emit('im', { to: w.buddy, text, style: w.style });
    addMsg(w, state.screenName, text, w.style, true);
    input.textContent = '';
    if (w.typingState) { w.typingState = 0; socket.emit('typing', { to: w.buddy, state: 0 }); }
    SND.send();
    if (state.awayMessage) setAway(null); // sending a message brings you back
    input.focus();
  }

  win.onFocus = () => setTimeout(() => input.focus(), 0);
  imWindows.set(k, w);
  if (opts && opts.background) win.flash();
  else setTimeout(() => input.focus(), 0);
  return w;
}

function placeCaretAtEnd(elem) {
  const range = document.createRange();
  range.selectNodeContents(elem);
  range.collapse(false);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(range);
}

function addMsg(w, from, text, style, isMe) {
  const div = el('div', 'im-msg');
  const sn = el('span', 'im-sn ' + (isMe ? 'me' : 'them'), from);
  div.appendChild(sn);
  if (prefs.timestamps) div.appendChild(el('span', 'im-ts', ' (' + timeStr() + ')'));
  div.appendChild(document.createTextNode(': '));
  const span = el('span');
  if (style) {
    if (style.bold) span.style.fontWeight = 'bold';
    if (style.italic) span.style.fontStyle = 'italic';
    if (style.underline) span.style.textDecoration = 'underline';
    if (style.color) span.style.color = style.color;
    if (style.font) span.style.fontFamily = style.font;
    if (style.size) span.style.fontSize = SIZE_MAP[style.size] || '14px';
  }
  span.appendChild(renderRich(text));
  div.appendChild(span);
  w.history.appendChild(div);
  w.history.scrollTop = w.history.scrollHeight;
}

function addAutoMsg(w, from, text) {
  const div = el('div', 'im-msg im-auto');
  div.appendChild(el('span', 'im-sn them', 'Auto response from ' + from));
  if (prefs.timestamps) div.appendChild(el('span', 'im-ts', ' (' + timeStr() + ')'));
  div.appendChild(document.createTextNode(': '));
  const span = el('span');
  span.style.fontStyle = 'italic';
  span.appendChild(renderRich(text));
  div.appendChild(span);
  w.history.appendChild(div);
  w.history.scrollTop = w.history.scrollHeight;
}

function addSysMsg(w, text, cls) {
  const div = el('div', 'im-msg ' + (cls || 'im-sys'));
  div.appendChild(document.createTextNode(text));
  w.history.appendChild(div);
  w.history.scrollTop = w.history.scrollHeight;
}

socket.on('im', (msg) => {
  const w = openIM(msg.from, { background: true });
  if (!w) return;
  if (msg.auto) addAutoMsg(w, msg.from, msg.text);
  else {
    addMsg(w, msg.from, msg.text, msg.style, false);
    SND.receive();
  }
  w.win.flash();
});

socket.on('im-error', (data) => {
  const w = imWindows.get(norm(data.to));
  if (w) addSysMsg(w, data.error);
  else classicAlert('Instant Message', data.error);
});

socket.on('typing', (data) => {
  const w = imWindows.get(norm(data.from));
  if (!w) return;
  w.typingEl.textContent = data.state ? data.from + ' is typing...' : '';
});

function blockUser(name) {
  socket.emit('block', { name });
  if (!state.blocked.includes(norm(name))) state.blocked.push(norm(name));
  const w = imWindows.get(norm(name));
  if (w) addSysMsg(w, name + ' has been blocked.');
}

/* =====================================================================
   Get Info / profile
   ===================================================================== */

function showGetInfo(name) {
  socket.emit('getinfo', { name }, (res) => {
    if (res.error) return classicAlert('Buddy Info', res.error);
    classicDialog(res.screenName + ' - Buddy Info', (pad) => {
      const grid = el('div', 'info-grid');
      function row(k, v) {
        grid.appendChild(el('div', 'k', k));
        grid.appendChild(el('div', null, v));
      }
      row('Screen Name:', res.screenName);
      row('Status:', res.online ? (res.awayMessage ? 'Away' : 'Online') : 'Offline');
      row('Warning Level:', (res.warning || 0) + '%');
      if (res.online && res.signonAt) row('Online Since:', new Date(res.signonAt).toLocaleString());
      if (res.idleMin > 0) row('Idle Time:', res.idleMin + ' minutes');
      if (res.memberSince) row('Member Since:', new Date(res.memberSince).toLocaleDateString());
      pad.appendChild(grid);
      if (res.awayMessage) {
        pad.appendChild(el('div', 'k', 'Away Message:'));
        const am = el('div', 'info-profile');
        am.appendChild(renderRich(res.awayMessage));
        pad.appendChild(am);
      }
      pad.appendChild(el('div', 'k', 'Profile:'));
      const prof = el('div', 'info-profile');
      if (res.profile) prof.appendChild(renderRich(res.profile));
      else prof.appendChild(el('i', null, 'No profile information provided.'));
      pad.appendChild(prof);
    }, [{ label: 'OK', default: true }], { width: 310 });
  });
}

function showEditProfile() {
  let ta;
  classicDialog('Edit Profile', (pad) => {
    pad.appendChild(el('div', 'dlg-text', 'Tell the world about yourself. Other users will see this when they Get Info on you.'));
    ta = el('textarea', 'away-text');
    ta.style.height = '110px';
    ta.value = state.profile || '';
    pad.appendChild(ta);
  }, [
    { label: 'Save', default: true, action: () => { state.profile = ta.value; socket.emit('set-profile', { profile: ta.value }); } },
    { label: 'Cancel' }
  ], { width: 320 });
}

/* =====================================================================
   Chat rooms
   ===================================================================== */

function promptJoinChat() {
  classicPrompt('Buddy Chat', 'Enter the name of the chat room to join or create:', 'Chat Room 1', (room) => {
    if (room) joinChat(room);
  });
}

function joinChat(room) {
  if (chatWindows.has(room)) { chatWindows.get(room).win.focus(); return; }
  socket.emit('chat-join', { room }, (res) => {
    if (!res || !res.ok) return;
    const c = { room, style: { color: '#000000', font: 'Arial', size: 'normal' } };
    const win = WM.create({
      title: 'Chat Room: ' + room,
      width: 480, height: 340, icon: 'img/aim.svg',
      onClose: () => {
        socket.emit('chat-leave', { room });
        chatWindows.delete(room);
      }
    });
    c.win = win;

    const main = el('div', 'chat-main');
    const history = el('div', 'im-history chat-history');
    const roster = el('div', 'chat-roster');
    main.appendChild(history);
    main.appendChild(roster);
    win.body.appendChild(main);
    c.history = history;
    c.roster = roster;

    const input = el('div', 'im-input');
    input.contentEditable = 'true';
    input.spellcheck = false;
    win.body.appendChild(input);

    const bottom = el('div', 'im-bottom');
    const sendBtn = el('button', 'im-action im-send');
    sendBtn.appendChild(iconEl('send'));
    sendBtn.appendChild(el('span', null, 'Send'));
    bottom.appendChild(sendBtn);
    win.body.appendChild(bottom);

    function doSend() {
      const text = input.innerText.replace(/\n+$/, '');
      if (!text.trim()) return;
      socket.emit('chat-msg', { room, text, style: c.style });
      input.textContent = '';
      SND.send();
      input.focus();
    }
    sendBtn.addEventListener('click', doSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    c.setRoster = (members) => {
      roster.innerHTML = '';
      roster.appendChild(el('div', 'hd', members.length + ' people here'));
      for (const m of members) {
        const r = el('div', null, m);
        if (norm(m) !== norm(state.screenName)) {
          r.classList.add('link');
          r.style.color = '#000';
          r.addEventListener('dblclick', () => openIM(m));
        }
        roster.appendChild(r);
      }
    };
    c.setRoster(res.members || []);
    addSysMsg(c, 'You have entered "' + room + '".');
    chatWindows.set(room, c);
    win.onFocus = () => setTimeout(() => input.focus(), 0);
    setTimeout(() => input.focus(), 0);
  });
}

socket.on('chat-msg', (msg) => {
  const c = chatWindows.get(msg.room);
  if (!c) return;
  addMsg(c, msg.from, msg.text, msg.style, norm(msg.from) === norm(state.screenName));
  if (norm(msg.from) !== norm(state.screenName)) {
    SND.receive();
    c.win.flash();
  }
});

socket.on('chat-event', (ev) => {
  const c = chatWindows.get(ev.room);
  if (!c) return;
  addSysMsg(c, ev.who + ' has ' + (ev.type === 'join' ? 'entered' : 'left') + ' the room.');
  if (ev.type === 'join') SND.doorOpen(); else SND.doorSlam();
});

socket.on('chat-roster', (data) => {
  const c = chatWindows.get(data.room);
  if (c) c.setRoster(data.members || []);
});

/* =====================================================================
   Idle detection
   ===================================================================== */

let idleTimer = null;
let isIdle = false;
let lastActivity = Date.now();

function activity() {
  lastActivity = Date.now();
  if (isIdle && state.signedOn) {
    isIdle = false;
    socket.emit('idle', { idle: false });
  }
}

function startIdleWatch() {
  document.addEventListener('mousemove', activity);
  document.addEventListener('keydown', activity);
  idleTimer = setInterval(() => {
    if (!state.signedOn) return;
    if (!isIdle && Date.now() - lastActivity > 10 * 60000) {
      isIdle = true;
      socket.emit('idle', { idle: true, minutes: 10 });
    }
  }, 30000);
}

function stopIdleWatch() {
  document.removeEventListener('mousemove', activity);
  document.removeEventListener('keydown', activity);
  clearInterval(idleTimer);
  isIdle = false;
}

/* =====================================================================
   Desktop / start menu wiring
   ===================================================================== */

const aimIcon = document.getElementById('icon-aim');
aimIcon.addEventListener('click', () => aimIcon.classList.add('selected'));
document.addEventListener('mousedown', (e) => {
  if (!aimIcon.contains(e.target)) aimIcon.classList.remove('selected');
});
aimIcon.addEventListener('dblclick', () => {
  if (state.signedOn) { if (buddyListWin) buddyListWin.focus(); }
  else showSignon();
});

document.addEventListener('startmenu-action', (e) => {
  if (e.detail === 'aim') {
    if (state.signedOn) { if (buddyListWin) buddyListWin.focus(); }
    else showSignon();
  } else if (e.detail === 'shutdown') {
    const doShutdown = () => {
      if (state.signedOn) signOff();
      const ov = el('div');
      ov.style.cssText = 'position:fixed;inset:0;background:#000;color:#ffb000;z-index:999999;' +
        'display:flex;align-items:center;justify-content:center;font:bold 22px "Courier New",monospace;text-align:center;cursor:pointer';
      ov.textContent = "It's now safe to turn off your computer.";
      ov.addEventListener('click', () => ov.remove());
      document.body.appendChild(ov);
    };
    if (state.signedOn) classicConfirm('Shut Down', 'This will sign you off AIM. Are you sure?', doShutdown);
    else doShutdown();
  }
});

/* ---------------- boot ---------------- */

window.addEventListener('load', () => {
  showSignon();
});

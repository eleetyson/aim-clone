const { io } = require('socket.io-client');
const URL = 'http://localhost:3000';
let failures = 0;
function ok(cond, label) {
  console.log((cond ? 'PASS' : 'FAIL') + ': ' + label);
  if (!cond) failures++;
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
function emitAck(sock, ev, data) { return new Promise(r => sock.emit(ev, data, r)); }
function once(sock, ev, timeout = 4000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => res(null), timeout);
    sock.once(ev, (d) => { clearTimeout(t); res(d); });
  });
}

(async () => {
  const a = io(URL), b = io(URL);
  const ra = await emitAck(a, 'signon', { screenName: 'TestUserA', password: 'pw1' });
  ok(ra.ok && ra.screenName === 'TestUserA', 'A signs on');
  ok(ra.buddies && ra.buddies.Buddies.includes('SmarterChild'), 'default buddy list has SmarterChild');

  const rbad = await emitAck(io(URL), 'signon', { screenName: 'TestUserA', password: 'WRONG' });
  ok(rbad.error && /password/i.test(rbad.error), 'wrong password rejected');

  const presenceP = once(a, 'presence');
  const rb = await emitAck(b, 'signon', { screenName: 'Test UserB', password: 'pw2' });
  ok(rb.ok, 'B signs on (name with space)');
  const pres = await presenceP;
  ok(pres && pres.screenName === 'Test UserB' && pres.status === 'online', 'A receives presence for B');

  // IM A -> B (normalized name routing)
  const imP = once(b, 'im');
  a.emit('im', { to: 'testuserb', text: 'hey :-)', style: { bold: true, color: '#ff0000' } });
  const im = await imP;
  ok(im && im.from === 'TestUserA' && im.text === 'hey :-)' && im.style.bold && im.style.color === '#ff0000', 'B receives styled IM');

  // typing relay
  const tP = once(b, 'typing');
  a.emit('typing', { to: 'Test UserB', state: 1 });
  const t = await tP;
  ok(t && t.from === 'TestUserA' && t.state === 1, 'typing notification relayed');

  // away auto-response
  b.emit('away', { message: 'gone fishin' });
  await wait(100);
  const autoP = once(a, 'im');
  a.emit('im', { to: 'Test UserB', text: 'you there?' });
  const auto = await autoP;
  ok(auto && auto.auto && auto.text === 'gone fishin', 'away auto-response received');
  b.emit('away', { message: null });

  // warn: B can warn A (A sent B an IM)
  const warnedP = once(a, 'warned');
  const wres = await emitAck(b, 'warn', { to: 'TestUserA' });
  ok(wres.ok && wres.warning === 10, 'warn succeeds, level 10%');
  const warned = await warnedP;
  ok(warned && warned.by === 'Test UserB', 'A notified of warning');
  const wres2 = await emitAck(b, 'warn', { to: 'TestUserA' });
  ok(wres2.error != null, 'second warn without new IM rejected');

  // block: B blocks A; A's IM is rejected as "not signed on"
  b.emit('block', { name: 'TestUserA' });
  await wait(100);
  const errP = once(a, 'im-error');
  a.emit('im', { to: 'Test UserB', text: 'blocked?' });
  const err = await errP;
  ok(err && /not signed on/.test(err.error), 'blocked sender told target is offline');
  b.emit('block', { name: 'TestUserA', unblock: true });

  // SmarterChild
  const botP = once(a, 'im', 5000);
  a.emit('im', { to: 'SmarterChild', text: 'hello' });
  const bot = await botP;
  ok(bot && bot.from === 'SmarterChild' && bot.text.length > 0, 'SmarterChild replies: ' + (bot && JSON.stringify(bot.text)));
  const mathP = once(a, 'im', 5000);
  a.emit('im', { to: 'SmarterChild', text: 'what is 6 * 7' });
  const math = await mathP;
  ok(math && /42/.test(math.text), 'SmarterChild does math: ' + (math && JSON.stringify(math.text)));

  // getinfo
  const info = await emitAck(a, 'getinfo', { name: 'test userb' });
  ok(info.screenName === 'Test UserB' && info.online === true, 'getinfo works');

  // chat rooms
  const ja = await emitAck(a, 'chat-join', { room: 'TestRoom' });
  ok(ja.ok && ja.members.includes('TestUserA'), 'A joins chat room');
  const evP = once(a, 'chat-event');
  const jb = await emitAck(b, 'chat-join', { room: 'TestRoom' });
  ok(jb.members.length === 2, 'B joins, roster has 2');
  const ev = await evP;
  ok(ev && ev.type === 'join' && ev.who === 'Test UserB', 'A sees join event');
  const cmP = once(a, 'chat-msg');
  b.emit('chat-msg', { room: 'TestRoom', text: 'hi room' });
  const cm = await cmP;
  ok(cm && cm.from === 'Test UserB' && cm.text === 'hi room', 'chat message broadcast');

  // buddy list save + offline presence on disconnect
  a.emit('buddylist', { buddies: { Buddies: ['SmarterChild', 'Test UserB'], Family: [] } });
  await wait(200);
  const offP = once(a, 'presence');
  b.disconnect();
  const off = await offP;
  ok(off && off.screenName === 'Test UserB' && off.status === 'offline', 'offline presence broadcast');

  // boot on duplicate signon
  const bootP = once(a, 'booted');
  const a2 = io(URL);
  const ra2 = await emitAck(a2, 'signon', { screenName: 'testusera', password: 'pw1' });
  ok(ra2.ok, 'duplicate signon accepted (case-insensitive)');
  ok(ra2.buddies.Buddies.includes('Test UserB'), 'buddy list persisted');
  const boot = await bootP;
  ok(boot !== null || !a.connected, 'old session booted');

  a.disconnect(); a2.disconnect();
  console.log(failures === 0 ? '\nALL TESTS PASSED' : '\n' + failures + ' FAILURES');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

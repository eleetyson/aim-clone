# AOL Instant Messenger (clone)

A loving, full-stack recreation of **AOL Instant Messenger** circa 2002 (AIM 5.x on
Windows Classic), right down to the running man, the door creak, and SmarterChild.

![Version](https://img.shields.io/badge/version-5.2.3292-ffd200)

## Running it

```bash
npm install
npm start
# open http://localhost:3000
```

Open the page in **two browser windows** (or send the URL to a friend on your
network), sign on with two different screen names, and IM away. Or just message
**SmarterChild** — he's always online.

Sign-on is instant: typing any new screen name + password registers the account
(names are 3–16 characters, starting with a letter — just like the real thing).

## What's recreated

**Sign On**
- The classic sign-on window: running man logo, Screen Name™/Password fields,
  *Save password* / *Auto-login*, "Get a Screen Name", the staged
  "Connecting... / Verifying name and password..." progress bar, and
  *Version: 5.2.3292*.

**Buddy List**
- `<ScreenName>'s Buddy List` window with **My AIM / People / Help** menus,
  a rotating retro AOL banner ad, **Online / List Setup** tabs, and the
  Buddies / Family / Co-Workers / Offline groups with `(online/total)` counts.
- Door-open creak when a buddy signs on, door slam when they sign off.
- Away buddies show the yellow note icon in gray italics; idle time shown.
- IM / Chat / Info / Setup toolbar.

**Instant Messages**
- Classic IM windows: your screen name in blue, theirs in red, timestamps,
  Times New Roman, the formatting toolbar (font, size, **B** *I* <u>U</u>,
  color picker, smiley picker), and Warn / Block / Add Buddy / Get Info / Send.
- Typing notifications ("so-and-so is typing...").
- Text emoticons (`:-)`, `;-)`, `:-P`...) render as classic yellow smileys.
- The message "ding" on receive and the little whip on send.

**Away Messages**
- Preset or custom away messages ("I am away from my computer right now."),
  the floating away-note window with the **I'm Back** button, and automatic
  away replies sent to anyone who IMs you (rate-limited, like the original).

**Warnings & Blocking**
- Warn users who IM you (+10%, or less anonymously); warning levels decay
  1%/minute and show up in Get Info. Blocked users are told you're offline.

**Buddy Chat**
- Create/join chat rooms with a member roster, join/leave door sounds, and
  double-click a member to IM them.

**SmarterChild**
- Everyone's favorite bot is on every buddy list. Ask him about the weather,
  the time, movies, music, jokes, or math. He types before he answers.

**The desktop**
- Windows Classic chrome: gradient title bars, beveled everything, draggable
  windows, a taskbar with flashing buttons for unread IMs, a Start menu, and
  a system tray clock. Shut Down does what you'd hope.

## The sounds

The audio (door creak, door slam, receive ding, send whip) is **synthesized at
runtime with the Web Audio API** as an homage to the original sounds — no
copyrighted AOL audio files are included.

## Tech

- **Server:** Node.js, Express, Socket.IO. Accounts/buddy lists persist to
  `data.json`. Presence, IM routing, away auto-replies, warning decay, chat
  rooms, and SmarterChild all live in `server.js`.
- **Client:** zero-dependency vanilla JS — a tiny window manager (`wm.js`),
  procedural sounds (`sounds.js`), and the app (`app.js`). All icons and
  smileys are inline SVG.
- **Tests:** `node test-e2e.js` (with the server running) exercises sign-on,
  auth, IMs, styles, typing, away replies, warnings, blocking, chat rooms,
  persistence, and duplicate-session booting.

*This is a fan recreation for nostalgia and education. Not affiliated with or
endorsed by AOL/Yahoo. "AOL Instant Messenger", "AIM" and "SmarterChild" are
trademarks of their respective owners.*

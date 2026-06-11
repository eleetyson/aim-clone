'use strict';
/* Minimal Windows-Classic window manager: drag, focus/z-order, minimize
   to taskbar, title flashing, popup menus, clock & start menu. */
const WM = (() => {
  const desktop = document.getElementById('desktop');
  const taskbuttons = document.getElementById('taskbuttons');
  let zTop = 100;
  let activeWin = null;
  const wins = new Set();

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function create(opts) {
    const win = {
      id: opts.id || ('w' + Math.random().toString(36).slice(2)),
      onClose: opts.onClose || null,
      onFocus: opts.onFocus || null,
      minimized: false
    };
    const root = el('div', 'win');
    root.style.width = (opts.width || 300) + 'px';
    if (opts.height) root.style.height = opts.height + 'px';
    const dw = desktop.clientWidth, dh = desktop.clientHeight;
    root.style.left = Math.max(0, opts.x != null ? opts.x : Math.round(dw / 2 - (opts.width || 300) / 2 + (Math.random() * 60 - 30))) + 'px';
    root.style.top = Math.max(0, opts.y != null ? opts.y : Math.round(dh / 3 - 80 + (Math.random() * 60 - 30))) + 'px';

    const tb = el('div', 'titlebar');
    const icon = document.createElement('img');
    icon.src = opts.icon || 'img/aim.svg';
    icon.className = 'ticon';
    icon.alt = '';
    const ttext = el('span', 'ttext', opts.title || '');
    tb.appendChild(icon);
    tb.appendChild(ttext);
    if (opts.minimizable !== false) {
      const mb = el('button', 'title-btn tb-min');
      mb.title = 'Minimize';
      mb.addEventListener('click', (e) => { e.stopPropagation(); minimize(win); });
      tb.appendChild(mb);
    }
    if (opts.closable !== false) {
      const cb = el('button', 'title-btn tb-close');
      cb.title = 'Close';
      cb.addEventListener('click', (e) => { e.stopPropagation(); close(win); });
      tb.appendChild(cb);
    }
    const body = el('div', 'win-body');

    root.appendChild(tb);
    root.appendChild(body);
    desktop.appendChild(root);

    win.el = root; win.body = body; win.titlebar = tb; win.ttext = ttext;
    win.icon = opts.icon || 'img/aim.svg';

    // dragging
    tb.addEventListener('mousedown', (e) => {
      if (e.target.closest('.title-btn')) return;
      focus(win);
      const startX = e.clientX, startY = e.clientY;
      const ox = root.offsetLeft, oy = root.offsetTop;
      function move(ev) {
        root.style.left = Math.min(Math.max(ox + ev.clientX - startX, -root.offsetWidth + 60), desktop.clientWidth - 30) + 'px';
        root.style.top = Math.min(Math.max(oy + ev.clientY - startY, 0), desktop.clientHeight - 20) + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    });

    root.addEventListener('mousedown', () => focus(win));

    // taskbar button
    if (opts.taskbar !== false) {
      const btn = el('button', 'taskbtn');
      const bimg = document.createElement('img');
      bimg.src = win.icon; bimg.alt = '';
      btn.appendChild(bimg);
      btn.appendChild(el('span', null, opts.title || ''));
      btn.addEventListener('click', () => {
        if (win.minimized) restore(win);
        else if (activeWin === win) minimize(win);
        else focus(win);
      });
      taskbuttons.appendChild(btn);
      win.taskbtn = btn;
    }

    win.setTitle = (t) => {
      ttext.textContent = t;
      if (win.taskbtn) win.taskbtn.querySelector('span').textContent = t;
    };
    win.close = () => close(win);
    win.focus = () => focus(win);
    win.minimize = () => minimize(win);
    win.restore = () => restore(win);
    win.flash = () => {
      if (activeWin === win && !win.minimized) return;
      win.el.classList.add('flashing');
      if (win.taskbtn) win.taskbtn.classList.add('flashing');
    };

    wins.add(win);
    focus(win);
    return win;
  }

  function focus(win) {
    if (!wins.has(win)) return;
    if (win.minimized) { restore(win); return; }
    if (activeWin && activeWin !== win) {
      activeWin.el.classList.remove('active');
      if (activeWin.taskbtn) activeWin.taskbtn.classList.remove('active');
    }
    activeWin = win;
    win.el.classList.add('active');
    win.el.classList.remove('flashing');
    win.el.style.zIndex = ++zTop;
    if (win.taskbtn) {
      win.taskbtn.classList.add('active');
      win.taskbtn.classList.remove('flashing');
    }
    if (win.onFocus) win.onFocus();
  }

  function minimize(win) {
    win.minimized = true;
    win.el.style.display = 'none';
    win.el.classList.remove('active');
    if (win.taskbtn) win.taskbtn.classList.remove('active');
    if (activeWin === win) activeWin = null;
  }

  function restore(win) {
    win.minimized = false;
    win.el.style.display = '';
    focus(win);
  }

  function close(win) {
    if (!wins.has(win)) return;
    wins.delete(win);
    if (win.onClose) win.onClose();
    win.el.remove();
    if (win.taskbtn) win.taskbtn.remove();
    if (activeWin === win) activeWin = null;
  }

  /* ---------- popup menus ---------- */

  let openPopup = null;
  function closePopup() {
    if (openPopup) {
      if (openPopup.anchor) openPopup.anchor.classList.remove('open');
      openPopup.el.remove();
      openPopup = null;
    }
  }
  document.addEventListener('mousedown', (e) => {
    if (openPopup && !openPopup.el.contains(e.target) && e.target !== openPopup.anchor) closePopup();
    const sm = document.getElementById('startmenu');
    if (sm.style.display !== 'none' && !sm.contains(e.target) && !e.target.closest('#startbtn')) {
      sm.style.display = 'none';
      document.getElementById('startbtn').classList.remove('open');
    }
  });

  // items: [{label, action, checked, disabled} | 'sep']
  function popupMenu(x, y, items, anchor) {
    closePopup();
    const pop = el('div', 'menu-popup');
    for (const it of items) {
      if (it === 'sep') { pop.appendChild(el('div', 'menu-sep')); continue; }
      const mi = el('div', 'menu-item' + (it.disabled ? ' disabled' : ''));
      if (it.checked) mi.appendChild(el('span', 'check', '✓'));
      mi.appendChild(document.createTextNode(it.label));
      if (!it.disabled && it.action) {
        mi.addEventListener('mouseup', () => { closePopup(); it.action(); });
      }
      pop.appendChild(mi);
    }
    document.body.appendChild(pop);
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.min(x, window.innerWidth - r.width - 4) + 'px';
    pop.style.top = (y + r.height > window.innerHeight - 30 ? y - r.height : y) + 'px';
    if (anchor) anchor.classList.add('open');
    openPopup = { el: pop, anchor };
    return pop;
  }

  /* ---------- clock & start menu ---------- */

  function tickClock() {
    const d = new Date();
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    document.getElementById('clock').textContent =
      h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
  }
  tickClock();
  setInterval(tickClock, 5000);

  const startbtn = document.getElementById('startbtn');
  const startmenu = document.getElementById('startmenu');
  startbtn.addEventListener('click', () => {
    const open = startmenu.style.display !== 'none';
    startmenu.style.display = open ? 'none' : 'flex';
    startbtn.classList.toggle('open', !open);
  });
  startmenu.addEventListener('click', (e) => {
    const item = e.target.closest('.startmenu-item');
    if (!item) return;
    startmenu.style.display = 'none';
    startbtn.classList.remove('open');
    document.dispatchEvent(new CustomEvent('startmenu-action', { detail: item.dataset.action }));
  });

  return { create, focus, close, popupMenu, closePopup, get active() { return activeWin; }, desktop };
})();

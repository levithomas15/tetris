/*
 * ui.js — Menüs, Shop, Optionen, Statistik, Erfolge, Toasts, HUD.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};
  var Save = T.Save;

  var MODES = [
    { id: 'marathon', name: 'Marathon', desc: 'Endlos — Level steigen alle 10 Reihen', icon: '🏃' },
    { id: 'sprint', name: 'Sprint 40', desc: '40 Reihen so schnell wie möglich', icon: '⚡' },
    { id: 'ultra', name: 'Ultra 2:00', desc: 'Maximale Punkte in 2 Minuten', icon: '⏱️' },
    { id: 'zen', name: 'Zen', desc: 'Ohne Levelanstieg, einfach spielen', icon: '🧘' },
    { id: 'cheese', name: 'Käse', desc: '9 Müllreihen wegräumen', icon: '🧀' },
    { id: 'daily', name: 'Tages-Challenge', desc: 'Jeden Tag dieselbe Steinfolge', icon: '📅' }
  ];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  function fmtTime(ms) {
    if (ms == null) { return '–'; }
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    var cs = Math.floor((ms % 1000) / 10);
    return m + ':' + String(s % 60).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
  }
  function fmtClock(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtNum(n) { return Math.round(n).toLocaleString('de-DE'); }

  function UI(save, audio, game) {
    this.save = save;
    this.audio = audio;
    this.game = game;
    this.current = null;
    this.shopTab = 'skins';
    this.overlay = $('overlay');
    this.bind();
    this.applyShell();
  }

  UI.MODES = MODES;
  UI.fmtTime = fmtTime;

  UI.prototype.bind = function () {
    var self = this;
    document.addEventListener('click', function (e) {
      var viewBtn = e.target.closest('[data-view]');
      if (viewBtn) {
        self.audio.play('ui');
        self.show(viewBtn.getAttribute('data-view'));
        return;
      }
      var actBtn = e.target.closest('[data-view-action]');
      if (actBtn) {
        self.audio.play('ui');
        var act = actBtn.getAttribute('data-view-action');
        if (self.game[act]) { self.game[act](); }
        return;
      }
      var tab = e.target.closest('.tab');
      if (tab && tab.parentElement.id === 'shopTabs') {
        self.audio.play('ui');
        self.shopTab = tab.getAttribute('data-tab');
        Array.prototype.forEach.call(tab.parentElement.children, function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        self.renderShop();
      }
    });
  };

  /* ---------------- Ansichten ---------------- */

  UI.prototype.show = function (name) {
    this.overlay.classList.remove('hidden');
    Array.prototype.forEach.call(this.overlay.querySelectorAll('.view'), function (v) { v.classList.add('hidden'); });
    var view = $('view-' + name);
    if (view) { view.classList.remove('hidden'); }
    this.current = name;
    if (name === 'shop') { this.renderShop(); }
    if (name === 'settings') { this.renderSettings(); }
    if (name === 'stats') { this.renderStats(); }
    if (name === 'achievements') { this.renderAchievements(); }
    if (name === 'modes') { this.renderModes(); }
    if (name === 'menu') { this.renderMenu(); }
    if (this.game.onViewChange) { this.game.onViewChange(name); }
  };

  UI.prototype.hide = function () {
    this.overlay.classList.add('hidden');
    this.current = null;
    if (this.game.onViewChange) { this.game.onViewChange(null); }
  };

  UI.prototype.renderMenu = function () {
    var d = this.save.data;
    $('menuCoins').textContent = fmtNum(d.coins);
    var streak = d.streak || 0;
    $('menuStreak').textContent = streak + (streak === 1 ? ' Tag' : ' Tage');
    var p = this.save.achievementProgress();
    $('achPill').textContent = p.done + '/' + p.total;
    var mode = MODES.filter(function (m) { return m.id === this.game.mode; }, this)[0] || MODES[0];
    $('menuMode').textContent = 'Modus: ' + mode.name;
  };

  UI.prototype.renderModes = function () {
    var list = $('modeList');
    var self = this;
    list.innerHTML = '';
    MODES.forEach(function (m) {
      var best = self.bestText(m.id);
      var item = el('div', 'item' + (self.game.mode === m.id ? ' equipped' : ''));
      item.appendChild(el('div', 'item-icon', m.icon));
      var body = el('div', 'item-body');
      body.appendChild(el('div', 'item-name', m.name));
      body.appendChild(el('div', 'item-desc', m.desc + (best ? ' · ' + best : '')));
      item.appendChild(body);
      var btn = el('button', 'btn item-action' + (self.game.mode === m.id ? ' on' : ' equip'), self.game.mode === m.id ? '✓ aktiv' : 'wählen');
      btn.addEventListener('click', function () {
        self.audio.play('ui');
        self.game.setMode(m.id);
        self.renderModes();
      });
      item.appendChild(btn);
      list.appendChild(item);
    });
  };

  UI.prototype.bestText = function (mode) {
    var b = this.save.data.best;
    if (mode === 'sprint') { return b.sprint ? 'Best: ' + fmtTime(b.sprint) : ''; }
    if (mode === 'daily') {
      var t = this.save.today();
      return b.daily && b.daily[t] ? 'Heute: ' + fmtNum(b.daily[t]) : '';
    }
    if (mode === 'cheese') { return b.cheese ? 'Best: ' + fmtTime(b.cheese) : ''; }
    return b[mode] ? 'Best: ' + fmtNum(b[mode]) : '';
  };

  /* ---------------- Shop ---------------- */

  UI.prototype.renderShop = function () {
    $('shopCoins').textContent = fmtNum(this.save.data.coins);
    var list = $('shopList');
    list.innerHTML = '';
    var tab = this.shopTab;
    if (tab === 'skins') { this.renderCatalog(list, Save.SKINS, 'skins'); }
    else if (tab === 'shells') { this.renderCatalog(list, Save.SHELLS, 'shells'); }
    else if (tab === 'music') { this.renderCatalog(list, Save.MUSIC, 'music'); }
    else if (tab === 'powerups') { this.renderPowerups(list); }
    else if (tab === 'upgrades') { this.renderUpgrades(list); }
  };

  UI.prototype.swatch = function (item, cat) {
    var sw = el('div', 'item-swatch');
    var colors = cat === 'skins' ? item.colors.slice(0, 8)
      : cat === 'shells' ? [item.body, item.body2, item.accent, item.body, item.accent, item.body2, item.body, item.accent]
        : ['#3aa7ff', '#b45cff', '#ffd400', '#33d17a', '#ff4d4d', '#3aa7ff', '#b45cff', '#ffd400'];
    for (var i = 0; i < 8; i++) {
      var c = el('i');
      c.style.background = colors[i % colors.length];
      sw.appendChild(c);
    }
    return sw;
  };

  UI.prototype.renderCatalog = function (list, catalog, cat) {
    var self = this;
    var equippedKey = { skins: 'skin', shells: 'shell', music: 'music' }[cat];
    catalog.forEach(function (item) {
      var owned = self.save.owns(cat, item.id);
      var equipped = self.save.data.equipped[equippedKey] === item.id;
      var row = el('div', 'item' + (equipped ? ' equipped' : owned ? ' owned' : ' locked'));
      if (cat === 'music') { row.appendChild(el('div', 'item-icon', '🎵')); }
      else { row.appendChild(self.swatch(item, cat)); }
      var body = el('div', 'item-body');
      body.appendChild(el('div', 'item-name', item.name));
      body.appendChild(el('div', 'item-desc', item.desc || ('Gehäuse in ' + item.name)));
      row.appendChild(body);

      var btn = el('button', 'btn item-action');
      if (equipped) { btn.className += ' on'; btn.textContent = '✓ aktiv'; btn.disabled = true; }
      else if (owned) { btn.className += ' equip'; btn.textContent = 'nutzen'; }
      else { btn.className += ' buy'; btn.textContent = '🪙 ' + item.price; }

      btn.addEventListener('click', function () {
        if (owned) {
          self.save.equip(cat, item.id);
          self.audio.play('ui');
          if (cat === 'music') { self.audio.setTrack(item.id); }
          self.applyShell();
          self.toast('„' + item.name + '“ ausgerüstet');
        } else {
          var res = self.save.buy(cat, item.id);
          if (res.ok) {
            self.audio.play('buy');
            self.save.equip(cat, item.id);
            if (cat === 'music') { self.audio.setTrack(item.id); }
            self.applyShell();
            self.toast('Gekauft: ' + item.name, 'gold');
            self.checkAchievements();
          } else {
            self.audio.play('deny');
            self.toast(res.reason === 'poor' ? 'Zu wenig Münzen!' : 'Nicht möglich');
          }
        }
        self.renderShop();
        if (self.game.onCosmeticChange) { self.game.onCosmeticChange(); }
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
  };

  UI.prototype.renderPowerups = function (list) {
    var self = this;
    var inv = this.save.data.inventory;
    Save.POWERUPS.forEach(function (p) {
      var row = el('div', 'item');
      row.appendChild(el('div', 'item-icon', p.icon));
      var body = el('div', 'item-body');
      body.appendChild(el('div', 'item-name', p.name + ' × ' + (inv[p.id] || 0)));
      body.appendChild(el('div', 'item-desc', p.desc));
      row.appendChild(body);
      var btn = el('button', 'btn item-action buy', '🪙 ' + p.price);
      btn.addEventListener('click', function () {
        var res = self.save.buyPowerup(p.id, 1);
        if (res.ok) {
          self.audio.play('buy');
          self.toast(p.name + ' gekauft', 'gold');
        } else {
          self.audio.play('deny');
          self.toast('Zu wenig Münzen!');
        }
        self.renderShop();
        if (self.game.renderItems) { self.game.renderItems(); }
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
    var hint = el('div', 'help-row');
    hint.innerHTML = '<b>Tipp</b><span>Items im Spiel über die Leiste oben zünden</span>';
    list.appendChild(hint);
  };

  UI.prototype.renderUpgrades = function (list) {
    var self = this;
    Save.UPGRADES.forEach(function (u) {
      var lvl = self.save.upgradeLevel(u.id);
      var price = self.save.upgradePrice(u.id);
      var row = el('div', 'item' + (lvl > 0 ? ' owned' : ''));
      row.appendChild(el('div', 'item-icon', lvl >= u.max ? '★' : '☆'));
      var body = el('div', 'item-body');
      body.appendChild(el('div', 'item-name', u.name + ' ' + (lvl > 0 ? 'Lv.' + lvl : '')));
      body.appendChild(el('div', 'item-desc', u.desc));
      var bar = el('div', 'bar');
      var fill = el('i');
      fill.style.width = (lvl / u.max * 100) + '%';
      bar.appendChild(fill);
      body.appendChild(bar);
      row.appendChild(body);
      var btn = el('button', 'btn item-action ' + (price == null ? 'on' : 'buy'), price == null ? 'MAX' : '🪙 ' + price);
      if (price == null) { btn.disabled = true; }
      btn.addEventListener('click', function () {
        var res = self.save.buyUpgrade(u.id);
        if (res.ok) {
          self.audio.play('buy');
          self.toast(u.name + ' → Lv.' + res.level, 'gold');
        } else {
          self.audio.play('deny');
          self.toast('Zu wenig Münzen!');
        }
        self.renderShop();
        if (self.game.renderItems) { self.game.renderItems(); }
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
  };

  /* ---------------- Optionen ---------------- */

  UI.prototype.renderSettings = function () {
    var self = this;
    var s = this.save.data.settings;
    var list = $('settingsList');
    list.innerHTML = '';

    function toggle(label, key, onChange) {
      var row = el('div', 'row');
      row.appendChild(el('b', null, label));
      var sw = el('div', 'switch' + (s[key] ? ' on' : ''));
      sw.addEventListener('click', function () {
        s[key] = !s[key];
        sw.classList.toggle('on', s[key]);
        self.save.save();
        self.audio.play('ui');
        if (onChange) { onChange(s[key]); }
      });
      row.appendChild(sw);
      list.appendChild(row);
    }

    function slider(label, key, min, max, step, fmt, onChange) {
      var row = el('div', 'row');
      row.appendChild(el('b', null, label));
      var val = el('span', 'val', fmt(s[key]));
      var inp = document.createElement('input');
      inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = s[key];
      inp.addEventListener('input', function () {
        s[key] = parseFloat(inp.value);
        val.textContent = fmt(s[key]);
        self.save.save();
        if (onChange) { onChange(s[key]); }
      });
      row.appendChild(inp);
      row.appendChild(val);
      list.appendChild(row);
    }

    list.appendChild(el('div', 'help-sep', 'Ton'));
    toggle('Musik', 'music', function (v) { self.audio.setMusic(v); });
    toggle('Soundeffekte', 'sfx', function (v) { self.audio.setSfx(v); });
    slider('Lautstärke', 'volume', 0, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }, function (v) { self.audio.setVolume(v); });

    var track = el('div', 'row');
    track.appendChild(el('b', null, 'Musikstück'));
    var sel = document.createElement('select');
    sel.style.cssText = 'background:#1a1f2a;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px;font-family:inherit;font-size:11px';
    Save.MUSIC.forEach(function (m) {
      if (!self.save.owns('music', m.id)) { return; }
      var o = document.createElement('option');
      o.value = m.id; o.textContent = m.name;
      if (self.save.data.equipped.music === m.id) { o.selected = true; }
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      self.save.equip('music', sel.value);
      self.audio.setTrack(sel.value);
    });
    track.appendChild(sel);
    list.appendChild(track);

    list.appendChild(el('div', 'help-sep', 'Steuerung'));
    toggle('Wisch-Gesten', 'gestures');
    toggle('Vibration', 'vibrate');
    toggle('Tippen links dreht links', 'tapRotateSplit');
    toggle('Linkshänder-Layout', 'leftHanded', function (v) {
      $('controls').classList.toggle('lefty', v);
    });
    slider('DAS (Verzögerung)', 'das', 60, 300, 10, function (v) { return v + ' ms'; });
    slider('ARR (Wiederholung)', 'arr', 0, 100, 1, function (v) { return v <= 5 ? 'sofort' : v + ' ms'; });

    list.appendChild(el('div', 'help-sep', 'Anzeige'));
    toggle('Geisterstein', 'ghost');
    toggle('Gitternetz', 'grid');
    toggle('Partikel', 'particles');
    toggle('Bildschirm-Wackeln', 'shake');

    list.appendChild(el('div', 'help-sep', 'Daten'));
    var resetRow = el('div', 'row');
    resetRow.appendChild(el('b', null, 'Spielstand löschen'));
    var rbtn = el('button', 'btn item-action', 'Reset');
    rbtn.style.borderColor = '#ff5d5d';
    rbtn.style.color = '#ff5d5d';
    var armed = false;
    rbtn.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        rbtn.textContent = 'Sicher?';
        self.audio.play('warn');
        setTimeout(function () { armed = false; rbtn.textContent = 'Reset'; }, 3000);
        return;
      }
      self.save.reset();
      self.audio.play('deny');
      self.applyShell();
      self.toast('Spielstand zurückgesetzt');
      self.renderSettings();
      if (self.game.onCosmeticChange) { self.game.onCosmeticChange(); }
    });
    resetRow.appendChild(rbtn);
    list.appendChild(resetRow);

    var about = el('div', 'help-row');
    about.innerHTML = '<b>Musik</b><span>Korobeiniki – russisches Volkslied (gemeinfrei)</span>';
    list.appendChild(about);
  };

  /* ---------------- Statistik & Erfolge ---------------- */

  UI.prototype.renderStats = function () {
    var d = this.save.data;
    var s = d.stats;
    var list = $('statsList');
    list.innerHTML = '';
    var self = this;

    function row(k, v) {
      var r = el('div', 'row');
      r.appendChild(el('b', null, k));
      r.appendChild(el('span', 'val', v));
      list.appendChild(r);
    }

    list.appendChild(el('div', 'help-sep', 'Bestwerte'));
    row('Marathon', fmtNum(d.best.marathon || 0));
    row('Sprint 40', d.best.sprint ? fmtTime(d.best.sprint) : '–');
    row('Ultra 2:00', fmtNum(d.best.ultra || 0));
    row('Zen', fmtNum(d.best.zen || 0));
    var today = this.save.today();
    row('Tages-Challenge', d.best.daily && d.best.daily[today] ? fmtNum(d.best.daily[today]) : '–');

    list.appendChild(el('div', 'help-sep', 'Gesamt'));
    row('Spiele', fmtNum(s.games));
    row('Reihen', fmtNum(s.lines));
    row('Steine', fmtNum(s.pieces));
    row('Tetrises', fmtNum(s.tetrises));
    row('T-Spins', fmtNum(s.tspins));
    row('Perfect Clears', fmtNum(s.perfectClears));
    row('Beste Combo', fmtNum(s.maxCombo));
    row('Höchstes Level', fmtNum(s.maxLevel));
    row('Spielzeit', fmtClock(s.playtime));
    row('Münzen gesamt', fmtNum(d.totalCoins));
    row('Tages-Serie', (d.streak || 0) + ((d.streak || 0) === 1 ? ' Tag 🔥' : ' Tage 🔥'));

    var p = this.save.achievementProgress();
    row('Erfolge', p.done + ' / ' + p.total);
    void self;
  };

  UI.prototype.renderAchievements = function () {
    var list = $('achList');
    var d = this.save.data;
    list.innerHTML = '';
    var p = this.save.achievementProgress();
    var head = el('div', 'row');
    head.innerHTML = '<b>Fortschritt</b><span class="val">' + p.done + ' / ' + p.total + '</span>';
    list.appendChild(head);
    Save.ACHIEVEMENTS.forEach(function (a) {
      var done = !!d.achievements[a.id];
      var row = el('div', 'item' + (done ? ' owned' : ' locked'));
      row.appendChild(el('div', 'item-icon', done ? '🏆' : '🔒'));
      var body = el('div', 'item-body');
      body.appendChild(el('div', 'item-name', a.name));
      body.appendChild(el('div', 'item-desc', a.desc));
      row.appendChild(body);
      row.appendChild(el('div', 'item-action btn' + (done ? ' on' : ''), '🪙 ' + a.coins));
      list.appendChild(row);
    });
  };

  UI.prototype.checkAchievements = function () {
    var unlocked = this.save.checkAchievements();
    var self = this;
    unlocked.forEach(function (a, i) {
      setTimeout(function () {
        self.audio.play('achievement');
        self.toast('🏆 ' + a.name + ' · +' + a.coins + ' 🪙', 'gold', 2600);
      }, i * 700);
    });
    return unlocked;
  };

  /* ---------------- Toast & HUD ---------------- */

  UI.prototype.toast = function (text, kind, ms) {
    var host = $('toastHost');
    var t = el('div', 'toast' + (kind ? ' ' + kind : ''), text);
    host.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentElement) { t.parentElement.removeChild(t); } }, 300);
    }, ms || 1600);
    while (host.children.length > 3) { host.removeChild(host.firstChild); }
  };

  UI.prototype.applyShell = function () {
    var shell = this.save.shell();
    var root = document.documentElement;
    root.style.setProperty('--shell-body', shell.body);
    root.style.setProperty('--shell-body2', shell.body2);
    root.style.setProperty('--shell-accent', shell.accent);
    var dev = $('device');
    if (dev) { dev.classList.toggle('clear-shell', !!shell.clear); }
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) { meta.setAttribute('content', shell.body2); }
  };

  UI.prototype.fmtNum = fmtNum;
  UI.prototype.fmtClock = fmtClock;

  T.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);

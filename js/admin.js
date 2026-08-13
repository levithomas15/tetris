/*
 * admin.js — Verstecktes Admin-/Cheat-Panel.
 * Öffnen: 3× kurz hintereinander in eine der oberen Bildschirmecken tippen.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};

  var TAPS_NEEDED = 3;
  var TAP_WINDOW = 1600;   // ms zwischen den Tipps
  var CORNER_H = 0.14;     // oberer Anteil der Bildschirmhöhe

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  function fmtNum(n) { return Math.round(n).toLocaleString('de-DE'); }

  var Admin = {
    taps: 0,
    lastTap: 0,
    returnTo: null
  };

  /* ---------------- Geheime Ecke ---------------- */

  Admin.install = function (game) {
    this.game = game;
    this.save = T.save;
    this.audio = T.audio;
    this.ui = game.ui;

    var screen = $('screen');
    var self = this;

    // Capture-Phase, damit der Zähler auch über Menüs/Overlays läuft —
    // das Event wird nicht verschluckt, alles darunter bleibt bedienbar.
    screen.addEventListener('pointerdown', function (e) {
      if (!self.inCorner(e.clientX, e.clientY)) { self.taps = 0; return; }
      var now = performance.now();
      self.taps = (now - self.lastTap < TAP_WINDOW) ? self.taps + 1 : 1;
      self.lastTap = now;
      if (self.taps >= TAPS_NEEDED) {
        self.taps = 0;
        self.open();
      }
    }, true);

    if ($('adminSecret')) { /* nichts */ }
  };

  // Nur die schmalen Ecken über den Seitenleisten — nie über dem Spielfeld,
  // damit im Spiel keine Drehung ausgelöst wird.
  Admin.inCorner = function (cx, cy) {
    var screen = $('screen');
    if (!screen) { return false; }
    var r = screen.getBoundingClientRect();
    var rail = document.querySelector('.rail');
    var w = rail ? Math.max(rail.getBoundingClientRect().width, 40) : 56;
    if (cy < r.top || cy > r.top + r.height * CORNER_H) { return false; }
    return (cx >= r.left && cx <= r.left + w) || (cx >= r.right - w && cx <= r.right);
  };

  Admin.open = function () {
    var g = this.game;
    this.returnTo = (!this.ui.current && g.engine && !g.engine.finished && g.engine.piecesPlaced >= 0
      && (g.engine.phase === 'playing' || g.engine.phase === 'clearing')) ? 'game' : (this.ui.current || 'menu');
    this.audio.play('achievement');
    if (navigator.vibrate && this.save.data.settings.vibrate) {
      try { navigator.vibrate([12, 40, 12]); } catch (e) { /* egal */ }
    }
    this.ui.show('admin');
  };

  Admin.close = function () {
    if (this.returnTo === 'game') { this.game.resume(); }
    else { this.ui.show(this.returnTo === 'admin' ? 'menu' : (this.returnTo || 'menu')); }
  };

  /* ---------------- Panel ---------------- */

  Admin.render = function () {
    var list = $('adminList');
    var self = this;
    var save = this.save;
    var g = this.game;
    list.innerHTML = '';

    function sep(t) { list.appendChild(el('div', 'help-sep', t)); }

    function buttons(label, defs) {
      var row = el('div', 'admin-block');
      if (label) { row.appendChild(el('div', 'admin-label', label)); }
      var grid = el('div', 'admin-grid');
      defs.forEach(function (d) {
        var b = el('button', 'btn admin-btn' + (d.cls ? ' ' + d.cls : ''), d.txt);
        b.addEventListener('click', function () {
          d.fn();
          self.audio.play(d.quiet ? 'ui' : 'buy');
          // "keep" lässt das Panel stehen — sonst würde z. B. das Export-
          // Textfeld direkt wieder geleert.
          if (!d.keep) {
            self.render();
            if (g.renderItems) { g.renderItems(); }
            if (g.updateHud) { g.updateHud(true); }
          }
        });
        grid.appendChild(b);
      });
      row.appendChild(grid);
      list.appendChild(row);
    }

    function toggle(label, get, set) {
      var row = el('div', 'row');
      row.appendChild(el('b', null, label));
      var sw = el('div', 'switch' + (get() ? ' on' : ''));
      sw.addEventListener('click', function () {
        set(!get());
        sw.classList.toggle('on', get());
        save.save();
        self.audio.play('ui');
      });
      row.appendChild(sw);
      list.appendChild(row);
    }

    function numberRow(label, placeholder, fn) {
      var row = el('div', 'row');
      row.appendChild(el('b', null, label));
      var inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'admin-input';
      inp.placeholder = placeholder;
      var b = el('button', 'btn item-action', 'OK');
      b.addEventListener('click', function () {
        var v = parseFloat(inp.value);
        if (isNaN(v)) { self.audio.play('deny'); return; }
        fn(v);
        self.audio.play('buy');
        self.render();
        if (g.updateHud) { g.updateHud(true); }
      });
      row.appendChild(inp);
      row.appendChild(b);
      list.appendChild(row);
    }

    var eng = g.engine;
    var running = eng && !eng.finished;

    /* --- Status --- */
    var head = el('div', 'admin-status');
    head.innerHTML =
      '<span>🪙 <b>' + fmtNum(save.data.coins) + '</b></span>' +
      '<span>Modus <b>' + g.mode + '</b></span>' +
      '<span>Phase <b>' + (eng ? eng.phase : '–') + '</b></span>';
    list.appendChild(head);

    /* --- Münzen --- */
    sep('Münzen');
    buttons(null, [
      { txt: '+1.000', fn: function () { save.addCoins(1000); } },
      { txt: '+10.000', fn: function () { save.addCoins(10000); } },
      { txt: '+100.000', fn: function () { save.addCoins(100000); } },
      { txt: 'Auf 0', cls: 'danger', fn: function () { save.data.coins = 0; save.save(); } }
    ]);
    numberRow('Münzen setzen', 'z. B. 5000', function (v) {
      save.data.coins = Math.max(0, Math.round(v));
      save.save();
    });

    /* --- Freischalten --- */
    sep('Freischalten');
    buttons(null, [
      { txt: '🎁 ALLES freischalten', cls: 'primary wide', fn: function () { self.unlockAll(); } },
      { txt: 'Alle Blöcke', fn: function () { self.unlockCat('skins', T.Save.SKINS); } },
      { txt: 'Alle Gehäuse', fn: function () { self.unlockCat('shells', T.Save.SHELLS); } },
      { txt: 'Alle Musik', fn: function () { self.unlockCat('music', T.Save.MUSIC); } },
      { txt: 'Upgrades MAX', fn: function () { self.maxUpgrades(); } },
      { txt: 'Items ×99', fn: function () { self.fillItems(99); } },
      { txt: 'Alle Erfolge', fn: function () { self.unlockAchievements(); } }
    ]);

    /* --- Im Spiel --- */
    sep('Im laufenden Spiel');
    if (!running) {
      list.appendChild(el('div', 'admin-hint', 'Kein Spiel aktiv — starte erst eine Runde.'));
    } else {
      buttons('Level & Punkte', [
        { txt: 'Level −1', fn: function () { eng.level = Math.max(1, eng.level - 1); } },
        { txt: 'Level +1', fn: function () { eng.level++; } },
        { txt: 'Level +5', fn: function () { eng.level += 5; } },
        { txt: 'Punkte +10k', fn: function () { eng.score += 10000; } },
        { txt: 'Reihen +10', fn: function () { eng.lines += 10; } },
        { txt: 'Combo +5', fn: function () { eng.combo += 5; eng.maxCombo = Math.max(eng.maxCombo, eng.combo); } }
      ]);
      numberRow('Level setzen', '1–30', function (v) { eng.level = Math.max(1, Math.min(30, Math.round(v))); });

      var pieceRow = el('div', 'admin-block');
      pieceRow.appendChild(el('div', 'admin-label', 'Stein einwechseln'));
      var pg = el('div', 'admin-grid pieces');
      T.Engine.PIECES.forEach(function (p) {
        var b = el('button', 'btn admin-btn piece-' + p, p);
        b.addEventListener('click', function () {
          eng.spawn(p);
          self.audio.play('hold');
          if (g.updateHud) { g.updateHud(true); }
        });
        pg.appendChild(b);
      });
      pieceRow.appendChild(pg);
      list.appendChild(pieceRow);

      buttons('Spielfeld', [
        { txt: '🧹 Feld leeren', fn: function () { eng.clearBoard(); } },
        { txt: 'Reihe füllen', fn: function () { eng.fillRow(); } },
        { txt: 'Müll +1', fn: function () { eng.addGarbage(1); } },
        { txt: 'Müll +3', fn: function () { eng.addGarbage(3); } },
        { txt: '💣 Bombe', fn: function () { eng.powerBomb(); } },
        { txt: '⏳ Zeitlupe', fn: function () { eng.powerSlow(30000); } }
      ]);

      buttons('Runde beenden', [
        { txt: '🏆 Sofort gewinnen', fn: function () { eng.invincible = false; eng.gameOver(true); self.close(); } },
        { txt: '💀 Sofort verlieren', cls: 'danger', fn: function () { eng.invincible = false; eng.gameOver(false); self.close(); } }
      ]);
    }

    /* --- Cheats --- */
    sep('Cheats (bleiben aktiv)');
    var a = save.data.admin || (save.data.admin = {});
    toggle('Schwerkraft aus', function () { return !!a.noGravity; }, function (v) {
      a.noGravity = v; if (g.engine) { g.engine.noGravity = v; }
    });
    toggle('Unverwundbar', function () { return !!a.invincible; }, function (v) {
      a.invincible = v; if (g.engine) { g.engine.invincible = v; }
    });
    toggle('Unendlich Items', function () { return !!a.infiniteItems; }, function (v) {
      a.infiniteItems = v; if (g.renderItems) { g.renderItems(); }
    });
    toggle('FPS anzeigen', function () { return !!a.fps; }, function (v) {
      a.fps = v; $('fpsMeter').classList.toggle('hidden', !v);
    });
    buttons(null, [
      { txt: 'Alle Cheats aus', cls: 'danger', quiet: true, fn: function () {
        a.noGravity = a.invincible = a.infiniteItems = a.fps = false;
        if (g.engine) { g.engine.noGravity = false; g.engine.invincible = false; }
        $('fpsMeter').classList.add('hidden');
        save.save();
      } }
    ]);

    /* --- Technik --- */
    sep('Technik');
    var r = g.renderer;
    var info = el('div', 'admin-code');
    info.textContent = [
      'Auflösung  ' + innerWidth + '×' + innerHeight + ' @' + (r ? r.dpr.toFixed(2) : '?') + 'x',
      'Zellgröße  ' + (r ? (r.cell / r.dpr).toFixed(1) + ' px' : '?'),
      'Canvas     ' + (r ? r.canvas.width + '×' + r.canvas.height : '?'),
      'Seed       ' + (eng ? eng.seed : '–'),
      'Steine     ' + (eng ? eng.piecesPlaced : 0) + '   Combo ' + (eng ? eng.combo : 0) + '   B2B ' + (eng ? eng.b2b : 0),
      'Musik      ' + this.audio.track + (this.audio.playing ? ' (läuft)' : ' (aus)'),
      'Tempo      ×' + this.audio.tempoScale.toFixed(2),
      'Erfolge    ' + save.achievementProgress().done + '/' + save.achievementProgress().total
    ].join('\n');
    list.appendChild(info);

    /* --- Speicherstand --- */
    sep('Speicherstand');
    var ta = document.createElement('textarea');
    ta.className = 'admin-textarea';
    ta.placeholder = 'Hier erscheint der Export — oder JSON einfügen und „Laden" drücken.';
    list.appendChild(ta);
    buttons(null, [
      { txt: '⬇ Exportieren', quiet: true, keep: true, fn: function () {
        ta.value = JSON.stringify(save.data);
        ta.select();
        if (navigator.clipboard) { navigator.clipboard.writeText(ta.value).catch(function () {}); }
        self.ui.toast('Spielstand kopiert');
      } },
      { txt: '⬆ Laden', fn: function () {
        try {
          var parsed = JSON.parse(ta.value);
          if (!parsed || typeof parsed !== 'object') { throw new Error('kein Objekt'); }
          save.data = parsed;
          save.save();
          self.ui.applyShell();
          self.ui.toast('Spielstand geladen');
        } catch (err) {
          self.audio.play('deny');
          self.ui.toast('Ungültiges JSON');
        }
      } },
      { txt: 'Tagesbonus neu', quiet: true, keep: true, fn: function () {
        save.data.lastBonusDay = null; save.save();
        self.ui.toast('Tagesbonus wieder abholbar');
      } },
      { txt: 'Statistik nullen', cls: 'danger', fn: function () {
        var s = save.data.stats;
        Object.keys(s).forEach(function (k) { s[k] = 0; });
        s.maxLevel = 1;
        save.save();
      } }
    ]);

    var wipe = el('div', 'row');
    wipe.appendChild(el('b', null, 'Alles löschen'));
    var wb = el('button', 'btn item-action', 'Reset');
    wb.style.borderColor = '#ff5d5d';
    wb.style.color = '#ff5d5d';
    var armed = false;
    wb.addEventListener('click', function () {
      if (!armed) {
        armed = true; wb.textContent = 'Sicher?';
        self.audio.play('warn');
        setTimeout(function () { armed = false; wb.textContent = 'Reset'; }, 3000);
        return;
      }
      save.reset();
      self.ui.applyShell();
      self.ui.toast('Spielstand gelöscht');
      self.render();
      if (g.renderItems) { g.renderItems(); }
    });
    wipe.appendChild(wb);
    list.appendChild(wipe);

    list.appendChild(el('div', 'admin-hint',
      'Tipp: 3× in eine obere Bildschirmecke tippen öffnet dieses Panel jederzeit.'));
  };

  /* ---------------- Aktionen ---------------- */

  Admin.unlockCat = function (cat, catalog) {
    var owned = this.save.data.owned[cat];
    catalog.forEach(function (item) {
      if (owned.indexOf(item.id) < 0) { owned.push(item.id); }
    });
    this.save.save();
    this.ui.toast('Freigeschaltet: ' + catalog.length + ' Einträge');
  };

  Admin.maxUpgrades = function () {
    var up = this.save.data.upgrades;
    T.Save.UPGRADES.forEach(function (u) { up[u.id] = u.max; });
    this.save.save();
    this.ui.toast('Alle Upgrades auf Maximum');
  };

  Admin.fillItems = function (n) {
    var inv = this.save.data.inventory;
    T.Save.POWERUPS.forEach(function (p) { inv[p.id] = n; });
    this.save.save();
    this.ui.toast('Items aufgefüllt');
  };

  Admin.unlockAchievements = function () {
    var d = this.save.data;
    T.Save.ACHIEVEMENTS.forEach(function (a) {
      if (!d.achievements[a.id]) { d.achievements[a.id] = Date.now(); }
    });
    this.save.save();
    this.ui.toast('Alle Erfolge freigeschaltet');
  };

  Admin.unlockAll = function () {
    this.unlockCat('skins', T.Save.SKINS);
    this.unlockCat('shells', T.Save.SHELLS);
    this.unlockCat('music', T.Save.MUSIC);
    this.maxUpgrades();
    this.fillItems(99);
    this.unlockAchievements();
    this.save.addCoins(100000);
    this.ui.toast('🎁 Alles freigeschaltet!', 'gold', 2600);
  };

  // Cheats nach dem Laden/Neustart wieder auf die Engine anwenden.
  Admin.applyToEngine = function (engine) {
    var a = this.save && this.save.data.admin;
    if (!a || !engine) { return; }
    engine.noGravity = !!a.noGravity;
    engine.invincible = !!a.invincible;
  };

  T.Admin = Admin;
})(typeof window !== 'undefined' ? window : globalThis);

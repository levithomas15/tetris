/*
 * input.js — Touch-Buttons (DAS/ARR), Wisch-Gesten und Tastatur.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};

  function Input(opts) {
    this.actions = opts.actions;          // { left, right, rotateCW, ... }
    this.settings = opts.settings;        // Referenz auf save.data.settings
    this.getCellSize = opts.getCellSize || function () { return 30; };
    this.isPlaying = opts.isPlaying || function () { return true; };
    this.held = {};                       // action -> { since, next }
    this.pointers = {};                   // pointerId -> action
    this.gesture = null;
    this.enabled = true;
    this.bindButtons(opts.root);
    this.bindGestures(opts.surface);
    this.bindKeyboard();
  }

  Input.prototype.vibrate = function (ms) {
    if (this.settings.vibrate && global.navigator && global.navigator.vibrate) {
      try { global.navigator.vibrate(ms); } catch (e) { /* nicht unterstützt */ }
    }
  };

  /* ---------------- On-Screen-Buttons ---------------- */

  Input.prototype.bindButtons = function (root) {
    if (!root) { return; }
    var self = this;
    var buttons = root.querySelectorAll('[data-act]');

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (!self.enabled) { return; }
        var act = btn.getAttribute('data-act');
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
        btn.classList.add('pressed');
        self.pointers[e.pointerId] = { act: act, btn: btn };
        self.press(act);
      });

      var release = function (e) {
        var entry = self.pointers[e.pointerId];
        if (!entry) { return; }
        entry.btn.classList.remove('pressed');
        delete self.pointers[e.pointerId];
        self.release(entry.act);
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  };

  Input.prototype.press = function (act) {
    var a = this.actions;
    switch (act) {
      case 'left':
        if (a.move(-1)) { this.vibrate(8); }
        this.held.left = { since: 0, charged: false };
        delete this.held.right;
        break;
      case 'right':
        if (a.move(1)) { this.vibrate(8); }
        this.held.right = { since: 0, charged: false };
        delete this.held.left;
        break;
      case 'down':
        a.softDrop(true);
        this.held.down = true;
        break;
      case 'rotcw': if (a.rotate(1)) { this.vibrate(10); } break;
      case 'rotccw': if (a.rotate(-1)) { this.vibrate(10); } break;
      case 'rot180': if (a.rotate(2)) { this.vibrate(10); } break;
      case 'drop': a.hardDrop(); this.vibrate(24); break;
      case 'hold': a.hold(); this.vibrate(12); break;
      case 'pause': a.pause(); break;
      default:
        if (a.custom) { a.custom(act); }
    }
  };

  Input.prototype.release = function (act) {
    switch (act) {
      case 'left': delete this.held.left; break;
      case 'right': delete this.held.right; break;
      case 'down': delete this.held.down; this.actions.softDrop(false); break;
      default: break;
    }
  };

  Input.prototype.releaseAll = function () {
    this.held = {};
    this.pointers = {};
    this.actions.softDrop(false);
  };

  // Auto-Repeat (DAS/ARR) — pro Frame aufrufen.
  Input.prototype.update = function (dt) {
    if (!this.enabled) { return; }
    var das = this.settings.das, arr = this.settings.arr;
    ['left', 'right'].forEach(function (dir) {
      var h = this.held[dir];
      if (!h) { return; }
      h.since += dt;
      if (!h.charged) {
        if (h.since >= das) { h.charged = true; h.since = 0; this.actions.move(dir === 'left' ? -1 : 1); }
      } else {
        while (h.since >= arr) {
          h.since -= arr;
          if (arr < 8) { // "Instant"-ARR: sofort bis zur Wand
            var guard = 0;
            while (this.actions.move(dir === 'left' ? -1 : 1) && guard++ < 12) { /* bis Wand */ }
            break;
          }
          this.actions.move(dir === 'left' ? -1 : 1);
        }
      }
    }, this);
  };

  /* ---------------- Gesten auf dem Spielfeld ---------------- */

  Input.prototype.bindGestures = function (surface) {
    if (!surface) { return; }
    var self = this;

    surface.addEventListener('pointerdown', function (e) {
      if (!self.enabled || !self.settings.gestures) { return; }
      if (!self.isPlaying()) { return; }
      e.preventDefault();
      try { surface.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      self.gesture = {
        id: e.pointerId,
        x0: e.clientX, y0: e.clientY,
        x: e.clientX, y: e.clientY,
        t0: performance.now(),
        movedX: 0, movedY: 0,
        moved: false, dropped: false, softing: false
      };
    });

    surface.addEventListener('pointermove', function (e) {
      var g = self.gesture;
      if (!g || g.id !== e.pointerId) { return; }
      e.preventDefault();
      var cell = self.getCellSize();
      var stepX = Math.max(18, cell * 0.85);
      var stepY = Math.max(20, cell * 0.95);

      var dx = e.clientX - g.x;
      var dy = e.clientY - g.y;
      g.movedX += Math.abs(dx);
      g.movedY += Math.abs(dy);

      // Horizontal bewegen
      var totalDX = e.clientX - g.x0;
      var steps = 0;
      while (Math.abs(totalDX) >= stepX * (steps + 1)) { steps++; }
      if (steps > 0) {
        var dir = totalDX > 0 ? 1 : -1;
        for (var i = 0; i < steps; i++) { self.actions.move(dir); }
        g.x0 += dir * stepX * steps;
        g.moved = true;
        self.vibrate(6);
      }

      // Nach unten ziehen = Softdrop
      var totalDY = e.clientY - g.y0;
      if (totalDY >= stepY && Math.abs(totalDY) > Math.abs(e.clientX - g.x0)) {
        var sSteps = Math.floor(totalDY / stepY);
        for (var j = 0; j < sSteps; j++) { self.actions.softDropStep(); }
        g.y0 += sSteps * stepY;
        g.moved = true;
      }
      g.x = e.clientX; g.y = e.clientY;
    });

    var end = function (e) {
      var g = self.gesture;
      if (!g || g.id !== e.pointerId) { return; }
      self.gesture = null;
      var dt = performance.now() - g.t0;
      var dx = e.clientX - g.x0;
      var dy = e.clientY - g.y0;
      var cell = self.getCellSize();

      // Schneller Wisch nach unten = Hard Drop
      if (dy > cell * 1.2 && dt < 260 && Math.abs(dx) < Math.abs(dy)) {
        self.actions.hardDrop();
        self.vibrate(24);
        return;
      }
      // Wisch nach oben = Hold
      if (dy < -cell * 1.2 && dt < 320 && Math.abs(dx) < Math.abs(dy)) {
        self.actions.hold();
        self.vibrate(12);
        return;
      }
      // Kurzes Tippen = Drehen
      if (!g.moved && dt < 320 && g.movedX < 14 && g.movedY < 14) {
        var rect = surface.getBoundingClientRect();
        var leftHalf = (e.clientX - rect.left) < rect.width / 2;
        self.actions.rotate(self.settings.tapRotateSplit && leftHalf ? -1 : 1);
        self.vibrate(10);
      }
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', function (e) { if (self.gesture && self.gesture.id === e.pointerId) { self.gesture = null; } });
  };

  /* ---------------- Tastatur ---------------- */

  Input.prototype.bindKeyboard = function () {
    var self = this;
    var MAP = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
      ArrowUp: 'rotcw', KeyX: 'rotcw', KeyZ: 'rotccw', ControlLeft: 'rotccw',
      KeyA: 'rot180', Space: 'drop', KeyC: 'hold', ShiftLeft: 'hold',
      Escape: 'pause', KeyP: 'pause', KeyR: 'restart',
      Digit1: 'item1', Digit2: 'item2', Digit3: 'item3', Digit4: 'item4'
    };
    var down = {};

    global.addEventListener('keydown', function (e) {
      var act = MAP[e.code];
      if (!act || !self.enabled) { return; }
      if (e.repeat) { e.preventDefault(); return; }
      e.preventDefault();
      down[e.code] = true;
      if (act === 'restart') { if (self.actions.restart) { self.actions.restart(); } return; }
      self.press(act);
    });

    global.addEventListener('keyup', function (e) {
      var act = MAP[e.code];
      if (!act) { return; }
      delete down[e.code];
      self.release(act);
    });

    global.addEventListener('blur', function () { self.releaseAll(); });
  };

  T.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);

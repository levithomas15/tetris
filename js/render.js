/*
 * render.js — Canvas-Darstellung: Spielfeld, Hold, Vorschau, Effekte.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};
  var Engine = T.Engine;
  var FONT = 'ui-monospace, "SF Mono", "Roboto Mono", Menlo, Consolas, monospace';

  function shade(hex, amt) {
    var c = hex.replace('#', '');
    if (c.length === 3) { c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; }
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    r = Math.max(0, Math.min(255, Math.round(r + amt)));
    g = Math.max(0, Math.min(255, Math.round(g + amt)));
    b = Math.max(0, Math.min(255, Math.round(b + amt)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function Renderer(canvas, holdCanvas, nextCanvas, save) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.holdCanvas = holdCanvas;
    this.holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
    this.save = save;
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.time = 0;
    this.clearFlash = 0;
    this.dpr = Math.min(global.devicePixelRatio || 1, 3);
    this.lockFlashes = [];
    this.resize();
  }

  Renderer.prototype.colors = function () {
    var skin = this.save.skin();
    var cols = skin.colors.slice();
    if (skin.rainbow) {
      var t = this.time / 1000;
      cols = cols.map(function (_, i) {
        var h = (t * 60 + i * 51) % 360;
        return 'hsl(' + h + ',85%,60%)';
      });
    }
    return { skin: skin, cols: cols };
  };

  Renderer.prototype.resize = function () {
    var c = this.canvas;
    var rect = c.getBoundingClientRect();
    if (!rect.width || !rect.height) { return; }
    this.dpr = Math.min(global.devicePixelRatio || 1, 3);
    var w = Math.round(rect.width * this.dpr);
    var h = Math.round(rect.height * this.dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.cell = Math.floor(Math.min(c.width / Engine.COLS, c.height / Engine.ROWS));
    this.offX = Math.floor((c.width - this.cell * Engine.COLS) / 2);
    this.offY = Math.floor((c.height - this.cell * Engine.ROWS) / 2);

    [this.holdCanvas, this.nextCanvas].forEach(function (cv) {
      if (!cv) { return; }
      var r = cv.getBoundingClientRect();
      if (!r.width) { return; }
      var ww = Math.round(r.width * this.dpr), hh = Math.round(r.height * this.dpr);
      if (cv.width !== ww || cv.height !== hh) { cv.width = ww; cv.height = hh; }
    }, this);
  };

  Renderer.prototype.block = function (ctx, x, y, size, color, opts) {
    opts = opts || {};
    var s = size;
    var b = Math.max(1, Math.round(s * 0.11));
    ctx.save();
    if (opts.alpha != null) { ctx.globalAlpha = opts.alpha; }

    if (opts.glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = s * 0.45;
    }
    // Grundfläche
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);
    ctx.shadowBlur = 0;

    // Bevel: hell oben/links, dunkel unten/rechts
    ctx.fillStyle = shade(opts.base || color, 55);
    ctx.fillRect(x, y, s, b);
    ctx.fillRect(x, y, b, s);
    ctx.fillStyle = shade(opts.base || color, -55);
    ctx.fillRect(x, y + s - b, s, b);
    ctx.fillRect(x + s - b, y, b, s);

    // Innen-Highlight (GBC-Pixel-Look)
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + b * 1.6, y + b * 1.6, Math.max(1, s * 0.18), Math.max(1, s * 0.18));

    // Rahmen
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(1, this.dpr * 0.8);
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    ctx.restore();
  };

  Renderer.prototype.ghostBlock = function (ctx, x, y, size, color) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.09);
    ctx.strokeRect(x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88);
    ctx.restore();
  };

  Renderer.prototype.burst = function (col, row, color, count) {
    if (!this.save.data.settings.particles) { return; }
    var cx = this.offX + (col + 0.5) * this.cell;
    var cy = this.offY + (row + 0.5) * this.cell;
    for (var i = 0; i < (count || 6); i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (0.05 + Math.random() * 0.22) * this.cell;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - this.cell * 0.06,
        life: 420 + Math.random() * 320, age: 0,
        size: this.cell * (0.12 + Math.random() * 0.2),
        color: color
      });
    }
    if (this.particles.length > 400) { this.particles.splice(0, this.particles.length - 400); }
  };

  Renderer.prototype.float = function (text, color, big) {
    this.floaters.push({
      text: text, color: color || '#fff', age: 0, life: 1100,
      big: !!big, y: 0
    });
    if (this.floaters.length > 5) { this.floaters.shift(); }
  };

  Renderer.prototype.addShake = function (amount) {
    if (!this.save.data.settings.shake) { return; }
    this.shake = Math.min(this.shake + amount, 26);
  };

  Renderer.prototype.update = function (dt) {
    this.time += dt;
    var i;
    for (i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      var f = dt / 16.67;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.vy += 0.035 * this.cell * f * 0.5;
      p.vx *= 0.985;
    }
    for (i = this.floaters.length - 1; i >= 0; i--) {
      var fl = this.floaters[i];
      fl.age += dt;
      fl.y -= dt * 0.03;
      if (fl.age >= fl.life) { this.floaters.splice(i, 1); }
    }
    for (i = this.lockFlashes.length - 1; i >= 0; i--) {
      this.lockFlashes[i].age += dt;
      if (this.lockFlashes[i].age > 160) { this.lockFlashes.splice(i, 1); }
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 0.06);
      this.shakeX = (Math.random() - 0.5) * this.shake;
      this.shakeY = (Math.random() - 0.5) * this.shake;
    } else { this.shakeX = this.shakeY = 0; }
    if (this.clearFlash > 0) { this.clearFlash = Math.max(0, this.clearFlash - dt); }
  };

  Renderer.prototype.drawBoardBg = function (ctx) {
    var skin = this.save.skin();
    var dark = skin.mono && skin.id === 'dmg';
    var py = this.offY, ph = this.cell * Engine.ROWS;
    var g = ctx.createLinearGradient(0, py, 0, py + ph);
    if (dark) {
      g.addColorStop(0, '#8bac0f'); g.addColorStop(1, '#7a9a0c');
    } else {
      g.addColorStop(0, '#101827'); g.addColorStop(1, '#070b12');
    }
    ctx.fillStyle = g;
    ctx.fillRect(this.offX, py, this.cell * Engine.COLS, ph);

    if (this.save.data.settings.grid) {
      ctx.strokeStyle = dark ? 'rgba(15,56,15,0.16)' : 'rgba(255,255,255,0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = 0; x <= Engine.COLS; x++) {
        var px = this.offX + x * this.cell + 0.5;
        ctx.moveTo(px, this.offY); ctx.lineTo(px, this.offY + this.cell * Engine.ROWS);
      }
      for (var y = 0; y <= Engine.ROWS; y++) {
        var py = this.offY + y * this.cell + 0.5;
        ctx.moveTo(this.offX, py); ctx.lineTo(this.offX + this.cell * Engine.COLS, py);
      }
      ctx.stroke();
    }
  };

  Renderer.prototype.draw = function (eng) {
    var ctx = this.ctx;
    var c = this.canvas;
    var cell = this.cell;
    var info = this.colors();
    var cols = info.cols;
    var skin = info.skin;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    this.drawBoardBg(ctx);
    ctx.save();
    ctx.translate(this.shakeX * this.dpr, this.shakeY * this.dpr);

    var clearing = {};
    if (eng.phase === 'clearing') {
      eng.clearingRows.forEach(function (r) { clearing[r] = true; });
    }
    var clearProgress = eng.phase === 'clearing' ? 1 - Math.max(0, eng.clearTimer) / 260 : 0;

    // Gefahr: Stapel hoch → rote Warnzone
    var stackTop = this.stackTop(eng);
    if (stackTop >= 0 && stackTop < Engine.HIDDEN + 5) {
      var pulse = 0.10 + 0.06 * Math.sin(this.time / 160);
      ctx.fillStyle = 'rgba(255,40,40,' + pulse + ')';
      ctx.fillRect(this.offX, this.offY, cell * Engine.COLS, cell * 4);
    }

    // Gesetzte Blöcke
    for (var y = Engine.HIDDEN; y < Engine.TOTAL_ROWS; y++) {
      var vy = y - Engine.HIDDEN;
      for (var x = 0; x < Engine.COLS; x++) {
        var v = eng.board[y][x];
        if (!v) { continue; }
        var px = this.offX + x * cell;
        var py = this.offY + vy * cell;
        if (clearing[y]) {
          // Auflös-Animation: von der Mitte nach außen wegblitzen
          var mid = (Engine.COLS - 1) / 2;
          var d = Math.abs(x - mid) / mid;
          if (clearProgress > 0.25 + d * 0.5) { continue; }
          ctx.save();
          ctx.globalAlpha = 1;
          ctx.fillStyle = clearProgress > 0.15 ? '#ffffff' : shade(cols[v - 1] || '#888', 90);
          ctx.fillRect(px, py, cell, cell);
          ctx.restore();
          continue;
        }
        var color = v === 8 ? '#6b7280' : (cols[v - 1] || '#888');
        this.block(ctx, px, py, cell, color, { glow: skin.glow });
      }
    }

    // Geist
    if (eng.piece && this.save.data.settings.ghost && eng.phase === 'playing') {
      var gy = eng.ghostY();
      if (gy !== eng.piece.y) {
        var gcells = eng.cells(eng.piece, eng.piece.rot, eng.piece.x, gy);
        for (var i = 0; i < gcells.length; i++) {
          var gx2 = gcells[i][0], gy2 = gcells[i][1] - Engine.HIDDEN;
          if (gy2 < 0) { continue; }
          this.ghostBlock(ctx, this.offX + gx2 * cell, this.offY + gy2 * cell, cell, cols[eng.piece.id - 1]);
        }
      }
    }

    // Aktiver Stein
    if (eng.piece && (eng.phase === 'playing' || eng.phase === 'paused')) {
      var pcells = eng.cells(eng.piece);
      var grounded = eng.isGrounded();
      var lockPct = grounded ? Math.min(1, eng.lockTimer / eng.settings.lockDelay) : 0;
      for (var j = 0; j < pcells.length; j++) {
        var bx = pcells[j][0], by = pcells[j][1] - Engine.HIDDEN;
        if (by < 0) { continue; }
        var col = cols[eng.piece.id - 1];
        this.block(ctx, this.offX + bx * cell, this.offY + by * cell, cell, col, { glow: skin.glow });
        if (lockPct > 0) {
          ctx.save();
          ctx.globalAlpha = lockPct * 0.5;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(this.offX + bx * cell, this.offY + by * cell, cell, cell);
          ctx.restore();
        }
      }
    }

    // Partikel
    for (var k = 0; k < this.particles.length; k++) {
      var p = this.particles[k];
      var lifeLeft = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, lifeLeft);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Blitz bei großem Clear
    if (this.clearFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (this.clearFlash / 300) * 0.55 + ')';
      ctx.fillRect(this.offX, this.offY, cell * Engine.COLS, cell * Engine.ROWS);
    }

    // Schwebetexte
    var fieldW = cell * Engine.COLS;
    var centerX = this.offX + fieldW / 2;
    var baseY = this.offY + cell * Engine.ROWS * 0.4;
    for (var f = 0; f < this.floaters.length; f++) {
      var fl = this.floaters[f];
      var alpha = fl.age < 150 ? fl.age / 150 : Math.max(0, 1 - (fl.age - 150) / (fl.life - 150));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var size = Math.min((fl.big ? 0.115 : 0.08) * fieldW, cell * 1.1);
      ctx.font = '800 ' + size + 'px ' + FONT;
      ctx.lineWidth = Math.max(2, size * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.fillStyle = fl.color;
      var ty = baseY + fl.y * this.dpr + f * size * 1.4;
      ctx.strokeText(fl.text, centerX, ty);
      ctx.fillText(fl.text, centerX, ty);
      ctx.restore();
    }

    ctx.restore();

    // Rahmen um das Spielfeld
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2 * this.dpr;
    ctx.strokeRect(this.offX, this.offY, cell * Engine.COLS, cell * Engine.ROWS);

    this.drawHold(eng);
    this.drawNext(eng);
  };

  Renderer.prototype.stackTop = function (eng) {
    for (var y = 0; y < Engine.TOTAL_ROWS; y++) {
      for (var x = 0; x < Engine.COLS; x++) {
        if (eng.board[y][x]) { return y; }
      }
    }
    return -1;
  };

  Renderer.prototype.drawMini = function (ctx, cv, type, alpha) {
    if (!ctx) { return; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!type) { return; }
    var info = this.colors();
    var m = Engine.ROTATIONS[type][0];
    var minX = 99, maxX = -1, minY = 99, maxY = -1;
    for (var r = 0; r < m.length; r++) {
      for (var cIdx = 0; cIdx < m.length; cIdx++) {
        if (m[r][cIdx]) {
          if (cIdx < minX) { minX = cIdx; }
          if (cIdx > maxX) { maxX = cIdx; }
          if (r < minY) { minY = r; }
          if (r > maxY) { maxY = r; }
        }
      }
    }
    var w = maxX - minX + 1, h = maxY - minY + 1;
    var size = Math.floor(Math.min(cv.width / (w + 0.6), cv.height / (h + 0.6)));
    var ox = Math.floor((cv.width - size * w) / 2);
    var oy = Math.floor((cv.height - size * h) / 2);
    var color = info.cols[Engine.PIECE_ID[type] - 1];
    ctx.save();
    if (alpha != null) { ctx.globalAlpha = alpha; }
    for (var r2 = minY; r2 <= maxY; r2++) {
      for (var c2 = minX; c2 <= maxX; c2++) {
        if (m[r2][c2]) {
          this.block(ctx, ox + (c2 - minX) * size, oy + (r2 - minY) * size, size, color, { glow: info.skin.glow });
        }
      }
    }
    ctx.restore();
  };

  Renderer.prototype.drawHold = function (eng) {
    if (!this.holdCtx) { return; }
    this.drawMini(this.holdCtx, this.holdCanvas, eng.hold, eng.holdUsed ? 0.35 : 1);
  };

  // Begrenzungsrechteck eines Steins im 0°-Zustand.
  function bounds(type) {
    var m = Engine.ROTATIONS[type][0];
    var minX = 99, maxX = -1, minY = 99, maxY = -1;
    for (var r = 0; r < m.length; r++) {
      for (var c = 0; c < m.length; c++) {
        if (m[r][c]) {
          if (c < minX) { minX = c; } if (c > maxX) { maxX = c; }
          if (r < minY) { minY = r; } if (r > maxY) { maxY = r; }
        }
      }
    }
    return { m: m, minX: minX, maxX: maxX, minY: minY, maxY: maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  Renderer.prototype.drawNext = function (eng) {
    var ctx = this.nextCtx;
    if (!ctx) { return; }
    var cv = this.nextCanvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    var info = this.colors();
    var count = Math.min(eng.settings.nextCount, eng.queue.length);
    if (!count) { return; }

    // Liegt die Vorschau quer (Kopfleiste) oder hochkant (Querformat-Leiste)?
    var horizontal = cv.width >= cv.height;
    var slot = horizontal ? cv.width / count : cv.height / count;

    for (var i = 0; i < count; i++) {
      var b = bounds(eng.queue[i]);
      var scale = i === 0 ? 1 : 0.8;
      var size = Math.floor(Math.min(
        (horizontal ? slot : cv.width) / 4.7,
        (horizontal ? cv.height : slot) / 2.6
      ) * scale);
      if (size < 2) { continue; }
      var ox = Math.floor(horizontal
        ? i * slot + (slot - size * b.w) / 2
        : (cv.width - size * b.w) / 2);
      var oy = Math.floor(horizontal
        ? (cv.height - size * b.h) / 2
        : i * slot + (slot - size * b.h) / 2);
      var color = info.cols[Engine.PIECE_ID[eng.queue[i]] - 1];
      ctx.save();
      ctx.globalAlpha = i === 0 ? 1 : 0.7;
      for (var r2 = b.minY; r2 <= b.maxY; r2++) {
        for (var c2 = b.minX; c2 <= b.maxX; c2++) {
          if (b.m[r2][c2]) {
            this.block(ctx, ox + (c2 - b.minX) * size, oy + (r2 - b.minY) * size, size, color, { glow: info.skin.glow });
          }
        }
      }
      ctx.restore();
    }
  };

  // Position (Pixel im Canvas) → Spalte/Zeile, für Gesten.
  Renderer.prototype.cellFromPoint = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * this.dpr;
    var y = (clientY - rect.top) * this.dpr;
    return {
      col: Math.floor((x - this.offX) / this.cell),
      row: Math.floor((y - this.offY) / this.cell)
    };
  };

  T.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);

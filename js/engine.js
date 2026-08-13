/*
 * engine.js — Reine Spiellogik (kein DOM, kein Canvas).
 * Guideline-nah: SRS + Wallkicks, 7-Bag, Hold, Lock-Delay, T-Spins,
 * Back-to-Back, Combos, Perfect Clear, Level-Gravity.
 */
(function (global) {
  'use strict';

  var T = global.TETRIS = global.TETRIS || {};

  var COLS = 10;
  var ROWS = 20;
  var HIDDEN = 2; // Pufferzeilen über dem sichtbaren Feld
  var TOTAL_ROWS = ROWS + HIDDEN;

  // Piece-IDs: 1=I 2=J 3=L 4=O 5=S 6=T 7=Z, 8=Garbage/Bomb-Rest
  var PIECES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  var PIECE_ID = { I: 1, J: 2, L: 3, O: 4, S: 5, T: 6, Z: 7 };

  var SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
  };

  // SRS-Kicktabellen. y ist hier "nach oben positiv" und wird beim
  // Anwenden invertiert (Bildschirm-Koordinaten wachsen nach unten).
  var KICKS_JLSTZ = {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };
  var KICKS_I = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rotateMatrixCW(m) {
    var n = m.length, out = [], y, x;
    for (y = 0; y < n; y++) { out.push(new Array(n)); }
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) { out[x][n - 1 - y] = m[y][x]; }
    }
    return out;
  }

  // Alle 4 Rotationszustände vorberechnen.
  var ROTATIONS = {};
  PIECES.forEach(function (p) {
    var states = [SHAPES[p]];
    for (var i = 1; i < 4; i++) { states.push(rotateMatrixCW(states[i - 1])); }
    ROTATIONS[p] = states;
  });

  // Level-Gravity nach Guideline-Formel (Sekunden pro Reihe).
  function gravityMs(level) {
    var l = Math.max(1, Math.min(level, 30));
    var sec = Math.pow(0.8 - (l - 1) * 0.007, l - 1);
    return Math.max(16, sec * 1000);
  }

  function emptyBoard() {
    var b = [], y, x;
    for (y = 0; y < TOTAL_ROWS; y++) {
      var row = new Array(COLS);
      for (x = 0; x < COLS; x++) { row[x] = 0; }
      b.push(row);
    }
    return b;
  }

  var MODE_DEFAULTS = {
    marathon: { goalLines: 0, timeLimit: 0, levelUp: true, startLevel: 1 },
    sprint: { goalLines: 40, timeLimit: 0, levelUp: false, startLevel: 1 },
    ultra: { goalLines: 0, timeLimit: 120000, levelUp: true, startLevel: 1 },
    zen: { goalLines: 0, timeLimit: 0, levelUp: false, startLevel: 1 },
    daily: { goalLines: 0, timeLimit: 0, levelUp: true, startLevel: 1 },
    cheese: { goalLines: 0, timeLimit: 0, levelUp: false, startLevel: 1, garbage: 9 }
  };

  function Engine(opts) {
    opts = opts || {};
    this.mode = opts.mode || 'marathon';
    this.rules = Object.assign({}, MODE_DEFAULTS[this.mode] || MODE_DEFAULTS.marathon, opts.rules || {});
    this.settings = Object.assign({
      das: 150, arr: 33, softDropFactor: 20, lockDelay: 500, maxLockResets: 15,
      nextCount: 5, ghost: true, startLevel: 1
    }, opts.settings || {});
    this.onEvent = opts.onEvent || function () {};
    this.seed = opts.seed != null ? opts.seed : (Math.random() * 0xFFFFFFFF) >>> 0;
    this.reset();
  }

  Engine.COLS = COLS;
  Engine.ROWS = ROWS;
  Engine.HIDDEN = HIDDEN;
  Engine.TOTAL_ROWS = TOTAL_ROWS;
  Engine.PIECES = PIECES;
  Engine.PIECE_ID = PIECE_ID;
  Engine.ROTATIONS = ROTATIONS;
  Engine.gravityMs = gravityMs;

  Engine.prototype.reset = function () {
    this.rand = mulberry32(this.seed);
    this.board = emptyBoard();
    this.bag = [];
    this.queue = [];
    this.piece = null;
    this.hold = null;
    this.holdUsed = false;
    this.phase = 'ready'; // ready | playing | clearing | paused | over
    this.countdown = 0;

    this.score = 0;
    this.lines = 0;
    this.level = this.settings.startLevel || this.rules.startLevel || 1;
    this.startLevel = this.level;
    this.combo = -1;
    this.b2b = 0;
    this.elapsed = 0;
    this.piecesPlaced = 0;
    this.maxCombo = 0;
    this.tetrises = 0;
    this.tspins = 0;
    this.perfectClears = 0;
    this.holdCount = 0;
    this.finished = false;
    this.win = false;
    this.coinsEarned = 0;

    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.clearTimer = 0;
    this.clearingRows = [];
    this.softDropping = false;
    this.lastAction = null; // 'move' | 'rotate'
    this.lastKick = 0;
    this.gravityMultiplier = 1;
    this.slowUntil = 0;
    this.linesSinceLevel = 0;

    for (var i = 0; i < 7; i++) { this.refillQueue(); }
    if (this.rules.garbage) { this.addGarbage(this.rules.garbage); }
    this.spawn();
  };

  Engine.prototype.refillQueue = function () {
    if (this.bag.length === 0) {
      this.bag = PIECES.slice();
      // Fisher-Yates mit seed-fähigem RNG
      for (var i = this.bag.length - 1; i > 0; i--) {
        var j = Math.floor(this.rand() * (i + 1));
        var tmp = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = tmp;
      }
    }
    this.queue.push(this.bag.pop());
  };

  Engine.prototype.addGarbage = function (rows) {
    for (var r = 0; r < rows; r++) {
      var hole = Math.floor(this.rand() * COLS);
      this.board.shift();
      var row = new Array(COLS);
      for (var x = 0; x < COLS; x++) { row[x] = x === hole ? 0 : 8; }
      this.board.push(row);
    }
  };

  Engine.prototype.makePiece = function (type) {
    var states = ROTATIONS[type];
    var size = states[0].length;
    return {
      type: type,
      id: PIECE_ID[type],
      rot: 0,
      x: Math.floor((COLS - size) / 2),
      y: type === 'I' ? HIDDEN - 2 : HIDDEN - 2,
      size: size
    };
  };

  Engine.prototype.cells = function (piece, rot, px, py) {
    var m = ROTATIONS[piece.type][((rot == null ? piece.rot : rot) % 4 + 4) % 4];
    var x = px == null ? piece.x : px;
    var y = py == null ? piece.y : py;
    var out = [], r, c;
    for (r = 0; r < m.length; r++) {
      for (c = 0; c < m.length; c++) {
        if (m[r][c]) { out.push([x + c, y + r]); }
      }
    }
    return out;
  };

  Engine.prototype.collides = function (piece, rot, px, py) {
    var cs = this.cells(piece, rot, px, py);
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i][0], y = cs[i][1];
      if (x < 0 || x >= COLS || y >= TOTAL_ROWS) { return true; }
      if (y >= 0 && this.board[y][x]) { return true; }
    }
    return false;
  };

  Engine.prototype.spawn = function (type) {
    while (this.queue.length < Math.max(7, this.settings.nextCount + 1)) { this.refillQueue(); }
    var t = type || this.queue.shift();
    var p = this.makePiece(t);
    // Sofort eine Zeile fallen lassen, wenn möglich (Guideline-Spawn).
    if (!this.collides(p, p.rot, p.x, p.y + 1)) { p.y += 1; }
    this.piece = p;
    this.holdUsed = false;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.gravityAcc = 0;
    this.lastAction = null;
    this.lastKick = 0;
    if (this.collides(p, p.rot, p.x, p.y)) {
      this.gameOver(false);
      return false;
    }
    this.emit('spawn', { type: t });
    return true;
  };

  Engine.prototype.emit = function (name, data) {
    this.onEvent(name, data || {}, this);
  };

  /* ---------------- Eingaben ---------------- */

  Engine.prototype.move = function (dir) {
    if (this.phase !== 'playing' || !this.piece) { return false; }
    if (!this.collides(this.piece, this.piece.rot, this.piece.x + dir, this.piece.y)) {
      this.piece.x += dir;
      this.lastAction = 'move';
      this.onGroundedChange();
      this.emit('move', { dir: dir });
      return true;
    }
    return false;
  };

  Engine.prototype.rotate = function (dir) { // 1 = CW, -1 = CCW, 2 = 180
    if (this.phase !== 'playing' || !this.piece) { return false; }
    var p = this.piece;
    if (p.type === 'O') { return false; }
    var from = p.rot;
    var to = ((from + (dir === 2 ? 2 : dir)) % 4 + 4) % 4;
    var table = p.type === 'I' ? KICKS_I : KICKS_JLSTZ;
    var kicks = table[from + '>' + to];
    if (dir === 2 || !kicks) {
      // 180° ist nicht Teil von SRS — einfache Kicks als Komfortfeature.
      kicks = [[0, 0], [0, -1], [1, 0], [-1, 0], [0, 1]];
    }
    for (var i = 0; i < kicks.length; i++) {
      var kx = kicks[i][0], ky = -kicks[i][1];
      if (!this.collides(p, to, p.x + kx, p.y + ky)) {
        p.rot = to; p.x += kx; p.y += ky;
        this.lastAction = 'rotate';
        this.lastKick = i;
        this.onGroundedChange();
        this.emit('rotate', { dir: dir, kick: i });
        return true;
      }
    }
    this.emit('rotatefail', {});
    return false;
  };

  Engine.prototype.onGroundedChange = function () {
    if (this.isGrounded()) {
      if (this.lockResets < this.settings.maxLockResets) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    } else {
      this.lockTimer = 0;
    }
  };

  Engine.prototype.isGrounded = function () {
    return this.piece ? this.collides(this.piece, this.piece.rot, this.piece.x, this.piece.y + 1) : false;
  };

  Engine.prototype.ghostY = function () {
    if (!this.piece) { return 0; }
    var y = this.piece.y;
    while (!this.collides(this.piece, this.piece.rot, this.piece.x, y + 1)) { y++; }
    return y;
  };

  Engine.prototype.softDrop = function () {
    if (this.phase !== 'playing' || !this.piece) { return false; }
    if (!this.collides(this.piece, this.piece.rot, this.piece.x, this.piece.y + 1)) {
      this.piece.y++;
      this.score += 1;
      this.lastAction = 'move';
      this.emit('softdrop', {});
      return true;
    }
    return false;
  };

  Engine.prototype.hardDrop = function () {
    if (this.phase !== 'playing' || !this.piece) { return false; }
    var start = this.piece.y;
    var gy = this.ghostY();
    var dist = gy - start;
    this.piece.y = gy;
    this.score += dist * 2;
    this.emit('harddrop', { distance: dist, x: this.piece.x, y: gy });
    this.lockPiece(true);
    return true;
  };

  Engine.prototype.holdPiece = function () {
    if (this.phase !== 'playing' || !this.piece || this.holdUsed) { return false; }
    var cur = this.piece.type;
    var swap = this.hold;
    this.hold = cur;
    this.holdCount++;
    if (swap) { this.spawn(swap); } else { this.spawn(); }
    this.holdUsed = true;
    this.emit('hold', { type: cur });
    return true;
  };

  /* ---------------- T-Spin ---------------- */

  Engine.prototype.detectTSpin = function () {
    var p = this.piece;
    if (!p || p.type !== 'T' || this.lastAction !== 'rotate') { return null; }
    var cx = p.x + 1, cy = p.y + 1;
    var corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    var occupied = corners.map(function (c) {
      var x = cx + c[0], y = cy + c[1];
      if (x < 0 || x >= COLS || y >= TOTAL_ROWS) { return true; }
      if (y < 0) { return false; }
      return !!this.board[y][x];
    }, this);
    var count = occupied.filter(Boolean).length;
    if (count < 3) { return null; }
    // "Vordere" Ecken je nach Rotation (0=oben,1=rechts,2=unten,3=links)
    var frontIdx = [[0, 1], [1, 3], [3, 2], [2, 0]][p.rot];
    var front = occupied[frontIdx[0]] && occupied[frontIdx[1]];
    if (front || this.lastKick === 4) { return 'tspin'; }
    return 'mini';
  };

  /* ---------------- Lock & Clear ---------------- */

  Engine.prototype.lockPiece = function (fromHardDrop) {
    var p = this.piece;
    if (!p) { return; }
    var tspin = this.detectTSpin();
    var cs = this.cells(p);
    var topOut = true;
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i][0], y = cs[i][1];
      if (y >= 0) { this.board[y][x] = p.id; }
      if (y >= HIDDEN) { topOut = false; }
    }
    this.piecesPlaced++;
    this.emit('lock', { cells: cs, type: p.type, hard: !!fromHardDrop });
    this.piece = null;

    var rows = [];
    for (var y2 = 0; y2 < TOTAL_ROWS; y2++) {
      var full = true;
      for (var x2 = 0; x2 < COLS; x2++) { if (!this.board[y2][x2]) { full = false; break; } }
      if (full) { rows.push(y2); }
    }

    if (topOut && rows.length === 0) {
      this.gameOver(false);
      return;
    }

    if (rows.length) {
      this.clearingRows = rows;
      this.applyScore(rows.length, tspin);
      this.phase = 'clearing';
      this.clearTimer = 260;
    } else {
      if (tspin) {
        var pts = (tspin === 'mini' ? 100 : 400) * this.level;
        this.score += pts;
        this.tspins++;
        this.emit('tspin', { kind: tspin, lines: 0, points: pts });
      }
      this.combo = -1;
      this.spawn();
    }
  };

  Engine.prototype.applyScore = function (n, tspin) {
    var lvl = this.level;
    var base, name;
    if (tspin === 'tspin') {
      base = [0, 800, 1200, 1600][n] || 400;
      name = 'T-Spin ' + ['', 'Single', 'Double', 'Triple'][n];
      this.tspins++;
    } else if (tspin === 'mini') {
      base = [0, 200, 400, 600][n] || 100;
      name = 'T-Spin Mini';
      this.tspins++;
    } else {
      base = [0, 100, 300, 500, 800][n];
      name = ['', 'Single', 'Double', 'Triple', 'TETRIS'][n];
      if (n === 4) { this.tetrises++; }
    }

    var difficult = (n === 4) || !!tspin;
    var b2bBonus = 0;
    if (difficult && this.b2b > 0) { b2bBonus = Math.floor(base * 0.5); }
    var points = (base + b2bBonus) * lvl;

    this.combo++;
    if (this.combo > this.maxCombo) { this.maxCombo = this.combo; }
    var comboPts = this.combo > 0 ? 50 * this.combo * lvl : 0;
    points += comboPts;

    // Perfect Clear prüfen (Brett nach dem Clear leer?)
    var pc = this.wouldBePerfectClear(this.clearingRows);
    if (pc) {
      var pcBonus = [0, 800, 1200, 1800, 2000][n] * lvl;
      points += pcBonus;
      this.perfectClears++;
    }

    if (difficult) { this.b2b++; } else { this.b2b = 0; }

    this.score += points;
    this.lines += n;
    this.linesSinceLevel += n;

    var coins = this.computeCoins(n, tspin, difficult && b2bBonus > 0, this.combo, pc);
    this.coinsEarned += coins;

    this.emit('clear', {
      lines: n, name: name, tspin: tspin, points: points, combo: this.combo,
      b2b: this.b2b, perfectClear: pc, coins: coins, rows: this.clearingRows.slice()
    });

    if (this.rules.levelUp) {
      while (this.linesSinceLevel >= 10) {
        this.linesSinceLevel -= 10;
        this.level++;
        this.emit('levelup', { level: this.level });
      }
    }
    if (this.rules.goalLines && this.lines >= this.rules.goalLines) {
      this.gameOver(true);
    }
  };

  Engine.prototype.wouldBePerfectClear = function (rows) {
    var set = {};
    rows.forEach(function (r) { set[r] = true; });
    for (var y = 0; y < TOTAL_ROWS; y++) {
      if (set[y]) { continue; }
      for (var x = 0; x < COLS; x++) { if (this.board[y][x]) { return false; } }
    }
    return true;
  };

  Engine.prototype.computeCoins = function (n, tspin, b2b, combo, pc) {
    var c = [0, 1, 3, 6, 12][n] || 0;
    if (tspin) { c += tspin === 'mini' ? 3 : 8; }
    if (b2b) { c += 4; }
    if (combo > 0) { c += Math.min(combo, 10) * 2; }
    if (pc) { c += 40; }
    return c;
  };

  Engine.prototype.finishClear = function () {
    var rows = this.clearingRows;
    rows.sort(function (a, b) { return a - b; });
    for (var i = 0; i < rows.length; i++) {
      this.board.splice(rows[i], 1);
      var row = new Array(COLS);
      for (var x = 0; x < COLS; x++) { row[x] = 0; }
      this.board.unshift(row);
    }
    this.clearingRows = [];
    // Erst jetzt ist das Brett wirklich aufgeräumt — Modi wie „Käse"
    // prüfen hier ihr Ziel und können das Spiel noch beenden.
    this.emit('afterclear', { rows: rows.length });
    if (!this.finished) {
      this.phase = 'playing';
      this.spawn();
    }
  };

  /* ---------------- Power-Ups ---------------- */

  Engine.prototype.powerBomb = function () {
    // Untere 3 Reihen sprengen.
    var removed = 0;
    for (var i = 0; i < 3; i++) {
      var y = TOTAL_ROWS - 1;
      var any = false;
      for (var x = 0; x < COLS; x++) { if (this.board[y][x]) { any = true; break; } }
      if (!any) { break; }
      this.board.splice(y, 1);
      var row = new Array(COLS);
      for (var x2 = 0; x2 < COLS; x2++) { row[x2] = 0; }
      this.board.unshift(row);
      removed++;
    }
    this.emit('power', { kind: 'bomb', rows: removed });
    return removed;
  };

  Engine.prototype.powerSlow = function (ms) {
    this.slowUntil = this.elapsed + (ms || 20000);
    this.emit('power', { kind: 'slow', ms: ms || 20000 });
    return true;
  };

  Engine.prototype.powerSwap = function () {
    if (!this.piece) { return false; }
    var choices = PIECES.filter(function (p) { return p !== this.piece.type; }, this);
    var t = choices[Math.floor(this.rand() * choices.length)];
    this.spawn(t);
    this.emit('power', { kind: 'swap', type: t });
    return true;
  };

  Engine.prototype.powerClean = function () {
    // Entfernt alle "Löcher" der obersten 6 belegten Reihen nicht — stattdessen:
    // Räumt die 2 höchsten belegten Reihen ab (Notfallhilfe).
    var top = -1;
    for (var y = 0; y < TOTAL_ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (this.board[y][x]) { top = y; break; }
      }
      if (top >= 0) { break; }
    }
    if (top < 0) { return 0; }
    var removed = 0;
    for (var i = 0; i < 2 && top + i < TOTAL_ROWS; i++) {
      this.board.splice(top, 1);
      var row = new Array(COLS);
      for (var x2 = 0; x2 < COLS; x2++) { row[x2] = 0; }
      this.board.unshift(row);
      removed++;
    }
    this.emit('power', { kind: 'clean', rows: removed });
    return removed;
  };

  Engine.prototype.revive = function () {
    // Bretthälfte leeren und weiterspielen.
    for (var y = 0; y < TOTAL_ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (y < TOTAL_ROWS - 6) { this.board[y][x] = 0; }
      }
    }
    this.finished = false;
    this.win = false;
    this.phase = 'playing';
    this.combo = -1;
    this.spawn();
    this.emit('revive', {});
  };

  /* ---------------- Loop ---------------- */

  Engine.prototype.gameOver = function (win) {
    if (this.finished) { return; }
    this.finished = true;
    this.win = !!win;
    this.phase = 'over';
    this.piece = null;
    this.emit('gameover', { win: !!win });
  };

  Engine.prototype.pause = function () {
    if (this.phase === 'playing' || this.phase === 'clearing') {
      this.prevPhase = this.phase;
      this.phase = 'paused';
      this.emit('pause', {});
    }
  };

  Engine.prototype.resume = function () {
    if (this.phase === 'paused') {
      this.phase = this.prevPhase || 'playing';
      this.emit('resume', {});
    }
  };

  Engine.prototype.currentGravity = function () {
    var g = gravityMs(this.level);
    if (this.elapsed < this.slowUntil) { g *= 2.5; }
    return g / (this.gravityMultiplier || 1);
  };

  Engine.prototype.update = function (dt) {
    if (this.phase === 'paused' || this.phase === 'over') { return; }
    this.elapsed += dt;

    if (this.rules.timeLimit && this.elapsed >= this.rules.timeLimit) {
      this.gameOver(true);
      return;
    }

    if (this.phase === 'clearing') {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) { this.finishClear(); }
      return;
    }

    if (this.phase !== 'playing' || !this.piece) { return; }

    var g = this.currentGravity();
    if (this.softDropping) { g = Math.max(1, Math.min(g, g / this.settings.softDropFactor)); }

    this.gravityAcc += dt;
    var guard = 0;
    while (this.gravityAcc >= g && guard < 40) {
      this.gravityAcc -= g;
      guard++;
      if (!this.collides(this.piece, this.piece.rot, this.piece.x, this.piece.y + 1)) {
        this.piece.y++;
        if (this.softDropping) { this.score += 1; }
        this.lastAction = 'move';
      } else {
        this.gravityAcc = 0;
        break;
      }
    }

    if (this.isGrounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= this.settings.lockDelay) { this.lockPiece(false); }
    } else {
      this.lockTimer = 0;
    }
  };

  Engine.prototype.getVisibleBoard = function () {
    return this.board.slice(HIDDEN);
  };

  Engine.prototype.stats = function () {
    var minutes = this.elapsed / 60000;
    return {
      score: this.score, lines: this.lines, level: this.level,
      time: this.elapsed, pieces: this.piecesPlaced,
      pps: minutes > 0 ? this.piecesPlaced / (this.elapsed / 1000) : 0,
      lpm: minutes > 0 ? this.lines / minutes : 0,
      tetrises: this.tetrises, tspins: this.tspins,
      maxCombo: this.maxCombo, perfectClears: this.perfectClears,
      coins: this.coinsEarned
    };
  };

  T.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);

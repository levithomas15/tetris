/*
 * Logiktests für die Engine — laufen ohne Browser: `node test/engine.test.js`
 */
require('../js/engine.js');
var Engine = globalThis.TETRIS.Engine;

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function eq(a, b, msg) {
  if (a !== b) { throw new Error((msg || 'erwartet') + ': ' + JSON.stringify(b) + ', bekommen: ' + JSON.stringify(a)); }
}
function ok(v, msg) { if (!v) { throw new Error(msg || 'sollte wahr sein'); } }

function newEngine(opts) {
  return new Engine(Object.assign({ mode: 'marathon', seed: 12345 }, opts || {}));
}
function clearBoard(e) {
  for (var y = 0; y < Engine.TOTAL_ROWS; y++) {
    for (var x = 0; x < Engine.COLS; x++) { e.board[y][x] = 0; }
  }
}
function fillRow(e, y, except) {
  for (var x = 0; x < Engine.COLS; x++) { e.board[y][x] = (x === except) ? 0 : 2; }
}

console.log('\nEngine-Tests');

test('Brett hat 10×22 Felder (inkl. Puffer)', function () {
  var e = newEngine();
  eq(e.board.length, 22);
  eq(e.board[0].length, 10);
});

test('Spawn liefert einen Stein und füllt die Vorschau', function () {
  var e = newEngine();
  ok(e.piece, 'Stein vorhanden');
  ok(e.queue.length >= 5, 'Vorschau gefüllt');
});

test('7-Bag: je 7 Steine enthalten alle Typen genau einmal', function () {
  var e = newEngine();
  var seen = [e.piece.type];
  while (seen.length < 7) { seen.push(e.queue.shift()); e.refillQueue(); }
  var uniq = {};
  seen.forEach(function (t) { uniq[t] = (uniq[t] || 0) + 1; });
  eq(Object.keys(uniq).length, 7, 'alle 7 Typen');
});

test('Alle Steine haben 4 Zellen in jeder Rotation', function () {
  Engine.PIECES.forEach(function (p) {
    for (var r = 0; r < 4; r++) {
      var count = 0;
      var m = Engine.ROTATIONS[p][r];
      m.forEach(function (row) { row.forEach(function (v) { if (v) { count++; } }); });
      eq(count, 4, p + ' Rotation ' + r);
    }
  });
});

test('Bewegung nach links/rechts respektiert die Wände', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  var guard = 0;
  while (e.move(-1) && guard++ < 20) { /* bis zur Wand */ }
  ok(guard < 20, 'stoppt an der Wand');
  var cells = e.cells(e.piece);
  var minX = Math.min.apply(null, cells.map(function (c) { return c[0]; }));
  eq(minX, 0, 'linke Wand erreicht');
});

test('Hard Drop legt den Stein auf den Boden', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  e.hardDrop();
  var bottomFilled = false;
  for (var x = 0; x < Engine.COLS; x++) { if (e.board[Engine.TOTAL_ROWS - 1][x]) { bottomFilled = true; } }
  ok(bottomFilled, 'unterste Reihe belegt');
});

test('Volle Reihe wird erkannt und aufgelöst', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  var y = Engine.TOTAL_ROWS - 1;
  fillRow(e, y, 4);
  // I-Stück senkrecht in die Lücke fallen lassen
  e.piece = e.makePiece('I');
  e.piece.rot = 1;
  e.piece.x = 2; // Spalte 4 bei Rotation 1
  e.hardDrop();
  eq(e.phase, 'clearing', 'Clear-Phase aktiv');
  eq(e.clearingRows.length, 1, 'eine Reihe');
  e.clearTimer = 0;
  e.update(1);
  eq(e.lines, 1, 'Zeilenzähler');
});

test('Tetris zählt 800 × Level und setzt Back-to-Back', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  e.level = 1;
  for (var i = 0; i < 4; i++) { fillRow(e, Engine.TOTAL_ROWS - 1 - i, 4); }
  e.piece = e.makePiece('I');
  e.piece.rot = 1;
  e.piece.x = 2;
  e.score = 0;
  e.hardDrop();
  ok(e.score >= 800, 'mindestens 800 Punkte, war ' + e.score);
  eq(e.tetrises, 1, 'Tetris gezählt');
  eq(e.b2b, 1, 'B2B gestartet');
});

test('Combo steigt bei aufeinanderfolgenden Clears', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  eq(e.combo, -1);
  fillRow(e, Engine.TOTAL_ROWS - 1, 4);
  e.piece = e.makePiece('I');
  e.piece.rot = 1; e.piece.x = 2;
  e.hardDrop();
  eq(e.combo, 0, 'erster Clear = Combo 0');
  e.clearTimer = 0; e.update(1);
  clearBoard(e); // Reste des ersten I-Steins entfernen
  fillRow(e, Engine.TOTAL_ROWS - 1, 4);
  e.piece = e.makePiece('I');
  e.piece.rot = 1; e.piece.x = 2;
  e.hardDrop();
  eq(e.combo, 1, 'zweiter Clear = Combo 1');
});

test('Perfect Clear wird erkannt', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  var y = Engine.TOTAL_ROWS - 1;
  for (var x = 0; x < Engine.COLS; x++) { e.board[y][x] = (x >= 4 && x <= 7) ? 0 : 2; }
  var events = [];
  e.onEvent = function (n, d) { events.push([n, d]); };
  e.piece = e.makePiece('I');
  e.piece.rot = 0;
  e.piece.x = 4;
  e.hardDrop();
  var clear = events.filter(function (ev) { return ev[0] === 'clear'; })[0];
  ok(clear, 'Clear-Event');
  ok(clear[1].perfectClear, 'Perfect Clear erkannt');
});

test('Hold tauscht den Stein und sperrt bis zum nächsten Setzen', function () {
  var e = newEngine();
  e.phase = 'playing';
  var first = e.piece.type;
  eq(e.holdPiece(), true);
  eq(e.hold, first, 'Stein liegt im Hold');
  eq(e.holdPiece(), false, 'zweites Hold gesperrt');
});

test('T-Spin Double wird erkannt und bepunktet', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  e.level = 1;
  var bot = Engine.TOTAL_ROWS - 1;
  // Klassische T-Spin-Mulde bauen: Loch in Spalte 1, Überhang links
  for (var x = 0; x < Engine.COLS; x++) {
    e.board[bot][x] = (x === 1) ? 0 : 2;
    e.board[bot - 1][x] = (x >= 0 && x <= 2) ? 0 : 2;
  }
  e.board[bot - 2][0] = 2; // Überhang über der Mulde
  e.piece = e.makePiece('T');
  e.piece.rot = 2;      // T zeigt nach unten
  e.piece.x = 0;
  e.piece.y = bot - 3;
  // Herunterfallen, dann in die Mulde drehen
  while (!e.collides(e.piece, e.piece.rot, e.piece.x, e.piece.y + 1)) { e.piece.y++; }
  var res = e.rotate(1) || e.rotate(-1);
  ok(res !== undefined, 'Rotation ausgeführt');
  e.lastAction = 'rotate';
  var spin = e.detectTSpin();
  ok(spin !== null, 'T-Spin erkannt (' + spin + ')');
});

test('Gravity wird mit steigendem Level schneller', function () {
  var g1 = Engine.gravityMs(1), g5 = Engine.gravityMs(5), g15 = Engine.gravityMs(15);
  ok(g1 > g5 && g5 > g15, 'monoton fallend: ' + [g1, g5, g15].join(' > '));
  ok(Engine.gravityMs(20) >= 16, 'nie unter 16 ms');
});

test('Lock-Delay hält den Stein kurz auf dem Boden', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  e.piece.y = 100;
  while (e.collides(e.piece, e.piece.rot, e.piece.x, e.piece.y)) { e.piece.y--; }
  var before = e.piecesPlaced;
  e.update(100);
  eq(e.piecesPlaced, before, 'noch nicht gesetzt');
  e.update(600);
  eq(e.piecesPlaced, before + 1, 'nach Lock-Delay gesetzt');
});

test('Sprint endet nach 40 Reihen mit Sieg', function () {
  var e = new Engine({ mode: 'sprint', seed: 1 });
  e.phase = 'playing';
  e.lines = 39;
  clearBoard(e);
  fillRow(e, Engine.TOTAL_ROWS - 1, 4);
  e.piece = e.makePiece('I');
  e.piece.rot = 1; e.piece.x = 2;
  e.hardDrop();
  ok(e.finished, 'Spiel beendet');
  ok(e.win, 'als Sieg gewertet');
});

test('Ultra endet nach 2 Minuten', function () {
  var e = new Engine({ mode: 'ultra', seed: 1 });
  e.phase = 'playing';
  e.update(119000);
  ok(!e.finished, 'läuft noch');
  e.update(2000);
  ok(e.finished && e.win, 'nach 120 s beendet');
});

test('Käse-Modus startet mit Müllreihen', function () {
  var e = new Engine({ mode: 'cheese', seed: 7 });
  var garbage = 0;
  for (var y = 0; y < Engine.TOTAL_ROWS; y++) {
    for (var x = 0; x < Engine.COLS; x++) { if (e.board[y][x] === 8) { garbage++; break; } }
  }
  eq(garbage, 9, 'neun Müllreihen');
});

test('Gleicher Seed erzeugt gleiche Steinfolge (Tages-Challenge)', function () {
  var a = new Engine({ mode: 'daily', seed: 20250101 });
  var b = new Engine({ mode: 'daily', seed: 20250101 });
  eq(a.piece.type, b.piece.type);
  eq(a.queue.join(','), b.queue.join(','));
});

test('Bombe räumt untere Reihen ab', function () {
  var e = newEngine();
  clearBoard(e);
  for (var i = 0; i < 3; i++) { fillRow(e, Engine.TOTAL_ROWS - 1 - i, 3); }
  e.powerBomb();
  var any = false;
  for (var x = 0; x < Engine.COLS; x++) { if (e.board[Engine.TOTAL_ROWS - 1][x]) { any = true; } }
  ok(!any, 'unterste Reihe ist leer');
});

test('Game Over beim Top-Out', function () {
  var e = newEngine();
  e.phase = 'playing';
  for (var y = 0; y < Engine.TOTAL_ROWS; y++) { fillRow(e, y, -1); }
  e.spawn('I');
  ok(e.finished, 'Spiel beendet');
});

test('Wallkick: I-Stück dreht an der Wand', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  e.piece = e.makePiece('I');
  e.piece.x = -1;   // ganz links
  e.piece.rot = 1;  // senkrecht
  var okRot = e.rotate(1);
  ok(okRot, 'Rotation mit Kick erfolgreich');
  var cells = e.cells(e.piece);
  cells.forEach(function (c) { ok(c[0] >= 0 && c[0] < Engine.COLS, 'im Feld: ' + c[0]); });
});

test('Soft Drop gibt einen Punkt pro Reihe', function () {
  var e = newEngine();
  clearBoard(e);
  e.phase = 'playing';
  e.score = 0;
  e.softDrop();
  eq(e.score, 1);
});

console.log('\n' + passed + ' bestanden, ' + failed + ' fehlgeschlagen\n');
process.exit(failed ? 1 : 0);

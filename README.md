# 🎮 Blocktris — Tetris fürs Handy im Game-Boy-Color-Look

Ein komplettes Tetris-Spiel als Web-App: läuft direkt im Handy-Browser, ohne
Installation, ohne Internet (nach dem ersten Laden), ohne Werbung.
Mit Shop-System, Power-Ups, Erfolgen und der Original-Tetris-Melodie.

## ▶ Jetzt spielen: **https://levithomas15.github.io/tetris/**

Link am Handy öffnen → Teilen-Menü → „Zum Home-Bildschirm hinzufügen".
Danach läuft es im Vollbild wie eine echte App, auch ohne Internet.

---

## Highlights

* **Echtes Tetris-Gefühl** — SRS-Rotation mit Wallkicks, 7-Bag-Zufall, Hold,
  Geisterstein, Lock-Delay, T-Spins, Back-to-Back, Combos, Perfect Clear.
* **Für Daumen gemacht** — Wisch-Gesten *und* Game-Boy-Tasten, beides parallel.
* **Original-Musik** — „Korobeiniki" als Chiptune, live synthetisiert.
  Wird schneller, wenn der Stapel hoch ist — wie im Original.
* **Shop & Fortschritt** — Münzen sammeln, Skins, Gehäuse, Items und
  dauerhafte Upgrades kaufen.
* **6 Spielmodi**, **30 Erfolge**, **Tages-Challenge** mit täglich neuer,
  für alle gleicher Steinfolge.

---

## Steuerung

| Geste | Wirkung |
|---|---|
| Tippen aufs Feld | Stein drehen |
| Wischen ← → | Bewegen (rastet pro Feld ein) |
| Ziehen ↓ | Sanft fallen lassen |
| Schnippen ↓ | Sofort fallen (Hard Drop) |
| Wischen ↑ | Halten (Hold) |

Dazu die klassischen Tasten: **D-Pad**, **A/B** (drehen), **HOLD**, **START**
(Pause), **DROP**. Alles lässt sich in den Optionen anpassen
(DAS/ARR, Linkshänder-Layout, Gesten aus, Vibration).

**Tastatur:** ← → ↓ bewegen · ↑/X drehen · Z gegen den Uhrzeigersinn ·
A um 180° · Leertaste Hard Drop · C/Shift Hold · P/Esc Pause · R Neustart ·
1–4 Power-Ups.

---

## Spielmodi

| Modus | Ziel |
|---|---|
| **Marathon** | Endlos, Level steigt alle 10 Reihen |
| **Sprint 40** | 40 Reihen auf Zeit |
| **Ultra 2:00** | Maximale Punktzahl in 2 Minuten |
| **Zen** | Kein Levelanstieg, entspanntes Bauen |
| **Käse** | 9 Müllreihen abbauen |
| **Tages-Challenge** | Jeden Tag dieselbe Steinfolge für alle |

## Shop

Münzen gibt es fürs Spielen (Reihen, Combos, T-Spins, Perfect Clears),
für Erfolge und als Tagesbonus mit Serien-Bonus.

* **9 Block-Skins** — Game Boy Color, DMG-Grün, Neon, Candy, Eis, Magma,
  Tinte, Gold, Regenbogen (mit Echtzeit-Farbwechsel)
* **8 Gehäuse** — Berry, Teal, Grape, Kiwi, Atomic Purple, DMG-Grau,
  Midnight, Ghost. Färbt die ganze Oberfläche um.
* **4 Power-Ups** — 💣 Bombe, ⏳ Zeitlupe, 🔄 Steintausch, 🧹 Planierer
* **6 Upgrades** — Münz-Magnet, Startlevel, Item-Gürtel, Extraleben,
  Weitblick (mehr Vorschau), Punkte-Turbo
* **3 Musikstücke**

## Punkte

Single 100 · Double 300 · Triple 500 · **Tetris 800** (× Level) ·
T-Spin Double 1200 · Back-to-Back +50 % · Combo 50 × n ·
Perfect Clear bis 2000 · Soft Drop 1/Reihe · Hard Drop 2/Reihe.

---

## Technik

Reines HTML/CSS/JavaScript — kein Build, keine Abhängigkeiten, keine Tracker.

```
index.html            Aufbau: Gehäuse, Bildschirm, Menüs
css/styles.css        Game-Boy-Optik, responsives Layout
js/engine.js          Spiellogik (SRS, Bag, Punkte) — ohne DOM, testbar
js/render.js          Canvas: Feld, Vorschau, Partikel, Effekte
js/audio.js           Chiptune-Synth: Musik + Soundeffekte
js/input.js           Touch-Tasten (DAS/ARR), Gesten, Tastatur
js/shop.js            Speicherstand, Münzen, Shop, Erfolge
js/ui.js              Menüs, Shop-Ansichten, Optionen
js/main.js            Spielablauf, Loop, HUD
sw.js                 Service Worker (offline spielbar)
test/engine.test.js   22 Logiktests
```

**Tests ausführen:**

```bash
node test/engine.test.js
```

**Lokal starten** (nötig für Offline-Modus/Service Worker):

```bash
npx http-server -p 8080 .
# dann http://localhost:8080 öffnen
```

**Veröffentlichung:** Der Workflow `.github/workflows/pages.yml` führt bei
jedem Push auf `main` die Logiktests aus und schiebt die Spieldateien danach
in den Branch `gh-pages`, den GitHub Pages ausliefert. Die Seite aktualisiert
sich also von selbst.

Das Spiel merkt sich alles lokal im Browser (`localStorage`); es werden keine
Daten übertragen.

---

## Musik-Hinweis

Die Titelmelodie ist **„Korobeiniki"**, ein russisches Volkslied aus dem
19. Jahrhundert — die Melodie, die Tetris weltweit bekannt gemacht hat, und
gemeinfrei. Sie ist hier als Chiptune neu arrangiert und wird zur Laufzeit
mit der Web Audio API synthetisiert (keine Audiodateien im Repo). Ebenfalls
gemeinfrei: Bachs Menuett. „Neon Zen" ist eine Eigenkomposition.

Tetris® ist eine Marke der Tetris Holding, LLC. Dieses Projekt ist ein
privates, nicht-kommerzielles Hobbyprojekt ohne Verbindung zum Rechteinhaber.

/* Lehrer-Tafel: Knopf „🖊 Skizzen“ – Skizzen der Klasse (Widget data-widget="skizze" im AB) ansehen,
   bis zu vier auswählen und als Bild auf die aktuelle Tafelseite legen (nebeneinander zum Vergleichen).
   Die Bilder sind normale Tafel-Bilder: verschieben, skalieren und mit dem Stift darauf besprechen. */
(function () {
  'use strict';
  var GT = window.GT, MAX_WAHL = 4;

  var css = document.createElement('style');
  css.textContent = [
    '.sk-dlg{display:flex;flex-direction:column;gap:10px;max-height:70vh}',
    '.sk-dlg-kopf{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px}',
    '.sk-dlg-kopf select{font-size:15px;padding:6px 8px;border-radius:8px}',
    '.sk-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;overflow:auto;padding:4px}',
    '.sk-karte{border:2px solid #cbd5e1;border-radius:10px;background:#fff;padding:6px;cursor:pointer;text-align:left;color:#1e293b;font:inherit}',
    '.sk-karte canvas{width:100%;height:auto;display:block;border-radius:6px;border:1px solid #e2e8f0}',
    '.sk-karte .sk-name{display:flex;justify-content:space-between;gap:6px;font-size:14px;margin-top:5px}',
    '.sk-karte.an{border-color:#006AB3;box-shadow:0 0 0 3px #93c5fd}',
    '.sk-karte .sk-nr{background:#006AB3;color:#fff;border-radius:999px;padding:0 8px;font-weight:bold}',
    '.sk-meldet{color:#b45309;font-weight:bold}',
    '.sk-leer{padding:20px;color:#64748b}'
  ].join('');
  document.head.appendChild(css);

  function angebote() {
    var l = window.lehrerLeiste;
    return (l && l.angebote) || [];
  }

  async function bildHochladen(eintrag, aufgabe, mitName) {
    var c = window.Skizze.alsCanvas(eintrag.wert, 2, { ay: aufgabe.ay, ax: aufgabe.ax, name: mitName ? eintrag.name : '' });
    var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/png'); });
    var fd = new FormData();
    fd.append('datei', blob, 'skizze.png');
    var antwort = await GT.api('POST', '/tafel/api/foto', fd);
    return antwort.url;
  }

  /** Plätze für n Bilder rund um die Mitte der sichtbaren Tafel (Tafel = 1500 × 1000). */
  function plaetze(app, n) {
    var m = app.buehne.mitte(), r = window.Skizze.H / window.Skizze.B;
    var breite = n === 1 ? 960 : n === 2 ? 700 : 620, hoehe = Math.round(breite * r), abstand = 30;
    var spalten = n <= 2 ? n : 2, zeilen = Math.ceil(n / spalten);
    var gesamtB = spalten * breite + (spalten - 1) * abstand, gesamtH = zeilen * hoehe + (zeilen - 1) * abstand;
    var liste = [];
    for (var i = 0; i < n; i++) {
      liste.push({ x: Math.round(m.x - gesamtB / 2 + (i % spalten) * (breite + abstand)),
                   y: Math.round(m.y - gesamtH / 2 + Math.floor(i / spalten) * (hoehe + abstand)),
                   breite: breite, hoehe: hoehe });
    }
    return liste;
  }

  async function dialog(app) {
    var inhalt = document.createElement('div');
    inhalt.className = 'sk-dlg';
    inhalt.innerHTML = '<div class="sk-leer">Lade die Skizzen …</div>';
    var gewaehlt = [], daten = null, aufgabe = null;
    var d = app.dialog({
      titel: '🖊 Skizzen der Klasse an die Tafel', inhalt: inhalt, breit: true,
      knoepfe: [{ text: 'Auf die Tafel', name: 'ok', haupt: true, aktion: async function (api) {
        if (!gewaehlt.length) { return; }
        var knopf = api.knopf('ok');
        knopf.disabled = true; knopf.textContent = 'Wird eingefügt …';
        try {
          var mitName = inhalt.querySelector('.sk-mitname').checked;
          var orte = plaetze(app, gewaehlt.length);
          for (var i = 0; i < gewaehlt.length; i++) {
            var url = await bildHochladen(gewaehlt[i], aufgabe, mitName);
            await app.sende({ op: 'add', seite: app.z.aktuelle_seite,
              objekt: { id: GT.uid('b'), typ: 'bild', url: url, breite: orte[i].breite, hoehe: orte[i].hoehe,
                        x: orte[i].x, y: orte[i].y } });
          }
          api.schliessen();
          GT.toast(gewaehlt.length === 1 ? 'Skizze liegt auf der Tafel' : gewaehlt.length + ' Skizzen liegen nebeneinander auf der Tafel');
        } catch (e) {
          GT.toast(e.message || 'Das hat nicht geklappt.', 'fehler');
          knopf.disabled = false; knopf.textContent = 'Auf die Tafel';
        }
      } }]
    });
    d.knopf('ok').disabled = true;

    function zeichnen() {
      var liste = daten.skizzen.filter(function (s) { return s.nr === aufgabe.nr; });
      var melder = {};
      angebote().forEach(function (a) { if (String(a.aufgabe_id) === aufgabe.nr) { melder[a.schueler_id] = true; } });
      liste.sort(function (a, b) { return (melder[b.schueler_id] ? 1 : 0) - (melder[a.schueler_id] ? 1 : 0); });
      var auswahl = daten.aufgaben.length > 1
        ? '<select class="sk-aufgabe">' + daten.aufgaben.map(function (a) {
          return '<option value="' + a.nr + '"' + (a.nr === aufgabe.nr ? ' selected' : '') + '>Aufgabe ' + a.nr + ' · ' + GT.esc(a.titel) + '</option>';
        }).join('') + '</select>'
        : '<b>Aufgabe ' + aufgabe.nr + ' · ' + GT.esc(aufgabe.titel) + '</b>';
      inhalt.innerHTML = '<div class="sk-dlg-kopf">' + auswahl +
        '<span>Bis zu ' + MAX_WAHL + ' Skizzen antippen – sie kommen nebeneinander auf die Tafel.</span>' +
        '<label><input type="checkbox" class="sk-mitname" checked> Namen zeigen</label></div>' +
        '<div class="sk-raster"></div>';
      var sel = inhalt.querySelector('.sk-aufgabe');
      if (sel) {
        sel.onchange = function () {
          aufgabe = daten.aufgaben.filter(function (a) { return a.nr === sel.value; })[0];
          gewaehlt = []; d.knopf('ok').disabled = true; zeichnen();
        };
      }
      var raster = inhalt.querySelector('.sk-raster');
      if (!liste.length) {
        raster.innerHTML = '<div class="sk-leer">Noch hat niemand bei dieser Aufgabe etwas gezeichnet.</div>';
        return;
      }
      liste.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sk-karte';
        b.appendChild(window.Skizze.alsCanvas(s.wert, 0.5, { ay: aufgabe.ay, ax: aufgabe.ax }));
        var zeile = document.createElement('div');
        zeile.className = 'sk-name';
        zeile.innerHTML = '<span><b>' + GT.esc(s.name) + '</b>' + (melder[s.schueler_id] ? ' <span class="sk-meldet">🙋 möchte vorstellen</span>' : '') +
          '</span><span>' + GT.esc(s.zeit || '') + ' <span class="sk-nr" hidden></span></span>';
        b.appendChild(zeile);
        b.onclick = function () {
          var k = gewaehlt.indexOf(s);
          if (k >= 0) { gewaehlt.splice(k, 1); }
          else if (gewaehlt.length < MAX_WAHL) { gewaehlt.push(s); }
          else { GT.toast('Höchstens ' + MAX_WAHL + ' Skizzen auf einmal.'); }
          raster.querySelectorAll('.sk-karte').forEach(function (x, i) {
            var pos = gewaehlt.indexOf(liste[i]);
            x.classList.toggle('an', pos >= 0);
            var nr = x.querySelector('.sk-nr');
            nr.hidden = pos < 0;
            nr.textContent = pos + 1;
          });
          d.knopf('ok').disabled = !gewaehlt.length;
          d.knopf('ok').textContent = gewaehlt.length > 1 ? gewaehlt.length + ' Skizzen auf die Tafel' : 'Auf die Tafel';
        };
        raster.appendChild(b);
      });
    }

    try {
      var r = await fetch('/lehrer/skizzen', { credentials: 'same-origin' });
      daten = await r.json();
      if (!daten.ok) { throw new Error('Die Skizzen konnten nicht geladen werden.'); }
      if (!daten.aufgaben.length) { inhalt.innerHTML = '<div class="sk-leer">Dieses Arbeitsblatt hat keine Skizzen-Aufgabe.</div>'; return; }
      aufgabe = daten.aufgaben[0];
      zeichnen();
    } catch (e) {
      inhalt.innerHTML = '<div class="sk-leer">' + GT.esc(e.message) + '</div>';
    }
  }

  GT.skizzenDialog = dialog;
})();

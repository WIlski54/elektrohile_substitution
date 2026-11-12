/* Skizzen-Widget: eigene kleine Tafel im AB (Stift, gestrichelt, Beschriften, Radierer, Rückgängig).
   Wird im AB (Schüler: zeichnen, Lehrkraft: nur ansehen) und an der großen Tafel (Bild erzeugen) benutzt.

   Im AB:  <div class="skizze-wrap" data-widget="skizze" data-achse-y="ΔH" data-achse-x="Reaktionsverlauf"
                data-bausteine='["E_A1", "Brombenzol"]'></div>
   Gespeichert wird JSON im Feld a<N>.w<k>:
     {"v":1, "s":[{"f":Farbe 0-3, "g":0|1 gestrichelt, "p":[x,y,x,y,…]}], "t":[{"x","y","s":Text,"f"}], "ay","ax"}
   Koordinaten im festen Raum 900 × 560 (unabhängig von der Bildschirmgröße). Text mit „_“ = tiefgestellt (E_A1). */
(function () {
  'use strict';
  var B = 900, H = 560;
  var FARBEN = ['#1e293b', '#1d4ed8', '#dc2626', '#15803d'];
  var FARB_NAMEN = ['schwarz', 'blau', 'rot', 'grün'];
  var MAX_STRICHE = 400, MAX_PUNKTE = 20000, MAX_TEXTE = 40, MAX_TEXT = 40, MAX_UNDO = 40;
  var ACHSE = { x0: 64, y0: 510, x1: 870, y1: 34 };     // Ursprung links unten, Pfeilspitzen
  var SCHRIFT = '20px Arial, Helvetica, sans-serif';

  function leer() { return { v: 1, s: [], t: [] }; }

  function lesen(wert) {
    var d;
    try { d = JSON.parse(wert || ''); } catch (e) { d = null; }
    var o = leer();
    if (!d || typeof d !== 'object') { return o; }
    var punkte = 0;
    (Array.isArray(d.s) ? d.s : []).slice(0, MAX_STRICHE).forEach(function (s) {
      if (!s || !Array.isArray(s.p) || s.p.length < 2) { return; }
      var p = [];
      for (var i = 0; i + 1 < s.p.length && punkte < MAX_PUNKTE; i += 2) {
        var x = +s.p[i], y = +s.p[i + 1];
        if (isFinite(x) && isFinite(y)) { p.push(Math.round(x), Math.round(y)); punkte++; }
      }
      if (p.length >= 2) { o.s.push({ f: (s.f | 0) % FARBEN.length, g: s.g ? 1 : 0, p: p }); }
    });
    (Array.isArray(d.t) ? d.t : []).slice(0, MAX_TEXTE).forEach(function (t) {
      if (!t || typeof t.s !== 'string' || !isFinite(t.x) || !isFinite(t.y)) { return; }
      o.t.push({ x: Math.round(t.x), y: Math.round(t.y), s: t.s.slice(0, MAX_TEXT), f: (t.f | 0) % FARBEN.length });
    });
    return o;
  }

  function istLeer(d) { return !d.s.length && !d.t.length; }

  // ---------- Zeichnen ----------
  function pfeil(ctx, x0, y0, x1, y1) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    var w = Math.atan2(y1 - y0, x1 - x0), l = 14;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - l * Math.cos(w - 0.4), y1 - l * Math.sin(w - 0.4));
    ctx.lineTo(x1 - l * Math.cos(w + 0.4), y1 - l * Math.sin(w + 0.4));
    ctx.closePath(); ctx.fill();
  }

  /** Text mit Tiefstellung: „E_A1“ → E mit tiefgestelltem A1. Liefert Teile [{t, tief}]. */
  function teile(s) {
    var out = [], re = /_([A-Za-z0-9]+)/g, i = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > i) { out.push({ t: s.slice(i, m.index) }); }
      out.push({ t: m[1], tief: true });
      i = re.lastIndex;
    }
    if (i < s.length) { out.push({ t: s.slice(i) }); }
    return out;
  }

  function textMass(ctx, s) {
    var w = 0;
    teile(s).forEach(function (p) {
      ctx.font = p.tief ? '14px Arial, Helvetica, sans-serif' : SCHRIFT;
      w += ctx.measureText(p.t).width;
    });
    return { w: w, h: 26 };
  }

  function textZeichnen(ctx, t, markiert) {
    var m = textMass(ctx, t.s), x = t.x - m.w / 2, y = t.y;
    ctx.fillStyle = markiert ? 'rgba(253,230,138,.95)' : 'rgba(255,255,255,.85)';
    ctx.fillRect(x - 5, y - 16, m.w + 10, m.h + 4);
    ctx.fillStyle = FARBEN[t.f || 0];
    ctx.textBaseline = 'alphabetic';
    teile(t.s).forEach(function (p) {
      ctx.font = p.tief ? '14px Arial, Helvetica, sans-serif' : SCHRIFT;
      ctx.fillText(p.t, x, y + (p.tief ? 10 : 5));
      x += ctx.measureText(p.t).width;
    });
  }

  function strichZeichnen(ctx, s) {
    var p = s.p;
    ctx.strokeStyle = FARBEN[s.f || 0];
    ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(s.g ? [13, 10] : []);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    if (p.length === 2) { ctx.lineTo(p[0] + 0.1, p[1]); }
    for (var i = 2; i < p.length - 2; i += 2) {          // geglättet über Mittelpunkte
      ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
    }
    if (p.length > 2) { ctx.lineTo(p[p.length - 2], p[p.length - 1]); }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Ganze Skizze in einen 2D-Kontext zeichnen (Maßstab s: 1 = 900 × 560 Pixel). */
  function zeichne(ctx, d, s, opt) {
    opt = opt || {};
    ctx.save();
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, B, H);
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;          // Kästchen
    for (var gx = 0; gx <= B; gx += 28) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += 28) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(B, gy); ctx.stroke(); }
    ctx.strokeStyle = '#334155'; ctx.fillStyle = '#334155'; ctx.lineWidth = 2.5;
    pfeil(ctx, ACHSE.x0, ACHSE.y0 + 8, ACHSE.x0, ACHSE.y1);
    pfeil(ctx, ACHSE.x0 - 8, ACHSE.y0, ACHSE.x1, ACHSE.y0);
    ctx.font = 'bold 20px Arial, Helvetica, sans-serif';
    ctx.textBaseline = 'middle';
    if (opt.ay) { ctx.textAlign = 'left'; ctx.fillText(opt.ay, ACHSE.x0 + 12, ACHSE.y1 + 6); }
    if (opt.ax) { ctx.textAlign = 'right'; ctx.fillText(opt.ax, ACHSE.x1 - 4, ACHSE.y0 + 28); }
    ctx.textAlign = 'left';
    d.s.forEach(function (st) { strichZeichnen(ctx, st); });
    d.t.forEach(function (t, i) { textZeichnen(ctx, t, opt.markiert === i); });
    if (opt.name) {
      ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
      var w = ctx.measureText(opt.name).width;
      ctx.fillStyle = '#006AB3'; ctx.fillRect(B - w - 26, 8, w + 18, 30);
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(opt.name, B - w - 17, 23);
    }
    ctx.restore();
  }

  /** Skizze als Canvas (z. B. für die Tafel). */
  function alsCanvas(wert, s, opt) {
    var c = document.createElement('canvas');
    c.width = Math.round(B * s); c.height = Math.round(H * s);
    zeichne(c.getContext('2d'), typeof wert === 'string' ? lesen(wert) : wert, s, opt);
    return c;
  }

  // ---------- Treffer ----------
  function abstandZuStrecke(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    var t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function trifftStrich(s, x, y, r) {
    var p = s.p;
    if (p.length === 2) { return Math.hypot(p[0] - x, p[1] - y) < r; }
    for (var i = 0; i + 3 < p.length; i += 2) {
      if (abstandZuStrecke(x, y, p[i], p[i + 1], p[i + 2], p[i + 3]) < r) { return true; }
    }
    return false;
  }
  function trifftText(ctx, t, x, y) {
    var m = textMass(ctx, t.s);
    return x > t.x - m.w / 2 - 10 && x < t.x + m.w / 2 + 10 && y > t.y - 22 && y < t.y + 18;
  }

  // ---------- Widget im AB ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text) { e.textContent = text; }
    return e;
  }

  function widget(wrap, cfg) {
    var bearbeiten = !!cfg.bearbeiten;
    var opt = { ay: wrap.getAttribute('data-achse-y') || '', ax: wrap.getAttribute('data-achse-x') || '' };
    var bausteine = [];
    try { bausteine = JSON.parse(wrap.getAttribute('data-bausteine') || '[]'); } catch (e) { bausteine = []; }

    var d = leer(), undo = [], werkzeug = 'stift', farbe = 0, baustein = null, aktiv = null, stiftGesehen = false;
    var ziehText = -1, markiert = -1;

    wrap.innerHTML = '';
    var leiste = el('div', 'skizze-leiste'), chips = el('div', 'skizze-chips');
    var flaeche = el('div', 'skizze-flaeche'), cv = el('canvas', 'skizze-canvas');
    flaeche.appendChild(cv);
    var hinweis = el('div', 'skizze-hinweis');
    if (bearbeiten) { wrap.appendChild(leiste); wrap.appendChild(chips); }
    wrap.appendChild(flaeche);
    if (bearbeiten) { wrap.appendChild(hinweis); }
    var ctx = cv.getContext('2d');

    function knopf(text, titel, fn, cls) {
      var b = el('button', 'sk-knopf' + (cls ? ' ' + cls : ''), text);
      b.type = 'button'; b.title = titel; b.setAttribute('aria-label', titel);
      b.addEventListener('click', fn);
      return b;
    }

    // ----- Werkzeugleiste -----
    var wk = {};
    function werkzeugWaehlen(w) {
      werkzeug = w;
      Object.keys(wk).forEach(function (k) { wk[k].classList.toggle('an', k === w); });
      chips.hidden = w !== 'text';
      if (w !== 'text') { baustein = null; markiereChip(); }
      cv.style.cursor = w === 'radierer' ? 'cell' : w === 'text' ? 'text' : 'crosshair';
      zeigeHinweis();
    }
    function zeigeHinweis() {
      hinweis.textContent = werkzeug === 'text'
        ? (baustein ? 'Tippen Sie in die Skizze, um „' + baustein + '“ zu setzen. Beschriftungen lassen sich verschieben.'
          : 'Wählen Sie oben eine Beschriftung (oder eigener Text). Vorhandene Beschriftungen können Sie verschieben.')
        : werkzeug === 'radierer' ? 'Über einen Strich oder eine Beschriftung wischen, um sie zu entfernen.'
          : 'Zeichnen Sie mit dem Finger oder dem Stift. ' + (werkzeug === 'strich' ? '(gestrichelte Linie)' : '');
    }
    if (bearbeiten) {
      wk.stift = knopf('✏️ Stift', 'Durchgezogene Linie', function () { werkzeugWaehlen('stift'); });
      wk.strich = knopf('┅ gestrichelt', 'Gestrichelte Linie', function () { werkzeugWaehlen('strich'); });
      wk.text = knopf('🏷️ Beschriften', 'Beschriftung setzen oder verschieben', function () { werkzeugWaehlen('text'); });
      wk.radierer = knopf('🧽 Radierer', 'Strich oder Beschriftung entfernen', function () { werkzeugWaehlen('radierer'); });
      [wk.stift, wk.strich, wk.text, wk.radierer].forEach(function (b) { leiste.appendChild(b); });
      var fg = el('span', 'sk-farben');
      FARBEN.forEach(function (f, i) {
        var b = knopf('', 'Farbe ' + FARB_NAMEN[i], function () {
          farbe = i;
          fg.querySelectorAll('.sk-farbe').forEach(function (x, k) { x.classList.toggle('an', k === i); });
        }, 'sk-farbe' + (i === 0 ? ' an' : ''));
        b.style.background = f;
        fg.appendChild(b);
      });
      leiste.appendChild(fg);
      leiste.appendChild(knopf('↶', 'Rückgängig', function () {
        if (!undo.length) { return; }
        d = lesen(undo.pop()); malen(); geaendert(false);
      }, 'sk-undo'));
      var loeschen = knopf('🗑️', 'Alles löschen', function () {
        if (!loeschen.classList.contains('frage')) {
          loeschen.classList.add('frage'); loeschen.textContent = 'Wirklich alles löschen?';
          setTimeout(function () { loeschen.classList.remove('frage'); loeschen.textContent = '🗑️'; }, 3000);
          return;
        }
        loeschen.classList.remove('frage'); loeschen.textContent = '🗑️';
        if (istLeer(d)) { return; }
        merken(); d = leer(); malen(); geaendert(false);
      }, 'sk-loeschen');
      leiste.appendChild(loeschen);

      // Beschriftungen
      bausteine.concat(['✍️ eigener Text']).forEach(function (s) {
        var b = knopf(s.replace(/_([A-Za-z0-9]+)/g, function (_, t) { return t.split('').map(tief).join(''); }),
          'Beschriftung „' + s + '“', function () {
            if (s === '✍️ eigener Text') { eigenerText(); return; }
            baustein = baustein === s ? null : s; markiereChip(); zeigeHinweis();
          }, 'sk-chip');
        b.setAttribute('data-s', s);
        chips.appendChild(b);
      });
      chips.hidden = true;
    }
    function tief(c) {
      var m = '0123456789', u = '₀₁₂₃₄₅₆₇₈₉', k = m.indexOf(c);
      return k >= 0 ? u[k] : c;
    }
    function markiereChip() {
      chips.querySelectorAll('.sk-chip').forEach(function (b) { b.classList.toggle('an', b.getAttribute('data-s') === baustein); });
    }
    function eigenerText() {
      if (chips.querySelector('.sk-eigen')) { chips.querySelector('.sk-eigen input').focus(); return; }
      var box = el('span', 'sk-eigen');
      var inp = document.createElement('input');
      inp.type = 'text'; inp.maxLength = MAX_TEXT; inp.placeholder = 'Text eingeben';
      inp.className = 'sk-eigen-feld';
      inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocorrect', 'off');
      inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('spellcheck', 'false');
      var ok = knopf('OK', 'Text übernehmen', function () {
        var s = inp.value.trim();
        if (s) { baustein = s; markiereChip(); zeigeHinweis(); }
        box.parentNode.removeChild(box);
      }, 'sk-ok');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } });
      box.appendChild(inp); box.appendChild(ok);
      chips.appendChild(box);
      inp.focus();
    }

    // ----- Darstellung -----
    var skala = 1;
    function groesse() {
      var w = flaeche.clientWidth || B;
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      skala = (w / B) * dpr;
      cv.width = Math.round(B * skala); cv.height = Math.round(H * skala);
      malen();
    }
    function malen() {
      zeichne(ctx, d, skala, { ay: opt.ay, ax: opt.ax, markiert: markiert });
      if (aktiv && aktiv.p.length >= 2) {
        ctx.save(); ctx.setTransform(skala, 0, 0, skala, 0, 0); strichZeichnen(ctx, aktiv); ctx.restore();
      }
    }
    if (window.ResizeObserver) { new ResizeObserver(groesse).observe(flaeche); }
    window.addEventListener('resize', groesse);

    function merken() {
      undo.push(JSON.stringify(d));
      if (undo.length > MAX_UNDO) { undo.shift(); }
    }
    function geaendert() { if (cfg.aenderung) { cfg.aenderung(); } }
    function punkteGesamt() { return d.s.reduce(function (n, s) { return n + s.p.length / 2; }, 0); }

    // ----- Eingabe (Pointer Events: Finger, Maus, Apple Pencil) -----
    function pos(e) {
      var r = cv.getBoundingClientRect();
      return { x: Math.round((e.clientX - r.left) / r.width * B), y: Math.round((e.clientY - r.top) / r.height * H) };
    }
    function radieren(p) {
      var vorher = d.s.length + d.t.length;
      var neuT = d.t.filter(function (t) { return !trifftText(ctx, t, p.x, p.y); });
      var neuS = d.s.filter(function (s) { return !trifftStrich(s, p.x, p.y, 12); });
      if (neuS.length + neuT.length !== vorher) {
        if (!radiert) { merken(); radiert = true; }
        d.s = neuS; d.t = neuT; malen();
      }
    }
    var radiert = false, zeiger = null;

    if (bearbeiten) {
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'pen') { stiftGesehen = true; }
        if (stiftGesehen && e.pointerType === 'touch') { return; }    // Handballen ignorieren, sobald ein Stift benutzt wurde
        if (zeiger !== null) { return; }
        zeiger = e.pointerId;
        try { cv.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
        e.preventDefault();
        var p = pos(e);
        if (werkzeug === 'stift' || werkzeug === 'strich') {
          if (d.s.length >= MAX_STRICHE || punkteGesamt() >= MAX_PUNKTE) {
            hinweis.textContent = '⚠︎ Die Skizze ist voll – bitte etwas radieren.'; zeiger = null; return;
          }
          aktiv = { f: farbe, g: werkzeug === 'strich' ? 1 : 0, p: [p.x, p.y] };
        } else if (werkzeug === 'radierer') {
          radiert = false; radieren(p);
        } else if (werkzeug === 'text') {
          ziehText = -1;
          for (var i = d.t.length - 1; i >= 0; i--) {
            if (trifftText(ctx, d.t[i], p.x, p.y)) { ziehText = i; break; }
          }
          if (ziehText >= 0) { merken(); markiert = ziehText; malen(); }
          else if (baustein && d.t.length < MAX_TEXTE) {
            merken(); d.t.push({ x: p.x, y: p.y, s: baustein, f: farbe }); malen(); geaendert();
          }
        }
      });
      cv.addEventListener('pointermove', function (e) {
        if (e.pointerId !== zeiger) { return; }
        e.preventDefault();
        var p = pos(e);
        if (aktiv) {
          var n = aktiv.p.length, lx = aktiv.p[n - 2], ly = aktiv.p[n - 1];
          if (Math.hypot(p.x - lx, p.y - ly) >= 3) { aktiv.p.push(p.x, p.y); malen(); }
        } else if (werkzeug === 'radierer') {
          radieren(p);
        } else if (ziehText >= 0) {
          d.t[ziehText].x = Math.max(10, Math.min(B - 10, p.x));
          d.t[ziehText].y = Math.max(16, Math.min(H - 10, p.y));
          malen();
        }
      });
      var ende = function (e) {
        if (e.pointerId !== zeiger) { return; }
        zeiger = null;
        if (aktiv) {
          merken(); d.s.push(aktiv); aktiv = null; malen(); geaendert();
        } else if (werkzeug === 'radierer') {
          if (radiert) { geaendert(); }
        } else if (ziehText >= 0) {
          ziehText = -1; markiert = -1; malen(); geaendert();
        }
      };
      cv.addEventListener('pointerup', ende);
      cv.addEventListener('pointercancel', ende);
      werkzeugWaehlen('stift');
    }
    groesse();

    return {
      art: 'skizze', el: wrap,
      get: function () { return istLeer(d) ? '' : JSON.stringify(d); },
      set: function (wert) { d = lesen(wert); malen(); }
    };
  }

  window.Skizze = { B: B, H: H, lesen: lesen, istLeer: istLeer, zeichne: zeichne, alsCanvas: alsCanvas, widget: widget };
})();

"""Aufgaben des Arbeitsblatts für die digitale Tafel (Server-Adapter).

Diese Datei gehört zum INHALT des Arbeitsblatts (wie templates/ab_inhalt.html): Wer ein neues AB
baut, ändert hier die Tafel-Fassungen. Die Lösungen bleiben auf dem Server und gehen nie an die
Schüler:innen.

Zwei Dinge sind hier beschrieben:
1. VARIANTEN      – die leeren Tafel-Aufgaben (eine Fassung je Aufgabe) samt Lösung, die live gelöst werden.
                    Das ist der EINZIGE Teil, der für ein neues Arbeitsblatt neu geschrieben wird.
2. AbAdapter      – inhaltsunabhängig: liest die AB-Antworten und füllt damit die Tafel-Aufgaben vor.
                    Regel: Tafel-Feld k einer Aufgabe N = AB-Eingabefeld a<N>.f<k> (Reihenfolge in ab_inhalt.html).
"""
import json

from tafel.aufgaben import feld_ids, zelle

# Es gibt bewusst nur EINE Fassung je Aufgabe (keine Niveaus A/B/C). Die Tafel braucht aber einen Schlüssel
# für den Knopf in der Aufgabenliste; er steht nur dort (Knopftext) und erscheint nicht auf der Tafel.
KNOPF = "an die Tafel"

# ---------- Tafel-Fassungen (leer + Lösung) ----------
# lueckentext: teile (None = Lücke), loesung je Lücke (Liste akzeptierter Antworten), wortbank
# zuordnung:   links (Zeilen), optionen, loesung {zeile: option}
# mc:          frage, optionen, loesung
# richtigfalsch: aussagen [(Text, "richtig"|"falsch")]
# freitext:    frage
def _schalen(*zahlen):
    """„2,1“ darf auch als „2 1“, „2-1“, „2/1“ … geschrieben werden."""
    return [t.join(str(z) for z in zahlen) for t in (",", ", ", " ", "-", "/", ";", "|", ".")]


# Die Tafel-Fassungen entsprechen dem AB (gleiche Felder, gleiche Reihenfolge wie in ab_inhalt.html): Was eine Person
# im AB eingetragen hat, steht an der Tafel schon in den Feldern und lässt sich dort bearbeiten – je Aufgabe passend:
#   tabelle (Aufgabe 1, 3, 5): Tabelle mit Eingabefeldern (Tastatur) und Ankreuzfeldern
#   lueckentext (2) · freitext (6) · schalen (4): antippbares Schalenmodell
# tabelle: spalten, breiten (Gewichte), zeilen = Zellen: str = fester Text, "F" = Eingabefeld, "Z" = Zifferneingabe,
#          "H" = Ankreuzfeld; Felder heißen c0, c1, … in Lesereihenfolge (wie die Eingabefelder im AB).
VARIANTEN = {
    "1": {"titel": "Aufgabe 1 · Benzol und Brom", "typ": "lueckentext",
          "teile": ["Gibt man zu Benzol einige Tropfen Brom, findet zunächst ", None,
                    " Reaktion statt. Erst nach Zugabe eines ", None,
                    " wie Eisen(III)-bromid entfärbt sich das Gemisch. Es entstehen ", None, " und ", None,
                    ". Anders als bei den ", None, " findet keine Addition statt, sondern eine elektrophile ", None,
                    ". Dabei bleibt der ", None, " Bindungszustand erhalten."],
          "loesung": [["keine"], ["Katalysators", "Katalysator"], ["Brombenzol", "Bromwasserstoff"],
                      ["Bromwasserstoff", "Brombenzol", "HBr"], ["Alkenen", "Alkene"],
                      ["Substitution"], ["aromatische", "aromatisch"]],
          "wortbank": ["keine", "Katalysators", "Brombenzol", "Bromwasserstoff", "Alkenen", "Substitution",
                       "aromatische", "Addition", "Dibrombenzol"]},
    "2": {"titel": "Aufgabe 2 · Der Mechanismus der Bromierung", "typ": "tabelle",
          "frage": "Ordnen Sie jedem Schritt den Fachbegriff zu und kreuzen Sie den geschwindigkeitsbestimmenden Schritt an.",
          "spalten": ["Schritt", "Was passiert?", "Fachbegriff", "geschw.-bestimmend"],
          "breiten": [0.8, 3.6, 1.8, 1.4], "schrift": 18,
          "zeilen": [["1", "Br₂ polarisiert, lagert sich locker an", "F", "H"],
                     ["2", "Heterolyse mit FeBr₃, Br bindet an C", "F", "H"],
                     ["3", "Abgabe eines H⁺ an FeBr₄⁻", "F", "H"]],
          "loesung": [["π-Komplex", "pi-Komplex", "π Komplex", "pi Komplex", "Pi-Komplex"], ["false"],
                      ["σ-Komplex", "sigma-Komplex", "σ Komplex", "sigma Komplex", "Carbenium-Ion", "Carbeniumion"],
                      ["true"],
                      ["Rearomatisierung", "Re-Aromatisierung", "Protonenabspaltung", "Deprotonierung"], ["false"]]},
    "3": {"titel": "Aufgabe 3 · Das Enthalpiediagramm skizzieren", "typ": "freitext", "skizze": True,
          "frage": "Skizzieren Sie das Enthalpiediagramm der Bromierung von Benzol (Substitution durchgezogen, Addition "
                   "gestrichelt) und erläutern Sie, was die Skizze über den Ablauf der Reaktion aussagt."},
    "4": {"titel": "Aufgabe 4 · Substitution oder Addition?", "typ": "tabelle",
          "frage": "Vergleichen Sie beide Wege mithilfe Ihrer Skizze aus Aufgabe 3 und des Textes.",
          "spalten": ["Kriterium", "Substitution", "Addition"], "breiten": [2.6, 1.5, 1.5], "schrift": 19,
          "zeilen": [["Aktivierungsenergie 2. Schritt", "F", "F"], ["Produkt aromatisch?", "F", "F"],
                     ["exotherm / endotherm", "F", "F"], ["Reaktionsentropie", "F", "F"]],
          "loesung": [["klein", "kleiner", "niedrig", "gering"], ["groß", "größer", "hoch", "gross", "grösser"],
                      ["ja"], ["nein"],
                      ["exotherm"], ["endotherm"],
                      ["nimmt zu", "zu", "steigt", "Zunahme", "größer"],
                      ["nimmt ab", "ab", "sinkt", "Abnahme", "kleiner"]]},
    "5": {"titel": "Aufgabe 5 · Elektrophile Substitutionen im Überblick", "typ": "tabelle",
          "frage": "Ergänzen Sie das angreifende Elektrophil und den Namen des Produkts.",
          "spalten": ["Reaktion", "Reagenz (Kat.)", "Elektrophil", "Produkt"], "breiten": [2.1, 1.9, 1.5, 2.1],
          "schrift": 18,
          "zeilen": [["Bromierung", "Br₂ (FeBr₃)", "F", "F"], ["Nitrierung", "HNO₃ (H₂SO₄)", "F", "F"],
                     ["Sulfonierung", "rauch. H₂SO₄", "F", "F"], ["F.-C.-Alkylierung", "CH₃Cl (AlCl₃)", "F", "F"]],
          "loesung": [["Br⁺", "Bromkation", "Brom-Kation", "Bromonium-Ion", "Br₂", "polarisiertes Br₂"],
                      ["Brombenzol"],
                      ["NO₂⁺", "Nitronium-Ion", "Nitroniumion", "Nitrylkation"], ["Nitrobenzol"],
                      ["HSO₃⁺", "SO₃", "SO₃H⁺"], ["Benzolsulfonsäure"],
                      ["CH₃⁺", "Methylkation", "Methyl-Kation", "Carbenium-Ion", "CH₃Cl"],
                      ["Toluol", "Methylbenzol"]]},
    "6": {"titel": "Aufgabe 6 · Reaktionsgleichungen", "typ": "lueckentext",
          "teile": ["a) SO₃ + ", None, " ⇌ ", None, " + HSO₄⁻   b) C₆H₆ + HNO₃ → ", None, " + ", None,
                    "   c) Katalysator: ", None, " ;  C₆H₆ + CH₃COCl → C₆H₅COCH₃ + ", None],
          "loesung": [["H₂SO₄"], ["HSO₃⁺", "HSO₃ +"],
                      ["C₆H₅NO₂", "C₆H₅-NO₂", "C₆H₅–NO₂", "Nitrobenzol", "H₂O"],
                      ["H₂O", "C₆H₅NO₂", "C₆H₅-NO₂", "Nitrobenzol"],
                      ["AlCl₃", "Aluminiumchlorid"], ["HCl", "Chlorwasserstoff"]],
          "wortbank": ["H₂SO₄", "HSO₃⁺", "C₆H₅NO₂", "H₂O", "AlCl₃", "HCl", "FeBr₃", "NO₂⁺"]},
    "7": {"titel": "Aufgabe 7 · Der Mechanismus der Nitrierung", "typ": "freitext",
          "frage": "Beschreiben Sie den Mechanismus der Nitrierung von Benzol in Schritten. Verwenden Sie die "
                   "Fachbegriffe Nitronium-Ion, π-Komplex, σ-Komplex (Carbenium-Ion) und Rearomatisierung."},
}


def _gemischt(liste):
    """Feste, aber nicht triviale Reihenfolge (die Lösung soll nicht einfach dastehen)."""
    return sorted(liste, key=lambda t: (len(t) * 7 + sum(map(ord, t))) % 11)


def aufgabenliste():
    return [{"aufgabe_id": nr, "titel": v["titel"], "typ": v["typ"],
             "niveaus": [KNOPF]} for nr, v in VARIANTEN.items()]


def aufgabe_leer(aufgabe_id, niveau):
    f = VARIANTEN.get(aufgabe_id)
    if f is None or niveau != KNOPF:
        return None
    typ = f["typ"]
    daten = {"aufgabe_id": aufgabe_id, "niveau": "", "titel": f["titel"], "aufgabentyp": typ}
    if typ == "lueckentext":
        teile, n = [], 0
        for teil in f["teile"]:
            if teil is None:
                teile.append({"feld": f"l{n}"})
                n += 1
            else:
                teile.append({"text": teil})
        daten.update(teile=teile, wortbank=list(f["wortbank"]))
    elif typ == "zuordnung":
        daten.update(zeilen=[{"feld": f"z{i}", "text": t} for i, t in enumerate(f["links"])],
                     optionen=list(f["optionen"]))
    elif typ == "tabelle":
        n, zeilen = 0, []
        for zeile in f["zeilen"]:
            neu = []
            for z in zeile:
                if z in ("F", "Z", "H"):
                    zelle = {"feld": f"c{n}"}
                    n += 1
                    if z == "H":
                        zelle["art"] = "haken"
                    if z == "Z":
                        zelle["zahl"] = True
                    neu.append(zelle)
                else:
                    neu.append({"text": z})
            zeilen.append(neu)
        daten.update(frage=f.get("frage", ""), spalten=list(f["spalten"]),
                     breiten=list(f.get("breiten", [])), zeilen=zeilen, kartenbreite=700)
        if f.get("schrift"):
            daten["schrift"] = f["schrift"]
    elif typ == "schalen":
        daten.update(frage=f["frage"], kern=f["kern"], kartenbreite=640)
    elif typ == "mc":
        daten.update(frage=f["frage"], optionen=list(f["optionen"]))
    elif typ == "richtigfalsch":
        daten.update(aussagen=[{"feld": f"r{i}", "text": t} for i, (t, _) in enumerate(f["aussagen"])])
    else:
        daten.update(frage=f["frage"])
    return daten


def loesung(aufgabe_id, niveau):
    f = VARIANTEN.get(aufgabe_id)
    if f is None or f["typ"] == "freitext":
        return None
    typ = f["typ"]
    if typ == "lueckentext":
        return {f"l{i}": list(alt) for i, alt in enumerate(f["loesung"])}
    if typ == "tabelle":
        return {f"c{i}": list(alt) for i, alt in enumerate(f["loesung"])}
    if typ == "schalen":
        return {f"s{i}": list(alt) for i, alt in enumerate(f["loesung"])}
    if typ == "zuordnung":
        return {f"z{i}": [f["loesung"][t]] for i, t in enumerate(f["links"])}
    if typ == "mc":
        return {"wahl": [f["loesung"]]}
    if typ == "richtigfalsch":
        return {f"r{i}": [u] for i, (_, u) in enumerate(f["aussagen"])}
    return None


# ---------- Antworten aus dem AB (Karten und vorbelegte Tafel-Aufgaben) ----------
# Dieser Teil ist INHALTSUNABHÄNGIG – er liest nur VARIANTEN. Regel: Die Felder einer Tafel-Aufgabe stehen in derselben
# Reihenfolge wie die Eingabefelder (input/textarea) dieser Aufgabe in ab_inhalt.html (AB-Feld a<N>.f<k> = k-tes Tafel-Feld).
# Sonderfälle: Schalenmodell (typ "schalen") liest das Widget a<N>.w1, Freitext (typ "freitext") das Feld a<N>.f1.
class _Anonym:
    id, name, ist_lehrer = "", "", False


class AbAdapter:
    """Liest die Antworten einer Person aus der Tabelle `antworten` und liefert sie als Tafel-Karten bzw. Tafel-Aufgaben."""

    def __init__(self, get_db, anzahl_aufgaben):
        self.get_db = get_db
        self.anzahl = anzahl_aufgaben

    # ----- Tafel-Seite (leere Aufgaben, Lösungen) -----
    def aufgabenliste(self):
        return aufgabenliste()

    def aufgabe_leer(self, aufgabe_id, niveau):
        return aufgabe_leer(aufgabe_id, niveau)

    def loesung(self, aufgabe_id, niveau):
        return loesung(aufgabe_id, niveau)

    def niveau_des_schuelers(self, schueler_id, aufgabe_id):
        return KNOPF

    # ----- Antworten der Schüler:innen -----
    def _felder(self, schueler_id):
        db = self.get_db()
        try:
            return {r[0]: r[1] for r in db.execute(
                "SELECT feld, wert FROM antworten WHERE schueler_id=?", (schueler_id,)).fetchall()}
        finally:
            db.close()

    @staticmethod
    def _schalen(felder, nr):
        """Elektronen je Schale aus dem Schalenmodell-Widget des ABs (Punkte {r: Schale, w: Winkel})."""
        try:
            punkte = json.loads(felder.get(f"a{nr}.w1") or "[]")
        except ValueError:
            punkte = []
        zaehler = [0, 0, 0]
        for p in punkte if isinstance(punkte, list) else []:
            if isinstance(p, dict) and isinstance(p.get("r"), int) and 0 <= p["r"] < 3:
                zaehler[p["r"]] += 1
        return zaehler

    def aufgabe_befuellt(self, schueler_id, aufgabe_id, person):
        """Die Tafel-Aufgabe, in der schon steht, was die Person im AB eingetragen hat (None, wenn es keine
        Tafel-Fassung gibt). Die Felder bleiben an der Tafel bearbeitbar."""
        nr = str(aufgabe_id)
        objekt = aufgabe_leer(nr, KNOPF)
        if objekt is None:
            return None
        felder = self._felder(schueler_id)
        typ = objekt["aufgabentyp"]
        vorhanden = {}
        if typ == "schalen":
            for k, n in enumerate(self._schalen(felder, nr)):
                if n:
                    vorhanden[f"s{k}"] = str(min(n, 18))
        elif typ == "freitext":
            wert = (felder.get(f"a{nr}.f1") or "").strip()
            if VARIANTEN[nr].get("skizze") and (felder.get(f"a{nr}.w1") or "").startswith("{"):
                wert = ("✏️ Skizze vorhanden (an der Tafel: Knopf 🖊 „Skizzen“)\n" + wert).strip()
            if wert:
                vorhanden["text"] = wert[:2000]
        else:                                                        # Lückentext, Tabelle, …: Feld k = AB-Feld k
            for k, fid in enumerate(feld_ids(objekt), start=1):
                wert = (felder.get(f"a{nr}.f{k}") or "").strip()
                if zelle(objekt, fid).get("art") == "haken":         # Ankreuzfeld: nur „angekreuzt“ übernehmen
                    wert = "true" if wert == "true" else ""
                elif wert == "false":
                    wert = ""
                if wert:
                    vorhanden[fid] = wert[:60]
        objekt["felder"] = {k: {"wert": w, "von_id": person.id, "von": person.name, "status": None, "alt": None}
                            for k, w in vorhanden.items()}
        objekt["quelle"] = schueler_id
        return objekt

    @staticmethod
    def _karte_inhalt(o):
        """Antwort als Karte (Lückentext → Segmente, Tabelle → Zeilenpaare, sonst Text)."""
        wert = lambda fid: ((o.get("felder") or {}).get(fid) or {}).get("wert", "")  # noqa: E731
        typ = o["aufgabentyp"]
        if typ == "lueckentext":
            return "lueckentext", {"segmente": [{"luecke": wert(t["feld"]) or "…"} if "feld" in t else {"text": t["text"]}
                                                 for t in o["teile"]]}
        if typ == "tabelle":
            def zeige(z):
                if "feld" not in z:
                    return z.get("text", "")
                w = wert(z["feld"])
                return ("✓" if w == "true" else "–") if z.get("art") == "haken" else (w or "…")
            paare = []
            for zeile in o["zeilen"]:
                if zeile and "feld" not in zeile[0]:
                    paare.append([zeile[0]["text"], " · ".join(zeige(z) for z in zeile[1:])])
                else:
                    paare += [[(o["spalten"][i] if i < len(o["spalten"]) else ""), zeige(z)] for i, z in enumerate(zeile)]
            return "zuordnung", {"paare": paare}
        if typ == "schalen":
            n = [int(wert(f"s{k}") or 0) for k in range(3)]
            return "freitext", {"text": f"{sum(n)} Elektronen gesetzt (" + " · ".join(f"Schale {k + 1}: {x}" for k, x in enumerate(n)) + ")"}
        return "freitext", {"text": wert("text") or "…"}

    def aufgaben_des_schuelers(self, schueler_id):
        ergebnis = []
        for nr, v in VARIANTEN.items():
            o = self.aufgabe_befuellt(schueler_id, nr, _Anonym)
            typ, inhalt = self._karte_inhalt(o)
            ergebnis.append({"aufgabe_id": nr, "titel": v["titel"], "typ": typ, "niveau": "",
                             "bearbeitet": bool(o["felder"]), "inhalt": inhalt})
        return ergebnis

    def aufgabe_des_schuelers(self, schueler_id, aufgabe_id):
        return next((a for a in self.aufgaben_des_schuelers(schueler_id) if a["aufgabe_id"] == str(aufgabe_id)), None)

# === Google Colab Script: Video-Dateien in Google Drive umbenennen ===
# 1. In Google Colab einfuegen
# 2. Ausfuehren — Drive wird gemountet
# 3. Erst DRY RUN (zeigt was umbenannt wird), dann LIVE RUN

from google.colab import drive
import os
import re
import unicodedata

# --- Drive mounten ---
drive.mount('/content/drive')

# --- Ordner-Pfade ---
FOLDERS = [
    '/content/drive/MyDrive/TRL Insta Reels/26-04',
    '/content/drive/MyDrive/TRL Insta Reels/26-05',
]

# --- Mapping: Titel (nach dem —) → Neuer Dateiname (ohne Extension) ---
RENAME_MAP = {
    "Slice vs Topspin": "0104 Tipp SF — Slice vs Topspin",
    "Slice vs. Topspin": "0104 Tipp SF — Slice vs Topspin",
    "Paddle Reaction": "0204 Reaction SF — Paddle Reaction",
    "Marco Rückhand": "0304 Training SF — Marco Rückhand",
    "Marco Rueckhand": "0304 Training SF — Marco Rückhand",
    "Perfekter Vorhand-Treffpunkt": "0404 Tipp SF — Perfekter Vorhand-Treffpunkt",
    "Die besten Aufschläger nutzen diesen Trick": "0504 Tipp SF — Die besten Aufschläger nutzen diesen Trick",
    "Aufschlagverzögerung": "0504 Tipp SF — Die besten Aufschläger nutzen diesen Trick",
    "Johnny Richtige Ausgangsposition oben": "0604 Training SF — Johnny Richtige Ausgangsposition oben",
    "Vincent Früh ausholen": "0704 Training SF — Vincent Früh ausholen",
    "Vincent Frueh ausholen": "0704 Training SF — Vincent Früh ausholen",
    "Drei Taktiken die dich unschlagbar machen": "0804 Tipp SF — Drei Taktiken die dich unschlagbar machen",
    "Slice-Training mit Theo": "0904 Training SF — Slice-Training mit Theo",
    "Vorhandgriff beim Aufschlag korrigieren": "1004 Tipp SF — Vorhandgriff beim Aufschlag korrigieren",
    "Vorhandgriff beim Aufschlag": "1004 Tipp SF — Vorhandgriff beim Aufschlag korrigieren",
    "Crystal Reaction": "1104 Reaction SF — Crystal Reaction",
    "Zu spät am Treffpunkt mit Marco": "1204 Training SF — Zu spät am Treffpunkt mit Marco",
    "Zu spaet am Treffpunkt mit Marco": "1204 Training SF — Zu spät am Treffpunkt mit Marco",
    "Johnny Auf Technik fokussieren statt auf Ergebnis": "1304 Training SF — Johnny Auf Technik fokussieren statt auf Ergebnis",
    "Johnny Auf Technik fokussieren": "1304 Training SF — Johnny Auf Technik fokussieren statt auf Ergebnis",
    "3 Tipps damit du nie wieder gegen schwächere Gegner verlierst": "1404 Tipp SF — 3 Tipps damit du nie wieder gegen schwächere Gegner verlierst",
    "3 Tipps gegen schwächere Gegner": "1404 Tipp SF — 3 Tipps damit du nie wieder gegen schwächere Gegner verlierst",
    "Bester Tipp für einen konstanten Ballwurf": "1504 Tipp SF — Bester Tipp für einen konstanten Ballwurf",
    "Bester Tipp konstanter Ballwurf": "1504 Tipp SF — Bester Tipp für einen konstanten Ballwurf",
    "Return-Beinarbeit der Profis": "1604 Tipp SF — Return-Beinarbeit der Profis",
    "Mehr Power in die Vorhand": "1704 Tipp SF — Mehr Power in die Vorhand",
    "Mit Konzept angreifen": "1804 Training SF — Mit Konzept angreifen",
    "Ballwurf mit Marco": "1904 Training SF — Ballwurf mit Marco",
    "5 Schritte um den Aufschlag-Treffpunkt zu fixen": "2004 Tipp SF — 5 Schritte um den Aufschlag-Treffpunkt zu fixen",
    "5 Schritte Aufschlag-Treffpunkt": "2004 Tipp SF — 5 Schritte um den Aufschlag-Treffpunkt zu fixen",
    "Johnny Mythos Ball im Steigen nehmen": "2104 Training SF — Johnny Mythos Ball im Steigen nehmen",
    "Vorhand locker spielen": "2204 Tipp SF — Vorhand locker spielen",
    "5 Tipps für den perfekten Ballwurf": "2304 Tipp SF — 5 Tipps für den perfekten Ballwurf",
    "5 Tipps perfekter Ballwurf": "2304 Tipp SF — 5 Tipps für den perfekten Ballwurf",
    "Schmetterlball Masterclass": "2404 Tipp SF — Schmetterlball Masterclass",
    "Schmetterball Masterclass": "2404 Tipp SF — Schmetterlball Masterclass",
    "Power in den Topspin Vorhand": "2504 Tipp SF — Power in den Topspin Vorhand",
    "Vincent Aufschlag Treffpunkt korrigieren": "2604 Training SF — Vincent Aufschlag Treffpunkt korrigieren",
    "Return Masterclass mit Theo": "2704 Training SF — Return Masterclass mit Theo",
    "80 Prozent des Aufschlags kommt aus dem Arm": "2804 Tipp SF — 80 Prozent des Aufschlags kommt aus dem Arm",
    "80% des Aufschlags kommt aus dem Arm": "2804 Tipp SF — 80 Prozent des Aufschlags kommt aus dem Arm",
    "Johnny Intensität in den Beinen": "2904 Training SF — Johnny Intensität in den Beinen",
    "Johnny Intensitaet in den Beinen": "2904 Training SF — Johnny Intensität in den Beinen",
    "Drei-Höhen-Prinzip": "3004 Tipp SF — Drei-Höhen-Prinzip",
    "Drei-Hoehen-Prinzip": "3004 Tipp SF — Drei-Höhen-Prinzip",
    "20 kmh mehr Power in den Aufschlag": "3104 Tipp SF — 20 kmh mehr Power in den Aufschlag",
    "20 km/h mehr Power in den Aufschlag": "3104 Tipp SF — 20 kmh mehr Power in den Aufschlag",
    "Return Masterclass": "3204 Tipp SF — Return Masterclass",
    "Schmetterball mit Marco": "3304 Training SF — Schmetterball mit Marco",
    "Schmetterlball mit Marco": "3304 Training SF — Schmetterball mit Marco",
    "Angriffsball Masterclass": "3404 Tipp SF — Angriffsball Masterclass",
    "Johnny Angriffsbälle": "0105 Training SF — Johnny Angriffsbälle",
    "Johnny Angriffsballe": "0105 Training SF — Johnny Angriffsbälle",
    "Aufschlag Training endlich wieder spannend machen": "0205 Tipp SF — Aufschlag Training endlich wieder spannend machen",
    "Aufschlag Training spannend": "0205 Tipp SF — Aufschlag Training endlich wieder spannend machen",
    "Mondball-Training mit Joel und Theo": "0305 Training SF — Mondball-Training mit Joel und Theo",
    "Winkelhalbierende mit Joel und Theo": "0405 Training SF — Winkelhalbierende mit Joel und Theo",
}

def norm(s):
    """Unicode normalisieren — loest das Problem mit zerlegten Umlauten in Google Drive."""
    return unicodedata.normalize('NFC', s)

def extract_title(filename):
    """Extrahiert den Titel nach dem — aus dem Dateinamen."""
    name = os.path.splitext(filename)[0]
    name = norm(name)
    for sep in [' \u2014 ', ' -- ', ' - ']:
        if sep in name:
            return name.split(sep, 1)[1].strip()
    return None

def find_new_name(title):
    """Sucht den neuen Namen im Mapping."""
    t = norm(title)
    for key, val in RENAME_MAP.items():
        if norm(key) == t:
            return val
    for key, val in RENAME_MAP.items():
        if norm(key).lower() == t.lower():
            return val
    for key, val in RENAME_MAP.items():
        if norm(key).lower() in t.lower() or t.lower() in norm(key).lower():
            return val
    return None

# === DRY RUN ===
print("=" * 60)
print("DRY RUN — Zeigt was umbenannt wird (nichts passiert)")
print("=" * 60)

rename_actions = []
not_found = []

for folder in FOLDERS:
    if not os.path.exists(folder):
        print(f"\n⚠️  Ordner nicht gefunden: {folder}")
        continue
    print(f"\n📁 {folder}")
    files = sorted(os.listdir(folder))
    for f in files:
        if f.startswith('.'):
            continue
        ext = os.path.splitext(f)[1]
        title = extract_title(f)
        if title is None:
            print(f"  ❓ Kein Titel erkannt: {f}")
            not_found.append(f)
            continue
        new_name = find_new_name(title)
        if new_name is None:
            print(f"  ❓ Kein Match gefunden: {f}  (Titel: '{title}')")
            not_found.append(f)
            continue
        new_filename = new_name + ext
        if f == new_filename:
            print(f"  ✅ Schon korrekt: {f}")
            continue
        old_path = os.path.join(folder, f)
        new_path = os.path.join(folder, new_filename)
        rename_actions.append((old_path, new_path, f, new_filename))
        print(f"  🔄 {f}")
        print(f"     → {new_filename}")

print(f"\n{'=' * 60}")
print(f"Zusammenfassung: {len(rename_actions)} Dateien zum Umbenennen")
if not_found:
    print(f"⚠️  {len(not_found)} Dateien ohne Match")
print(f"{'=' * 60}")

# === LIVE RUN ===
print("\n🚀 LIVE RUN — Dateien werden umbenannt...")
for old_path, new_path, old_name, new_name in rename_actions:
    os.rename(old_path, new_path)
    print(f"  ✅ {old_name} → {new_name}")
print(f"\n✅ Fertig! {len(rename_actions)} Dateien umbenannt.")

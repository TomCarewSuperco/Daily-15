"""
Takes CoFID values for the app's everyday foods, using scripts/curated-map.json.
Run after build-cofid.py:  python3 scripts/build-curated.py > src/app/data/curated.json
"""
import json
import sys

cofid = json.load(open("src/app/data/cofid.json"))
fields = cofid["fields"]
by_code = {f[0]: dict(zip(fields, f)) for f in cofid["foods"]}
mapping = json.load(open("scripts/curated-map.json"))
out = {}
missing = []
for name, code in mapping.items():
    if name.startswith("_") or code is None:
        continue
    f = by_code.get(code)
    if not f:
        missing.append(f"{name}: {code}")
        continue
    out[name] = {k: f[k] for k in ("code", "kcal", "protein", "carbs", "fat", "fibre", "satFat", "sugars", "salt", "abv")}
if missing:
    sys.exit("Codes not found in cofid.json: " + ", ".join(missing))
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

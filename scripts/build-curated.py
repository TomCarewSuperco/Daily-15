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
# Mixed drinks: sum the parts and express per 100 ml.
mixed = json.load(open("scripts/mixed-drinks.json"))
for name, parts in mixed.items():
    if name.startswith("_"):
        continue
    tot = {k: 0.0 for k in ("kcal", "protein", "carbs", "fat", "fibre", "satFat", "sugars", "salt")}
    ml = 0.0
    alcohol_ml = 0.0
    for code, amount in parts:
        ml += amount
        if code == "water":
            continue
        f = by_code.get(code)
        if not f:
            missing.append(f"{name}: {code}")
            continue
        for k in tot:
            tot[k] += (f[k] or 0) * amount / 100
        if f["abv"]:
            alcohol_ml += amount * f["abv"] / 100
    per = {k: round(v * 100 / ml, 2 if k == "salt" else 1) for k, v in tot.items()}
    per["kcal"] = round(tot["kcal"] * 100 / ml)
    out[name] = {"code": "mix", **per, "abv": round(alcohol_ml * 100 / ml, 1), "ml": ml}

# Coffee-shop drinks: recipe x milk, per 100 ml, with caffeine and units.
coffee = json.load(open("scripts/coffee-drinks.json"))
custom = coffee["_custom"]
def build(name, parts, caffeine, units):
    tot = {k: 0.0 for k in ("kcal", "protein", "carbs", "fat", "fibre", "satFat", "sugars", "salt")}
    ml = 0.0
    for code, amount in parts:
        ml += amount
        f = custom.get(code) or by_code.get(code)
        if not f:
            missing.append(f"{name}: {code}")
            continue
        for k in tot:
            tot[k] += (f[k] or 0) * amount / 100
    per = {k: round(v * 100 / ml, 2 if k == "salt" else 1) for k, v in tot.items()}
    per["kcal"] = round(tot["kcal"] * 100 / ml)
    out[name] = {"code": "mix", **per, "abv": 0, "ml": ml, "caffeine": round(caffeine * 100 / ml, 1), "units": units}
for d in coffee["with_milk"]:
    for milk, code in coffee["_milks"].items():
        build(d["name"].replace("{milk}", milk), d["parts"] + [[code, d["milk"]]], d["caffeine"], d["units"])
for d in coffee["plain"]:
    build(d["name"], d["parts"], d["caffeine"], d["units"])

if missing:
    sys.exit("Codes not found in cofid.json: " + ", ".join(missing))
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

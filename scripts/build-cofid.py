"""
Converts McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID)
into the compact food list the app searches.

Usage:  python3 scripts/build-cofid.py path/to/CoFID_2021.xlsx > src/app/data/cofid.json
Needs:  openpyxl

Source: McCance and Widdowson's The Composition of Foods Integrated Dataset 2021,
Public Health England. Crown copyright. Check the licence on the dataset's GOV.UK
page before release and credit it in the app.

Output: {"version": "...", "fields": [...], "foods": [[...], ...]}
Values per 100 g, or per 100 ml for alcoholic drinks. null means not known.
'Tr' (trace) becomes 0. 'N' (present but not measured) becomes null.
"""
import json
import re
import sys

import openpyxl


def num(v):
    if v is None:
        return None
    s = str(v).strip()
    if s in ("", "N"):
        return None
    if s == "Tr":
        return 0.0
    s = s.replace("(", "").replace(")", "")
    try:
        return float(s)
    except ValueError:
        return None


def sheet_rows(wb, prefix):
    ws = next(w for w in wb.worksheets if w.title.startswith(prefix))
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    codes = next(rows)  # short codes such as KCALS
    next(rows)  # long names
    idx = {c: i for i, c in enumerate(codes) if c}
    out = {}
    for r in rows:
        if not r or not r[0]:
            continue
        out[str(r[0]).strip()] = r
    return idx, out


def five_a_day(group, name):
    lower = name.lower()
    if group.startswith("FC"):
        return "juice"
    if group.startswith("DB"):
        return "pulses"
    if group.startswith(("DF", "DG", "DI")) or group.startswith("FA"):
        return "fv"
    return None


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    p_idx, prox = sheet_rows(wb, "1.3")
    i_idx, inorg = sheet_rows(wb, "1.4")
    foods = []
    for code, r in prox.items():
        name = str(r[1]).strip()
        group = str(r[3] or "").strip()
        # Weights that include bones, stones or peel don't match what people eat.
        if "weighed with" in name.lower():
            continue
        kcal = num(r[p_idx["KCALS"]])
        if kcal is None:
            continue
        fibre = num(r[p_idx["AOACFIB"]])
        if fibre is None:
            fibre = num(r[p_idx["ENGFIB"]])
        sodium_mg = num(inorg.get(code, [None] * 99)[i_idx["NA"]]) if code in inorg else None
        alcohol_g = num(r[p_idx["ALCO"]]) or 0
        drink = group.startswith("Q") and alcohol_g > 0
        abv = round(alcohol_g / 0.789, 1) if drink else None
        rnd = lambda v, dp=1: None if v is None else round(v, dp)
        foods.append([
            code,
            name,
            group,
            round(kcal),
            rnd(num(r[p_idx["PROT"]])),
            rnd(num(r[p_idx["CHO"]])),
            rnd(num(r[p_idx["FAT"]])),
            rnd(fibre),
            rnd(num(r[p_idx["SATFOD"]])),
            rnd(num(r[p_idx["TOTSUG"]])),
            None if sodium_mg is None else round(sodium_mg * 2.5 / 1000, 2),
            five_a_day(group, name),
            abv,
            "ml" if drink else "g",
        ])
    foods.sort(key=lambda f: f[1].lower())
    json.dump(
        {
            "version": "CoFID 2021",
            "fields": ["code", "name", "group", "kcal", "protein", "carbs", "fat", "fibre", "satFat", "sugars", "salt", "fiveADay", "abv", "unit"],
            "foods": foods,
        },
        sys.stdout,
        ensure_ascii=False,
        separators=(",", ":"),
    )


if __name__ == "__main__":
    main(sys.argv[1])

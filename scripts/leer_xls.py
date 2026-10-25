"""Lee un .xls antiguo (BIFF) y muestra su contenido."""
import sys
sys.path.insert(0, ".tools/pylibs")
import xlrd

path = sys.argv[1]
wb = xlrd.open_workbook(path, formatting_info=False)
print("Hojas:", wb.sheet_names())
print()

for sh in wb.sheets():
    print("=" * 70)
    print(f"HOJA: {sh.name}  filas={sh.nrows} cols={sh.ncols}")
    for r in range(min(sh.nrows, 60)):
        vals = []
        for c in range(min(sh.ncols, 12)):
            v = sh.cell_value(r, c)
            if v == "" or v is None:
                continue
            if isinstance(v, float):
                v = round(v, 4)
            if isinstance(v, str) and len(v) > 32:
                v = v[:32] + "…"
            vals.append(f"{xlrd.formula.colname(c)}{r+1}={v!r}")
        if vals:
            print("  " + " | ".join(vals))
    print()

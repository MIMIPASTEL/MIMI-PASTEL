"""Descifra un xlsx protegido y lo guarda sin contraseña."""
import sys
sys.path.insert(0, ".tools/pylibs")
import msoffcrypto

entrada, salida, clave = sys.argv[1], sys.argv[2], sys.argv[3]
with open(entrada, "rb") as f:
    office = msoffcrypto.OfficeFile(f)
    office.load_key(password=clave)
    with open(salida, "wb") as out:
        office.decrypt(out)
print("descifrado ->", salida)

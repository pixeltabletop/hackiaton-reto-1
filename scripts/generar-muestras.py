"""Genera las fotos de ejemplo (cédula y póliza) que se usan para probar el OCR.

Son documentos FICTICIOS, marcados como muestra: existen solo para que quien pruebe
la app pueda subir una foto real y ver el reconocimiento sin usar documentos de nadie.
"""
from PIL import Image, ImageDraw, ImageFont

REGULAR = "C:/Windows/Fonts/arial.ttf"
NEGRITA = "C:/Windows/Fonts/arialbd.ttf"
MONO = "C:/Windows/Fonts/consola.ttf"

ANCHO, ALTO = 1012, 638  # tamaño de una cédula real, en 2x para que el OCR lea cómodo


def fuente(ruta, tamano):
    return ImageFont.truetype(ruta, tamano)


def marca_de_muestra(dibujo):
    texto = "MUESTRA · DATOS FICTICIOS"
    dibujo.rectangle([0, ALTO - 46, ANCHO, ALTO], fill=(150, 32, 24))
    dibujo.text((18, ALTO - 40), texto, font=fuente(NEGRITA, 24), fill=(255, 255, 255))


def cedula(ruta, numero, nombre, nacimiento, vence, sexo):
    imagen = Image.new("RGB", (ANCHO, ALTO), (243, 240, 232))
    d = ImageDraw.Draw(imagen)

    # Franja superior, como la cédula panameña
    d.rectangle([0, 0, ANCHO, 118], fill=(14, 82, 122))
    d.text((290, 18), "REPÚBLICA DE PANAMÁ", font=fuente(NEGRITA, 32), fill=(255, 255, 255))
    d.text((300, 58), "TRIBUNAL ELECTORAL", font=fuente(REGULAR, 24), fill=(233, 240, 245))
    d.text((292, 88), "CÉDULA DE IDENTIDAD PERSONAL", font=fuente(REGULAR, 20), fill=(206, 224, 236))

    # Foto
    d.rectangle([34, 140, 250, 400], fill=(214, 210, 200), outline=(150, 150, 150), width=2)
    d.text((70, 258), "FOTO", font=fuente(REGULAR, 26), fill=(120, 120, 120))

    # Datos
    etiqueta = fuente(REGULAR, 19)
    valor = fuente(NEGRITA, 25)
    d.text((286, 148), "NOMBRES Y APELLIDOS", font=etiqueta, fill=(90, 96, 102))
    d.text((286, 172), nombre, font=valor, fill=(28, 34, 40))

    d.text((286, 232), "CÉDULA", font=etiqueta, fill=(90, 96, 102))
    d.text((286, 256), numero, font=fuente(MONO, 42), fill=(20, 26, 32))

    d.text((286, 330), "FECHA DE NACIMIENTO", font=etiqueta, fill=(90, 96, 102))
    d.text((286, 352), nacimiento, font=valor, fill=(28, 34, 40))
    d.text((600, 330), "SEXO", font=etiqueta, fill=(90, 96, 102))
    d.text((600, 352), sexo, font=valor, fill=(28, 34, 40))

    d.text((286, 412), "VENCE", font=etiqueta, fill=(90, 96, 102))
    d.text((286, 434), vence, font=valor, fill=(28, 34, 40))
    d.text((600, 412), "PÓLIZA DE SALUD", font=etiqueta, fill=(90, 96, 102))
    d.text((600, 436), "IS-A-2025-0871", font=fuente(MONO, 26), fill=(20, 26, 32))

    marca_de_muestra(d)
    imagen.save(ruta)


def poliza(ruta, numero, titular, desde, hasta):
    imagen = Image.new("RGB", (ANCHO, ALTO), (250, 249, 245))
    d = ImageDraw.Draw(imagen)

    d.rectangle([0, 0, ANCHO, 108], fill=(14, 107, 122))
    d.text((34, 20), "ASEGURADORA ISTMO SALUD", font=fuente(NEGRITA, 34), fill=(255, 255, 255))
    d.text((34, 64), "Certificado de póliza de salud", font=fuente(REGULAR, 22), fill=(219, 240, 243))

    etiqueta = fuente(REGULAR, 20)
    valor = fuente(NEGRITA, 26)

    d.text((34, 150), "NÚMERO DE PÓLIZA", font=etiqueta, fill=(90, 96, 102))
    d.text((34, 174), numero, font=fuente(MONO, 44), fill=(18, 24, 30))

    d.text((34, 262), "ASEGURADO TITULAR", font=etiqueta, fill=(90, 96, 102))
    d.text((34, 286), titular, font=valor, fill=(28, 34, 40))

    d.text((34, 350), "VIGENCIA", font=etiqueta, fill=(90, 96, 102))
    d.text((34, 374), f"del {desde} al {hasta}", font=valor, fill=(28, 34, 40))

    d.text((34, 438), "COBERTURA", font=etiqueta, fill=(90, 96, 102))
    d.text((34, 462), "Hospitalaria y quirúrgica · red de clínicas en Panamá", font=fuente(REGULAR, 22), fill=(28, 34, 40))

    marca_de_muestra(d)
    imagen.save(ruta)


if __name__ == "__main__":
    import os

    destino = os.path.join(os.path.dirname(__file__), "..", "public", "muestras")
    os.makedirs(destino, exist_ok=True)

    cedula(
        os.path.join(destino, "cedula-8-742-1593.png"),
        numero="8-742-1593",
        nombre="ANA MERCEDES RÍOS BATISTA",
        nacimiento="1972-04-18",
        vence="2030-04-18",
        sexo="F",
    )
    poliza(
        os.path.join(destino, "poliza-IS-A-2025-0871.png"),
        numero="IS-A-2025-0871",
        titular="ANA MERCEDES RÍOS BATISTA",
        desde="2025-01-01",
        hasta="2026-12-31",
    )
    print("listo:", os.listdir(destino))

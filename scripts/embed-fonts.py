#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Embute as fontes IBM Plex (TTF) dentro do PPTX para portabilidade total.
Manipula o zip OOXML diretamente (sem dependências)."""
import zipfile, shutil, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
TTF = os.path.join(HERE, "fonts", "ttf")
SRC = os.path.join(os.path.dirname(HERE), "Propostas comerciais", "Apresentacao_Comercial_FIHAN_Jose_Marcos.pptx")
TMP = SRC + ".embed.tmp"

# (typeface, {style: ttf})
FONTS = [
    ("IBM Plex Sans", {"regular":"ibm-plex-sans-v23-latin-regular.ttf",
                        "bold":"ibm-plex-sans-v23-latin-700.ttf",
                        "italic":"ibm-plex-sans-v23-latin-italic.ttf"}),
    ("IBM Plex Sans Light", {"regular":"ibm-plex-sans-v23-latin-300.ttf",
                              "italic":"ibm-plex-sans-v23-latin-300italic.ttf"}),
    ("IBM Plex Sans Medium", {"regular":"ibm-plex-sans-v23-latin-500.ttf"}),
    ("IBM Plex Sans SemiBold", {"regular":"ibm-plex-sans-v23-latin-600.ttf"}),
    ("IBM Plex Mono", {"regular":"ibm-plex-mono-v20-latin-regular.ttf"}),
]
STYLE_TAG = {"regular":"regular","bold":"bold","italic":"italic","boldItalic":"boldItalic"}

zin = zipfile.ZipFile(SRC)
items = {n: zin.read(n) for n in zin.namelist()}
zin.close()

# 1) fontes -> ppt/fonts/fontN.fntdata + montar listas
embedded = []   # (typeface, {style: rid})
rels_add = []   # (rid, target)
font_idx = 0
rid_idx = 9000
for typeface, styles in FONTS:
    style_rids = {}
    for style, fname in styles.items():
        font_idx += 1; rid_idx += 1
        part = f"ppt/fonts/font{font_idx}.fntdata"
        items[part] = open(os.path.join(TTF, fname), "rb").read()
        rid = f"rIdFont{rid_idx}"
        style_rids[style] = rid
        rels_add.append((rid, f"fonts/font{font_idx}.fntdata"))
    embedded.append((typeface, style_rids))

# 2) [Content_Types].xml -> Default fntdata
ct = items["[Content_Types].xml"].decode("utf-8")
if "fntdata" not in ct:
    ct = ct.replace("</Types>", '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>')
items["[Content_Types].xml"] = ct.encode("utf-8")

# 3) presentation.xml -> atributos + <p:embeddedFontLst>
pres = items["ppt/presentation.xml"].decode("utf-8")
m = re.search(r"<p:presentation\b[^>]*>", pres)
tag = m.group(0)
newtag = tag
if "embedTrueTypeFonts" not in newtag:
    newtag = newtag[:-1] + ' embedTrueTypeFonts="1">'   # não duplicar saveSubsetFonts (já existe)
pres = pres.replace(tag, newtag, 1)
lst = ["<p:embeddedFontLst>"]
for typeface, srids in embedded:
    lst.append("<p:embeddedFont>")
    lst.append(f'<p:font typeface="{typeface}"/>')
    for style in ("regular","bold","italic","boldItalic"):
        if style in srids:
            lst.append(f'<p:{STYLE_TAG[style]} r:id="{srids[style]}"/>')
    lst.append("</p:embeddedFont>")
lst.append("</p:embeddedFontLst>")
block = "".join(lst)
# inserir após o notesSz (ou sldSz)
if "</p:notesSz>" in pres or re.search(r"<p:notesSz\b[^>]*/>", pres):
    pres = re.sub(r"(<p:notesSz\b[^>]*/>)", r"\1" + block, pres, count=1)
else:
    pres = re.sub(r"(<p:sldSz\b[^>]*/>)", r"\1" + block, pres, count=1)
items["ppt/presentation.xml"] = pres.encode("utf-8")

# 4) presentation.xml.rels -> relationships de fonte
rels = items["ppt/_rels/presentation.xml.rels"].decode("utf-8")
add = "".join(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="{tgt}"/>' for rid,tgt in rels_add)
rels = rels.replace("</Relationships>", add + "</Relationships>")
items["ppt/_rels/presentation.xml.rels"] = rels.encode("utf-8")

# 5) gravar
zout = zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED)
for n, data in items.items():
    zout.writestr(n, data)
zout.close()
shutil.move(TMP, SRC)
print("OK fontes embutidas:", font_idx, "arquivos |", os.path.getsize(SRC)//1024, "KB")

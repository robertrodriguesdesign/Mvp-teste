#!/usr/bin/env python3
"""Rasteriza os SVGs de assets/svg para assets/png via headless Chrome
(garante o uso das fontes IBM Plex instaladas). Escala 2x para nitidez."""
import os, re, glob, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = os.path.join(HERE, "assets", "svg")
PNG = os.path.join(HERE, "assets", "png")
os.makedirs(PNG, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

for svg in sorted(glob.glob(os.path.join(SVG, "*.svg"))):
    name = os.path.splitext(os.path.basename(svg))[0]
    txt = open(svg).read()
    m = re.search(r'<svg[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"', txt)
    W, H = (int(float(m.group(1))), int(float(m.group(2)))) if m else (1920, 1080)
    is_bg = name.startswith("bg_")
    scale = 2 if not is_bg else 1
    html = f'<!doctype html><meta charset="utf-8"><body style="margin:0;padding:0;background:transparent">{txt}</body>'
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, dir=PNG)
    tmp.write(html); tmp.close()
    out = os.path.join(PNG, name + ".png")
    cmd = [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
           f"--force-device-scale-factor={scale}",
           "--default-background-color=00000000",
           f"--window-size={W},{H}", f"--screenshot={out}", "file://" + tmp.name]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.unlink(tmp.name)
    print(f"{name}.png  {W}x{H} @{scale}x")
print("OK rasterização")

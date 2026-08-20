#!/usr/bin/env python3
"""
Gerador de ícones pixelados da Fihan — estilo "superarrow".

Grid modular 10x10 = a grade 5x5 da Fihan com cada módulo dividido em 2
(meio-módulo). É exatamente a resolução em que a seta de referência do Figma
("superarrow") foi construída: elementos com 1 módulo (2 células) de espessura,
diagonais em escada de blocos que se tocam pelo canto e uso intencional do
espaço negativo.

Cada ícone é um bitmap 10x10 desenhado à mão nesse estilo. '#' acende a célula.

Saídas:
  - 40 SVGs em "Icones em SVG/"
  - galeria "icones-fihan.html"
  - "icons-data.js" (bitmaps) para o grid de construção
"""
import os
import json

GREEN = "#14CC52"
GRAY = "#5C665F"
MINT = "#DAF2E2"
DARK = "#202224"
N = 10

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_DIR = os.path.join(ROOT, "Icones em SVG")


# ---------------------------------------------------------------------------
# Bitmaps 10x10 (estilo superarrow). Linhas de cima para baixo.
# ---------------------------------------------------------------------------
RAW = {
# Setas — reprodução fiel da superarrow (cabeça em xadrez + espaço negativo)
"arrow-right": """
....##....
....##....
#.....##..
#.....##..
######..##
######..##
#.....##..
#.....##..
....##....
....##....""",
"arrow-left": """
....##....
....##....
..##.....#
..##.....#
##..######
##..######
..##.....#
..##.....#
....##....
....##....""",
"arrow-up": """
....##....
....##....
..##..##..
..##..##..
##..##..##
##..##..##
....##....
....##....
....##....
..######..""",
"arrow-down": """
..######..
....##....
....##....
....##....
##..##..##
##..##..##
..##..##..
..##..##..
....##....
....##....""",

"home": """
....##....
...####...
..######..
.########.
##########
.##....##.
.##.##.##.
.##.##.##.
.##.##.##.
.##....##.""",
"search": """
.######...
##....##..
##....##..
##....##..
##....##..
.######...
....####..
.....####.
......####
.......###""",
"heart": """
..........
.##....##.
####..####
##########
##########
.########.
..######..
...####...
....##....
..........""",
"star": """
....##....
....##....
.########.
##########
.########.
..######..
..##..##..
.##....##.
..........
..........""",
"user": """
...####...
..######..
..######..
..######..
...####...
..........
.########.
##########
##########
##########""",
"mail": """
..........
##########
###....###
##.####.##
##..##..##
##...##.##
##########
##########
..........
..........""",
"settings": """
....##....
.##.##.##.
.########.
####..####
###....###
###....###
####..####
.########.
.##.##.##.
....##....""",
"bell": """
....##....
...####...
..######..
..######..
.########.
.########.
##########
##########
...####...
....##....""",
"lock": """
..######..
.##....##.
.##....##.
##########
##########
###....###
###.##.###
###....###
##########
##########""",
"check": """
.........#
........##
.......##.
......##..
##...##...
###.##....
.####.....
..##......
..........
..........""",
"close": """
##......##
.##....##.
..##..##..
...####...
....##....
....##....
...####...
..##..##..
.##....##.
##......##""",
"plus": """
....##....
....##....
....##....
....##....
##########
##########
....##....
....##....
....##....
....##....""",
"minus": """
..........
..........
..........
..........
##########
##########
..........
..........
..........
..........""",
"play": """
##........
####......
######....
########..
##########
##########
########..
######....
####......
##........""",
"pause": """
.##....##.
.##....##.
.##....##.
.##....##.
.##....##.
.##....##.
.##....##.
.##....##.
.##....##.
.##....##.""",
"camera": """
...####...
..######..
##########
###....###
##.####.##
##.####.##
###....###
##########
##########
..........""",
"clock": """
..######..
.########.
##########
###.####.#
###.####.#
###....###
##########
##########
.########.
..######..""",
"trash": """
...####...
##########
..........
.########.
.#.##.##.#
.#.##.##.#
.#.##.##.#
.#.##.##.#
.########.
..........""",
"calendar": """
.#......#.
.#......#.
##########
##########
##.##.##.#
##.##.##.#
##.##.##.#
##########
##########
..........""",
"download": """
....##....
....##....
....##....
##..##..##
.##.##.##.
..######..
...####...
..........
.########.
.########.""",
"upload": """
...####...
..######..
.##.##.##.
##..##..##
....##....
....##....
..........
.########.
.########.
..........""",
"share": """
.......##.
......####
##....####
####..##..
######....
####..##..
##....####
......####
.......##.
..........""",
"chat": """
##########
##########
##.##.##.#
##########
##########
##########
.####.....
.##.......
..........
..........""",
"like": """
.......##.
.......##.
.....###..
##...##...
##.####...
########..
########..
########..
########..
..........""",
"cloud": """
..........
....####..
..########
.#########
##########
##########
##########
.########.
..........
..........""",
"folder": """
.####.....
######....
##########
##########
##########
##########
##########
##########
..........
..........""",
"file": """
.######.#.
.######.#.
.########.
.##....##.
.########.
.##....##.
.########.
.##....##.
.########.
..........""",
"image": """
##########
##......##
##.#..#.##
##....#.##
##...##.##
##.####.##
########.#
##########
..........
..........""",
"video": """
..........
##########
#........#
#.##.....#
#.####...#
#.####...#
#.##.....#
#........#
##########
..........""",
"music": """
.....#####
.....#####
.....#...#
.....#...#
.....#...#
###..#..##
####.####.
.##...##..
..........
..........""",
"wifi": """
..######..
.########.
##########
##......##
.#.####.#.
..######..
...####...
....##....
....##....
..........""",
"battery": """
..........
.#######.#
.#######.#
.#.....#.#
.#.###.#.#
.#.....#.#
.#######.#
.#######.#
..........
..........""",
"location": """
..######..
.########.
##########
##.####.##
##.####.##
##########
.########.
..######..
...####...
....##....""",
"tag": """
#######...
##....##..
##.....##.
##......##
##.....##.
##....##..
#######...
..........
..........
..........""",
"cart": """
.#........
.#........
.#######..
.#.....#..
.#.....#..
.#######..
..........
.##...##..
.##...##..
..........""",
"eye": """
..........
...####...
.###..###.
##..##..##
##.####.##
##..##..##
.###..###.
...####...
..........
..........""",
}

LABELS = {
    "home": "Início", "search": "Buscar", "heart": "Curtir", "star": "Favorito",
    "user": "Usuário", "mail": "E-mail", "settings": "Ajustes", "bell": "Notificação",
    "lock": "Bloqueio", "check": "Confirmar", "close": "Fechar", "plus": "Adicionar",
    "minus": "Remover", "arrow-up": "Seta cima", "arrow-down": "Seta baixo",
    "arrow-left": "Seta esq.", "arrow-right": "Seta dir.", "play": "Reproduzir",
    "pause": "Pausar", "camera": "Câmera", "clock": "Relógio", "trash": "Lixeira",
    "calendar": "Agenda", "download": "Baixar", "upload": "Enviar", "share": "Compartilhar",
    "chat": "Mensagem", "like": "Joinha", "cloud": "Nuvem", "folder": "Pasta",
    "file": "Arquivo", "image": "Imagem", "video": "Vídeo", "music": "Música",
    "wifi": "Wi-Fi", "battery": "Bateria", "location": "Local", "tag": "Etiqueta",
    "cart": "Carrinho", "eye": "Visualizar",
}

ORDER = [
    "arrow-right", "arrow-left", "arrow-up", "arrow-down",
    "home", "search", "heart", "star", "user", "mail", "settings", "bell", "lock",
    "check", "close", "plus", "minus", "play", "pause", "camera", "clock", "trash",
    "calendar", "download", "upload", "share", "chat", "like", "cloud", "folder",
    "file", "image", "video", "music", "wifi", "battery", "location", "tag", "cart", "eye",
]


def rows_of(name):
    r = [ln for ln in RAW[name].strip("\n").split("\n")]
    assert len(r) == N, f"{name}: {len(r)} linhas (esperado {N})"
    for ln in r:
        assert len(ln) == N, f"{name}: linha '{ln}' tem {len(ln)} cols"
    return r


def rle_rects(rows):
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < N:
            if row[x] == "#":
                s = x
                while x < N and row[x] == "#":
                    x += 1
                out.append(f'<rect x="{s}" y="{y}" width="{x - s}" height="1"/>')
            else:
                x += 1
    return out


def svg(rows, label):
    body = "".join(rle_rects(rows))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" '
        f'width="48" height="48" fill="currentColor" color="{GREEN}" '
        f'shape-rendering="crispEdges" role="img" aria-label="{label}">{body}</svg>\n'
    )


def main():
    os.makedirs(SVG_DIR, exist_ok=True)
    bitmaps = {name: rows_of(name) for name in ORDER}
    for name in ORDER:
        with open(os.path.join(SVG_DIR, f"{name}.svg"), "w", encoding="utf-8") as f:
            f.write(svg(bitmaps[name], LABELS[name]))
    print(f"OK: {len(ORDER)} SVGs em {SVG_DIR!r}")

    with open(os.path.join(ROOT, "icons-data.js"), "w", encoding="utf-8") as f:
        f.write("window.FIHAN_GRID = %d;\n" % N)
        f.write("window.FIHAN_ICONS = " + json.dumps({n: bitmaps[n] for n in ORDER}) + ";\n")
        f.write("window.FIHAN_LABELS = " + json.dumps(LABELS) + ";\n")
    print("OK: icons-data.js")

    cards = []
    for name in ORDER:
        inner = "".join(rle_rects(bitmaps[name]))
        cards.append(
            f'<figure class="card"><div class="art"><svg class="icon" viewBox="0 0 {N} {N}" '
            f'fill="currentColor" shape-rendering="crispEdges" role="img" aria-label="{LABELS[name]}">'
            f'{inner}</svg></div><figcaption><span class="lbl">{LABELS[name]}</span>'
            f'<code>{name}.svg</code></figcaption></figure>'
        )
    with open(os.path.join(ROOT, "icones-fihan.html"), "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{{CARDS}}", "\n".join(cards))
                    .replace("{{N}}", str(len(ORDER)))
                    .replace("{{GRID}}", str(N))
                    .replace("{{GREEN}}", GREEN)
                    .replace("{{DARK}}", DARK))
    print("OK: icones-fihan.html")


PAGE = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ícones Fihan — biblioteca pixelada</title>
<style>
  :root { --green: {{GREEN}}; --dark: {{DARK}}; --mint:#DAF2E2; --card:#161917; --border:#2c302e; --muted:#9CA3AF; --cells:{{GRID}}; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--dark); color:#F9F9F9; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  header { padding:56px 32px 24px; max-width:1180px; margin:0 auto; }
  .kicker { color:var(--green); font-weight:600; letter-spacing:.14em; text-transform:uppercase; font-size:12px; }
  h1 { font-size: clamp(28px,5vw,44px); margin:10px 0 8px; letter-spacing:-.02em; }
  p.sub { color:var(--muted); max-width:66ch; line-height:1.6; margin:0; }
  code { background:#11130f; padding:1px 5px; border-radius:4px; color:var(--mint); font-size:.92em; }
  .toolbar { max-width:1180px; margin:24px auto 0; padding:0 32px; display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
  .toolbar label { font-size:13px; color:var(--muted); display:inline-flex; gap:8px; align-items:center; }
  input[type=search] { background:var(--card); border:1px solid var(--border); color:#fff; padding:9px 13px; border-radius:10px; min-width:220px; font-size:14px; }
  input[type=color] { width:34px; height:34px; padding:0; border:1px solid var(--border); border-radius:8px; background:none; }
  .grid { max-width:1180px; margin:28px auto 80px; padding:0 32px; display:grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap:16px; }
  .card { margin:0; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:16px 14px 12px; text-align:center; transition:border-color .15s, transform .15s; }
  .card:hover { border-color:var(--green); transform:translateY(-2px); }
  .art { position:relative; width:96px; height:96px; margin:0 auto 12px; border-radius:8px;
         background-image: linear-gradient(to right, rgba(20,204,82,.12) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(20,204,82,.12) 1px, transparent 1px);
         background-size: calc(96px / var(--cells)) calc(96px / var(--cells)); }
  .art svg { position:absolute; inset:0; width:100%; height:100%; color:var(--green); padding:8px; }
  figcaption { display:flex; flex-direction:column; gap:3px; }
  .lbl { font-size:13px; font-weight:500; }
  figcaption code { background:none; color:var(--muted); font-size:11px; }
  footer { max-width:1180px; margin:0 auto; padding:0 32px 64px; color:var(--muted); font-size:13px; line-height:1.7; }
</style>
</head>
<body>
  <header>
    <div class="kicker">Fihan · Sistema de ícones</div>
    <h1>Biblioteca pixelada</h1>
    <p class="sub">{{N}} ícones no estilo <strong>superarrow</strong>, construídos sobre o grid
    modular {{GRID}}×{{GRID}} da Fihan (5×5 módulos × ½). Blocos sólidos, diagonais em escada e
    espaço negativo intencional. Todos usam <code>fill="currentColor"</code> — recoloríveis
    (verde #14CC52, cinza #5C665F, mint #DAF2E2).</p>
  </header>
  <div class="toolbar">
    <input id="q" type="search" placeholder="Filtrar ícones…" autocomplete="off">
    <label>Cor dos ícones <input id="clr" type="color" value="{{GREEN}}"></label>
    <label>Grid <input id="showgrid" type="checkbox" checked></label>
  </div>
  <main class="grid" id="grid">
{{CARDS}}
  </main>
  <footer>Gerado por <code>scripts/gen-icons.py</code> · arquivos em <code>Icones em SVG/</code> ·
  crie novos ícones em <code>grid-modular.html</code>.</footer>
<script>
  const q=document.getElementById('q'), grid=document.getElementById('grid'),
        clr=document.getElementById('clr'), sg=document.getElementById('showgrid');
  q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();
    grid.querySelectorAll('.card').forEach(c=>c.style.display=c.textContent.toLowerCase().includes(t)?'':'none');});
  clr.addEventListener('input',()=>document.querySelectorAll('.icon').forEach(s=>s.style.color=clr.value));
  sg.addEventListener('change',()=>document.querySelectorAll('.art').forEach(a=>a.style.backgroundImage=sg.checked?'':'none'));
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()

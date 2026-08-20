#!/usr/bin/env python3
"""
Gerador de ícones pixelados da Fihan — grid modular 24x24.

O grid do Figma (5x5) foi subdividido para 24x24 células, dando ~23x mais
"pixels" para desenhar ícones mais representativos, mantendo o estilo pixelado
(cada célula é um bloco; render com shape-rendering="crispEdges").

Em vez de pintar célula a célula, cada ícone é definido por primitivas
geométricas (linhas grossas, discos, anéis, polígonos) que são rasterizadas
no grid. Isso mantém os ícones limpos e fáceis de ajustar.

Saídas:
  - 40 SVGs individuais em "Icones em SVG/"
  - galeria única "icones-fihan.html"
  - "icons-data.js" (bitmaps 24x24) usado pelo grid de construção
"""
import os
import math

GREEN = "#14CC52"
PURPLE = "#8A38F5"
DARK = "#202224"
N = 10        # resolução do grid (módulos por lado) — único botão de ajuste
DESIGN = 24   # espaço lógico de desenho dos ícones (mapeado para N×N)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_DIR = os.path.join(ROOT, "Icones em SVG")


# ---------------------------------------------------------------------------
# Canvas de rasterização
# ---------------------------------------------------------------------------
def _seg_dist(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    if dx == 0 and dy == 0:
        return math.hypot(px - x0, py - y0)
    t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))


class C:
    """Desenha em espaço lógico DESIGN×DESIGN, rasterizando para N×N células."""

    def __init__(self):
        self.g = [[False] * N for _ in range(N)]
        self.f = N / float(DESIGN)   # fator de escala design -> grid

    def _set(self, x, y, v):
        if 0 <= x < N and 0 <= y < N:
            self.g[y][x] = v

    def rect(self, x0, y0, x1, y1, v=True):
        f = self.f
        x0, y0, x1, y1 = x0 * f, y0 * f, x1 * f, y1 * f
        for y in range(N):
            for x in range(N):
                if x0 - 0.5 <= x + 0.5 <= x1 + 0.5 and y0 - 0.5 <= y + 0.5 <= y1 + 0.5:
                    self._set(x, y, v)

    def disc(self, cx, cy, r, v=True):
        f = self.f; cx, cy, r = cx * f, cy * f, r * f
        for y in range(N):
            for x in range(N):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                    self._set(x, y, v)

    def ellipse(self, cx, cy, rx, ry, v=True):
        f = self.f; cx, cy, rx, ry = cx * f, cy * f, rx * f, ry * f
        for y in range(N):
            for x in range(N):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self._set(x, y, v)

    def ering(self, cx, cy, rx, ry, t, v=True):
        f = self.f; cx, cy, rx, ry, t = cx * f, cy * f, rx * f, ry * f, t * f
        for y in range(N):
            for x in range(N):
                d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
                din = ((x + 0.5 - cx) / max(0.1, rx - t)) ** 2 + ((y + 0.5 - cy) / max(0.1, ry - t)) ** 2
                if d <= 1 and din >= 1:
                    self._set(x, y, v)

    def ring(self, cx, cy, r, t, v=True):
        self.ering(cx, cy, r, r, t, v)

    def line(self, x0, y0, x1, y1, t, v=True):
        f = self.f; x0, y0, x1, y1 = x0 * f, y0 * f, x1 * f, y1 * f
        r = max(0.5, t * f / 2.0)
        for y in range(N):
            for x in range(N):
                if _seg_dist(x + 0.5, y + 0.5, x0, y0, x1, y1) <= r:
                    self._set(x, y, v)

    def poly(self, pts, v=True):
        f = self.f
        pts = [(px * f, py * f) for px, py in pts]
        ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(N, int(max(ys)) + 2)):
            yc = y + 0.5
            xs = []
            for i in range(len(pts)):
                ax, ay = pts[i]
                bx, by = pts[(i + 1) % len(pts)]
                if (ay <= yc < by) or (by <= yc < ay):
                    xs.append(ax + (yc - ay) / (by - ay) * (bx - ax))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(N):
                    if xs[i] <= x + 0.5 <= xs[i + 1]:
                        self._set(x, y, v)

    def frame(self, x0, y0, x1, y1, t, v=True):
        self.rect(x0, y0, x1, y1, v)
        self.rect(x0 + t, y0 + t, x1 - t, y1 - t, not v)

    def rows(self):
        return ["".join("#" if c else "." for c in row) for row in self.g]


# ---------------------------------------------------------------------------
# Definição dos 40 ícones (coordenadas em 0..24, centro 12)
# ---------------------------------------------------------------------------
def home(c):
    c.line(3, 12, 12, 4, 2.4); c.line(12, 4, 21, 12, 2.4)      # telhado
    c.line(6, 11, 6, 20, 2.4); c.line(18, 11, 18, 20, 2.4)     # paredes
    c.line(6, 20, 18, 20, 2.4)                                  # piso
    c.frame(10, 14, 14, 21, 2)                                  # porta

def search(c):
    c.ring(10, 10, 6.5, 2.4)
    c.line(14.6, 14.6, 21, 21, 2.6)

def heart(c):
    c.disc(8.3, 9, 4.6); c.disc(15.7, 9, 4.6)
    c.poly([(4, 11), (20, 11), (12, 21)])

def star(c):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = 9.5 if i % 2 == 0 else 4.0
        pts.append((12 + r * math.cos(ang), 12 + r * math.sin(ang)))
    c.poly(pts)

def user(c):
    c.disc(12, 8, 4.3)
    c.poly([(4, 22), (5.5, 17), (8, 14.5), (16, 14.5), (18.5, 17), (20, 22)])

def mail(c):
    c.frame(3, 6, 21, 18, 2)
    c.line(4, 7, 12, 13, 2); c.line(20, 7, 12, 13, 2)

def settings(c):
    for i in range(8):
        a = i * math.pi / 4
        c.line(12, 12, 12 + 9 * math.cos(a), 12 + 9 * math.sin(a), 4.2)
    c.disc(12, 12, 7)
    c.disc(12, 12, 3.2, False)

def bell(c):
    c.disc(12, 9, 5)
    c.rect(7, 9, 17, 17)
    c.poly([(5, 18), (19, 18), (17, 16), (7, 16)])
    c.line(5, 18, 19, 18, 2)
    c.disc(12, 20, 2)

def lock(c):
    c.ring(12, 11, 4.5, 2.4)             # arco (metade inferior é coberta)
    c.rect(5, 12, 19, 21)                # corpo
    c.disc(12, 16, 1.8, False)           # buraco da fechadura
    c.rect(11, 17, 12, 19, False)        # fenda

def check(c):
    c.line(4, 13, 10, 19, 3.2); c.line(10, 19, 20, 6, 3.2)

def close(c):
    c.line(6, 6, 18, 18, 3.2); c.line(18, 6, 6, 18, 3.2)

def plus(c):
    c.line(12, 4, 12, 20, 3.2); c.line(4, 12, 20, 12, 3.2)

def minus(c):
    c.line(4, 12, 20, 12, 3.2)

def arrow_up(c):
    c.line(12, 6, 12, 20, 3); c.line(12, 5, 5, 12, 3); c.line(12, 5, 19, 12, 3)

def arrow_down(c):
    c.line(12, 4, 12, 18, 3); c.line(12, 19, 5, 12, 3); c.line(12, 19, 19, 12, 3)

def arrow_left(c):
    c.line(4, 12, 20, 12, 3); c.line(5, 12, 12, 5, 3); c.line(5, 12, 12, 19, 3)

def arrow_right(c):
    c.line(4, 12, 20, 12, 3); c.line(19, 12, 12, 5, 3); c.line(19, 12, 12, 19, 3)

def play(c):
    c.poly([(7, 4), (7, 20), (20, 12)])

def pause(c):
    c.rect(6, 4, 10, 20); c.rect(14, 4, 18, 20)

def camera(c):
    c.frame(3, 8, 21, 20, 2)
    c.poly([(8, 8), (9.5, 5), (14.5, 5), (16, 8)])
    c.ring(12, 14, 4, 2.2)
    c.disc(18, 11, 1.2)

def clock(c):
    c.ring(12, 12, 8.5, 2.2)
    c.line(12, 12, 12, 7, 2); c.line(12, 12, 16, 14, 2)

def trash(c):
    c.line(4, 7, 20, 7, 2.4)               # tampa
    c.rect(9, 4, 15, 6)                     # alça
    c.line(6, 8, 7.5, 21, 2.2)             # lateral esq. (afunila)
    c.line(18, 8, 16.5, 21, 2.2)          # lateral dir.
    c.line(7.5, 21, 16.5, 21, 2.2)        # fundo
    c.line(10, 11, 10, 19, 1.6); c.line(12, 11, 12, 19, 1.6); c.line(14, 11, 14, 19, 1.6)  # ranhuras

def calendar(c):
    c.frame(3, 6, 21, 21, 2)
    c.line(3, 10, 21, 10, 2)
    c.line(8, 3, 8, 7, 2.4); c.line(16, 3, 16, 7, 2.4)
    c.disc(8, 14, 1.3); c.disc(12, 14, 1.3); c.disc(16, 14, 1.3); c.disc(8, 18, 1.3); c.disc(12, 18, 1.3)

def download(c):
    c.line(12, 4, 12, 15, 3); c.line(12, 17, 6, 11, 3); c.line(12, 17, 18, 11, 3)
    c.line(5, 20, 5, 21, 2); c.line(19, 20, 19, 21, 2); c.line(5, 21, 19, 21, 2.4)

def upload(c):
    c.line(12, 9, 12, 20, 3); c.line(12, 7, 6, 13, 3); c.line(12, 7, 18, 13, 3)
    c.line(5, 21, 19, 21, 2.4)

def share(c):
    c.disc(6, 12, 2.8); c.disc(18, 6, 2.8); c.disc(18, 18, 2.8)
    c.line(7.5, 11, 16.5, 7, 2); c.line(7.5, 13, 16.5, 17, 2)

def chat(c):
    c.frame(3, 4, 21, 16, 2)
    c.poly([(7, 16), (7, 21), (13, 16)])
    c.disc(8, 10, 1.3); c.disc(12, 10, 1.3); c.disc(16, 10, 1.3)

def like(c):
    c.rect(3, 12, 7, 21)                                  # antebraço/punho
    c.poly([(7, 12), (11, 12), (11, 6), (13, 4), (14.5, 5), (13.5, 11),
            (20, 11), (19, 21), (7, 21)])

def cloud(c):
    c.disc(9, 13, 4.5); c.disc(15, 11, 5.5); c.disc(18, 14, 3.8)
    c.rect(6, 13, 19, 17)

def folder(c):
    c.poly([(3, 7), (9, 7), (11, 9), (21, 9), (21, 19), (3, 19)])
    c.poly([(5, 9), (9.2, 9), (10.5, 11), (19, 11), (19, 17), (5, 17)], False)

def file(c):
    c.poly([(6, 3), (15, 3), (20, 8), (20, 21), (6, 21)])       # página + canto dobrado
    c.poly([(8, 5), (13, 5), (18, 9), (18, 19), (8, 19)], False)  # interior (deixa borda)
    c.poly([(15, 3), (15, 8), (20, 8)])                         # dobra (orelha)
    c.line(9, 12, 16, 12, 1.6); c.line(9, 15, 16, 15, 1.6); c.line(9, 18, 14, 18, 1.6)

def image(c):
    c.frame(3, 5, 21, 19, 2)
    c.disc(8.5, 10, 1.8)
    c.poly([(5, 17), (10, 11), (14, 17)])
    c.poly([(12, 17), (16, 13), (20, 17)])

def video(c):
    c.frame(3, 7, 14, 17, 2)
    c.poly([(6.5, 9.5), (6.5, 14.5), (11, 12)])
    c.poly([(15, 10), (20, 7), (20, 17), (15, 14)])

def music(c):
    c.line(10, 7, 10, 19, 2); c.line(19, 5, 19, 17, 2)
    c.line(10, 6, 19, 4, 2.4); c.line(10, 9, 19, 7, 2.4)
    c.disc(7.5, 19, 2.8); c.disc(16.5, 17, 2.8)

def wifi(c):
    c.ring(12, 20, 13, 2.4); c.ring(12, 20, 9, 2.4); c.ring(12, 20, 5, 2.4)
    c.rect(0, 20, 23, 23, False)
    c.disc(12, 20, 1.6)

def battery(c):
    c.frame(3, 8, 19, 18, 2)
    c.rect(19, 11, 21, 15)
    c.rect(6, 11, 12, 15)

def location(c):
    c.poly([(5, 12), (19, 12), (12, 22)])
    c.disc(12, 9, 6.5)
    c.disc(12, 9, 4, False)
    c.poly([(7.5, 12.5), (16.5, 12.5), (12, 19.5)], False)

def tag(c):
    c.poly([(4, 4), (12, 4), (21, 13), (12, 21), (4, 13)])
    c.poly([(6.5, 6.5), (11, 6.5), (18, 13), (11, 18.5), (6.5, 11)], False)
    c.disc(8, 9, 1.5, False)

def cart(c):
    c.line(3, 5, 6, 5, 2); c.line(6, 5, 8, 16, 2)
    c.poly([(8, 8), (21, 8), (19, 16), (10, 16)])
    c.poly([(9.5, 9.5), (19.5, 9.5), (18, 14.5), (10.8, 14.5)], False)
    c.disc(11, 20, 2); c.disc(18, 20, 2)

def eye(c):
    c.ellipse(12, 12, 9, 5.5)
    c.ellipse(12, 12, 6.5, 3.2, False)
    c.disc(12, 12, 3)


REGISTRY = [
    ("home", home, "Início"), ("search", search, "Buscar"), ("heart", heart, "Curtir"),
    ("star", star, "Favorito"), ("user", user, "Usuário"), ("mail", mail, "E-mail"),
    ("settings", settings, "Ajustes"), ("bell", bell, "Notificação"), ("lock", lock, "Bloqueio"),
    ("check", check, "Confirmar"), ("close", close, "Fechar"), ("plus", plus, "Adicionar"),
    ("minus", minus, "Remover"), ("arrow-up", arrow_up, "Seta cima"), ("arrow-down", arrow_down, "Seta baixo"),
    ("arrow-left", arrow_left, "Seta esq."), ("arrow-right", arrow_right, "Seta dir."), ("play", play, "Reproduzir"),
    ("pause", pause, "Pausar"), ("camera", camera, "Câmera"), ("clock", clock, "Relógio"),
    ("trash", trash, "Lixeira"), ("calendar", calendar, "Agenda"), ("download", download, "Baixar"),
    ("upload", upload, "Enviar"), ("share", share, "Compartilhar"), ("chat", chat, "Mensagem"),
    ("like", like, "Joinha"), ("cloud", cloud, "Nuvem"), ("folder", folder, "Pasta"),
    ("file", file, "Arquivo"), ("image", image, "Imagem"), ("video", video, "Vídeo"),
    ("music", music, "Música"), ("wifi", wifi, "Wi-Fi"), ("battery", battery, "Bateria"),
    ("location", location, "Local"), ("tag", tag, "Etiqueta"), ("cart", cart, "Carrinho"),
    ("eye", eye, "Visualizar"),
]


def bitmap(fn):
    c = C()
    fn(c)
    return c.rows()


def rle_rects(rows):
    """Comprime cada linha em runs -> menos <rect>."""
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < N:
            if row[x] == "#":
                start = x
                while x < N and row[x] == "#":
                    x += 1
                out.append(f'<rect x="{start}" y="{y}" width="{x - start}" height="1"/>')
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
    bitmaps = {}
    for name, fn, label in REGISTRY:
        rows = bitmap(fn)
        bitmaps[name] = rows
        with open(os.path.join(SVG_DIR, f"{name}.svg"), "w", encoding="utf-8") as f:
            f.write(svg(rows, label))
    print(f"OK: {len(REGISTRY)} SVGs em {SVG_DIR!r}")

    # icons-data.js (para o grid de construção)
    import json
    data = {name: bitmaps[name] for name, _, _ in REGISTRY}
    with open(os.path.join(ROOT, "icons-data.js"), "w", encoding="utf-8") as f:
        f.write("window.FIHAN_GRID = %d;\n" % N)
        f.write("window.FIHAN_ICONS = " + json.dumps(data) + ";\n")
        f.write("window.FIHAN_LABELS = " + json.dumps({n: l for n, _, l in REGISTRY}) + ";\n")
    print("OK: icons-data.js")

    # galeria
    cards = []
    for name, _, label in REGISTRY:
        inner = "".join(rle_rects(bitmaps[name]))
        cards.append(
            f'<figure class="card"><div class="art"><svg class="icon" viewBox="0 0 {N} {N}" '
            f'fill="currentColor" shape-rendering="crispEdges" role="img" aria-label="{label}">'
            f'{inner}</svg></div><figcaption><span class="lbl">{label}</span>'
            f'<code>{name}.svg</code></figcaption></figure>'
        )
    with open(os.path.join(ROOT, "icones-fihan.html"), "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{{CARDS}}", "\n".join(cards))
                    .replace("{{N}}", str(len(REGISTRY)))
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
  p.sub { color:var(--muted); max-width:64ch; line-height:1.6; margin:0; }
  code { background:#11130f; padding:1px 5px; border-radius:4px; color:var(--mint); font-size:.92em; }
  .toolbar { max-width:1180px; margin:24px auto 0; padding:0 32px; display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
  .toolbar label { font-size:13px; color:var(--muted); display:inline-flex; gap:8px; align-items:center; }
  input[type=search] { background:var(--card); border:1px solid var(--border); color:#fff; padding:9px 13px; border-radius:10px; min-width:220px; font-size:14px; }
  input[type=color] { width:34px; height:34px; padding:0; border:1px solid var(--border); border-radius:8px; background:none; }
  .grid { max-width:1180px; margin:28px auto 80px; padding:0 32px; display:grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap:16px; }
  .card { margin:0; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:16px 14px 12px; text-align:center; transition:border-color .15s, transform .15s; }
  .card:hover { border-color:var(--green); transform:translateY(-2px); }
  .art { position:relative; width:96px; height:96px; margin:0 auto 12px; border-radius:8px;
         background-image: linear-gradient(to right, rgba(20,204,82,.10) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(20,204,82,.10) 1px, transparent 1px);
         background-size: calc(96px / var(--cells)) calc(96px / var(--cells)); }
  .art svg { position:absolute; inset:0; width:100%; height:100%; color:var(--green); }
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
    <p class="sub">{{N}} ícones contextuais construídos sobre o grid modular {{GRID}}×{{GRID}} da Fihan,
    no estilo pixelado. As linhas verdes mostram o grid de construção; cada ícone ocupa células
    inteiras. Todos usam <code>fill="currentColor"</code> e são recoloríveis.</p>
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

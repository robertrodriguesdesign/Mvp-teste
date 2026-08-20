#!/usr/bin/env python3
"""Gera os assets visuais da apresentação FIHAN (fundos, ícones normais e os 4
diagramas) como SVG. Depois são rasterizados para PNG por scripts/raster.js."""
import os, math

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "svg")
os.makedirs(OUT, exist_ok=True)

GRAFITE="#202224"; CARVAO="#43464A"; NEUTRO="#65696E"; PRATEADO="#AEB1B5"
GELO="#D7D9DB"; CLARO="#E6E6E6"; BRANCO="#FAFAFA"; ROXO="#6D62B3"; LAVANDA="#C5BEEE"; DEV2="#07A55D"

def w(name, svg):
    open(os.path.join(OUT, name+".svg"), "w").write(svg)

# ---------------------------------------------------------------- BACKGROUNDS
def bg(name, base, glow, op, W=1920, H=1080):
    w(name, f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs><radialGradient id="g" cx="0.80" cy="0.12" r="0.95">
<stop offset="0" stop-color="{glow}" stop-opacity="{op}"/>
<stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="{base}"/>
<rect width="{W}" height="{H}" fill="url(#g)"/></svg>''')

bg("bg_grafite", GRAFITE, CARVAO, 0.75)
bg("bg_carvao",  GRAFITE, CARVAO, 1.0)        # transição (mais luz)
bg("bg_branco",  BRANCO,  CLARO,  0.0)        # base branca pura
# branca com leve vinheta clara embaixo-esq (topo-dir mais claro):
w("bg_branco", f'''<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
<defs><radialGradient id="g" cx="0.18" cy="0.92" r="1.05">
<stop offset="0" stop-color="{CLARO}" stop-opacity="0.9"/>
<stop offset="0.7" stop-color="{CLARO}" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="{BRANCO}"/><rect width="1920" height="1080" fill="url(#g)"/></svg>''')
bg("bg_claro",   CLARO,   BRANCO, 0.95)
# fechamento: grafite com ponto de luz forte no topo-direito
w("bg_close", f'''<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
<defs><radialGradient id="g" cx="0.82" cy="0.13" r="0.7">
<stop offset="0" stop-color="{DEV2}" stop-opacity="0.20"/>
<stop offset="0.45" stop-color="{CARVAO}" stop-opacity="0.30"/>
<stop offset="1" stop-color="{GRAFITE}" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="{GRAFITE}"/><rect width="1920" height="1080" fill="url(#g)"/></svg>''')

# ---------------------------------------------------------------- ÍCONES (linha)
def ico(name, color, body, sw=6):
    w("ic_"+name, f'''<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 100 100"
fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{body}</svg>''')

ico("chart_"+"carvao".upper() if False else "chart_carvao", CARVAO,
    '<line x1="16" y1="84" x2="88" y2="84"/><rect x="22" y="54" width="14" height="26"/><rect x="43" y="38" width="14" height="42"/><rect x="64" y="22" width="14" height="58"/>')
ico("spark_carvao", CARVAO,
    '<path d="M50 14 C54 38 62 46 86 50 C62 54 54 62 50 86 C46 62 38 54 14 50 C38 46 46 38 50 14 Z"/>')
ico("code_carvao", CARVAO,
    '<polyline points="36,30 16,50 36,70"/><polyline points="64,30 84,50 64,70"/><line x1="57" y1="24" x2="43" y2="76"/>')
ico("magnifier_carvao", CARVAO,
    '<circle cx="42" cy="42" r="24"/><line x1="59" y1="59" x2="84" y2="84"/>')
ico("blocks_carvao", CARVAO,
    '<rect x="18" y="18" width="28" height="28"/><rect x="54" y="18" width="28" height="28"/><rect x="18" y="54" width="28" height="28"/><rect x="54" y="54" width="28" height="28"/>')
ico("layers_carvao", CARVAO,
    '<path d="M50 16 L86 36 L50 56 L14 36 Z"/><polyline points="14,52 50,72 86,52"/><polyline points="14,66 50,86 86,66"/>')
ico("cursor_carvao", CARVAO,
    '<path d="M26 22 L70 44 L48 50 L60 78 L50 82 L38 56 L24 70 Z"/>')
ico("terminal_dev", DEV2,
    '<rect x="14" y="22" width="72" height="56" rx="4"/><polyline points="28,42 40,52 28,62"/><line x1="48" y1="64" x2="70" y2="64"/>')
ico("check_dev", DEV2, '<polyline points="20,52 40,72 82,28"/>', sw=8)
ico("check_gelo", GELO, '<polyline points="20,52 40,72 82,28"/>', sw=8)
ico("x_neutro", NEUTRO, '<line x1="26" y1="26" x2="74" y2="74"/><line x1="74" y1="26" x2="26" y2="74"/>', sw=8)
ico("arrow_carvao", CARVAO, '<line x1="18" y1="50" x2="78" y2="50"/><polyline points="60,32 82,50 60,68"/>', sw=7)

# ---------------------------------------------------------------- DIAGRAMA 4.2 ESPIRAL
def spiral_path(turns, a, b, t0, t1, cx, cy, steps=240):
    pts=[]
    for i in range(steps+1):
        t=t0+(t1-t0)*i/steps
        r=a+b*t
        pts.append((cx+r*math.cos(t), cy+r*math.sin(t)))
    return pts
def to_path(pts):
    return "M"+" L".join(f"{x:.1f},{y:.1f}" for x,y in pts)
W=820; H=760; cx=410; cy=380
a=8; b=10.5
# três faixas de ângulo (voltas) -> 3 cores
seg1=spiral_path(3,a,b,0.6, 7.0, cx,cy)          # interna - Negócio
seg2=spiral_path(3,a,b,6.7,13.3, cx,cy)          # meio - Marca
seg3=spiral_path(3,a,b,13.0,19.6, cx,cy)         # externa - Desenvolvimento
def arrowhead(pts,color):
    (x1,y1),(x0,y0)=pts[-1],pts[-6]
    ang=math.atan2(y1-y0,x1-x0); L=18; spread=0.5
    p2=(x1-L*math.cos(ang-spread), y1-L*math.sin(ang-spread))
    p3=(x1-L*math.cos(ang+spread), y1-L*math.sin(ang+spread))
    return f'<path d="M{x1:.1f},{y1:.1f} L{p2[0]:.1f},{p2[1]:.1f} M{x1:.1f},{y1:.1f} L{p3[0]:.1f},{p3[1]:.1f}" stroke="{color}" stroke-width="9" fill="none" stroke-linecap="round"/>'
verts=[]
for tt,lbl in [(3.2,"V1"),(6.6,"V2"),(12.9,"V3"),(19.2,"V4")]:
    r=a+b*tt; vx=cx+r*math.cos(tt); vy=cy+r*math.sin(tt)
    verts.append(f'<circle cx="{vx:.1f}" cy="{vy:.1f}" r="11" fill="{ROXO}"/><text x="{vx:.1f}" y="{vy-20:.1f}" font-family="IBM Plex Sans" font-weight="600" font-size="20" fill="{ROXO}" text-anchor="middle">{lbl}</text>')
w("dg_spiral", f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<path d="{to_path(seg1)}" fill="none" stroke="{NEUTRO}" stroke-width="9" stroke-linecap="round"/>
<path d="{to_path(seg2)}" fill="none" stroke="{ROXO}" stroke-width="9" stroke-linecap="round"/>
<path d="{to_path(seg3)}" fill="none" stroke="{DEV2}" stroke-width="9" stroke-linecap="round"/>
{arrowhead(seg2,ROXO)}{arrowhead(seg3,DEV2)}
{''.join(verts)}
</svg>''')

# ---------------------------------------------------------------- DIAGRAMA 4.3 VÉRTICES (timeline)
VW=1680; VH=440
verts4=[("01","Problema Validado","O problema se confirmou?","Semana 2"),
        ("02","Solução e Posicionamento Aprovados","A solução resolve o problema validado?","Semana 3"),
        ("03","Solução Funcional","A solução funciona tecnicamente?","Semana 6"),
        ("04","Ativo Completo","Os ativos estão coerentes e a solução está no mundo real?","Semana 8")]
xs=[VW*(i+0.5)/4 for i in range(4)]; midy=210
el=[f'<line x1="60" y1="{midy}" x2="{VW-60}" y2="{midy}" stroke="{CARVAO}" stroke-width="3"/>']
def wrap(s,n):
    out=[]; line=""
    for word in s.split():
        if len(line)+len(word)+1<=n: line=(line+" "+word).strip()
        else: out.append(line); line=word
    out.append(line); return out
for i,(num,title,q,wk) in enumerate(verts4):
    x=xs[i]
    el.append(f'<circle cx="{x:.0f}" cy="{midy}" r="40" fill="{ROXO}"/>')
    el.append(f'<text x="{x:.0f}" y="{midy+11:.0f}" font-family="IBM Plex Sans" font-weight="700" font-size="34" fill="{BRANCO}" text-anchor="middle">{num}</text>')
    el.append(f'<text x="{x:.0f}" y="{midy-62:.0f}" font-family="IBM Plex Sans" font-size="13" fill="{NEUTRO}" text-anchor="middle" letter-spacing="2">{wk.upper()}</text>')
    for j,ln in enumerate(wrap(title,22)):
        el.append(f'<text x="{x:.0f}" y="{midy-110+j*26:.0f}" font-family="IBM Plex Sans" font-weight="600" font-size="22" fill="{GRAFITE}" text-anchor="middle">{ln}</text>')
    for j,ln in enumerate(wrap(q,26)):
        el.append(f'<text x="{x:.0f}" y="{midy+78+j*24:.0f}" font-family="IBM Plex Sans" font-size="17" fill="{CARVAO}" text-anchor="middle">{ln}</text>')
w("dg_vertices", f'<svg xmlns="http://www.w3.org/2000/svg" width="{VW}" height="{VH}" viewBox="0 0 {VW} {VH}">{"".join(el)}</svg>')

# ---------------------------------------------------------------- DIAGRAMA 4.4 MAPA DO SPRINT
MW=1720; MH=620
cells=[
 ["Frente 1, Diagnóstico do Problema","Visão Interna com o founder",None],
 ["Frente 2, Escuta de Cliente","Visão Externa e de Mercado",None],
 ["Frentes 3 e 4, Engenharia e Inteligência Competitiva","Vetor Estratégico, Diretrizes, DNA da Marca",None],
 ["Frente 6, Dimensionamento de Mercado","Codex de Marca, Briefing visual","Início, Design System Atômico"],
 ["Frente 5, Validação de Conceito","Perfis de Experiência, Jornada Ideal","Construção front-end"],
 ["Frentes 7 e 8, Modelagem e Estratégia","Experiências Memoráveis, Síntese","Back-end, banco, autenticação"],
 ["Frente 9, Projeção de Viabilidade","Segmentos, Narrativa, Síntese","Integração e deploy"],
 ["Frente 10, Composição de Time","Integração de identidade","Solução Operável no ar"],
]
labelW=250; gridX=labelW+20; gridW=MW-gridX-20; colW=gridW/8
headY=40; rowH=150; rowY=[80, 80+rowH, 80+2*rowH]
rowColors=[NEUTRO,ROXO,DEV2]; rowNames=["Eixo de Negócio","Eixo de Marca","Eixo de Desenvolvimento"]
e=[f'<rect width="{MW}" height="{MH}" fill="{BRANCO}"/>']
for c in range(8):
    cxp=gridX+c*colW
    e.append(f'<text x="{cxp+colW/2:.0f}" y="{headY:.0f}" font-family="IBM Plex Sans" font-weight="600" font-size="17" fill="{GRAFITE}" text-anchor="middle">SEM {c+1:02d}</text>')
    e.append(f'<line x1="{cxp:.0f}" y1="60" x2="{cxp:.0f}" y2="{rowY[2]+rowH-20}" stroke="{CLARO}" stroke-width="1"/>')
for r in range(3):
    e.append(f'<text x="20" y="{rowY[r]+rowH/2:.0f}" font-family="IBM Plex Sans" font-weight="600" font-size="17" fill="{rowColors[r]}">{rowNames[r]}</text>')
    for c in range(8):
        cxp=gridX+c*colW; txt=cells[c][r]
        bx=cxp+8; by=rowY[r]+14; bw=colW-16; bh=rowH-28
        if txt is None:
            e.append(f'<line x1="{cxp+12:.0f}" y1="{rowY[r]+rowH/2:.0f}" x2="{cxp+colW-12:.0f}" y2="{rowY[r]+rowH/2:.0f}" stroke="{GELO}" stroke-width="2" stroke-dasharray="6 6"/>')
            continue
        fill = "#EFF6F1" if r==2 else ("#F1EEF8" if r==1 else "#F0F1F2")
        e.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{bw:.0f}" height="{bh:.0f}" rx="6" fill="{fill}" stroke="{GELO}" stroke-width="1"/>')
        for j,ln in enumerate(wrap(txt,18)):
            e.append(f'<text x="{cxp+colW/2:.0f}" y="{by+30+j*20:.0f}" font-family="IBM Plex Sans" font-size="13.5" fill="{GRAFITE}" text-anchor="middle">{ln}</text>')
# barras de vértices ao final das semanas 2,3,6,8
for wk,lbl,accent in [(2,"V1",False),(3,"V2",False),(6,"V3",False),(8,"V4",True)]:
    bx=gridX+wk*colW
    col=DEV2 if accent else ROXO
    e.append(f'<line x1="{bx:.0f}" y1="62" x2="{bx:.0f}" y2="{rowY[2]+rowH-16}" stroke="{col}" stroke-width="4"/>')
    e.append(f'<rect x="{bx-16:.0f}" y="{rowY[2]+rowH-14}" width="32" height="26" rx="4" fill="{col}"/>')
    e.append(f'<text x="{bx:.0f}" y="{rowY[2]+rowH+4:.0f}" font-family="IBM Plex Sans" font-weight="700" font-size="15" fill="{BRANCO}" text-anchor="middle">{lbl}</text>')
# marco de handoff (fim sem3/inicio sem4)
hx=gridX+3*colW
e.append(f'<text x="{hx:.0f}" y="{MH-12:.0f}" font-family="IBM Plex Sans" font-style="italic" font-size="13" fill="{CARVAO}" text-anchor="middle">Handoff Estratégia para Desenvolvimento</text>')
w("dg_sprintmap", f'<svg xmlns="http://www.w3.org/2000/svg" width="{MW}" height="{MH}" viewBox="0 0 {MW} {MH}">{"".join(e)}</svg>')

# ---------------------------------------------------------------- DIAGRAMA 4.5 PORTAS DE SAÍDA
PW=1500; PH=720; pcx=PW/2; pcy=PH/2
nodes=[("Mercado Direto","Venda para empresas privadas que precisam cumprir NR-1 e NR-17. Solução pronta para uso.", -1,-1),
       ("Prefeitura de Vitória","Se o processo avançar, você chega com produto funcional, validado, com compliance LGPD.", 1,-1),
       ("Programa Centelha","Os ativos atendem às exigências de prestação técnica e financeira do programa.", -1,1),
       ("Investidores","Problema validado, mercado dimensionado, marca construída, produto rodando.", 1,1)]
cardW=340; cardH=150; offx=470; offy=210
pe=[]
for title,desc,dx,dy in nodes:
    ncx=pcx+dx*offx; ncy=pcy+dy*offy
    pe.append(f'<line x1="{pcx}" y1="{pcy}" x2="{ncx:.0f}" y2="{ncy:.0f}" stroke="{CARVAO}" stroke-width="1.5"/>')
for title,desc,dx,dy in nodes:
    ncx=pcx+dx*offx; ncy=pcy+dy*offy; bx=ncx-cardW/2; by=ncy-cardH/2
    pe.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{cardW}" height="{cardH}" rx="10" fill="{BRANCO}" stroke="{GELO}" stroke-width="2"/>')
    pe.append(f'<text x="{bx+26:.0f}" y="{by+44:.0f}" font-family="IBM Plex Sans" font-weight="600" font-size="22" fill="{GRAFITE}">{title}</text>')
    for j,ln in enumerate(wrap(desc,38)):
        pe.append(f'<text x="{bx+26:.0f}" y="{by+78+j*24:.0f}" font-family="IBM Plex Sans" font-size="15" fill="{CARVAO}">{ln}</text>')
# nó central
pe.append(f'<circle cx="{pcx}" cy="{pcy}" r="118" fill="{BRANCO}" opacity="0.6"/>')
pe.append(f'<circle cx="{pcx}" cy="{pcy}" r="100" fill="{GRAFITE}"/>')
pe.append(f'<text x="{pcx}" y="{pcy-6}" font-family="IBM Plex Sans" font-weight="700" font-size="24" fill="{BRANCO}" text-anchor="middle">O Ativo</text>')
pe.append(f'<text x="{pcx}" y="{pcy+24}" font-family="IBM Plex Sans" font-weight="700" font-size="24" fill="{BRANCO}" text-anchor="middle">Construído</text>')
w("dg_portas", f'<svg xmlns="http://www.w3.org/2000/svg" width="{PW}" height="{PH}" viewBox="0 0 {PW} {PH}">{"".join(pe)}</svg>')

print("OK assets SVG em", OUT)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta Apresentacao_Comercial_FIHAN_Jose_Marcos.pptx (16:9, 1920x1080, 22 slides)
seguindo o Handoff de Execução. Texto fiel à proposta, sem travessão em.
Rodar com o venv:  scripts/venv/bin/python scripts/build-pptx.py
"""
import os
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

HERE = os.path.dirname(os.path.abspath(__file__))
PNG = os.path.join(HERE, "assets", "png")
OUT = os.path.join(os.path.dirname(HERE), "Propostas comerciais", "Apresentacao_Comercial_FIHAN_Jose_Marcos.pptx")

PX = 9525
def E(px): return Emu(int(round(px * PX)))

# paleta
GRAFITE = RGBColor(0x20,0x22,0x24); CARVAO = RGBColor(0x43,0x46,0x4A)
NEUTRO = RGBColor(0x65,0x69,0x6E); PRATEADO = RGBColor(0xAE,0xB1,0xB5)
GELO = RGBColor(0xD7,0xD9,0xDB); CLARO = RGBColor(0xE6,0xE6,0xE6)
BRANCO = RGBColor(0xFA,0xFA,0xFA); ROXO = RGBColor(0x6D,0x62,0xB3)
LAVANDA = RGBColor(0xC5,0xBE,0xEE); DEV2 = RGBColor(0x07,0xA5,0x5D)
WHITE = RGBColor(0xFF,0xFF,0xFF)

# fontes
SANS="IBM Plex Sans"; LIGHT="IBM Plex Sans Light"; MED="IBM Plex Sans Medium"
SEMI="IBM Plex Sans SemiBold"; MONO="IBM Plex Mono"

MX = 120  # margem lateral

prs = Presentation()
prs.slide_width = E(1920); prs.slide_height = E(1080)
BLANK = prs.slide_layouts[6]


def R(text, font=SANS, size=22, color=GRAFITE, bold=False, italic=False):
    return dict(t=text, f=font, s=size, c=color, b=bold, i=italic)

def P(runs, align=PP_ALIGN.LEFT, lh=1.18, sa=0.0, sb=0.0, spc=None):
    if isinstance(runs, dict): runs=[runs]
    return dict(runs=runs, align=align, lh=lh, sa=sa, sb=sb, spc=spc)

def tb(s, x, y, w, h, paras, anchor=MSO_ANCHOR.TOP):
    box = s.shapes.add_textbox(E(x), E(y), E(w), E(h))
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    for m in ("margin_left","margin_right","margin_top","margin_bottom"):
        setattr(tf, m, 0)
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = p["align"]
        para.line_spacing = p["lh"]
        if p["sa"]: para.space_after = Pt(p["sa"])
        if p["sb"]: para.space_before = Pt(p["sb"])
        for rr in p["runs"]:
            run = para.add_run(); run.text = rr["t"]
            f = run.font; f.name = rr["f"]; f.size = Pt(rr["s"]); f.bold = rr["b"]; f.italic = rr["i"]
            f.color.rgb = rr["c"]
            if p["spc"] is not None:
                run._r.get_or_add_rPr().set("spc", str(int(p["spc"])))
    return box

def shape(s, kind, x, y, w, h, fill=None, line=None, line_w=1.0, radius=None):
    sp = s.shapes.add_shape(kind, E(x), E(y), E(w), E(h))
    sp.shadow.inherit = False
    if fill is None: sp.fill.background()
    else: sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb = line; sp.line.width = Pt(line_w)
    if radius is not None and kind == MSO_SHAPE.ROUNDED_RECTANGLE:
        try: sp.adjustments[0] = radius
        except Exception: pass
    return sp

def rect(s,x,y,w,h,fill=None,line=None,lw=1.0): return shape(s,MSO_SHAPE.RECTANGLE,x,y,w,h,fill,line,lw)
def rrect(s,x,y,w,h,fill=None,line=None,lw=1.0,rad=0.08): return shape(s,MSO_SHAPE.ROUNDED_RECTANGLE,x,y,w,h,fill,line,lw,rad)

def pic(s, name, x, y, w, h=None):
    from PIL import Image
    path = os.path.join(PNG, name + ".png")
    if h is None:
        iw, ih = Image.open(path).size; h = w * ih / iw
    s.shapes.add_picture(path, E(x), E(y), E(w), E(h)); return h

def slide(bg):
    s = prs.slides.add_slide(BLANK)
    s.shapes.add_picture(os.path.join(PNG, bg + ".png"), 0, 0, E(1920), E(1080))
    return s

def kicker(s, text, dark):
    tb(s, MX, 118, 1680, 34, [P(R(text, MED, 14, PRATEADO if dark else NEUTRO), spc=180)])

def title(s, text, dark, size=48, y=178, w=1680, x=MX):
    tb(s, x, y, w, 220, [P(R(text, SANS, size, BRANCO if dark else GRAFITE, bold=True), lh=1.04)])

def footer(s, n, dark):
    sym = "symbol_white" if dark else "symbol_grafite"
    pic(s, sym, MX, 1006, 18)
    col = PRATEADO if dark else NEUTRO
    tb(s, 1620, 1004, 180, 30, [P(R(f"{n:02d} / 22", LIGHT, 12, col), align=PP_ALIGN.RIGHT)])
    tb(s, MX+30, 1006, 600, 30, [P(R("Valide antes de arriscar.", LIGHT, 12, col, italic=True))])

def divider_v(s, x, y, h, color=GELO):
    rect(s, x, y, 1.4, h, fill=color)
def divider_h(s, x, y, w, color=GELO, th=1.4):
    rect(s, x, y, w, th, fill=color)

# ===================================================================== SLIDES
def s01():
    s = slide("bg_grafite")
    tb(s, MX, 70, 700, 30, [P(R("FIHAN-PROP-001-v1.0", LIGHT, 14, PRATEADO))])
    pic(s, "symbol_white", 1740, 80, 46)
    pic(s, "logo_white", MX, 300, 300)
    tb(s, MX, 470, 1500, 360, [P(R("Proposta de Estruturação e Evolução de Produto", SANS, 72, BRANCO, bold=True), lh=1.03)])
    tb(s, MX, 730, 1400, 60, [P(R("Plataforma de Gestão de Riscos Psicossociais", MED, 28, GELO))])
    tb(s, MX, 850, 900, 90, [P(R("Cliente   José Marcos Santana Gomes", LIGHT, 18, PRATEADO), sa=6),
                              P(R("Junho 2026   |   Confidencial", LIGHT, 18, PRATEADO))])
    tb(s, MX, 980, 1000, 60, [P(R("Valide antes de arriscar.", LIGHT, 24, GELO, italic=True))])

def s02():
    s = slide("bg_grafite"); kicker(s, "ABERTURA", True)
    title(s, "Esta proposta nasce de uma conversa.", True, 48, 178, w=1200)
    tb(s, MX, 360, 1180, 520, [
        P(R("Não de um formulário genérico. De uma conversa real, onde você compartilhou um pouco da sua experiência em Saúde e Segurança do Trabalho, os bastidores de um projeto que passou por 4 mil inscritos no Centelha e ficou em 19º lugar, e a visão de uma ferramenta que resolve um problema que ninguém no mercado está resolvendo direito.",
            SANS, 24, GELO), lh=1.5, sa=24),
        P(R("Ouvimos com atenção. E vamos ser diretos sobre o que entendemos.", SANS, 24, GELO), lh=1.5),
    ])
    footer(s, 2, True)

def s03():
    s = slide("bg_grafite"); kicker(s, "APRESENTAÇÃO", True)
    tb(s, MX, 300, 1400, 240, [
        P(R("Você tem conhecimento técnico e regulatório que poucos profissionais no Brasil acumulam. A ferramenta atual cumpriu seu papel de prova de conceito. A próxima precisa de outro nível de maturidade.",
            SANS, 24, GELO), lh=1.5, sa=22),
        P(R("É aqui que a FIHAN entra.", MED, 24, BRANCO)),
    ])
    divider_h(s, MX, 600, 1680, CARVAO)
    tb(s, MX, 680, 1680, 200, [P(R("Não é inventar o brilho. É revelar o brilho que já existe.", LIGHT, 36, BRANCO, italic=True), align=PP_ALIGN.CENTER, lh=1.25)])
    footer(s, 3, True)

def s04():
    s = slide("bg_grafite"); kicker(s, "O DESAFIO ATUAL", True)
    title(s, "O contexto regulatório é claro e inadiável.", True, 48, 178, w=1400)
    tb(s, MX, 380, 1400, 300, [
        P([R("A ", SANS,24,GELO), R("NR-1", MONO,22,BRANCO), R(", na sua atualização recente, passou a exigir de toda empresa com colaboradores em regime CLT o gerenciamento de riscos psicossociais. Não é recomendação, é obrigação legal com poder de fiscalização.", SANS,24,GELO)], lh=1.5, sa=20),
        P([R("A ", SANS,24,GELO), R("NR-17", MONO,22,BRANCO), R(" é a norma que entrega o documento que o fiscal pede quando notifica: a Avaliação Ergonômica do Trabalho, a ", SANS,24,GELO), R("AET", MONO,22,BRANCO), R(".", SANS,24,GELO)], lh=1.5),
    ])
    divider_h(s, MX, 760, 1680, CARVAO)
    tb(s, MX, 800, 1500, 120, [P(R("Milhares de empresas precisam cumprir a lei. Profissionais de SST precisam de ferramentas para operar. Governos precisam garantir a saúde dos seus servidores.", LIGHT, 18, PRATEADO), lh=1.5)])
    footer(s, 4, True)

def s05():
    s = slide("bg_grafite"); kicker(s, "O DESAFIO ATUAL", True)
    title(s, "A metodologia existe. A forma de aplicá-la é o gargalo.", True, 44, 178, w=1080)
    tb(s, MX, 420, 820, 460, [
        P(R("O COPSOQ é a metodologia de referência. Validada internacionalmente, reconhecida na América Latina, com respaldo jurídico em auditorias. O problema não é a metodologia. É como ela chega no colaborador.", SANS, 22, GELO), lh=1.5, sa=22),
        P(R("São 60, 90 ou até 132 perguntas em um formato que ninguém quer responder.", MED, 22, BRANCO), lh=1.45),
    ])
    tb(s, 1080, 360, 720, 220, [P(R("6 / 20", MONO, 144, BRANCO), align=PP_ALIGN.CENTER)])
    tb(s, 1080, 600, 720, 90, [P(R("Em um teste de campo, apenas 6 colaboradores de 20 responderam.", LIGHT, 18, PRATEADO), align=PP_ALIGN.CENTER, lh=1.45)])
    footer(s, 5, True)

def s06():
    s = slide("bg_grafite"); kicker(s, "O DESAFIO ATUAL", True)
    title(s, "O diferencial é real. A oportunidade está aberta.", True, 48, 178, w=1500)
    divider_v(s, 952, 380, 470, CARVAO)
    tb(s, MX, 380, 760, 80, [P(R("O diferencial técnico precisa ser materializado.", MED, 24, GELO), lh=1.25)])
    tb(s, MX, 500, 760, 360, [P(R("Você percebeu o que o mercado não entrega: o documento legal. O fiscal não quer dashboard. Quer a AET conforme NR-17, declarando conformidade. É um diferencial técnico com potencial de mercado concreto. Mas ainda está no campo da visão, não da operação.", SANS, 20, GELO), lh=1.5)])
    tb(s, 1010, 380, 790, 120, [P(R("A Prefeitura de Vitória colocou você dentro de um processo que vale ouro.", MED, 24, GELO), lh=1.25)])
    tb(s, 1010, 540, 790, 360, [P(R("Sua solução foi aprovada na primeira fase, a RFI, de um processo conduzido pela administração reconhecida como a mais inteligente e conectada do Brasil no ranking Connected Smart Cities 2025. O processo continua, e uma eventual contratação demanda um nível de produto que a versão atual ainda não alcançou.", SANS, 20, GELO), lh=1.5)])
    footer(s, 6, True)

def s07():
    s = slide("bg_carvao"); kicker(s, "NOSSA LEITURA DO CENÁRIO", True)
    title(s, "O que vimos, em quatro camadas.", True, 44, 178, w=1500)
    rows = [
        ("O que já existe", "Conhecimento técnico e regulatório, prova de conceito funcional na conformeNR, aprovação no Centelha com R$ 80 mil garantidos e aprovação na RFI da Prefeitura. Sinais concretos de tração."),
        ("O que precisa evoluir", "A experiência do usuário, o formato atual do COPSOQ que gera atrito e abandono, a identidade da solução que precisa virar plataforma com marca e posicionamento próprios, e o modelo de negócio que precisa ser estruturado."),
        ("O que precisa ser validado", "Se o diferencial da AET é percebido como valor, se o modelo de precificação se sustenta, se os perfis de usuário navegam sem fricção, e qual é a melhor forma de resolver o engajamento."),
        ("O que precisa ser construído", "Uma solução nova, com arquitetura pensada para escala, identidade visual e verbal próprias, modelo de negócio sustentado por evidências, e tecnologia adequada às decisões dos Eixos de Negócio e Marca."),
    ]
    y = 320; rh = 132
    for i,(lab,desc) in enumerate(rows):
        if i % 2 == 1: rect(s, MX, y, 1680, rh, fill=RGBColor(0x4A,0x4D,0x51))
        tb(s, MX+24, y+20, 360, rh-20, [P(R(lab, MED, 22, BRANCO), lh=1.2)], anchor=MSO_ANCHOR.TOP)
        tb(s, 540, y+18, 1230, rh-20, [P(R(desc, SANS, 18, GELO), lh=1.4)])
        y += rh
    tb(s, MX, y+14, 1680, 60, [P(R("Com evidência, não com esperança.", LIGHT, 28, BRANCO, italic=True))])
    footer(s, 7, True)

def eixo_col(s, x, w, icon, head, q, desc):
    pic(s, icon, x, 360, 52)
    tb(s, x, 440, w, 36, [P(R(head, MED, 20, CARVAO))])
    tb(s, x, 486, w, 130, [P(R(q, SANS, 32, GRAFITE, bold=True), lh=1.08)])
    tb(s, x, 636, w, 320, [P(R(desc, SANS, 18, CARVAO), lh=1.5)])

def s08():
    s = slide("bg_branco"); kicker(s, "COMO A FIHAN TRABALHA", False)
    title(s, "Três Eixos. Uma solução integrada.", False, 48, 178)
    colw = 500; gap = 90; x0 = MX
    xs = [x0, x0+colw+gap, x0+2*(colw+gap)]
    divider_v(s, xs[1]-gap/2, 360, 560); divider_v(s, xs[2]-gap/2, 360, 560)
    eixo_col(s, xs[0], colw, "ic_chart_carvao", "Eixo de Negócio", "A ideia merece existir?",
             "Diagnóstico, escuta, engenharia da solução, inteligência competitiva, dimensionamento, modelagem, viabilidade. Responde se existe mercado, se existe demanda, se vale a pena construir.")
    eixo_col(s, xs[1], colw, "ic_spark_carvao", "Eixo de Marca", "Como será reconhecida e desejada?",
             "Diagnóstico, Vetor Estratégico, DNA da Marca, Codex de Marca, experiência e comunicação. Transforma a solução técnica em marca com personalidade, linguagem, jornada e pontos de encantamento.")
    eixo_col(s, xs[2], colw, "ic_code_carvao", "Eixo de Desenvolvimento", "Como passa a operar de fato?",
             "Design System, arquitetura de dados, front-end, back-end e deploy. Materializa em código tudo o que os outros dois Eixos geraram, virando uma Solução Operável com dados reais e lógica de negócio funcionando.")
    footer(s, 8, False)

def s09():
    s = slide("bg_branco"); kicker(s, "COMO A FIHAN TRABALHA", False)
    title(s, "Uma espiral, não uma linha.", False, 48, 178)
    pic(s, "dg_spiral", 110, 330, 660)
    tb(s, 880, 400, 900, 300, [P(R("Os três Eixos operam em paralelo, com sobreposição controlada. Cada volta da espiral produz evidências que retroalimentam os outros Eixos. O produto no ar gera dados reais de uso que refinam o diagnóstico de negócio e a experiência de marca.", SANS, 20, CARVAO), lh=1.55)])
    tb(s, 880, 720, 900, 80, [P(R("A gente constrói e aprende ao mesmo tempo.", MED, 22, GRAFITE), lh=1.25)])
    # legenda
    tb(s, 150, 980, 700, 30, [P([R("●", SANS,14,NEUTRO), R(" Negócio    ", LIGHT,14,CARVAO), R("●", SANS,14,ROXO), R(" Marca    ", LIGHT,14,CARVAO), R("●", SANS,14,DEV2), R(" Desenvolvimento", LIGHT,14,CARVAO)])])
    footer(s, 9, False)

def s10():
    s = slide("bg_claro"); kicker(s, "COMO A FIHAN TRABALHA", False)
    title(s, "Quatro Vértices de decisão.", False, 48, 178)
    tb(s, MX, 300, 1680, 60, [P(R("Em cada Vértice, o projeto para e uma decisão é tomada em conjunto: avançar, pivotar ou encerrar.", LIGHT, 22, CARVAO), lh=1.4)])
    pic(s, "dg_vertices", 120, 420, 1680)
    tb(s, MX, 900, 1680, 60, [P(R("A gente traz a evidência. Você decide com a gente.", LIGHT, 24, CARVAO, italic=True), align=PP_ALIGN.CENTER)])
    footer(s, 10, False)

def s11():
    s = slide("bg_branco"); kicker(s, "MAPA DO SPRINT INTEGRADO", False)
    title(s, "Oito semanas. Três Eixos em paralelo. Quatro Vértices.", False, 44, 178, w=1680)
    tb(s, MX, 270, 1680, 40, [P(R("Da Visão Interna na semana 1 à Solução Operável na semana 8.", LIGHT, 20, CARVAO))])
    pic(s, "dg_sprintmap", 120, 350, 1680)
    footer(s, 11, False)

def fase_header(s, label, ttl, sub, dark=False, label_color=NEUTRO):
    tb(s, MX, 118, 1680, 34, [P(R(label, MED, 14, label_color), spc=160)])
    title(s, ttl, dark, 48, 172)
    tb(s, MX, 268, 1500, 80, [P(R(sub, LIGHT, 22, CARVAO), lh=1.4)])

def block3(s, blocks, y=400, h=440):
    colw = (1680 - 2*70)/3; xs=[MX, MX+colw+70, MX+2*(colw+70)]
    divider_v(s, xs[1]-35, y, h); divider_v(s, xs[2]-35, y, h)
    for i,(lab,body,labcol) in enumerate(blocks):
        tb(s, xs[i], y, colw, 34, [P(R(lab, MED, 18, labcol), spc=80)])
        tb(s, xs[i], y+46, colw, h-46, [P(R(body, SANS, 17, GRAFITE), lh=1.5)])
    return xs, colw

def block4(s, blocks, y=400):
    colw=(1680-80)/2; rows=[y, y+230]; xs=[MX, MX+colw+80]
    for i,(lab,body) in enumerate(blocks):
        cx=xs[i%2]; cy=rows[i//2]
        tb(s, cx, cy, colw, 30, [P(R(lab, MED, 17, NEUTRO), spc=70)])
        tb(s, cx, cy+40, colw, 170, [P(R(body, SANS, 17, GRAFITE), lh=1.45)])

def s12():
    s = slide("bg_branco"); fase_header(s, "FASE 01   |   SEMANAS 1 E 2 DO SPRINT", "Diagnóstico Estratégico.",
        "Sem diagnóstico, toda decisão seguinte vira suposição. Com ele, cada decisão é rastreável até uma evidência.")
    pic(s, "ic_magnifier_carvao", 1700, 120, 60)
    block3(s, [
        ("OBJETIVOS", "Formalizar a declaração de problema com dados verificáveis, conduzir entrevistas com perfis que vivem essa dor, mapear o cenário competitivo, identificar impulsionadores, detratores e aceleradores de valor, e coletar matéria-prima para o DNA da Marca.", CARVAO),
        ("ENTREGÁVEIS", "Declaração de Problema validada, Perfis comportamentais dos segmentos, Mapa de Jobs-to-be-Done, Análise competitiva estruturada, Framework Revelando o Valor, e Síntese analítica de problema e impacto.", CARVAO),
        ("VÉRTICE 01", "O problema é real, relevante e sentido por pessoas reais? Se sim, seguimos. Se não, pivotamos antes de investir em construção.", ROXO),
    ], y=380, h=420)
    tb(s, MX, 880, 1680, 50, [P(R("A resposta não também tem valor.", LIGHT, 18, CARVAO, italic=True))])
    footer(s, 12, False)

def s13():
    s = slide("bg_branco"); fase_header(s, "FASE 02   |   SEMANAS 3 E 4 DO SPRINT", "Estruturação do Produto.",
        "O que construir, para quem, como, e com qual modelo de negócio.")
    pic(s, "ic_blocks_carvao", 1700, 120, 60)
    block3(s, [
        ("OBJETIVOS", "Selecionar o formato da solução com base nas evidências, definir recursos incluídos e excluídos da primeira versão, mapear a arquitetura técnica proposta, estruturar o Mapa de Modelagem, e formalizar o DNA da Marca, o Codex de Marca e o Design System.", CARVAO),
        ("ENTREGÁVEIS", "Engenharia da Solução, Inteligência Competitiva, DNA da Marca com os seis elementos proprietários, Codex de Marca com os nove elementos de identidade, Mapa de Modelagem, e Dimensionamento de mercado em TAM, SAM e SOM.", CARVAO),
        ("VÉRTICE 02", "O Vértice mais importante do sprint. Libera o Eixo de Desenvolvimento. A solução resolve o problema validado? O posicionamento está aprovado? Somente com essas respostas afirmativas o desenvolvimento inicia.", ROXO),
    ], y=380, h=440)
    footer(s, 13, False)

def s14():
    s = slide("bg_branco"); fase_header(s, "FASE 03   |   SEMANA 4 DO SPRINT", "Arquitetura da Solução.",
        "A ponte entre o que foi decidido nos Eixos de Negócio e Marca e o que será construído no Eixo de Desenvolvimento.")
    pic(s, "ic_layers_carvao", 1700, 120, 60)
    block4(s, [
        ("FLUXOS", "Mapeamento dos fluxos de interação para cada perfil de usuário identificado no diagnóstico."),
        ("JORNADAS", "Jornada Ideal em quatro fases, com identificação dos três pontos de Experiência Memorável que transformam usuários em promotores."),
        ("REQUISITOS", "Especificação funcional com recursos priorizados, requisitos de segurança e LGPD, especialmente críticos no contexto de dados de saúde."),
        ("PRIORIZAÇÃO", "Nem tudo entra na primeira versão. A priorização nasce de evidência. O restante entra no roadmap de evolução contínua."),
    ], y=400)
    footer(s, 14, False)

def s15():
    s = slide("bg_branco"); fase_header(s, "FASE 04   |   SEMANAS 5 E 6 DO SPRINT", "Experiência do Usuário.",
        "É onde a solução ganha ou perde. E onde resolvemos o problema mais urgente: ninguém quer responder dezenas de perguntas de uma vez.")
    pic(s, "ic_cursor_carvao", 1700, 120, 60)
    block4(s, [
        ("UX COMO SOLUÇÃO DE ENGAJAMENTO", "O redesign da experiência de preenchimento do COPSOQ é um dos desafios centrais. As decisões de formato virão das evidências coletadas no diagnóstico. Não cravamos a solução antes de ouvir o usuário. Cravamos o método."),
        ("APLICAÇÃO DO COPSOQ SEM PERDA DE VALIDADE", "Qualquer redesenho precisa respeitar os requisitos psicométricos da metodologia. Blocos temáticos coesos, ordem lógica preservada, dados coletados com timestamp e controle de completude."),
        ("REDUÇÃO DE FRICÇÃO", "Cada tela, cada mensagem, cada interação será desenhada para minimizar atrito. Onboarding curto, progresso visual, linguagem humana."),
        ("PERFIS DISTINTOS, EXPERIÊNCIAS DISTINTAS", "O profissional de SST precisa de controle e profundidade. O gestor precisa de visão consolidada. O colaborador precisa de simplicidade. Três experiências em uma plataforma integrada."),
    ], y=380)
    footer(s, 15, False)

def s16():
    s = slide("bg_branco"); fase_header(s, "FASE 05   |   SEMANAS 4 A 8 DO SPRINT", "Desenvolvimento.",
        "O Eixo que materializa em código, em tempo real, o que os outros Eixos definem.", label_color=DEV2)
    pic(s, "ic_terminal_dev", 1700, 120, 60)
    block3(s, [
        ("SOLUÇÃO OPERÁVEL, NÃO PROTÓTIPO", "O protótipo é a ferramenta usada na Frente 5 do Eixo de Negócio para coletar feedback. É instrumento de validação, não a entrega final. A Solução Operável é o produto funcional, com código, dados reais, lógica de negócio, identidade aplicada e deploy operando.", CARVAO),
        ("ROADMAP DA PRIMEIRA VERSÃO", "Design System Atômico traduzindo o Codex de Marca. Front-end para os perfis identificados. Back-end com processamento de dados, classificação de riscos e motor documental. Autenticação, controle de acesso e compliance LGPD. Deploy em infraestrutura pronta para uso.", CARVAO),
        ("ITERAÇÕES ORIENTADAS POR EVIDÊNCIA", "A primeira versão vai ao ar. Gera dados reais. Esses dados retroalimentam os Eixos de Negócio e Marca. A segunda iteração corrige o que a evidência de uso revelou.", CARVAO),
    ], y=370, h=420)
    rect(s, MX, 858, 1680, 3, fill=DEV2)
    tb(s, MX, 876, 1680, 50, [P(R("VÉRTICE 04   Solução Operável no ar.", SANS, 24, DEV2, bold=True))])
    footer(s, 16, False)

def s17():
    s = slide("bg_claro"); kicker(s, "ENTREGÁVEIS CONSOLIDADOS", False)
    title(s, "Uma Solução Operável e três ativos documentais.", False, 44, 172, w=1680)
    tb(s, MX, 262, 1680, 40, [P(R("Tudo coerente entre si. Tudo nascido de evidência.", LIGHT, 20, CARVAO))])
    data = [
        (NEUTRO, "Declaração de Problema Validada", "Base de evidências para toda decisão do sprint"),
        (NEUTRO, "Dossiê de Mercado", "Visão completa do mercado, com TAM, SAM, SOM"),
        (ROXO, "DNA da Marca", "Arquétipo, propósito, atributos e discurso de posicionamento"),
        (ROXO, "Codex de Marca", "Paleta, tipografia, iconografia, tom de voz, elementos aplicáveis"),
        (NEUTRO, "Mapa de Modelagem", "Modelo de receita, precificação, canais, ponto de equilíbrio"),
        (NEUTRO, "Relatório de Viabilidade", "P&L de 12 meses, premissas e cenários projetados"),
        (ROXO, "Perfis de Experiência", "Personas comportamentais com Jobs-to-be-Done"),
        (ROXO, "Jornada Ideal e Experiências Memoráveis", "Mapa de jornada com touchpoints e pontos de encantamento"),
        (ROXO, "Síntese de Comunicação", "Segmentos, narrativa e diferenciais comunicáveis"),
        (DEV2, "Solução Operável", "Plataforma pronta para uso, com identidade aplicada e dados reais"),
    ]
    colw=820; rowh=108; y0=340
    for i,(chip,ent,res) in enumerate(data):
        col=i//5; row=i%5
        x=MX+col*(colw+40); y=y0+row*rowh
        rect(s, x, y+6, 10, 64, fill=chip)
        tb(s, x+30, y, colw-30, 40, [P(R(ent, MED, 21, GRAFITE), lh=1.1)])
        tb(s, x+30, y+42, colw-30, 50, [P(R(res, LIGHT, 16, CARVAO), lh=1.3)])
        divider_h(s, x, y+rowh-14, colw, GELO)
    footer(s, 17, False)

def s18():
    s = slide("bg_branco"); kicker(s, "O ATIVO E SUAS PORTAS DE SAÍDA", False)
    title(s, "Um ativo. Quatro portas de saída.", False, 44, 172)
    pic(s, "dg_portas", 360, 290, 1180)
    tb(s, MX, 980, 1680, 50, [P(R("O ativo é seu. A FIHAN não retém propriedade intelectual.", LIGHT, 24, CARVAO, italic=True), align=PP_ALIGN.CENTER)])
    footer(s, 18, False)

def s19():
    s = slide("bg_grafite"); kicker(s, "INVESTIMENTO", True)
    title(s, "Sprint Integrado. Protocolo FIHAN Completo.", True, 44, 172, w=1680)
    tb(s, MX, 300, 1680, 160, [P(R("R$ 120.000,00", MONO, 96, BRANCO))])
    tb(s, MX, 470, 1680, 50, [P(R("Sprint completo, Solução Operável pronta para uso e 30 dias de suporte.", LIGHT, 22, GELO))])
    divider_h(s, MX, 560, 1680, CARVAO)
    cols = [
        ("CONDIÇÕES DE PAGAMENTO", "Entrada de 30% na assinatura, equivalente a R$ 36.000,00. Saldo de R$ 84.000,00 em condições a definir, podendo ser parcelado por etapas do sprint ou em parcelas mensais."),
        ("O QUE ESTÁ INCLUSO", "Solução Operável construída a partir de evidências, Dossiê de Mercado, DNA da Marca, Relatório de Viabilidade, quatro Vértices documentados, e 30 dias de suporte para refinamento com dados reais."),
        ("O QUE NÃO ESTÁ INCLUSO", "Evolução para escala plena de produção. Custos de infraestrutura de terceiros, contratados pelo cliente. Processos regulatórios externos, como Centelha e Prefeitura, de responsabilidade do founder."),
    ]
    colw=(1680-2*60)/3
    for i,(lab,body) in enumerate(cols):
        x=MX+i*(colw+60)
        tb(s, x, 610, colw, 34, [P(R(lab, MED, 16, PRATEADO), spc=80)])
        tb(s, x, 656, colw, 300, [P(R(body, SANS, 18, GELO), lh=1.5)])
    footer(s, 19, True)

def s20():
    s = slide("bg_branco"); kicker(s, "PAPÉIS E RESPONSABILIDADES", False)
    title(s, "Divisão clara. Caminhada junto.", False, 44, 172)
    tb(s, MX, 268, 1680, 70, [P(R("Você é o detentor do conhecimento regulatório. A FIHAN é o sistema que transforma esse conhecimento em ativo operável.", LIGHT, 22, CARVAO), lh=1.4)])
    divider_v(s, 952, 400, 460)
    tb(s, MX, 400, 760, 40, [P(R("Cliente", MED, 24, GRAFITE))])
    tb(s, MX, 444, 760, 36, [P(R("José Marcos Santana Gomes", LIGHT, 18, NEUTRO))])
    tb(s, MX, 510, 760, 360, [P(R("Participar ativamente das sessões de diagnóstico e validação. Disponibilizar tempo para Visão Interna e sessões conjuntas nos Vértices. Fornecer acesso a contatos para entrevistas de Escuta de Cliente. Decidir conosco em cada Vértice. Conduzir de forma independente os processos da Prefeitura e do Centelha, usando os ativos do sprint como suporte.", SANS, 18, CARVAO), lh=1.55)])
    tb(s, 1012, 400, 760, 40, [P(R("FIHAN", MED, 24, GRAFITE))])
    tb(s, 1012, 444, 760, 36, [P(R("Equipe do Sprint", LIGHT, 18, NEUTRO))])
    tb(s, 1012, 510, 768, 380, [P(R("Estrategista responsável pelos Eixos de Negócio e Marca. UX Designer responsável pela experiência e pela ponte entre Marca e Desenvolvimento. Desenvolvedor responsável pelo Eixo de Desenvolvimento. Toda a operação segue o Protocolo FIHAN com fidelidade metodológica. Capacidade técnica para projetos com escala superior a dezenas de milhares de usuários, incluindo escala acima de 16 mil.", SANS, 18, CARVAO), lh=1.55)])
    footer(s, 20, False)

def s21():
    s = slide("bg_claro"); kicker(s, "PRÓXIMOS PASSOS", False)
    title(s, "Se faz sentido, o caminho é simples.", False, 44, 172)
    passos = [
        ("01", "Alinhamento final", "Reunião para sanar dúvidas sobre escopo, cronograma e condições. Ajustes pontuais, se necessário."),
        ("02", "Aceite e formalização", "Assinatura do contrato de prestação de serviços. Pagamento da entrada de 30%. Definição das condições de parcelamento."),
        ("03", "Início do sprint", "Agendamento da Visão Interna na semana 1. Onboarding no espaço de trabalho compartilhado. Início formal do Protocolo FIHAN."),
    ]
    colw=(1680-2*60)/3; y=420
    divider_h(s, MX+60, y+60, 1680-120, NEUTRO, th=1.4)
    for i,(n,t,d) in enumerate(passos):
        x=MX+i*(colw+60)
        tb(s, x, y, 120, 90, [P(R(n, MONO, 64, CARVAO))])
        tb(s, x, y+150, colw, 40, [P(R(t, MED, 24, GRAFITE))])
        tb(s, x, y+200, colw, 200, [P(R(d, SANS, 18, CARVAO), lh=1.5)])
    footer(s, 21, False)

def s22():
    s = slide("bg_close")
    tb(s, 260, 250, 1400, 200, [P(R("A gente constrói com você. Você decide o que fazer com o resultado.", LIGHT, 44, BRANCO, italic=True), align=PP_ALIGN.CENTER, lh=1.25)])
    pic(s, "symbol_white", 940, 540, 54)
    tb(s, 260, 760, 1400, 50, [P(R("FIHAN   Inteligência de Negócio, Marca e Desenvolvimento", SANS, 24, BRANCO, bold=True), align=PP_ALIGN.CENTER)])
    tb(s, 260, 824, 1400, 36, [P(R("www.fihan.com.br", LIGHT, 16, PRATEADO), align=PP_ALIGN.CENTER)])
    tb(s, 260, 880, 1400, 36, [P(R("Valide antes de arriscar.", LIGHT, 18, GELO, italic=True), align=PP_ALIGN.CENTER)])

for fn in [s01,s02,s03,s04,s05,s06,s07,s08,s09,s10,s11,s12,s13,s14,s15,s16,s17,s18,s19,s20,s21,s22]:
    fn()

prs.save(OUT)
print("OK:", OUT, "| slides:", len(prs.slides._sldIdLst))

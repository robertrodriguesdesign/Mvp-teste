#!/usr/bin/env python3
"""
Monta a apresentação comercial FIHAN (1920x1080) em HTML autossuficiente,
para ser exportada em PDF. Conteúdo extraído EXCLUSIVAMENTE do documento
"Propostas comerciais/2. Rascunho Proposta Comercial FIHAN Jose Marcos.md.docx".

Estilo de marca Fihan: IBM Plex Mono, fundo escuro, verde #14CC52, roxo #8A38F5,
mint #DAF2E2 e os ícones pixelados (estilo superarrow).
"""
import os, base64, importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "scripts", "fonts")

# --- reaproveita os bitmaps dos ícones (estilo superarrow) ---
spec = importlib.util.spec_from_file_location("gen", os.path.join(ROOT, "scripts", "gen-icons.py"))
gen = importlib.util.module_from_spec(spec); spec.loader.exec_module(gen)

GREEN = "#14CC52"; PURPLE = "#8A38F5"; MINT = "#DAF2E2"; DARK = "#202224"; GRAY = "#5C665F"


def icon(name, size=40, color="currentColor"):
    rows = gen.rows_of(name)
    rects = "".join(gen.rle_rects(rows))
    return (f'<svg class="ico" viewBox="0 0 10 10" width="{size}" height="{size}" '
            f'fill="{color}" shape-rendering="crispEdges" aria-hidden="true">{rects}</svg>')


SUPERARROW = ('<svg class="superarrow" viewBox="0 0 71 66" fill="{c}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
              '<path d="M57.6453 39.2763H44.8074V26.4436H57.6453V39.2763ZM69.1357 26.1981C69.0574 26.1877 68.9843 26.1825 '
              '68.9112 26.1825V26.1981H57.9117V13.1043H44.8178V0H31.4628V13.355H44.5515V26.2086H42.9376C42.8645 26.1981 '
              '42.7914 26.1981 42.713 26.1981L42.7026 26.2086H7.36431V13.2453H0V52.5112H7.36431V39.5479H44.5515V52.365H31.4628'
              'V65.72H44.8178V52.6313H57.9117V39.5375H71.0003V26.1981H69.1357Z"/></svg>')


def fontface():
    weights = {400: "normal", 500: "normal", 600: "normal", 700: "normal"}
    css = ""
    for w in (400, 500, 600, 700):
        p = os.path.join(FONTS, f"plexmono-{w}.woff2")
        b64 = base64.b64encode(open(p, "rb").read()).decode()
        css += (f"@font-face{{font-family:'IBM Plex Mono';font-style:normal;font-weight:{w};"
                f"font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2');}}\n")
    return css


# ----- componentes de slide -----
def chrome(num, section):
    return f'''<div class="chrome">
      <div class="brand">{LOGO}<span>FIHAN</span></div>
      <div class="meta"><span class="dot"></span>{section}<span class="sep">/</span>FIHAN-PROP-001-v1.0</div>
    </div>'''


FOOT = '<div class="foot"><span>Confidencial · Junho 2026</span><span class="tag">Valide antes de arriscar.</span><span class="pg">{pg} / 11</span></div>'

LOGO = ('<svg class="logo" viewBox="0 0 71 66" fill="' + GREEN + '" aria-hidden="true">'
        '<path d="M57.6453 39.2763H44.8074V26.4436H57.6453V39.2763ZM69.1357 26.1981C69.0574 26.1877 68.9843 26.1825 '
        '68.9112 26.1825V26.1981H57.9117V13.1043H44.8178V0H31.4628V13.355H44.5515V26.2086H42.9376C42.8645 26.1981 '
        '42.7914 26.1981 42.713 26.1981L42.7026 26.2086H7.36431V13.2453H0V52.5112H7.36431V39.5479H44.5515V52.365H31.4628'
        'V65.72H44.8178V52.6313H57.9117V39.5375H71.0003V26.1981H69.1357Z"/></svg>')


def slide(inner, num, section, cls=""):
    return f'<section class="slide {cls}">{chrome(num, section)}{inner}{FOOT.format(pg=num)}</section>'


# =====================================================================
# SLIDES (conteúdo apenas do documento)
# =====================================================================
slides = []

# 01 — CAPA
slides.append(f'''<section class="slide cover">
  <div class="grid-bg"></div>
  <div class="cover-top">{LOGO}<span class="wm">FIHAN</span><span class="wm-sub">Inteligência de Negócio, Marca e Desenvolvimento</span></div>
  <div class="cover-mid">
    <div class="kick">FIHAN-PROP-001-v1.0 · Junho 2026 · Confidencial</div>
    <h1>Proposta de Estruturação<br>e Evolução de Produto</h1>
    <div class="cover-sub">Plataforma de Gestão de Riscos Psicossociais</div>
    <div class="cover-client"><span>Cliente</span> José Marcos Santana Gomes</div>
  </div>
  <div class="cover-bot">
    {SUPERARROW.format(c=GREEN)}
    <div class="tagbig">Valide antes de arriscar.</div>
  </div>
</section>''')

# 02 — O MÉTODO
slides.append(slide(f'''<div class="body method-intro">
    <div class="lead-kick">02 · O Método</div>
    <h2>Como a FIHAN trabalha</h2>
    <p class="big-statement">A FIHAN opera sobre um <b>Protocolo proprietário</b> que integra
    <b>três Eixos</b> em um sprint de <b>6 a 8 semanas</b>.</p>
    <p class="sub-statement">Não entregamos documentos separados. Entregamos uma
    <span class="hl">solução completa construída a partir de evidências</span>.</p>
    <div class="pillrow">
      <div class="pill">{icon("search",26,GREEN)} Negócio</div>
      <div class="pill">{icon("star",26,GREEN)} Marca</div>
      <div class="pill">{icon("settings",26,GREEN)} Desenvolvimento</div>
    </div>
  </div>''', 2, "MÉTODO"))

# 03 — OS TRÊS EIXOS
def eixo(ic, n, name, q, desc):
    return f'''<div class="eixo">
      <div class="eixo-h"><span class="eixo-ic">{icon(ic,46,GREEN)}</span><span class="eixo-n">{n}</span></div>
      <h3>{name}</h3>
      <div class="eixo-q">{q}</div>
      <p>{desc}</p>
    </div>'''
slides.append(slide(f'''<div class="body">
    <div class="lead-kick">03 · O Método</div>
    <h2>Os três Eixos</h2>
    <div class="eixos">
      {eixo("search","A","Eixo de Negócio","A ideia merece existir?","Diagnóstico do problema, escuta de cliente, engenharia da solução, inteligência competitiva, dimensionamento de mercado, modelagem de negócio e projeção financeira. Responde se existe mercado, demanda e se o modelo se sustenta.")}
      {eixo("star","B","Eixo de Marca","Como será reconhecida e desejada?","Diagnóstico de percepção, estratégia de posicionamento, identidade visual e verbal, experiência do usuário e comunicação. Transforma a solução técnica em marca: personalidade, linguagem, jornada e encantamento.")}
      {eixo("settings","C","Eixo de Desenvolvimento","Como passa a operar de fato?","Design System, arquitetura de dados, front-end, back-end, integração de IA, monetização e deploy. Materializa em uma Solução Operável as decisões que os outros Eixos fundamentaram com evidência.")}
    </div>
  </div>''', 3, "MÉTODO"))

# 04 — ESPIRAL + VÉRTICES
slides.append(slide(f'''<div class="body two-col">
    <div>
      <div class="lead-kick">04 · O Método</div>
      <h2>Espiral, não linha</h2>
      <p class="col-p">Os três Eixos operam <b>em paralelo</b>, com sobreposição controlada. Cada
      volta da espiral produz evidências que <b>retroalimentam</b> os outros Eixos.</p>
      <p class="col-p">O produto no ar gera dados reais de uso que refinam o diagnóstico de negócio
      e a experiência de marca. Construímos e aprendemos ao mesmo tempo.</p>
    </div>
    <div class="vbox">
      <div class="vbox-h">{icon("check",30,DARK)}<span>Quatro Vértices de Decisão</span></div>
      <p>O sprint é atravessado por quatro pontos formais de decisão — os Vértices. Em cada um,
      o projeto para e decide:</p>
      <div class="vchips"><span>Avançar</span><span>Pivotar</span><span>Encerrar</span></div>
      <div class="vrule">Nenhum Vértice é pulado. Nenhuma etapa avança sem evidência. É a disciplina que protege o investimento.</div>
    </div>
  </div>''', 4, "MÉTODO"))

# 05 — FLUXO MACRO
flow = [
    ("Qualificação","Contexto e aderência ao Protocolo. (Concluída)"),
    ("Diagnóstico","Problema, escuta de cliente, mapa de mercado."),
    ("Modelagem","O que construir, para quem e como monetizar."),
    ("Estratégia","Posicionamento, identidade, DNA da Marca."),
    ("Arquitetura","Especificação funcional e fluxos de dados."),
    ("UX","Perfis, jornada, wireframes, Design System."),
    ("Desenvolvimento","Front-end, back-end, IA, banco, deploy."),
    ("Validação","Teste com usuários reais e métricas."),
    ("Solução Operável","Produto no ar, com identidade e dados fluindo."),
]
steps_html = ""
for i,(t,d) in enumerate(flow):
    arrow = f'<div class="fa">{icon("arrow-right",26,PURPLE)}</div>' if i>0 else ""
    steps_html += f'{arrow}<div class="fstep{" first" if i==0 else ""}{" last" if i==len(flow)-1 else ""}"><span class="fn">{i+1:02d}</span><div class="ft">{t}</div><div class="fd">{d}</div></div>'
slides.append(slide(f'''<div class="body">
    <div class="lead-kick">05 · As Etapas</div>
    <h2>Fluxo macro do projeto</h2>
    <p class="intro-p">Uma sequência lógica de <b>fidelidade crescente</b>. Cada etapa gera evidências que alimentam a próxima — cada decisão é fundamentada, não presumida.</p>
    <div class="flow">{steps_html}</div>
  </div>''', 5, "ETAPAS"))

# 06 — CRONOGRAMA (gantt 8 semanas)
fases_gantt = [
    ("Fase 01 · Diagnóstico Estratégico", 1, 2),
    ("Fase 02 · Estruturação do Produto", 3, 4),
    ("Fase 03 · Arquitetura da Solução", 4, 4),
    ("Fase 04 · Experiência do Usuário", 5, 6),
    ("Fase 05 · Desenvolvimento", 4, 8),
]
weekcols = "".join(f'<div class="wk">S{w}</div>' for w in range(1,9))
bars = ""
for name, a, b in fases_gantt:
    bars += (f'<div class="grow"><div class="glabel">{name}</div>'
             f'<div class="gtrack"><div class="gbar" style="grid-column:{a} / {b+1}">'
             f'<span>Sem {a}{"–"+str(b) if b!=a else ""}</span></div></div></div>')
vertices_marks = ""
for vn, wk, lbl in [("V1",2,"Problema"),("V2",3,"Solução"),("V3",6,"Funcional"),("V4",8,"Ativo")]:
    vertices_marks += f'<div class="vmark" style="grid-column:{wk}"><span class="vd">{vn}</span><span class="vl">{lbl}</span></div>'
slides.append(slide(f'''<div class="body">
    <div class="lead-kick">06 · As Etapas</div>
    <h2>Cronograma — 8 semanas</h2>
    <div class="gantt">
      <div class="ghead"><div class="ghpad"></div><div class="weeks">{weekcols}</div></div>
      {bars}
      <div class="grow vrow"><div class="glabel">Vértices de decisão</div><div class="gtrack vtrack">{vertices_marks}</div></div>
    </div>
    <p class="gantt-note">Fases 03–05 operam em paralelo, com sobreposição controlada. O Desenvolvimento inicia a partir do Vértice 02.</p>
  </div>''', 6, "ETAPAS"))

# 07 — AS 5 FASES (detalhe)
fases = [
    ("01","Diagnóstico Estratégico","Semanas 1–2","Formalizar a declaração de problema com dados verificáveis e entrevistar os três perfis de usuário.","Declaração de Problema validada · Perfis comportamentais · Análise competitiva · Revelando o Valor"),
    ("02","Estruturação do Produto","Semanas 3–4","Definir o que construir, para quem, como e com qual modelo de negócio.","Engenharia da Solução · DNA da Marca · Codex de Marca · Mapa de Modelagem · TAM/SAM/SOM"),
    ("03","Arquitetura da Solução","Semana 4","Traduzir as decisões estratégicas em especificação técnica executável.","Fluxos por perfil · Jornada Ideal · Requisitos (IA, LGPD, segurança) · Priorização"),
    ("04","Experiência do Usuário","Semanas 5–6","Resolver o engajamento: fragmentação inteligente do COPSOQ, sem perder validade.","Onboarding < 60s · Redução de fricção · Três perfis, três experiências"),
    ("05","Desenvolvimento","Semanas 4–8","Materializar a Solução Operável — não protótipo — com código, dados reais e IA.","Design System · Front + Back · IA na coleta e na AET · LGPD · Deploy"),
]
fcards = ""
for n,t,wk,obj,ent in fases:
    fcards += f'''<div class="fase">
      <div class="fase-top"><span class="fase-n">{n}</span><span class="fase-wk">{wk}</span></div>
      <h4>{t}</h4>
      <p class="fase-obj">{obj}</p>
      <div class="fase-ent"><span class="ent-k">Entrega</span>{ent}</div>
    </div>'''
slides.append(slide(f'''<div class="body">
    <div class="lead-kick">07 · As Etapas</div>
    <h2>As cinco fases, em detalhe</h2>
    <div class="fases">{fcards}</div>
  </div>''', 7, "ETAPAS"))

# 08 — OS 4 VÉRTICES
verts = [
    ("V1","Problema Validado","Fim da semana 2","O problema se confirmou? Se sim, avançar. Se não, pivotar antes de investir em construção."),
    ("V2","Solução e Posicionamento Aprovados","Fim da semana 3","Libera o Eixo de Desenvolvimento. A solução resolve o problema validado? O posicionamento foi aprovado?"),
    ("V3","Solução Funcional","Fim da semana 6","A solução funciona tecnicamente? Os dados fluem? Os perfis conseguem usar?"),
    ("V4","Ativo Completo","Fim da semana 8","Os ativos estão coerentes? A solução está no ar gerando dados? O suporte de 30 dias inicia."),
]
vcards = ""
for n,t,wk,d in verts:
    vcards += f'''<div class="vert">
      <div class="vert-h"><span class="vert-n">{n}</span>{icon("check",30,GREEN)}</div>
      <h4>{t}</h4>
      <div class="vert-wk">{wk}</div>
      <p>{d}</p>
    </div>'''
slides.append(slide(f'''<div class="body">
    <div class="lead-kick">08 · As Etapas</div>
    <h2>Quatro Vértices de decisão</h2>
    <p class="intro-p">Em cada Vértice o projeto <b>para e decide</b>: avançar, pivotar ou encerrar. É onde o investimento é protegido por evidência.</p>
    <div class="verts">{vcards}</div>
  </div>''', 8, "ETAPAS"))

# 09 — ENTREGÁVEIS CONSOLIDADOS
entregaveis = [
    ("Declaração de Problema Validada","Base de evidências para todas as decisões do sprint"),
    ("Dossiê de Mercado","Diagnóstico completo com TAM/SAM/SOM e inteligência competitiva"),
    ("DNA da Marca","Arquétipo, propósito, atributos, posicionamento"),
    ("Codex de Marca","Paleta, tipografia, iconografia, tom de voz"),
    ("Mapa de Modelagem","Receita, precificação, canais, break-even"),
    ("Relatório de Viabilidade","P&L 12 meses, premissas e cenários projetados"),
    ("Perfis de Experiência","Personas comportamentais com Jobs-to-be-Done"),
    ("Jornada + Experiências Memoráveis","Touchpoints e pontos de encantamento"),
    ("Síntese de Comunicação","Segmentos, narrativa e diferenciais comunicáveis"),
    ("Solução Operável","Plataforma no ar, com IA integrada e dados fluindo"),
]
ecards = ""
for i,(t,r) in enumerate(entregaveis):
    ecards += f'<div class="ent"><span class="ent-n">{i+1:02d}</span><div class="ent-b"><div class="ent-t">{t}</div><div class="ent-r">{r}</div></div></div>'
slides.append(slide(f'''<div class="body">
    <div class="lead-kick">09 · O que você recebe</div>
    <h2>Entregáveis consolidados</h2>
    <div class="ents">{ecards}</div>
  </div>''', 9, "ENTREGÁVEIS"))

# 10 — INVESTIMENTO
inclui = ["Eixo de Negócio — diagnóstico, escuta, modelagem, viabilidade",
          "Eixo de Marca — DNA, identidade, experiência, comunicação",
          "Eixo de Desenvolvimento — arquitetura, UX, front, back, IA, deploy",
          "Suporte pós-sprint — 30 dias de refinamento com dados reais"]
nao = ["Evolução para escala de produção (16 mil+ usuários)",
       "Infraestrutura de terceiros (servidores, APIs, domínios)",
       "Processos regulatórios (Centelha, Prefeitura)"]
inc_html = "".join(f'<li>{icon("check",20,GREEN)}<span>{x}</span></li>' for x in inclui)
nao_html = "".join(f'<li>{icon("close",18,GRAY)}<span>{x}</span></li>' for x in nao)
slides.append(slide(f'''<div class="body invest">
    <div class="lead-kick">10 · Investimento</div>
    <h2>Sprint Integrado — Protocolo completo</h2>
    <div class="invest-grid">
      <div class="price-card">
        <div class="pc-label">Sprint completo + Solução Operável + Suporte 30 dias</div>
        <div class="pc-value">R$ 120.000<span>,00</span></div>
        <div class="pc-cond">
          <div class="cond"><span class="cl">Entrada · 30%</span><span class="cv">R$ 36.000,00</span><span class="cd">na assinatura do contrato</span></div>
          <div class="cond"><span class="cl">Saldo</span><span class="cv">R$ 84.000,00</span><span class="cd">parcelável por etapas ou mensal, conforme negociação</span></div>
        </div>
      </div>
      <div class="invest-lists">
        <div class="ilist"><div class="il-h">O que está incluso</div><ul>{inc_html}</ul></div>
        <div class="ilist out"><div class="il-h">Não incluso</div><ul>{nao_html}</ul></div>
      </div>
    </div>
  </div>''', 10, "INVESTIMENTO"))

# 11 — PRÓXIMOS PASSOS / FECHO
passos = [
    ("01","Alinhamento final","Reunião de esclarecimento sobre escopo, cronograma e condições. Ajustes pontuais, se necessário."),
    ("02","Aceite e formalização","Assinatura do contrato. Pagamento da entrada (30%). Definição do parcelamento do saldo."),
    ("03","Início do sprint","Sessão de Visão Interna (Semana 1). Onboarding no espaço compartilhado. Início do Protocolo FIHAN."),
]
pcards = "".join(f'''<div class="passo"><span class="passo-n">{n}</span><h4>{t}</h4><p>{d}</p></div>''' for n,t,d in passos)
slides.append(slide(f'''<div class="body closing">
    <div class="lead-kick">11 · Próximos passos</div>
    <h2>O caminho é simples</h2>
    <div class="passos">{pcards}</div>
    <div class="close-strip">
      <div class="cs-left">{SUPERARROW.format(c=GREEN)}<div><div class="cs-asset">O ativo é seu.</div><div class="cs-sub">A FIHAN constrói. Você decide o que fazer com o resultado.</div></div></div>
      <div class="cs-tag">Valide antes de arriscar.</div>
    </div>
  </div>''', 11, "PRÓXIMOS PASSOS"))


# =====================================================================
CSS = open(os.path.join(ROOT, "scripts", "proposta.css")).read()
html = ("<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'>"
        "<title>Proposta FIHAN — José Marcos</title><style>"
        + fontface() + CSS + "</style></head><body>" + "".join(slides) + "</body></html>")
out = os.path.join(ROOT, "Propostas comerciais", "Apresentacao-FIHAN-Jose-Marcos.html")
open(out, "w", encoding="utf-8").write(html)
print("OK:", out, f"({len(html)//1024} KB)")

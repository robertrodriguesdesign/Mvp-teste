// Fihan — comportamentos de interface (carrossel do case Zei, founders, etc.)

// ---- formulário de contato: envia pro CRM (via /api/submit-lead) ----
(function () {
  const form = document.querySelector('.contact__form');
  const status = document.querySelector('[data-contact-status]');
  const confirm = document.querySelector('[data-contact-confirm]');
  const confirmDetail = document.querySelector('[data-confirm-detail]');
  const icsLink = document.querySelector('[data-confirm-ics]');
  if (!form || !status || !confirm || !confirmDetail || !icsLink) return;

  // próximo dia útil (seg-sex) às 14h — horário fixo da "Reunião de Contexto"
  function nextMeetingSlot() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d;
  }

  function formatMeetingDate(date) {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
    const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${weekday}, ${dayMonth} às ${time}`;
  }

  function buildIcs(date, protocol) {
    const end = new Date(date.getTime() + 45 * 60000);
    const stamp = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Fihan//Reuniao de Contexto//PT-BR',
      'BEGIN:VEVENT',
      `UID:${protocol}@fihan.com.br`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(date)}`,
      `DTEND:${stamp(end)}`,
      'SUMMARY:Reunião de Contexto — FIHAN',
      `DESCRIPTION:Protocolo ${protocol}. A conversa começa pelo contexto\\, não pela oferta.`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  icsLink.addEventListener('click', (e) => {
    e.preventDefault();
    const { date, protocol } = icsLink._meeting || {};
    if (!date) return;
    const blob = new Blob([buildIcs(date, protocol)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reuniao-fihan.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.contact__submit button');
    const data = new FormData(form);
    const payload = {
      nome: data.get('nome'),
      email: data.get('email'),
      whatsapp: data.get('whatsapp'),
      empresa: data.get('empresa'),
      estagio: data.get('estagio'),
      eixos: data.getAll('eixos'),
      investimento: data.get('investimento'),
      urgencia: data.get('urgencia'),
      mensagem: data.get('mensagem'),
    };

    submitBtn.disabled = true;
    status.dataset.state = '';
    status.textContent = 'Enviando…';

    try {
      const res = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);

      const meetingDate = nextMeetingSlot();
      const protocol = `FH-${meetingDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      confirmDetail.textContent = `Protocolo ${protocol} · ${formatMeetingDate(meetingDate)}. A conversa começa pelo contexto, não pela oferta.`;
      icsLink._meeting = { date: meetingDate, protocol };

      status.textContent = '';
      status.dataset.state = '';
      form.style.display = 'none';
      confirm.classList.add('is-visible');
      form.reset();
    } catch (err) {
      console.error('falha ao enviar formulário:', err);
      status.dataset.state = 'error';
      status.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

// ---- formulário de contato: "Todos" e os eixos individuais se excluem ----
document.querySelectorAll('[data-checkbox-group]').forEach((group) => {
  const boxes = Array.from(group.querySelectorAll('input[type="checkbox"]'));
  const allBox = group.querySelector('[data-select-all]');
  if (!allBox) return;
  boxes.forEach((box) => {
    box.addEventListener('change', () => {
      if (box === allBox) {
        if (allBox.checked) boxes.forEach((b) => { if (b !== allBox) b.checked = false; });
      } else if (box.checked) {
        allBox.checked = false;
      }
    });
  });
});

// ---- menu de tela cheia (hambúrguer do navbar) ----
(function () {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!toggle || !menu) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('nav-menu-open', open);
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  menu.querySelectorAll('[data-menu-link]').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
  });
})();

// Carrossel genérico: qualquer [data-carousel-track] dentro de um [data-carousel]
// ganha loop infinito (sempre da esquerda para a direita), setas prev/next,
// dots, contraste automático e pausa no hover.
//
// Técnica: clona o primeiro slide e cola no fim, clona o último e cola no
// início. O track desliza normalmente sobre esses clones e, ao chegar neles,
// pula sem transição para o slide real equivalente — como os clones são
// idênticos, o salto é invisível e o carrossel nunca "volta" visualmente.
function initCarousel(track) {
  const realSlides = Array.from(track.children);
  const total = realSlides.length;
  if (total < 2) return;

  const AUTOPLAY_MS = 4500;
  let timer = null;
  let isSnapping = false;

  const firstClone = realSlides[0].cloneNode(true);
  const lastClone = realSlides[total - 1].cloneNode(true);
  firstClone.setAttribute('aria-hidden', 'true');
  lastClone.setAttribute('aria-hidden', 'true');
  track.appendChild(firstClone);
  track.insertBefore(lastClone, realSlides[0]);

  const slides = Array.from(track.children); // [lastClone, ...real, firstClone]
  let index = 1; // aponta pro slide real 0

  const media = track.closest('[data-carousel]');
  const prevBtn = media ? media.querySelector('[data-carousel-prev]') : null;
  const nextBtn = media ? media.querySelector('[data-carousel-next]') : null;
  const nav = media ? media.querySelector('[data-carousel-nav]') : null;
  const dotsWrap = media ? media.querySelector('[data-carousel-dots]') : null;
  const status = media ? media.querySelector('[data-carousel-status]') : null;

  function realIndex() { return (index - 1 + total) % total; }

  // ---- feedback de quantas imagens existem (dots + contagem para leitor de tela) ----
  const dots = realSlides.map(() => {
    const dot = document.createElement('span');
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  function updateFeedback() {
    const ri = realIndex();
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === ri));
    if (status) status.textContent = `Imagem ${ri + 1} de ${total}`;
  }

  // ---- contraste das setas conforme o brilho do fundo da imagem atual ----
  const brightnessCache = new Map();
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 12;
  sampleCanvas.height = 12;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  async function getBrightness(img) {
    if (!img || img.tagName !== 'IMG') return null;
    if (brightnessCache.has(img)) return brightnessCache.get(img);
    try {
      if (!img.complete || img.naturalWidth === 0) await img.decode();
      const sy = img.naturalHeight * 0.78;
      const sh = img.naturalHeight * 0.22;
      sampleCtx.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, 12, 12);
      const { data } = sampleCtx.getImageData(0, 0, 12, 12);
      let total = 0;
      for (let i = 0; i < data.length; i += 4) {
        total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avg = total / (data.length / 4);
      brightnessCache.set(img, avg);
      return avg;
    } catch (err) {
      return null; // amostragem falhou (ex: restrição de canvas) — mantém a cor padrão
    }
  }

  async function updateContrast() {
    if (!nav) return;
    const slide = realSlides[realIndex()];
    const img = slide.tagName === 'IMG' ? slide : slide.querySelector('img');
    const avg = await getBrightness(img);
    if (avg === null) return;
    nav.dataset.contrast = avg > 150 ? 'light-bg' : 'dark-bg';
  }

  function render(animate) {
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(-${index * 100}%)`;
    updateFeedback();
    updateContrast();
  }

  function next() { index += 1; render(true); }
  function prev() { index -= 1; render(true); }

  // ao terminar a transição sobre um clone, pula sem animação pro slide real
  track.addEventListener('transitionend', (e) => {
    if (e.target !== track || e.propertyName !== 'transform') return;
    if (index === slides.length - 1) {
      isSnapping = true;
      index = 1;
      render(false);
    } else if (index === 0) {
      isSnapping = true;
      index = slides.length - 2;
      render(false);
    }
    if (isSnapping) {
      // força reflow antes de reabilitar a transição, senão o navegador anima o salto
      void track.offsetWidth;
      track.style.transition = '';
      isSnapping = false;
    }
  });

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(next, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAutoplay(); });

  if (media) {
    media.addEventListener('mouseenter', stopAutoplay);
    media.addEventListener('mouseleave', startAutoplay);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  render(false);
  if (!prefersReducedMotion) startAutoplay();
}

document.querySelectorAll('[data-carousel-track]').forEach(initCarousel);

// ---- "Onde você está agora?": carrossel linear de 5 personas + pills ----
// As 5 personas são cards separados que deslizam sempre da esquerda para a
// direita (nunca "voltam" visualmente), em loop infinito — mesma técnica de
// clones do initCarousel, só que aqui 3 cards ficam visíveis ao mesmo tempo
// e o card central ganha o tamanho/estilo em destaque.
(function () {
  const viewport = document.querySelector('[data-persona-carousel]');
  const track = document.querySelector('[data-persona-track]');
  const wrap = document.querySelector('[data-pill-carousel]');
  if (!viewport || !track || !wrap) return;

  const pills = Array.from(wrap.querySelectorAll('.decision__tag'));
  const realCells = Array.from(track.children);
  const total = realCells.length;
  if (!total || pills.length !== total) return;

  const DURATION_MS = 4000;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;

  // 2 clones em cada ponta: o suficiente para os 3 cards visíveis nunca
  // mostrarem um vazio durante o "salto" do loop infinito.
  const PAD = 2;
  const before = [];
  const after = [];
  for (let i = 0; i < PAD; i++) {
    before.push(realCells[(total - PAD + i) % total].cloneNode(true));
    after.push(realCells[i].cloneNode(true));
  }
  // insere sempre relativo à 1ª célula real (estável), senão a ordem inverte
  before.forEach((el) => { el.setAttribute('aria-hidden', 'true'); track.insertBefore(el, realCells[0]); });
  after.forEach((el) => { el.setAttribute('aria-hidden', 'true'); track.appendChild(el); });

  const cells = Array.from(track.children); // [..before, ...real, ...after]
  let center = PAD; // posição (no array `cells`) do card real ativo

  function cellWidth() {
    return cells[0].getBoundingClientRect().width;
  }

  // Cada persona tem título/descrição de tamanho diferente, então o card em
  // destaque (capsule--lg) tem uma altura natural distinta pra cada uma —
  // sem isso, a seção inteira crescia/encolhia sozinha a cada troca automática
  // e empurrava o resto da página. Mede a altura "em destaque" de cada persona
  // real (a maior variante possível) e trava todos os cards nesse valor.
  function applyFixedCellHeight() {
    realCells.forEach((cell) => { cell.style.height = ''; });
    let max = 0;
    realCells.forEach((cell) => {
      const capsule = cell.querySelector('.decision__capsule');
      const persona = cell.querySelector('.decision__persona');
      capsule.style.transition = 'none';
      persona.style.transition = 'none';
      capsule.classList.add('decision__capsule--lg');
      capsule.classList.remove('decision__capsule--sm');
      persona.classList.add('decision__persona--main');
      persona.classList.remove('decision__persona--muted');
      max = Math.max(max, cell.getBoundingClientRect().height);
    });
    cells.forEach((cell) => {
      cell.style.height = `${max}px`;
      const capsule = cell.querySelector('.decision__capsule');
      const persona = cell.querySelector('.decision__persona');
      capsule.style.transition = '';
      persona.style.transition = '';
    });
    render(false);
  }

  // desloca o track até o meio da célula ativa coincidir com o meio do
  // viewport — funciona tanto quando 3 células cabem inteiras (desktop)
  // quanto quando o viewport é mais estreito que 3 células e só sobra um
  // "espiadinha" das vizinhas (mobile), caso em que assumir viewport =
  // 3 * cellWidth (como antes) centralizava a célula errada.
  function offsetFor(centerIndex) {
    const vw = viewport.getBoundingClientRect().width;
    const cw = cellWidth();
    return vw / 2 - (centerIndex + 0.5) * cw;
  }

  function setFeatured(cell, isFeatured) {
    const capsule = cell.querySelector('.decision__capsule');
    const persona = cell.querySelector('.decision__persona');
    capsule.classList.toggle('decision__capsule--lg', isFeatured);
    capsule.classList.toggle('decision__capsule--sm', !isFeatured);
    persona.classList.toggle('decision__persona--main', isFeatured);
    persona.classList.toggle('decision__persona--muted', !isFeatured);
  }

  function render(animate) {
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(${offsetFor(center)}px)`;
    cells.forEach((cell, i) => setFeatured(cell, i === center));
  }

  function setFill(pill, isLoading, animate) {
    const fill = pill.querySelector('.decision__tag-fill');
    pill.classList.toggle('is-loading', isLoading);
    if (!isLoading) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      return;
    }
    if (!animate) {
      fill.style.transition = 'none';
      fill.style.width = '100%';
      return;
    }
    fill.style.transition = 'none';
    fill.style.width = '0%';
    void fill.offsetWidth; // força reflow para reiniciar a transição do zero
    fill.style.transition = `width ${DURATION_MS}ms linear`;
    fill.style.width = '100%';
  }

  function stopAuto() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function startAuto() {
    stopAuto();
    if (prefersReducedMotion) return;
    timer = setTimeout(() => activate(realIndex() + 1), DURATION_MS);
  }

  function realIndex() {
    return (center - PAD + total) % total;
  }

  function activate(i, opts) {
    const isInit = !!(opts && opts.init);
    const targetRi = (i + total) % total;
    if (isInit) {
      center = PAD + targetRi;
    } else {
      // menor caminho (em número de cards) até o alvo — o avanço automático
      // sempre pede o próximo índice em sequência, então isso já dá "sempre
      // pra frente"; um clique manual pode usar o atalho mais curto.
      let delta = targetRi - realIndex();
      if (delta > total / 2) delta -= total;
      if (delta < -total / 2) delta += total;
      center += delta;
    }
    pills.forEach((pill, idx) => setFill(pill, idx === targetRi, !isInit && !prefersReducedMotion));
    render(!isInit && !prefersReducedMotion);
    startAuto();
  }

  // ao terminar a transição sobre a área de clones, pula sem animação
  // pro card real equivalente — como é idêntico, o salto é invisível.
  track.addEventListener('transitionend', (e) => {
    if (e.target !== track || e.propertyName !== 'transform') return;
    if (center < PAD || center >= PAD + total) {
      center = PAD + realIndex();
      // o destaque (capsule--lg/persona--main) ainda está no clone que
      // sumiu de vista — reaplica pro card real que assumiu o centro.
      // Desliga a transition de tamanho da cápsula só durante o salto,
      // senão ela "encolhe e cresce" de novo mesmo já estando no lugar.
      cells.forEach((cell) => {
        cell.querySelector('.decision__capsule').style.transition = 'none';
        cell.querySelector('.decision__persona').style.transition = 'none';
      });
      render(false);
      void track.offsetWidth;
      track.style.transition = '';
      cells.forEach((cell) => {
        cell.querySelector('.decision__capsule').style.transition = '';
        cell.querySelector('.decision__persona').style.transition = '';
      });
    }
  });

  pills.forEach((pill, i) => {
    pill.addEventListener('click', () => activate(i));
  });

  wrap.addEventListener('mouseenter', stopAuto);
  wrap.addEventListener('mouseleave', () => activate(realIndex()));
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    render(false);
    // a largura do card responde ao container query — recalcula a altura
    // travada só depois que o resize assentar, pra não refazer a cada pixel
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyFixedCellHeight, 150);
  });

  applyFixedCellHeight();
  activate(1, { init: true }); // "Eixo de Negócio" começa selecionado
})();

// ---- "O que a evidência mostra": barras crescendo + números contando ----
// Ao entrar na tela, cada stat-card anima sua(s) barra(s) de 0 até a largura
// real (guardada no HTML) e conta seus números de 0 até o valor final,
// preservando o formato original (vírgula decimal, %, ×).
(function () {
  const cards = Array.from(document.querySelectorAll('.stat-card'));
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION_MS = 1100;

  // "37,3%" -> { decimals: 1, suffix: '%', target: 37.3 } / "1,00" -> { decimals: 2, suffix: '', target: 1 }
  function parseNumber(text) {
    const match = text.trim().match(/^(\d+)(?:,(\d+))?(.*)$/);
    if (!match) return null;
    const [, intPart, decPart, suffix] = match;
    const decimals = decPart ? decPart.length : 0;
    const target = parseFloat(`${intPart}.${decPart || '0'}`);
    return { decimals, suffix, target };
  }

  function format(value, decimals, suffix) {
    return value.toFixed(decimals).replace('.', ',') + suffix;
  }

  function countUp(el) {
    // usa o valor original guardado em data-final (o textContent atual já
    // pode estar zerado pela inicialização abaixo)
    const parsed = parseNumber(el.dataset.final || el.textContent);
    if (!parsed) return;
    const { decimals, suffix, target } = parsed;
    const finalText = format(target, decimals, suffix);
    if (prefersReducedMotion) {
      el.textContent = finalText;
      return;
    }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      el.textContent = p < 1 ? format(target * eased, decimals, suffix) : finalText;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // zera os números já no carregamento (antes do card entrar na tela), pra
  // não piscar o valor final e só então voltar a 0
  const numberEls = cards.flatMap((card) =>
    Array.from(card.querySelectorAll('.stat-card__value, .stat-card__bar-value'))
  );
  if (!prefersReducedMotion) {
    numberEls.forEach((el) => {
      const parsed = parseNumber(el.textContent);
      if (parsed) {
        el.dataset.final = el.textContent;
        el.textContent = format(0, parsed.decimals, parsed.suffix);
      }
    });
  }

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    cards.forEach((card) => card.classList.add('is-visible'));
    numberEls.forEach(countUp);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      card.classList.add('is-visible');
      Array.from(card.querySelectorAll('.stat-card__value, .stat-card__bar-value')).forEach(countUp);
      observer.unobserve(card);
    });
  }, { threshold: 0.35 });

  cards.forEach((card) => observer.observe(card));
})();

// ---- revelação de palavras conforme o scroll (claim + statement) ----
// Cada palavra começa em opacidade 0.15 e vai para 1 progressivamente,
// conforme `computeProgress` avança de 0 a 1 — sem "prender" o scroll.
function initScrollWordReveal(wordsEl, rectEl, computeProgress) {
  const words = Array.from(wordsEl.querySelectorAll('[class$="__word"]'));
  if (!words.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;

  function update() {
    ticking = false;
    const rect = rectEl.getBoundingClientRect();
    const progress = computeProgress(rect, window.innerHeight);
    words.forEach((word, i) => {
      const threshold = i / words.length;
      word.style.opacity = progress > threshold ? '1' : '0.15';
    });
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// Seções "presas" na tela (.statement-pin, .claim-pin): o wrapper mais
// alto rola por baixo enquanto o conteúdo fica sticky, e o progresso
// acompanha o quanto já se rolou dentro desse wrapper — só quando todas as
// palavras chegam a 100% o scroll volta ao fluxo normal da página.
document.querySelectorAll('[data-scroll-pin]').forEach((pin) => {
  const text = pin.querySelector('[data-scroll-reveal]');
  if (!text) return;
  initScrollWordReveal(text, pin, (rect, vh) =>
    Math.min(Math.max(-rect.top / (rect.height - vh), 0), 1)
  );
});

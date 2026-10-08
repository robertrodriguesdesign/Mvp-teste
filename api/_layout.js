// moldura compartilhada das páginas geradas pelo admin (projetos e blog):
// navbar, contato, rodapé e menu iguais aos das páginas estáticas de
// /trabalhos — ao mudar o menu ou o rodapé do site, atualize aqui também
const HEAD_LINKS = `  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" type="image/svg+xml" href="/images/brand/favicon.svg" />
  <link rel="apple-touch-icon" href="/images/brand/apple-touch-icon.png" />
  <link rel="stylesheet" href="/css/fonts.css" />
  <link rel="stylesheet" href="/css/institucional.css" />
`;

const TOPO = `<body class="inst">

  <!-- DOBRA 1 · HERO -->
  <div class="inst-hero inst-hero--short">
    <!-- NAVBAR -->
    <header class="inst-nav">
      <div class="inst-nav__panel">
        <a class="inst-nav__logo" href="/" aria-label="Fihan — página inicial">
          <img src="/images/institucional/logo-navbar.svg" alt="Fihan" width="110" height="44" />
        </a>
        <div class="inst-nav__actions">
          <a class="inst-btn" href="/#contact">Comece Agora</a>
          <div class="tile-pair">
            <button class="tile" type="button" data-open-menu="busca" aria-label="Buscar">
              <img src="/images/institucional/icon-buscar.svg" alt="" />
            </button>
            <button class="tile" type="button" data-open-menu="menu" aria-label="Abrir menu">
              <img src="/images/institucional/icon-menu.svg" alt="" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- BARRA DE AÇÃO (mobile) -->
    <div class="inst-actionbar">
      <div class="tile-pair">
        <button class="tile tile--accent" type="button" data-open-menu="menu" aria-label="Abrir menu">
          <img src="/images/institucional/icon-menu.svg" alt="" />
        </button>
        <button class="tile tile--accent" type="button" data-open-menu="busca" aria-label="Buscar">
          <img src="/images/institucional/icon-buscar.svg" alt="" />
        </button>
      </div>
      <a class="inst-btn" href="/#contact">Comece Agora</a>
    </div>

`;

const RODAPE = `  <!-- ASSINATURA E CONTATO -->
  <section class="dobra dobra--contato" id="contato">
    <hr class="dobra__regua" />
    <div class="contato">
      <h2 class="t-h1">Contate-nos</h2>
      <div class="contato__campo-wrap" data-contato>
        <div class="contato__campo">
          <p class="contato__saudacao t-body-lg">Olá, bem-vindo à FIHAN</p>
          <label class="contato__entrada t-body-lg">
            <span aria-hidden="true">/</span>
            <input type="text" placeholder="enviar mensagem" aria-label="Sua mensagem" autocomplete="off" />
          </label>
        </div>
        <div class="tile-pair tile-pair--col">
          <a class="tile tile--on-light" data-contato-whatsapp href="https://wa.me/5527997289739" target="_blank" rel="noopener" aria-label="Enviar pelo WhatsApp">
            <img src="/images/institucional/icon-whatsapp.svg" alt="" />
          </a>
          <a class="tile tile--on-light" data-contato-email href="mailto:wellington@fihan.com.br" aria-label="Enviar por e-mail">
            <img src="/images/institucional/icon-mensagem.svg" alt="" />
          </a>
        </div>
      </div>
    </div>
    <div class="assinatura">
      <p class="assinatura__autor t-h3">– Fihan</p>
      <p class="t-h2">Cada trabalho carrega a mesma disciplina: entender o problema e as pessoas antes de desenvolver, e entregar a solução operando sobre fundamento documentado.</p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="inst-footer">
    <div class="inst-footer__top">
      <div class="inst-footer__contato">
        <a href="/" aria-label="Fihan — página inicial">
          <img src="/images/institucional/logo-footer.svg" alt="Fihan" width="130" height="52" />
        </a>
        <div class="inst-footer__dados">
          <a href="mailto:wellington@fihan.com.br">wellington@fihan.com.br</a>
          <a href="https://wa.me/5527997289739" target="_blank" rel="noopener">+55 27 99728-9739</a>
          <span>Espírito Santo, Brasil</span>
        </div>
        <div class="inst-footer__sociais">
          <a class="inst-pill t-overline" href="https://linkedin.com" target="_blank" rel="noopener">LinkedIn</a>
          <a class="inst-pill t-overline" href="https://instagram.com" target="_blank" rel="noopener">Instagram</a>
          <a class="inst-pill t-overline" href="https://youtube.com" target="_blank" rel="noopener">YouTube</a>
        </div>
      </div>
      <nav class="inst-footer__colunas" aria-label="Rodapé">
        <div class="inst-footer__coluna">
          <p class="t-overline">[ Fihan ]</p>
          <ul>
            <li><a href="/trabalhos">Trabalhos</a></li>
            <li><a href="/sobre">Sobre</a></li>
            <li><a href="/contatos">Contatos</a></li>
          </ul>
        </div>
        <div class="inst-footer__coluna">
          <p class="t-overline">[ Protocolo ]</p>
          <ul>
            <li><a href="/eixo-negocio">Eixo de Negócio</a></li>
            <li><a href="/fomento">Fomento</a></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="inst-footer__bottom">
      <p class="inst-footer__copy">© 2026 FIHAN. Todos os direitos reservados.</p>
      <div class="inst-selo">
        <img src="/images/institucional/simbolo.svg" alt="" width="4" height="16" />
        <span>Inteligência de Negócio, Marca e Desenvolvimento</span>
      </div>
    </div>
  </footer>

  <!-- MENU E BUSCA -->
  <dialog class="inst-menu" id="inst-menu" aria-label="Menu">
    <div class="inst-menu__inner">
      <div class="inst-menu__top">
        <img src="/images/institucional/logo-navbar.svg" alt="Fihan" width="110" height="44" />
        <button class="tile inst-menu__close" type="button" data-close-menu aria-label="Fechar menu">×</button>
      </div>
      <input class="inst-menu__search" type="search" placeholder="Buscar no site" aria-label="Buscar no site" />
      <nav class="inst-menu__cols" aria-label="Principal">
        <div class="inst-menu__col">
          <p class="inst-menu__label t-overline">[ Fihan ]</p>
          <ul class="inst-menu__list">
            <li><a class="t-h3" href="/">Início</a></li>
            <li><a class="t-h3" href="/trabalhos" data-keywords="cases projetos">Trabalhos</a></li>
            <li><a class="t-h3" href="/sobre">Sobre</a></li>
            <li><a class="t-h3" href="/contatos">Contatos</a></li>
          </ul>
        </div>
        <div class="inst-menu__col">
          <p class="inst-menu__label t-overline">[ Trabalhos ]</p>
          <ul class="inst-menu__list">
            <li><a class="t-h3" href="/trabalhos/routes" data-keywords="Transporte de passageiros">Routes</a></li>
            <li><a class="t-h3" href="/trabalhos/makers" data-keywords="Filmmakers e fotógrafos freelancers">Makers</a></li>
            <li><a class="t-h3" href="/trabalhos/ciclos-system" data-keywords="Lojas de moda, calçados e semijoias">Ciclos System</a></li>
            <li><a class="t-h3" href="/trabalhos/brain" data-keywords="Supermercados">Brain</a></li>
            <li><a class="t-h3" href="/trabalhos/auati" data-keywords="Permuta de serviços entre profissionais">Auati</a></li>
            <li><a class="t-h3" href="/trabalhos/zei" data-keywords="Compras em supermercado">Zei</a></li>
          </ul>
        </div>
        <div class="inst-menu__col">
          <p class="inst-menu__label t-overline">[ Protocolo ]</p>
          <ul class="inst-menu__list">
            <li><a class="t-h3" href="/eixo-negocio" data-keywords="protocolo frentes ciclos calculadora">Eixo de Negócio</a></li>
            <li><a class="t-h3" href="/vertices" data-keywords="protocolo decisao avancar pivotar encerrar">Os quatro Vértices</a></li>
            <li><a class="t-h3" href="/eixo-marca" data-keywords="dna codex frameworks dimensoes">Eixo de Marca</a></li>
            <li><a class="t-h3" href="/eixo-dev" data-keywords="desenvolvimento componentes fases solucao operando">Eixo Dev</a></li>
            <li><a class="t-h3" href="/fomento" data-keywords="editais finep embrapii centelha tecnova fapesp">Fomento</a></li>
          </ul>
        </div>
      </nav>
      <p class="inst-menu__empty">Nada encontrado.</p>
    </div>
  </dialog>

  <script src="/js/institucional.js"></script>
</body>
</html>
`;

module.exports = { HEAD_LINKS, TOPO, RODAPE };

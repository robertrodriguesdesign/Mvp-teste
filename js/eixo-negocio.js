/* Fihan — Eixo de Negócio: calculadora da Frente 9.
   N = clientes pagantes para cobrir o custo mensal (custo ÷ preço, arredondado
   para cima). M = mês em que a base chega a N, supondo que o número de novos
   clientes do primeiro mês se repete a cada mês. */
(function () {
  'use strict';

  var calc = document.getElementById('ex-calc');
  if (!calc) return;

  var custo = document.getElementById('ex-custo');
  var preco = document.getElementById('ex-preco');
  var clientes = document.getElementById('ex-clientes');
  var num = document.getElementById('ex-num');
  var titulo = document.getElementById('ex-titulo');
  var desc = document.getElementById('ex-desc');
  var VAZIO = { titulo: titulo.textContent, desc: desc.textContent };

  // Aceita "5.000", "5000,50" e "R$ 5.000,00".
  function valor(input) {
    var s = input.value.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function plural(n, um, varios) { return n.toLocaleString('pt-BR') + ' ' + (n === 1 ? um : varios); }

  function atualizar() {
    var c = valor(custo), p = valor(preco), k = Math.floor(valor(clientes));
    if (!c || !p) {
      num.textContent = '—';
      titulo.textContent = VAZIO.titulo;
      desc.textContent = VAZIO.desc;
      return;
    }
    var n = Math.ceil(c / p);
    num.textContent = n.toLocaleString('pt-BR');
    titulo.textContent = 'Você precisa de ' + plural(n, 'cliente pagante', 'clientes pagantes') + ' para se pagar.';
    desc.textContent = k
      ? 'No ritmo que você projetou, isso acontece no mês ' + Math.ceil(n / k).toLocaleString('pt-BR') + '.'
      : 'Informe quantos clientes você espera no primeiro mês para ver em que mês isso acontece.';
  }

  [custo, preco, clientes].forEach(function (i) { i.addEventListener('input', atualizar); });
  calc.addEventListener('submit', function (e) { e.preventDefault(); });
})();

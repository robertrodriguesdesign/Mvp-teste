'use client';

import { TrendingUp, MapPin, Package, BarChart3, DollarSign, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/lib/utils';
import { PRODUCTS, NEIGHBORHOOD_RANKING } from '@/lib/mockData';

const brandInsights = [
  { product: 'Feijão Carioca 1kg', brand: 'Kicaldo', avgPrice: 8.20, minPrice: 6.99, maxPrice: 10.50, registrations: 98, neighborhoods: 7, competitorAvg: 8.50, variance: 33.3 },
  { product: 'Leite Integral 1L', brand: 'Italac', avgPrice: 4.75, minPrice: 3.99, maxPrice: 5.99, registrations: 203, neighborhoods: 12, competitorAvg: 4.60, variance: 33.4 },
  { product: 'Arroz Agulhinha 5kg', brand: 'Camil', avgPrice: 27.50, minPrice: 24.90, maxPrice: 31.90, registrations: 142, neighborhoods: 9, competitorAvg: 28.00, variance: 28.3 },
];

const apiPlans = [
  { name: 'Pesquisador', price: 0, description: 'Acesso básico à API pública', features: ['100 req/dia', 'Dados aggregados', 'Delay 24h'] },
  { name: 'Startup', price: 990, description: 'Para fintechs e startups', features: ['10.000 req/dia', 'Dados em tempo real', 'Geolocalização', 'Suporte básico'] },
  { name: 'Enterprise', price: 4990, description: 'Para grandes empresas', features: ['Ilimitado', 'Dados brutos + API', 'Webhook em tempo real', 'SLA garantido', 'Gerente dedicado'] },
];

export function B2BDashboard() {
  return (
    <div className="pb-24 px-4 pt-4 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-purple-600" />
        <div>
          <h2 className="text-xl font-black text-gray-900">Inteligência de Mercado</h2>
          <p className="text-sm text-gray-500">Dashboard B2B — Dados em tempo real</p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="bg-purple-50 border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Registros ativos</p>
          <p className="text-2xl font-black text-purple-700">4.821</p>
          <p className="text-xs text-green-600">+12% esta semana</p>
        </Card>
        <Card padding="sm" className="bg-green-50 border-green-200">
          <p className="text-xs text-green-600 font-medium">Bairros mapeados</p>
          <p className="text-2xl font-black text-green-700">127</p>
          <p className="text-xs text-green-600">Grande Vitória - ES</p>
        </Card>
        <Card padding="sm" className="bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Agentes ativos</p>
          <p className="text-2xl font-black text-blue-700">1.203</p>
          <p className="text-xs text-blue-600">+8% este mês</p>
        </Card>
        <Card padding="sm" className="bg-orange-50 border-orange-200">
          <p className="text-xs text-orange-600 font-medium">Produtos monitorados</p>
          <p className="text-2xl font-black text-orange-700">348</p>
          <p className="text-xs text-orange-600">+24 esta semana</p>
        </Card>
      </div>

      {/* Brand Intelligence */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-600" />
          Inteligência de Preço por Produto
        </h3>
        <div className="space-y-3">
          {brandInsights.map((insight, idx) => (
            <Card key={idx}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{insight.product}</p>
                  <p className="text-xs text-gray-500">{insight.brand} · {insight.registrations} registros</p>
                </div>
                <Badge variant={insight.avgPrice > insight.competitorAvg ? 'danger' : 'success'}>
                  {insight.avgPrice > insight.competitorAvg ? 'Acima do mercado' : 'Competitivo'}
                </Badge>
              </div>

              {/* Price range */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-green-600 font-semibold">{formatCurrency(insight.minPrice)}</span>
                <div className="flex-1 mx-3">
                  <ProgressBar value={Math.round(((insight.avgPrice - insight.minPrice) / (insight.maxPrice - insight.minPrice)) * 100)} color="purple" />
                </div>
                <span className="text-red-600 font-semibold">{formatCurrency(insight.maxPrice)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Mínimo</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(insight.minPrice)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Média</p>
                  <p className="text-sm font-bold text-purple-600">{formatCurrency(insight.avgPrice)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">Máximo</p>
                  <p className="text-sm font-bold text-red-600">{formatCurrency(insight.maxPrice)}</p>
                </div>
              </div>

              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>{insight.neighborhoods} bairros mapeados</span>
                <span>Variância: {insight.variance.toFixed(1)}%</span>
              </div>

              {insight.competitorAvg && (
                <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-xs">
                  <span className="font-semibold text-yellow-700">Vs. concorrentes:</span>
                  <span className={`ml-1 font-bold ${insight.avgPrice > insight.competitorAvg ? 'text-red-600' : 'text-green-600'}`}>
                    {insight.avgPrice > insight.competitorAvg ? '+' : ''}{(((insight.avgPrice - insight.competitorAvg) / insight.competitorAvg) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Regional Heatmap */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-600" />
          Densidade de Dados por Região
        </h3>
        <div className="space-y-2">
          {NEIGHBORHOOD_RANKING.slice(0, 5).map((nb, idx) => (
            <div key={nb.id} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-4">#{idx + 1}</span>
              <span className="text-xs font-medium text-gray-700 w-28 truncate">{nb.name}</span>
              <div className="flex-1">
                <ProgressBar value={Math.round((nb.totalRegistrations / NEIGHBORHOOD_RANKING[0].totalRegistrations) * 100)} color="purple" />
              </div>
              <span className="text-xs font-bold text-gray-700 w-10 text-right">{nb.totalRegistrations.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* API Plans */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-purple-600" />
          Planos de Acesso à API
        </h3>
        <div className="space-y-3">
          {apiPlans.map((plan, idx) => (
            <Card key={idx} className={idx === 1 ? 'border-purple-300 shadow-md' : ''}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900">{plan.name}</h4>
                    {idx === 1 && <Badge variant="purple">Popular</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{plan.description}</p>
                </div>
                <div className="text-right">
                  {plan.price === 0 ? (
                    <p className="text-lg font-black text-green-600">Grátis</p>
                  ) : (
                    <>
                      <p className="text-lg font-black text-purple-600">{formatCurrency(plan.price)}</p>
                      <p className="text-xs text-gray-400">/mês</p>
                    </>
                  )}
                </div>
              </div>
              <ul className="space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full mt-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                idx === 1 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                {plan.price === 0 ? 'Começar grátis' : 'Assinar plano'}
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Brand mission CTA */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <h4 className="font-bold mb-1">Lançar campanha de missões</h4>
        <p className="text-xs text-white/80 mb-3">
          Contrate nossa rede para auditar preços e presença de produto. Custo 70% menor que promotores tradicionais.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          {[['R$3,50', 'por auditoria'], ['500+', 'agentes ES'], ['24h', 'cobertura']].map(([val, label], i) => (
            <div key={i} className="bg-white/20 rounded-lg p-2">
              <p className="font-black">{val}</p>
              <p className="text-[10px] text-white/70">{label}</p>
            </div>
          ))}
        </div>
        <button className="w-full bg-white text-purple-700 font-bold py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors">
          Criar campanha de marca
        </button>
      </Card>
    </div>
  );
}

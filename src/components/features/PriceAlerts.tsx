'use client';

import { Share2, ThumbsUp, MapPin, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime, getAlertSeverity } from '@/lib/utils';

export function PriceAlerts() {
  const { alerts, shareAlert, confirmRegistration } = useAppStore();

  const handleShare = (alertId: string, alert: typeof alerts[0]) => {
    shareAlert(alertId);
    const text = encodeURIComponent(
      `🚨 ${alert.productName} a ${formatCurrency(alert.price)} em ${alert.storeName} (${alert.neighborhood})!\n\n` +
      `A média na região é ${formatCurrency(alert.avgPrice)} — ${alert.percentAbove.toFixed(0)}% acima!\n\n` +
      `Confirma aí no Zei: https://zei.app`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">🚨 Alertas de Preço</h2>
        <p className="text-sm text-gray-500">Preços absurdos detectados pela comunidade</p>
      </div>

      {/* How it works */}
      <Card className="bg-red-50 border-red-200">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Como funciona o alerta?</p>
            <p className="text-xs text-red-600 mt-0.5">
              Quando alguém registra um preço muito acima da média regional, o app gera um alerta automático. Compartilhe para alertar a comunidade — e gere downloads orgânicos!
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map(alert => {
          const severity = getAlertSeverity(alert.percentAbove);
          return (
            <Card key={alert.id} className={`border ${severity.bg}`}>
              <div className="mb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-gray-900">{alert.productName}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500">{alert.storeName} · {alert.neighborhood}, {alert.city}</p>
                    </div>
                  </div>
                  <Badge variant="danger" className="flex-shrink-0">{severity.label}</Badge>
                </div>
              </div>

              {/* Price comparison */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 text-center bg-white rounded-xl p-3 border border-red-200">
                  <p className="text-xs text-gray-500">Preço registrado</p>
                  <p className="text-xl font-black text-red-600">{formatCurrency(alert.price)}</p>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-black ${severity.color}`}>+{alert.percentAbove.toFixed(0)}%</div>
                  <div className="text-xs text-gray-400">acima</div>
                </div>
                <div className="flex-1 text-center bg-white rounded-xl p-3 border border-green-200">
                  <p className="text-xs text-gray-500">Média regional</p>
                  <p className="text-xl font-black text-green-600">{formatCurrency(alert.avgPrice)}</p>
                </div>
              </div>

              {/* Social proof */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Registrado por {alert.reportedBy}</span>
                <span>{formatDateTime(alert.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => confirmRegistration(alert.registrationId)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Confirmar ({alert.confirmedCount})
                </button>
                <button
                  onClick={() => handleShare(alert.id, alert)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 rounded-xl text-sm font-semibold text-white hover:bg-green-600"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar ({alert.shares})
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Viral tip */}
      <Card className="bg-purple-50 border-purple-200">
        <p className="text-sm font-bold text-purple-800">💡 Dica viral</p>
        <p className="text-xs text-purple-600 mt-1">
          Preços absurdos geram muito engajamento! Compartilhe alertas no WhatsApp e Instagram — cada pessoa que baixar o app pelo seu conteúdo entra na sua rede automaticamente.
        </p>
      </Card>
    </div>
  );
}

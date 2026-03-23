'use client';

import { useState } from 'react';
import { MapPin, Clock, Tag, ChevronRight, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

export function Marketplace() {
  const { offers } = useAppStore();
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());
  const [selectedOffer, setSelectedOffer] = useState<typeof offers[0] | null>(null);

  const handleCheckIn = (offerId: string) => {
    setCheckedIn(prev => new Set([...prev, offerId]));
    setSelectedOffer(null);
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-4">
      <div>
        <h2 className="text-xl font-black text-gray-900">🏪 Ofertas do Bairro</h2>
        <p className="text-sm text-gray-500">Promoções de estabelecimentos locais perto de você</p>
      </div>

      {/* B2C info */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <div className="flex items-start gap-2">
          <Tag className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-800">Outdoor digital do seu bairro</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Lojistas locais pagam para aparecer aqui. Você encontra as melhores ofertas, eles ganham clientes. Todo mundo ganha!
            </p>
          </div>
        </div>
      </Card>

      {/* Offers */}
      <div className="space-y-3">
        {offers.map(offer => {
          const didCheckIn = checkedIn.has(offer.id);
          return (
            <Card key={offer.id} hover onClick={() => setSelectedOffer(offer)} className="relative overflow-hidden">
              {/* Discount badge */}
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-bl-xl rounded-tr-2xl">
                -{offer.discountPercent}%
              </div>

              <div className="flex items-start gap-3">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {offer.storeCategory === 'Padaria' ? '🥖' :
                   offer.storeCategory === 'Carnes' ? '🥩' :
                   offer.storeCategory === 'Hortifrúti' ? '🥭' : '🛒'}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <p className="text-sm font-bold text-gray-900">{offer.productName}</p>
                  <p className="text-xs text-gray-500">{offer.storeName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{offer.neighborhood} · {offer.distance}km</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div>
                      <span className="text-xs text-gray-400 line-through">{formatCurrency(offer.originalPrice)}</span>
                      <span className="text-base font-black text-green-600 ml-1">{formatCurrency(offer.offerPrice)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={didCheckIn ? 'success' : 'outline'}>
                      {didCheckIn ? '✓ Check-in feito' : `${offer.checkIns} check-ins`}
                    </Badge>
                    <span className="text-xs text-gray-400">{offer.views} visualizações</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                <Clock className="w-3 h-3" />
                <span>{offer.description}</span>
              </div>

              <ChevronRight className="absolute right-3 bottom-3 w-4 h-4 text-gray-300" />
            </Card>
          );
        })}
      </div>

      {/* Modal overlay */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setSelectedOffer(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] mx-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">
                {selectedOffer.storeCategory === 'Padaria' ? '🥖' :
                 selectedOffer.storeCategory === 'Carnes' ? '🥩' :
                 selectedOffer.storeCategory === 'Hortifrúti' ? '🥭' : '🛒'}
              </div>
              <div>
                <h3 className="font-black text-gray-900">{selectedOffer.productName}</h3>
                <p className="text-sm text-gray-500">{selectedOffer.storeName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card padding="sm" className="text-center bg-red-50 border-red-100">
                <p className="text-xs text-gray-500">De</p>
                <p className="text-base font-bold text-gray-400 line-through">{formatCurrency(selectedOffer.originalPrice)}</p>
              </Card>
              <Card padding="sm" className="text-center bg-green-50 border-green-100">
                <p className="text-xs text-gray-500">Por</p>
                <p className="text-xl font-black text-green-600">{formatCurrency(selectedOffer.offerPrice)}</p>
              </Card>
            </div>

            <p className="text-sm text-gray-600 mb-3">{selectedOffer.description}</p>

            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <MapPin className="w-4 h-4" />
              <span>{selectedOffer.storeAddress}, {selectedOffer.neighborhood}</span>
            </div>

            {checkedIn.has(selectedOffer.id) ? (
              <div className="flex items-center gap-2 justify-center py-3 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">Check-in confirmado!</span>
              </div>
            ) : (
              <button
                onClick={() => handleCheckIn(selectedOffer.id)}
                className="w-full bg-purple-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
              >
                📍 Fazer check-in no local
              </button>
            )}
          </div>
        </div>
      )}

      {/* For merchants CTA */}
      <Card className="border-purple-200 bg-purple-50 text-center">
        <p className="font-bold text-purple-800 mb-1">Você é lojista?</p>
        <p className="text-xs text-purple-600 mb-3">
          Apareça aqui para clientes próximos por apenas R$0,30/clique ou R$1,50/check-in. Sem mensalidade!
        </p>
        <button className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
          Anunciar minha loja
        </button>
      </Card>
    </div>
  );
}

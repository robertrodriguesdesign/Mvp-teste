import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/b2b — brand intelligence dashboard
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') ?? 'Vitória';

  // Price intelligence per product
  const registrations = await db.priceRegistration.findMany({
    where: { city, status: 'confirmed' },
    select: { productName: true, productBrand: true, price: true, neighborhood: true },
  });

  // Group by product
  const byProduct = registrations.reduce<Record<string, {
    prices: number[];
    neighborhoods: Set<string>;
    brand: string;
  }>>((acc, r) => {
    const key = r.productName;
    if (!acc[key]) acc[key] = { prices: [], neighborhoods: new Set(), brand: r.productBrand ?? '' };
    acc[key].prices.push(r.price);
    acc[key].neighborhoods.add(r.neighborhood);
    return acc;
  }, {});

  const insights = Object.entries(byProduct).map(([name, data]) => {
    const prices = data.prices;
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const variance = ((max - min) / avg) * 100;
    return {
      productName: name,
      brand: data.brand,
      avgPrice: parseFloat(avg.toFixed(2)),
      minPrice: min,
      maxPrice: max,
      priceVariance: parseFloat(variance.toFixed(1)),
      registrationCount: prices.length,
      neighborhoodsPresent: data.neighborhoods.size,
    };
  }).sort((a, b) => b.registrationCount - a.registrationCount).slice(0, 20);

  // Neighborhood density
  const byNeighborhood = await db.priceRegistration.groupBy({
    by: ['neighborhood'],
    where: { city },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // Total stats
  const [totalRegistrations, totalUsers, totalMissions] = await Promise.all([
    db.priceRegistration.count({ where: { city } }),
    db.user.count({ where: { city } }),
    db.mission.count({ where: { targetCity: city, status: 'active' } }),
  ]);

  return NextResponse.json({
    city,
    overview: { totalRegistrations, totalUsers, totalMissions },
    insights,
    neighborhoodDensity: byNeighborhood.map(n => ({
      neighborhood: n.neighborhood,
      count: n._count.id,
    })),
  });
}

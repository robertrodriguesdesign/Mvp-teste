import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { localOfferSchema } from '@/lib/validations';

// GET /api/offers — list active local offers
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const neighborhood = searchParams.get('neighborhood');

  const offers = await db.localOffer.findMany({
    where: {
      active: true,
      validUntil: { gte: new Date() },
      ...(city && { city }),
      ...(neighborhood && { neighborhood }),
    },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { views: 'desc' },
    take: 30,
  });

  return NextResponse.json(offers);
}

// POST /api/offers — create local offer (merchant)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = localOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const discountPercent = ((data.originalPrice - data.offerPrice) / data.originalPrice) * 100;

  const offer = await db.localOffer.create({
    data: {
      ownerId: session.user.id,
      storeName: data.storeName,
      storeCategory: data.storeCategory,
      storeAddress: data.storeAddress,
      neighborhood: data.neighborhood,
      city: data.city,
      productName: data.productName,
      originalPrice: data.originalPrice,
      offerPrice: data.offerPrice,
      discountPercent,
      description: data.description,
      validUntil: new Date(data.validUntil),
    },
  });

  return NextResponse.json(offer, { status: 201 });
}

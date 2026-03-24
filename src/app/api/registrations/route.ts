import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { priceRegistrationSchema } from '@/lib/validations';
import { SUSPICIOUS_PRICE_THRESHOLD } from '@/lib/constants';

// GET /api/registrations — list registrations (with optional filters)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const neighborhood = searchParams.get('neighborhood');
  const productName = searchParams.get('q');
  const status = searchParams.get('status');
  const take = parseInt(searchParams.get('take') || '50');
  const skip = parseInt(searchParams.get('skip') || '0');

  const registrations = await db.priceRegistration.findMany({
    where: {
      ...(city && { city }),
      ...(neighborhood && { neighborhood }),
      ...(productName && { productName: { contains: productName } }),
      ...(status && { status }),
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      confirmations: { select: { userId: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  return NextResponse.json(registrations);
}

// POST /api/registrations — create new price registration
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = priceRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session.user.id;
  const data = parsed.data;

  const registration = await db.priceRegistration.create({
    data: {
      userId,
      productName: data.productName,
      productCategory: data.productCategory,
      productBrand: data.productBrand,
      price: data.price,
      unit: data.unit,
      storeName: data.storeName,
      storeAddress: data.storeAddress,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state ?? 'ES',
      lat: data.lat,
      lng: data.lng,
      missionId: data.missionId,
    },
  });

  // Check if user is on a mission — handle mission participation
  if (data.missionId) {
    await db.missionParticipant.upsert({
      where: { missionId_userId: { missionId: data.missionId, userId } },
      create: { missionId: data.missionId, userId },
      update: {},
    });
  }

  // Check for suspiciously high price — auto-generate alert
  const recentSimilar = await db.priceRegistration.findMany({
    where: {
      productName: { contains: data.productName.split(' ')[0] },
      city: data.city,
      status: 'confirmed',
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  if (recentSimilar.length >= 3) {
    const avg = recentSimilar.reduce((sum, r) => sum + r.price, 0) / recentSimilar.length;
    const percentAbove = ((data.price - avg) / avg) * 100;

    if (percentAbove >= (SUSPICIOUS_PRICE_THRESHOLD - 1) * 100) {
      await db.priceAlert.create({
        data: {
          registrationId: registration.id,
          productName: data.productName,
          price: data.price,
          avgPrice: avg,
          percentAbove,
          storeName: data.storeName,
          neighborhood: data.neighborhood,
          city: data.city,
          reportedByName: session.user.name ?? 'Usuário',
        },
      });
    }
  }

  return NextResponse.json(registration, { status: 201 });
}

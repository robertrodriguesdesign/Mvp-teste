import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { missionSchema } from '@/lib/validations';

const ZEI_MARGIN = 1.75; // brand pays 75% more than user reward

// GET /api/missions — list active missions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const status = searchParams.get('status') ?? 'active';

  const missions = await db.mission.findMany({
    where: {
      status,
      ...(city && { targetCity: city }),
    },
    include: {
      brand: { select: { id: true, name: true, logo: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Attach user participation status if authenticated
  const session = await auth();
  const userId = session?.user?.id;

  const missionsWithStatus = await Promise.all(missions.map(async (mission) => {
    let userParticipation = null;
    if (userId) {
      userParticipation = await db.missionParticipant.findUnique({
        where: { missionId_userId: { missionId: mission.id, userId } },
      });
    }
    return {
      ...mission,
      filledSlots: mission._count.participants,
      joined: !!userParticipation,
      completed: userParticipation?.completed ?? false,
    };
  }));

  return NextResponse.json(missionsWithStatus);
}

// POST /api/missions — create mission (brand only — simplified for MVP)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = missionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // For MVP: any authenticated user can create (in prod: brand auth only)
  // Find or create a default brand for this user
  let brand = await db.brand.findFirst({ where: { email: session.user.email! } });
  if (!brand) {
    brand = await db.brand.create({
      data: {
        name: session.user.name ?? 'Minha Marca',
        email: session.user.email!,
        logo: session.user.name?.[0] ?? 'M',
      },
    });
  }

  const mission = await db.mission.create({
    data: {
      brandId: brand.id,
      title: data.title,
      description: data.description,
      type: data.type,
      productName: data.productName,
      productBrand: data.productBrand,
      targetCity: data.targetCity,
      rewardPerUser: data.rewardPerUser,
      brandCost: data.rewardPerUser * ZEI_MARGIN,
      totalSlots: data.totalSlots,
      expiresAt: new Date(data.expiresAt),
      bonusForReferrals: data.bonusForReferrals,
    },
    include: { brand: true },
  });

  return NextResponse.json(mission, { status: 201 });
}

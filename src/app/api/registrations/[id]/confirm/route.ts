import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const CONFIRMATION_REWARD = 0.02;
const CONFIRMATIONS_TO_VALIDATE = 3;

// POST /api/registrations/[id]/confirm — confirm or flag a registration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const { type = 'confirm' } = await req.json();

  const registration = await db.priceRegistration.findUnique({ where: { id } });
  if (!registration) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
  if (registration.userId === session.user.id) {
    return NextResponse.json({ error: 'Não pode confirmar o próprio registro' }, { status: 400 });
  }

  // Upsert confirmation (idempotent)
  await db.registrationConfirmation.upsert({
    where: { registrationId_userId: { registrationId: id, userId: session.user.id } },
    create: { registrationId: id, userId: session.user.id, type },
    update: { type },
  });

  // Count total confirmations
  const confirmCount = await db.registrationConfirmation.count({
    where: { registrationId: id, type: 'confirm' },
  });

  // Validate registration if enough confirms
  if (confirmCount >= CONFIRMATIONS_TO_VALIDATE && registration.status === 'pending') {
    await db.priceRegistration.update({
      where: { id },
      data: { status: 'confirmed' },
    });

    // Reward the original registrant
    const owner = await db.user.findUnique({ where: { id: registration.userId } });
    if (owner) {
      const levelRewards: Record<string, number> = {
        explorador: 0.05,
        guardiao: 0.10,
        capitao: 0.20,
        embaixador: 0.50,
      };
      const ownerReward = levelRewards[owner.level] ?? 0.05;

      await db.$transaction([
        db.user.update({
          where: { id: owner.id },
          data: { walletBalance: { increment: ownerReward }, points: { increment: 10 } },
        }),
        db.transaction.create({
          data: {
            userId: owner.id,
            type: 'earn_registration',
            amount: ownerReward,
            description: `Registro confirmado: ${registration.productName}`,
            reference: id,
          },
        }),
      ]);

      // Network bonus: if owner was referred, give bonus to referrer
      if (owner.referredById) {
        const referrer = await db.user.findUnique({ where: { id: owner.referredById } });
        if (referrer) {
          const bonusPercent: Record<string, number> = { guardiao: 0.02, capitao: 0.05, embaixador: 0.10 };
          const pct = bonusPercent[referrer.level] ?? 0;
          if (pct > 0) {
            const networkBonus = ownerReward * pct;
            await db.$transaction([
              db.user.update({
                where: { id: referrer.id },
                data: { walletBalance: { increment: networkBonus } },
              }),
              db.transaction.create({
                data: {
                  userId: referrer.id,
                  type: 'earn_network',
                  amount: networkBonus,
                  description: `Bônus de rede: ${owner.name} (${registration.productName})`,
                  reference: id,
                },
              }),
            ]);
          }
        }
      }
    }
  }

  // Small reward for the confirmer too
  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data: { walletBalance: { increment: CONFIRMATION_REWARD } },
    }),
    db.transaction.create({
      data: {
        userId: session.user.id,
        type: 'earn_registration',
        amount: CONFIRMATION_REWARD,
        description: `Confirmação: ${registration.productName}`,
        reference: id,
      },
    }),
  ]);

  return NextResponse.json({ success: true, confirmCount });
}

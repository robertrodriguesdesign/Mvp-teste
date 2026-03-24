import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// POST /api/missions/[id]/complete
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const mission = await db.mission.findUnique({ where: { id } });
  if (!mission) return NextResponse.json({ error: 'Missão não encontrada' }, { status: 404 });

  const participant = await db.missionParticipant.findUnique({
    where: { missionId_userId: { missionId: id, userId } },
  });
  if (!participant) return NextResponse.json({ error: 'Você não está participando desta missão' }, { status: 400 });
  if (participant.completed) return NextResponse.json({ error: 'Missão já concluída' }, { status: 400 });

  const reward = mission.rewardPerUser;

  // Check referral bonus: if someone they referred also completed this mission
  const user = await db.user.findUnique({ where: { id: userId }, include: { referrals: { select: { id: true } } } });
  let bonusAmount = 0;
  if (mission.bonusForReferrals && user?.referrals?.length) {
    const referralIds = user.referrals.map(r => r.id);
    const referralCompletions = await db.missionParticipant.count({
      where: { missionId: id, userId: { in: referralIds }, completed: true },
    });
    if (referralCompletions > 0) {
      bonusAmount = mission.bonusForReferrals;
    }
  }

  const totalReward = reward + bonusAmount;

  await db.$transaction([
    db.missionParticipant.update({
      where: { missionId_userId: { missionId: id, userId } },
      data: { completed: true, rewardPaid: totalReward },
    }),
    db.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: totalReward }, points: { increment: 50 } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: 'earn_mission',
        amount: totalReward,
        description: `Missão concluída: ${mission.title}${bonusAmount > 0 ? ' (+bônus de rede)' : ''}`,
        reference: id,
      },
    }),
  ]);

  return NextResponse.json({ success: true, reward: totalReward, bonus: bonusAmount });
}

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('senha123', 10);

  const joao = await prisma.user.upsert({
    where: { email: 'joao@zei.app' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@zei.app',
      passwordHash,
      level: 'guardiao',
      points: 1240,
      walletBalance: 24.75,
      referralCode: 'JOAO2024',
      neighborhood: 'Jardim Camburi',
      city: 'Vitória',
      state: 'ES',
    },
  });

  const maria = await prisma.user.upsert({
    where: { email: 'maria@zei.app' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria@zei.app',
      passwordHash,
      level: 'explorador',
      points: 320,
      walletBalance: 4.50,
      referralCode: 'MARIA2024',
      referredById: joao.id,
      neighborhood: 'Jardim Camburi',
      city: 'Vitória',
      state: 'ES',
    },
  });

  const carlos = await prisma.user.upsert({
    where: { email: 'carlos@zei.app' },
    update: {},
    create: {
      name: 'Carlos Oliveira',
      email: 'carlos@zei.app',
      passwordHash,
      level: 'explorador',
      points: 180,
      walletBalance: 2.80,
      referralCode: 'CARL2024',
      referredById: joao.id,
      neighborhood: 'Bento Ferreira',
      city: 'Vitória',
      state: 'ES',
    },
  });

  const ana = await prisma.user.upsert({
    where: { email: 'ana@zei.app' },
    update: {},
    create: {
      name: 'Ana Costa',
      email: 'ana@zei.app',
      passwordHash,
      level: 'explorador',
      points: 240,
      walletBalance: 3.20,
      referralCode: 'ANA2024',
      referredById: joao.id,
      neighborhood: 'Jardim da Penha',
      city: 'Vitória',
      state: 'ES',
    },
  });

  console.log('✅ Usuários criados');

  // ─── Welcome Transactions ───────────────────────────────────────────────
  for (const user of [joao, maria, carlos, ana]) {
    await prisma.transaction.upsert({
      where: { id: `bonus-${user.id}` },
      update: {},
      create: {
        id: `bonus-${user.id}`,
        userId: user.id,
        type: 'earn_bonus',
        amount: 5.00,
        description: 'Bônus de boas-vindas Zei 🎉',
      },
    });
  }

  // ─── Price Registrations ────────────────────────────────────────────────
  const regs = [
    { userId: joao.id, productName: 'Arroz Agulhinha 5kg', productCategory: 'Mercearia', productBrand: 'Camil', price: 28.90, unit: '5kg', storeName: 'Supermercado Extra', storeAddress: 'Av. Fernando Ferrari, 1000', neighborhood: 'Jardim Camburi', city: 'Vitória', state: 'ES', status: 'confirmed' },
    { userId: joao.id, productName: 'Ovos Brancos C30', productCategory: 'Hortifrúti', productBrand: 'Mantiqueira', price: 18.50, unit: 'cx30', storeName: 'Atacadão', storeAddress: 'Av. Central, 500', neighborhood: 'Jardim Camburi', city: 'Vitória', state: 'ES', status: 'confirmed' },
    { userId: maria.id, productName: 'Leite Integral 1L', productCategory: 'Laticínios', productBrand: 'Italac', price: 4.89, unit: '1L', storeName: 'Mercadinho do Bairro', storeAddress: 'Rua das Flores, 45', neighborhood: 'Jardim Camburi', city: 'Vitória', state: 'ES', status: 'confirmed' },
    { userId: carlos.id, productName: 'Óleo de Soja 900ml', productCategory: 'Mercearia', productBrand: 'Liza', price: 7.99, unit: '900ml', storeName: 'Rede Perim', storeAddress: 'Av. Marechal Campos, 200', neighborhood: 'Bento Ferreira', city: 'Vitória', state: 'ES', status: 'confirmed' },
    { userId: joao.id, productName: 'Feijão Carioca 1kg', productCategory: 'Mercearia', productBrand: 'Kicaldo', price: 8.49, unit: '1kg', storeName: 'Supermercado Extra', storeAddress: 'Av. Fernando Ferrari, 1000', neighborhood: 'Jardim Camburi', city: 'Vitória', state: 'ES', status: 'confirmed' },
    { userId: ana.id, productName: 'Frango Inteiro kg', productCategory: 'Carnes & Aves', productBrand: 'Seara', price: 18.90, unit: 'kg', storeName: 'Mini Mercado Expresso', storeAddress: 'Rua do Comercio, 30', neighborhood: 'Bento Ferreira', city: 'Vitória', state: 'ES', status: 'pending' },
    // Suspicious prices for alerts
    { userId: carlos.id, productName: 'Leite Integral 1L', productCategory: 'Laticínios', productBrand: 'Italac', price: 9.90, unit: '1L', storeName: 'Conveniência do Aeroporto', storeAddress: 'Av. do Aeroporto, 1', neighborhood: 'Goiabeiras', city: 'Vitória', state: 'ES', status: 'confirmed' },
  ];

  const createdRegs = [];
  for (const reg of regs) {
    const r = await prisma.priceRegistration.create({ data: reg });
    createdRegs.push(r);
  }

  // Confirmations for confirmed registrations
  const confirmedRegs = createdRegs.filter(r => r.status === 'confirmed');
  const confirmers = [maria.id, carlos.id, ana.id, joao.id];
  for (const reg of confirmedRegs.slice(0, 4)) {
    for (const confirmerId of confirmers.filter(id => id !== reg.userId).slice(0, 3)) {
      await prisma.registrationConfirmation.upsert({
        where: { registrationId_userId: { registrationId: reg.id, userId: confirmerId } },
        update: {},
        create: { registrationId: reg.id, userId: confirmerId, type: 'confirm' },
      });
    }
  }

  console.log('✅ Registros de preço criados');

  // ─── Brands ─────────────────────────────────────────────────────────────
  const kicaldo = await prisma.brand.upsert({
    where: { email: 'kicaldo@marcas.zei.app' },
    update: {},
    create: { name: 'Kicaldo', logo: 'K', email: 'kicaldo@marcas.zei.app', planTier: 'pro' },
  });
  const italac = await prisma.brand.upsert({
    where: { email: 'italac@marcas.zei.app' },
    update: {},
    create: { name: 'Italac', logo: 'I', email: 'italac@marcas.zei.app', planTier: 'pro' },
  });
  const seara = await prisma.brand.upsert({
    where: { email: 'seara@marcas.zei.app' },
    update: {},
    create: { name: 'Seara', logo: 'S', email: 'seara@marcas.zei.app', planTier: 'enterprise' },
  });
  const camil = await prisma.brand.upsert({
    where: { email: 'camil@marcas.zei.app' },
    update: {},
    create: { name: 'Camil', logo: 'C', email: 'camil@marcas.zei.app', planTier: 'enterprise' },
  });

  console.log('✅ Marcas criadas');

  // ─── Missions ───────────────────────────────────────────────────────────
  const missions = [
    { brandId: kicaldo.id, title: 'Mapeamento de Feijão Carioca no ES', description: 'Registre o preço do Feijão Carioca Kicaldo 1kg em mercados da Grande Vitória. Quanto mais mercados, mais você ganha!', type: 'price_check', productName: 'Feijão Carioca 1kg', productBrand: 'Kicaldo', targetCity: 'Vitória', rewardPerUser: 2.00, brandCost: 3.50, totalSlots: 500, expiresAt: new Date('2026-04-15'), bonusForReferrals: 1.00 },
    { brandId: italac.id, title: 'Auditoria de Leite Italac', description: 'Verifique presença e preço do Leite Integral Italac 1L em 3 supermercados diferentes. Ganhe bônus por trazer amigos!', type: 'shelf_audit', productName: 'Leite Integral 1L', productBrand: 'Italac', targetCity: 'Vila Velha', rewardPerUser: 3.00, brandCost: 5.25, totalSlots: 300, expiresAt: new Date('2026-04-10'), bonusForReferrals: 1.50 },
    { brandId: seara.id, title: 'Comparativo de Frango - ES', description: 'Compare o preço do Frango Inteiro Seara com concorrentes (Sadia, Perdigão) no seu mercado.', type: 'competitor_compare', productName: 'Frango Inteiro kg', productBrand: 'Seara', targetCity: 'Vitória', rewardPerUser: 4.00, brandCost: 7.00, totalSlots: 200, expiresAt: new Date('2026-04-20'), bonusForReferrals: 2.00 },
    { brandId: camil.id, title: '🏆 Caça ao Tesouro — Arroz Camil mais barato', description: 'Encontre o mercado com o menor preço do Arroz Camil 5kg na sua cidade. Quem trouxer amigos que também encontrem, ganha bônus coletivo!', type: 'treasure_hunt', productName: 'Arroz Agulhinha 5kg', productBrand: 'Camil', targetCity: 'Vitória', rewardPerUser: 5.00, brandCost: 8.75, totalSlots: 100, expiresAt: new Date('2026-03-30'), bonusForReferrals: 3.00 },
  ];

  const createdMissions = [];
  for (const m of missions) {
    const mission = await prisma.mission.create({ data: m });
    createdMissions.push(mission);
  }

  // Add João to first mission as participant
  await prisma.missionParticipant.upsert({
    where: { missionId_userId: { missionId: createdMissions[0].id, userId: joao.id } },
    update: {},
    create: { missionId: createdMissions[0].id, userId: joao.id, completed: true, rewardPaid: 2.00 },
  });

  console.log('✅ Missões criadas');

  // ─── Price Alerts ─────────────────────────────────────────────────────
  const alertsData = [
    { registrationId: createdRegs[1].id, productName: 'Ovos Brancos C30', price: 18.50, avgPrice: 16.90, percentAbove: 9.5, storeName: 'Atacadão', neighborhood: 'Jardim Camburi', city: 'Vitória', reportedByName: 'João Silva', shares: 47, confirmedCount: 12 },
    { registrationId: createdRegs[5].id, productName: 'Frango Inteiro kg', price: 18.90, avgPrice: 11.90, percentAbove: 58.8, storeName: 'Mini Mercado Expresso', neighborhood: 'Bento Ferreira', city: 'Vitória', reportedByName: 'Ana Costa', shares: 124, confirmedCount: 8 },
    { registrationId: createdRegs[6].id, productName: 'Leite Integral 1L', price: 9.90, avgPrice: 4.75, percentAbove: 108.4, storeName: 'Conveniência do Aeroporto', neighborhood: 'Goiabeiras', city: 'Vitória', reportedByName: 'Carlos Oliveira', shares: 289, confirmedCount: 23 },
  ];
  for (const a of alertsData) {
    await prisma.priceAlert.create({ data: a }).catch(() => {});
  }

  console.log('✅ Alertas de preço criados');

  // ─── Local Offers ──────────────────────────────────────────────────────
  const offersData = [
    { ownerId: joao.id, storeName: 'Padaria Pão Quente', storeCategory: 'Padaria', storeAddress: 'Rua do Pão, 123', neighborhood: 'Jardim Camburi', city: 'Vitória', productName: 'Pão Francês', originalPrice: 0.50, offerPrice: 0.35, discountPercent: 30, description: 'Pão fresquinho saindo do forno! Promoção válida das 17h às 19h.', validUntil: new Date('2026-03-31'), views: 342, checkIns: 87 },
    { ownerId: maria.id, storeName: 'Açougue do Tonho', storeCategory: 'Carnes', storeAddress: 'Av. Principal, 456', neighborhood: 'Jardim Camburi', city: 'Vitória', productName: 'Picanha Angus kg', originalPrice: 89.90, offerPrice: 69.90, discountPercent: 22, description: 'Picanha Angus selecionada. Estoque limitado!', validUntil: new Date('2026-04-25'), views: 891, checkIns: 156 },
    { ownerId: ana.id, storeName: 'Hortifrúti da Família', storeCategory: 'Hortifrúti', storeAddress: 'Rua Verde, 78', neighborhood: 'Jardim Camburi', city: 'Vitória', productName: 'Manga Palmer kg', originalPrice: 8.90, offerPrice: 4.99, discountPercent: 44, description: 'Manga madura e doce! Leve 2kg e ganhe desconto extra.', validUntil: new Date('2026-04-10'), views: 567, checkIns: 203 },
  ];
  for (const o of offersData) {
    await prisma.localOffer.create({ data: o }).catch(() => {});
  }

  console.log('✅ Ofertas locais criadas');

  // ─── Wallet Transactions for João ──────────────────────────────────────
  const txs = [
    { userId: joao.id, type: 'earn_registration', amount: 0.10, description: 'Registro confirmado: Arroz Agulhinha 5kg', reference: createdRegs[0].id },
    { userId: joao.id, type: 'earn_network', amount: 0.06, description: 'Bônus de rede: Maria Santos (Leite Integral)', reference: createdRegs[2].id },
    { userId: joao.id, type: 'earn_registration', amount: 0.10, description: 'Registro confirmado: Ovos Brancos C30', reference: createdRegs[1].id },
    { userId: joao.id, type: 'earn_mission', amount: 2.00, description: 'Missão concluída: Mapeamento Feijão Kicaldo', reference: createdMissions[0].id },
    { userId: joao.id, type: 'withdraw', amount: -10.00, description: 'Saque via Pix — joao@zei.app' },
  ];

  for (const tx of txs) {
    await prisma.transaction.create({ data: tx });
  }

  console.log('✅ Transações criadas');
  console.log('\n🚀 Seed completo!');
  console.log('\nContas de demo:');
  console.log('  joao@zei.app / senha123 (Guardião)');
  console.log('  maria@zei.app / senha123 (Explorador)');
  console.log('  carlos@zei.app / senha123 (Explorador)');
  console.log('  ana@zei.app / senha123 (Explorador)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

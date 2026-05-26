import { PrismaClient, AdminRole, KycStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed loan products
  const products = await Promise.all([
    prisma.loanProduct.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Starter Loan',
        minAmount: 5000,
        maxAmount: 50000,
        interestRate: 0.15,
        maxWeeks: 12,
        penaltyType: 'FLAT',
        penaltyAmount: 50,
        isActive: true,
      },
    }),
    prisma.loanProduct.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Growth Loan',
        minAmount: 50001,
        maxAmount: 500000,
        interestRate: 0.12,
        maxWeeks: 24,
        penaltyType: 'PERCENTAGE',
        penaltyPercentage: 0.02,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} loan products`);

  // Seed super admin
  const passwordHash = await argon2.hash('Admin@OYA2025!', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const superAdmin = await prisma.admin.upsert({
    where: { email: 'admin@oyamicrocredit.co.ke' },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: 'admin@oyamicrocredit.co.ke',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Created super admin: ${superAdmin.email}`);

  // Seed app version config
  await prisma.appVersionConfig.upsert({
    where: { platform: 'android' },
    update: {},
    create: {
      platform: 'android',
      minimumVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdateBelow: '1.0.0',
      updateMessage: 'Please update to the latest version.',
    },
  });

  await prisma.appVersionConfig.upsert({
    where: { platform: 'ios' },
    update: {},
    create: {
      platform: 'ios',
      minimumVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdateBelow: '1.0.0',
      updateMessage: 'Please update to the latest version.',
    },
  });

  console.log('✅ Created app version configs');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

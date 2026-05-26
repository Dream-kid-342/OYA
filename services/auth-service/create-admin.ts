import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Hashing password...');
  const passwordHash = await argon2.hash('12345678');
  
  console.log('Upserting admin user...');
  const admin = await prisma.admin.upsert({
    where: { email: 'oya@gmail.com' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      fullName: 'Oya Admin',
      email: 'oya@gmail.com',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ Admin created/updated successfully:', admin.email);
}

main()
  .catch((e) => {
    console.error('Failed to create admin:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

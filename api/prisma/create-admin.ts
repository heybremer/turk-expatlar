import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateRandomPassword(): string {
  return crypto.randomBytes(18).toString('base64url');
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    console.error(
      'ADMIN_EMAIL ortam değişkeni gerekli. Kullanım: ADMIN_EMAIL=... ADMIN_PASSWORD=... npx ts-node prisma/create-admin.ts',
    );
    process.exit(1);
  }
  // Şifre verilmezse rastgele, güçlü bir şifre üretilir ve sadece bu çalıştırmada ekrana yazdırılır.
  const password = process.env.ADMIN_PASSWORD || generateRandomPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const berlin = await prisma.federalState.findFirst({
    where: { slug: 'berlin' },
  });
  const berlinCity = berlin
    ? await prisma.city.findFirst({
        where: { stateId: berlin.id, slug: 'berlin' },
      })
    : null;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
      emailVerified: true,
      deletedAt: null,
      status: 'ACTIVE',
    },
    create: {
      email,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
      gdprConsentAt: new Date(),
      profile: {
        create: {
          displayName: 'Breme Admin',
          stateId: berlin?.id,
          cityId: berlinCity?.id,
          languages: ['Türkçe', 'Almanca'],
          trustScore: 100,
        },
      },
    },
    include: { profile: true },
  });

  console.log('Admin hesabı hazır:');
  console.log('  E-posta:', email);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      '  Şifre:  ',
      password,
      '(rastgele üretildi — şimdi kaydedin, tekrar gösterilmeyecek)',
    );
  } else {
    console.log('  Şifre:   (ADMIN_PASSWORD ortam değişkeninden alındı)');
  }
  console.log('  Rol:    ', user.role);
  console.log('  Panel:  http://localhost:3200/admin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

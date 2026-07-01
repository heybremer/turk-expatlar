import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'breme.admin@turkexpatlar.de';
  const password = 'Admin2026!';
  const passwordHash = await bcrypt.hash(password, 10);

  const berlin = await prisma.federalState.findFirst({ where: { slug: 'berlin' } });
  const berlinCity = berlin
    ? await prisma.city.findFirst({ where: { stateId: berlin.id, slug: 'berlin' } })
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
  console.log('  Şifre:  ', password);
  console.log('  Rol:    ', user.role);
  console.log('  Panel:  http://localhost:3200/admin');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

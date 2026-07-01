import { PrismaService } from '../prisma/prisma.service';

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return code;
}

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export async function createUniqueReferralCode(
  prisma: PrismaService,
): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Referans kodu oluşturulamadı');
}

import { existsSync } from 'fs';
import { join } from 'path';

// MIME -> güvenli dosya uzantısı eşlemesi. Uzantı istemcinin gönderdiği
// dosya adından DEĞİL, doğrulanan MIME türünden türetilir (XSS/HTML yükleme koruması).
export const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'audio/m4a': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/aac': '.aac',
  'audio/webm': '.webm',
};
export const ALLOWED_MIME = Object.keys(MIME_EXT);
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm',
};

const AUDIO_EXTS = new Set(['.m4a', '.mp3', '.wav', '.aac', '.webm']);
const IMAGE_EXTS = new Set(['.jpg', '.png', '.gif', '.webp']);

export type ChatAttachment = {
  url: string;
  name: string;
  size: number;
  type: string;
  mime: string;
};

/** URL origin'i bu API'nin dosya servis ettiği adreslerden biri mi? */
function isTrustedUploadOrigin(origin: string, requestBase?: string): boolean {
  const trusted = new Set<string>();
  for (const candidate of [requestBase, process.env.API_URL]) {
    if (!candidate) continue;
    try {
      trusted.add(new URL(candidate).origin);
    } catch {
      // geçersiz base yok sayılır
    }
  }
  const port = process.env.PORT ?? 3201;
  trusted.add(`http://localhost:${port}`);
  trusted.add(`http://127.0.0.1:${port}`);
  return trusted.has(origin);
}

/**
 * Ek URL'si güvenilmeyen bir origin içeriyorsa bilinen API adresinden
 * yeniden kurulur. Upload endpoint'i URL'yi istek host'undan ürettiği için
 * öncelik aynı kaynaktadır (requestBase), sonra API_URL, sonra localhost.
 */
function rebuildUploadUrl(filename: string, requestBase?: string): string {
  const base =
    requestBase ??
    process.env.API_URL ??
    `http://localhost:${process.env.PORT ?? 3201}`;
  return `${base.replace(/\/$/, '')}/uploads/chat/${filename}`;
}

/**
 * İstemciden gelen ek listesini doğrular. Yalnızca bu sunucuya gerçekten
 * yüklenmiş dosyalara izin verilir; URL, tür ve MIME alanları istemcinin
 * gönderdiği değerlerden değil, diskteki dosyadan türetilir. Böylece harici
 * URL'lerin (takip pikseli vb.) diğer kullanıcıların tarayıcısında
 * render edilmesi engellenir.
 */
export function sanitizeAttachments(
  raw: unknown,
  requestBase?: string,
): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];

  const result: ChatAttachment[] = [];
  for (const item of raw.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)) {
    if (!item || typeof item !== 'object') continue;
    const { url, name, size } = item as Record<string, unknown>;
    if (typeof url !== 'string') continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      continue;
    }
    const pathname = parsedUrl.pathname;
    if (!pathname.startsWith('/uploads/chat/')) continue;

    const filename = pathname.slice('/uploads/chat/'.length);
    // Yalnızca upload endpoint'inin ürettiği biçim: <timestamp>-<rastgele><.uzantı>
    if (!/^[A-Za-z0-9-]+\.[A-Za-z0-9]+$/.test(filename)) continue;

    const dotIdx = filename.lastIndexOf('.');
    const ext = filename.slice(dotIdx).toLowerCase();
    const mime = EXT_TO_MIME[ext];
    if (!mime) continue;

    // Dosya gerçekten bu sunucuda mevcut olmalı
    if (!existsSync(join(process.cwd(), 'uploads', 'chat', filename))) {
      continue;
    }

    result.push({
      // Güvenilir origin korunur (dev/prod host farkları), aksi halde URL
      // bilinen API adresinden yeniden kurulur
      url: isTrustedUploadOrigin(parsedUrl.origin, requestBase)
        ? `${parsedUrl.origin}/uploads/chat/${filename}`
        : rebuildUploadUrl(filename, requestBase),
      name:
        typeof name === 'string' && name.trim()
          ? name.trim().slice(0, 200)
          : filename,
      size:
        typeof size === 'number' && Number.isFinite(size) && size >= 0
          ? Math.min(size, MAX_UPLOAD_SIZE)
          : 0,
      type: IMAGE_EXTS.has(ext)
        ? 'image'
        : AUDIO_EXTS.has(ext)
          ? 'audio'
          : 'file',
      mime,
    });
  }
  return result;
}

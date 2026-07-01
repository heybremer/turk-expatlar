import { Injectable } from '@nestjs/common';

/**
 * Genel içerik moderasyon servisi — forum + yorum + DM için.
 * Kaba küfür listesi dışarıdan da (admin panel / DB) beslenebilir.
 */
@Injectable()
export class ContentModerationService {
  private profanityPatterns: RegExp[] = this.buildDefaultPatterns();

  private buildDefaultPatterns(): RegExp[] {
    // Temel Türkçe küfür desenleri — karakterler l33t-speak varyantlarını kapsar
    const words = [
      'orospu', 'or0spu', 'amk', 'amına', 'am[ıi]na', 'piç', 'pi[cç]', 'sik',
      's[ıi]k', 'göt', 'g[o0]t', 'oç', '[o0][cç]', 'yarrak', 'yarak',
      'oğlum', 'ibne', 'ibne', 'pezevenk', 'kahpe', 'fahişe', 'kaltak',
    ];
    return words.map((w) => new RegExp(`\\b${w}`, 'i'));
  }

  /**
   * Metindeki küfür var mı? Bulunursa redacted versiyon döndürür.
   */
  check(text: string): { clean: boolean; redacted: string } {
    let redacted = text;
    let clean = true;

    for (const re of this.profanityPatterns) {
      if (re.test(redacted)) {
        clean = false;
        redacted = redacted.replace(re, (m) => '*'.repeat(m.length));
      }
    }

    return { clean, redacted };
  }

  /**
   * Spam göstergesi — kısa aralıkta aynı metni tekrar eden, büyük harfli, vs.
   */
  isSpam(text: string): boolean {
    if (text.length < 3) return false;

    // ALL CAPS (5+ karakter)
    const upperRatio = (text.match(/[A-Z]/g) ?? []).length / text.length;
    if (text.length >= 8 && upperRatio > 0.7) return true;

    // Aynı karakter tekrarı (aaaaaaa)
    if (/(.)\1{5,}/.test(text)) return true;

    // Çok fazla URL
    const urls = text.match(/https?:\/\//g) ?? [];
    if (urls.length >= 3) return true;

    return false;
  }

  /**
   * Küfür içeren metni maskele (silme değil — içerik görünür kalır)
   */
  sanitize(text: string): string {
    return this.check(text).redacted;
  }
}

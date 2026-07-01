import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.tokens';

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Değeri önbellekten al. Redis kapalıysa null döner. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  /** Değeri önbelleğe yaz. ttlSeconds = 0 ise sonsuz. */
  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch {
      // Redis yazma hatası kritik değil
    }
  }

  /** Belirli bir prefix ile başlayan tüm anahtarları sil. */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) await this.redis.del(...keys);
    } catch {
      // sessizce geç
    }
  }

  /**
   * Cache-aside yardımcısı: önce önbellekten bakar, yoksa factory çağırıp yazar.
   * @param key Cache anahtarı
   * @param factory Veriyi üretecek async fonksiyon
   * @param ttlSeconds Önbellek süresi (saniye)
   */
  async wrap<T>(key: string, factory: () => Promise<T>, ttlSeconds = 60): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

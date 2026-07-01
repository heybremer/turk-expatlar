import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { REDIS_CLIENT } from './redis.tokens';

export { REDIS_CLIENT };

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
        });
        client.on('error', (err: Error) => {
          // Redis bağlanamasa bile uygulama çalışmaya devam eder
          if (!err.message.includes('ECONNREFUSED')) {
            console.error('[Redis] Error:', err.message);
          }
        });
        client.connect().catch(() => {
          console.warn('[Redis] Bağlantı kurulamadı — cache devre dışı');
        });
        return client;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}

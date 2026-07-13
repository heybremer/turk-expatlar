// Bu dosya, Sentry'nin otomatik enstrümantasyonunun çalışması için
// diğer tüm modüllerden ÖNCE import edilmelidir (bkz. main.ts ilk satırı).
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,
    beforeSend(event) {
      // Hassas verileri temizle
      if (event.request?.headers) {
        delete event.request.headers['cookie'];
        delete event.request.headers['authorization'];
      }
      return event;
    },
  });
}

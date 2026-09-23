# Çalışma notu — yayına hazırlık

## Yapıldı (commit edilmedi)
- API: `common/sanitize-user.util.ts` — auth yanıtı, `req.user`, `/users/me` artık passwordHash/twoFactorSecret/googleId/expoPushToken döndürmüyor.
- API: Hesap silme kimlik bilgilerini, push/token kayıtlarını temizliyor; Google girişi silinmiş/banlı hesaba token vermiyor.
- API: Promo kod atomik (limit yarışı, çift kullanım → 409); checkout aktif üyeyken 409; Stripe webhook `paid` + tutar/para birimi doğrulaması, idempotent süre, yapılandırma yoksa 503.
- Mobil: `app/hesap.tsx` (engellenenler + hesap silme), profil menüsüne eklendi; çıkışta React Query önbelleği temizleniyor; üyelik ekranı uygulamaya dönünce yenileniyor; `typecheck`/`doctor` script'leri.

## Doğrulama
- api: tsc, build, jest (60/60), eslint (değişen dosyalar) ✓
- web: tsc ✓ · mobile: tsc ✓, expo-doctor 18/18 ✓

- Web: `/profil/hesap` (engellenenler + hesap silme).
- Google + 2FA: callback 5 dk'lık bilet verir (`#twofa=` / mobilde `twofa`), `POST /auth/2fa/google` kodla token'a çevirir.

## Açık riskler / sıradaki
- iOS: Dijital üyeliğin Stripe ile satılması App Store 3.1.1'e takılabilir (IAP veya iOS'ta satın almayı gizleme kararı gerekli).
- Stripe webhook canlıda test edilmedi (gizli anahtar gerekir).
- Mobilde otomatik test yok.

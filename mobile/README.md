# Türk Expatlar — Native Mobil Uygulama

iOS ve Android için React Native (Expo) ile geliştirilmiş native mobil uygulama.

---

## Gereksinimler

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- iOS build için: Apple Developer hesabı ($99/yıl)
- Android build için: Google Play Console ($25 tek seferlik)

---

## Kurulum

```bash
cd mobile
npm install
```

---

## Geliştirme

### Expo Go ile hızlı test (fiziksel cihaz)
```bash
npx expo start
```
QR kodu telefonunuzdaki **Expo Go** uygulamasıyla tarayın.

### Android Emulator
```bash
npx expo start --android
```

### iOS Simulator (Mac gerekli)
```bash
npx expo start --ios
```

---

## EAS Build — Kurulum

### 1. EAS hesabı bağla
```bash
eas login
eas init --id YOUR_PROJECT_ID
```
`app.json` içindeki `extra.eas.projectId` değerini güncelleyin.

### 2. Android APK (preview testi için)
```bash
eas build --platform android --profile preview
```

### 3. iOS IPA (TestFlight için)
```bash
eas build --platform ios --profile production
```

### 4. Her iki platform aynı anda
```bash
eas build --platform all --profile production
```

---

## App Store / Play Store Yayınlama

### Google Play Store
```bash
# google-services.json dosyasını ekleyin
eas submit --platform android --profile production
```

### Apple App Store
```bash
# eas.json içinde appleId, ascAppId, appleTeamId doldurun
eas submit --platform ios --profile production
```

---

## OTA Güncelleme (kodlama değişiklikleri için)

Native kod değişmeyen (JS/TS) güncellemeler için:
```bash
eas update --branch production --message "Güncelleme açıklaması"
```

---

## Ortam Değişkenleri

`mobile/lib/api.ts` içindeki `API_URL` üretim sunucusuna işaret eder:
```
https://api.turkexpatlar.de/api
```

Geliştirme sırasında yerel API kullanmak için `api.ts` dosyasındaki URL'yi değiştirin:
```typescript
export const API_URL = "http://192.168.x.x:3201/api"; // yerel IP
```

---

## Proje Yapısı

```
mobile/
├── app/                    # Expo Router ekranları
│   ├── (auth)/             # Giriş / Kayıt
│   ├── (tabs)/             # Ana tab ekranları
│   │   ├── akis.tsx
│   │   ├── forum/
│   │   ├── sohbet/
│   │   ├── etkinlikler/
│   │   └── profil/
│   ├── rehber/             # İşletme Rehberi
│   ├── isler/              # İş İlanları
│   └── uygulamalar/        # Mini Uygulamalar
├── components/ui/          # Paylaşılan UI bileşenleri
├── lib/                    # API, Auth, Socket, Utils
├── hooks/                  # usePushNotifications
├── assets/                 # İkon, splash
├── app.json                # Expo konfigürasyon
└── eas.json                # Build profilleri
```

---

## Push Bildirimleri

Uygulama açıldığında otomatik olarak Expo Push Token alınır ve backend'e kaydedilir (`/api/notifications/subscribe`). Backend gönderilen bildirimleri Expo Push Service aracılığıyla iletir.

---

## Önemli Notlar

- `assets/` klasöründe `icon.png` (1024×1024), `splash.png` (1242×2436), `adaptive-icon.png` (1024×1024), `notification-icon.png` (96×96) dosyaları eklenmeden build alınamaz.
- `eas.json` içindeki `appleId`, `ascAppId`, `appleTeamId` değerleri gerçek değerlerle doldurulmalıdır.

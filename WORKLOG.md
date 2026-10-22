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

## Mobil: WebView araçları native oldu
- `uygulamalar/web.tsx` ve `react-native-webview` kaldırıldı. Native ekranlar: yeni-gelen (kaydedilen kontrol listesi), konsolosluklar, resmi-kurumlar, gezgin-rehberi, yolculuk-telsiz, `(tabs)/sohbet/kurallar`.
- Telsiz: `/telsiz` socket; gönderim `ptt_audio` (AAC m4a), alım `voice_chunk` PCM → WAV kuyruğu + `voice` klipleri (`lib/telsiz-audio.ts`). Web artık `voice` kliplerini de çalıyor.
- Ortak UI kiti `components/ui/kit.tsx`; `slate-*`/`bg-white` sınıfları token'lara çevrildi; hoşgeldin ekranında posta kodu alanı.
- Dogrulama: mobile tsc V, expo-doctor 18/18 V, web tsc V + eslint V. Telsiz cihazda test edilmedi.

## Mobil: tasarım sistemi v2 (tüm sayfalar)
- Tek ikon seti: lucide (Ionicons tamamen kaldırıldı). Renkler yalnızca token (slate/gray/hex yok).
- Yeni/yenilenen UI: Button (icon, soft), TextField, Card (onPress), Badge, EmptyState/ErrorState (lucide), SkeletonList, SearchBar, Pagination, BackButton, AppHeader/DetailHeader (children), kit: SectionHeader, Segmented, IconTile, ListGroup/ListRow, HeaderButton, StatTile, MetaItem; `components/auth/AuthLayout.tsx`.
- Tüm ekranlar AppHeader (sekme kökleri) veya Screen/DetailHeader kullanıyor; akış ana sayfası, profil, forum, etkinlik, sohbet (bottom-sheet modallar), rehber, işler, seyahat, mini uygulamalar ve yan menü yeniden tasarlandı.
- Dogrulama: tsc V, expo-doctor 18/18 V, `expo export --platform android` V. Cihazda görsel test yapılmadı.

## Mobil: sohbet klavyesi, NavigationContainer hatası, sayfa denetimi
- Hata kökü: NativeWind v4'te `shadow-*`/`active:`/`focus:` vb. sınıfların render sonrası eklenip çıkarılması `printUpgradeWarning` → "Couldn't find a navigation context" fırlatıyor (Segmented, Pagination, NavigationMenu). Kural: bu sınıflar sabit kalmalı; dinamik olan yalnızca renk/opaklık veya `style`. Reanimated `Animated.View`'da `className` yok.
- Klavye: `react-native-keyboard-controller` (KeyboardProvider, KAV, KeyboardAwareScrollView); `hooks/useComposerInset`. Screen, AuthLayout, DmPasswordModal, forum detay taşındı.
- Sohbet (WhatsApp/Telegram tarzı): ters FlatList, kaydırarak yanıtla, yanıta tıklayınca mesaja git + vurgu, aşağı-in butonu + okunmamış sayısı, yazıyor balonu, taslaklar, + menü (galeri/kamera/süreli), düzenleme (15 dk), DM silme, yeniden bağlanma çubuğu, linkler.
- 5 alan denetimi (auth, profil, forum/etkinlik, sohbet, rehber/iş/seyahat/uygulamalar): API uyumsuzlukları düzeltildi; bildirim sayacı (API düz sayı döndürüyor) düzeltildi, sohbet sekmesi rozeti yalnızca DM.
- Doğrulama: tsc V, expo-doctor 18/18 V, android export V. Cihazda test edilmedi.
- Backend eksikleri: etkinlik düzenle/sil/ayrıl, işletme sahibi düzenle/sil, destek talebi listesi, `dm_updated` socket olayı, DM listesinde `muted`, profilde `city.slug`; açık DM için push bastırma; şifre sıfırlama/e-posta doğrulama universal link.
## API + Mobil: eksik uç noktalar (etkinlik/işletme/destek) ve push bastırma
- API: `PATCH/DELETE /events/:id` (düzenleyici), `DELETE /events/:id/attend` (katılımdan ayrıl); `PATCH/DELETE /businesses/:id` (sahip); `GET /support/mine` (kendi taleplerim).
- API: Açık DM'de push bildirimi bastırıldı (`roomPresence` ile alıcı odayı gerçekten açmışsa push atlanır; `join_room`/`leave_room` zaten doğru presence'ı tutuyor).
- Mobil: Etkinlik detayında düzenleyici için "Düzenle" (`yeni.tsx`'e `editId` ile PATCH akışı eklendi) ve "Sil"; katılımcı için "Katılımdan ayrıl". Rehber detayında işletme sahibi için "İşletmeyi sil". Destek sayfasına "Geçmiş taleplerim" listesi.
- Doğrulama: api tsc/build/eslint(değişen dosyalar)/jest 66/66 V · mobile tsc V.
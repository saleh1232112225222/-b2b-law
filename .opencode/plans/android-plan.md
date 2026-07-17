# خطة Android — B2B-LAW → تطبيق جوال

> **آخر تحديث:** 28 يونيو 2026  
> **المشرف:** المهندس  
> **الحالة:** ✅ اكتمل التحليل — جاهز للبدء  
> **المجلد المرتبط:** `G:\AndroidB2B\README.md`

---

## 📊 ملخص التحليل

| البند | الوضع |
|-------|-------|
| واجهات الجوال | ✅ **مكتملة** — 19 مكوناً + 11 composable |
| تبديل التخطيط (Mobile/Desktop) | ✅ **يعمل** — عبر `useMobileLayout()` |
| التوجيه (Hash-based) | ✅ **جيد** — لا يحتاج تعديلاً |
 | API السحابي | ✅ **يعمل** — Axios → Render |
| CSP في index.html | ❌ **يمنع Capacitor** — يجب إنشاء نسخة مخففة |
| Vite config للجوال | ❌ **غير موجود** — يجب إنشاؤه |
| Capacitor | ❌ **غير مثبت** — يجب تثبيته |
| Android platform | ❌ **غير موجودة** — يجب إضافتها |
| Keystore | ❌ **غير موجود** — يجب إنشاؤه |
| ProGuard | ❌ **غير مفعل** — APK سيكون كبيراً |
| Push Notifications | ❌ **غير جاهزة** — ستضاف لاحقاً |
| localStorage | ⚠️ **يعمل حالياً** — استبدال بـ Preferences لاحقاً |

---

## 📋 نقاط التفتيش (Checkpoints)

### ✅ CP1 — تهيئة Capacitor
**المخرجات:**
```
node_modules/ محدثة
capacitor.config.ts ← جديد
vite.config.capacitor.ts ← جديد
src/renderer/index.mobile.html ← جديد (CSP مخفف)
package.json ← معدّل (scripts + dependencies)
```

**الأوامر:**
```powershell
cd G:\w2w
npm install @capacitor/cli @capacitor/core @capacitor/android      @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
npx cap init B2B-LAW com.b2blaw.app --web-dir dist/mobile
npm run build:mobile
```

### ✅ CP2 — إضافة Android
**المخرجات:** `android/`  
**الأمر:** `npx cap add android && npx cap copy android && npx cap sync android`

### ✅ CP3 — APK Debug
**المخرجات:** `app/build/outputs/apk/debug/app-debug.apk`  
**الأمر:** `cd android && .\gradlew assembleDebug`

### ✅ CP4 — اختبار يدوي
**الهدف:** تثبيت وتجربة APK على جهاز حقيقي

### ✅ CP5 — Keystore + توقيع
**المخرجات:** `G:\AndroidB2B\release.keystore`  
**الأمر:** `keytool -genkey ...`

### ✅ CP6 — AAB للمتجر
**المخرجات:** `app/build/outputs/bundle/release/app-release.aab`  
**الأمر:** `cd android && .\gradlew bundleRelease`

### ✅ CP7 — Google Play Console
**المخرجات:** التطبيق مرفوع للمراجعة

---

## 📦 الإضافات المطلوبة (تثبت مرة واحدة)

```bash
npm install @capacitor/cli @capacitor/core @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
```

**اختياري للمرحلة 3:**
```bash
npm install @capacitor/preferences @capacitor/push-notifications @capacitor/camera @capacitor/filesystem @capacitor/share @capacitor/haptics @capacitor/app
```

---

## 🚨 العقبات الرئيسية والحلول

| العقبة | الحل |
|--------|------|
| CSP تمنع Capacitor | إنشاء `index.mobile.html` بدون CSP صارم |
| لا يوجد Vite config للجوال | إنشاء `vite.config.capacitor.ts` مع `root` و `outDir` مختلفين |
| `__IS_WEB__` = true | مناسبة — لا تغيير (Capacitor WebView) |
| Android Studio غير مثبت | تنزيل وتثبيت |

---

## 📁 هيكل الملفات النهائي

```
G:\w2w\
├── capacitor.config.ts           ← جديد
├── vite.config.capacitor.ts      ← جديد
├── src/renderer/
│   ├── index.html                ← موجود (للويب)
│   ├── index.mobile.html         ← جديد (لـ Capacitor)
│   └── src/ (موجود — لا تغيير)
│
├── android/                      ← جديد (منصة Android)
│   ├── key.properties            ← جديد
│   └── app/build.gradle          ← معدّل
│
├── dist/mobile/                  ← جديد (بناء الجوال)
│
G:\AndroidB2B\
├── README.md                     ← موجود
├── release.keystore              ← جديد
├── key-info.txt                  ← جديد
├── release.aab                   ← جديد
└── screenshots/                  ← جديد
```

---

## 🐳 Docker Desktop

**غير ضروري** لبناء APK. يُستخدم فقط إذا احتجت تشغيل الباك إند محلياً:
```bash
docker-compose up -d db backend
```

---

## ♻️ استئناف العمل بعد انقطاع

- **انقطع النت بعد `npm install`** → تابع طبيعي (كل الحزم في `node_modules/`)
- **انقطع أثناء `npm install`** → `npm install` مرة أخرى (يدعم الاستئناف)
- **انقطع اشتراك Render** → استخدم Docker Desktop محلياً
- **انقطع اشتراك Google Play** → التطبيق يبقى في المتجر، فقط التحديثات تتوقف
- **فقدت الـ keystore** → لا يمكن تحديث التطبيق — **احتفظ بنسختين**

---

## 🎯 الأمر الوحيد للبدء

```powershell
cd G:\w2w && npm install @capacitor/cli @capacitor/core @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
```

> انتهت الخطة. جاهز للبدء بأمرك.

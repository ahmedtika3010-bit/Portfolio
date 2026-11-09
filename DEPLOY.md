# النشر على Vercel — موقعين من نفس الكود

## الوضع الحالي (اتنشروا من الـ CLI داخل فريق `golden-scent`)

| | موقع أحمد | موقع شيماء |
| --- | --- | --- |
| المشروع | `ahmed-mohamed-fullstack` | `shaimaa-morsy-portfolio` |
| الرابط | https://ahmed-mohamed-fullstack.vercel.app | https://shaimaa-morsy-portfolio.vercel.app |
| قاعدة البيانات | Upstash Redis من الـ Marketplace (`ahmed-portfolio-redis`) | Redis من حساب Upstash منفصل (متغيّرات `UPSTASH_REDIS_REST_*`) |
| الصور | Blob عام `ahmed-portfolio-blob` | Blob عام `shaimaa-portfolio-blob` |

### تحديث الكود لأي موقع
الـ CLI بيفتكر مشروع واحد بس في الفولدر، فاربط قبل كل نشر:

```powershell
cd D:\work\Portfolio

# موقع أحمد
vercel link --yes --project ahmed-mohamed-fullstack --scope golden-scent
vercel deploy --prod --yes --scope golden-scent

# موقع شيماء
vercel link --yes --project shaimaa-morsy-portfolio --scope golden-scent
vercel deploy --prod --yes --scope golden-scent
```

> بعد كل `vercel link` الـ CLI بيكتب ملف `.env.local` وبيضيف `.env*` في `.gitignore` (ده بيخلّي `.env.example` يتتجاهل). امسح الملف وشيل السطر ده لو ظهر.

---

الفكرة: **repo واحد** يتعمل منه **مشروعين** على Vercel، وكل مشروع ليه:

| | الموقع الأول | الموقع التاني |
| --- | --- | --- |
| الاسم (`OWNER_NAME`) | Ahmed Mohamed | Shaimaa Morsy |
| باسورد الأدمن (`ADMIN_PASSWORD`) | باسورد ليك | باسورد **مختلف** ليها |
| قاعدة البيانات | Upstash Redis بتاعتك | Upstash Redis **تانية** |
| تخزين الصور | Vercel Blob بتاعك | Vercel Blob **تاني** |

> الأهم: **ما تربطش نفس الـ Redis أو الـ Blob بالمشروعين**. لو ربطتهم، الموقعين هيشوفوا نفس البيانات.

---

## 0) ارفع الكود على GitHub (مرة واحدة)

```powershell
cd D:\work\Portfolio
git init
git add .
git commit -m "Portfolio"
```

اعمل repo فاضي على GitHub (خليه **Private**)، وبعدين:

```powershell
git branch -M main
git remote add origin https://github.com/<اسم-حسابك>/portfolio.git
git push -u origin main
```

الـ `.gitignore` بيمنع رفع `node_modules` و `.env` و `data/` (فيها الباسورد المشفّر وبيانات الاختبار).

---

## 1) الموقع الأول — Ahmed Mohamed

1. ادخل https://vercel.com/new واعمل **Import** للـ repo. سمّي المشروع مثلًا `ahmed-mohamed-portfolio`.
2. **Framework Preset** هيتعرف لوحده **Express**. سيب Build Command و Output Directory فاضيين.
3. افتح **Environment Variables** وضيف (للـ Production):
   - `OWNER_NAME` = `Ahmed Mohamed`
   - `ADMIN_PASSWORD` = باسورد قوي (12 حرف على الأقل). تقدر تولّده بـ:
     ```powershell
     node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
     ```
   - (اختياري) `OWNER_ROLE` لو المسمى غير *Full Stack Developer*.
4. اضغط **Deploy**. هتطلع صفحة "Almost there / No database is connected" — ده طبيعي لحد ما نربط قاعدة البيانات.
5. من المشروع: **Storage** ← **Create Database** ← **Upstash Redis** (الخطة Free) ← **Connect to Project**.
   بيضيف متغيّرات `KV_REST_API_URL` و `KV_REST_API_TOKEN` تلقائي.
6. **Storage** ← **Create** ← **Blob** ← اختار **Public** ← **Connect to Project**.
   > لازم **Public**. نوع الـ store ما ينفعش يتغيّر بعد الإنشاء. لو عملته Private بالغلط امسحه واعمل واحد جديد.
7. **Deployments** ← النقط التلاتة جنب آخر deployment ← **Redeploy**. (المتغيّرات الجديدة بتشتغل في deployment جديد بس.)
8. افتح `https://<اسم-المشروع>.vercel.app/admin`:
   - username: `admin`، والباسورد اللي حطيته.
   - **Settings ← Account**: غيّر الباسورد.
   - عدّل **Profile** وامسح/بدّل المحتوى التجريبي (المشاريع والشهادات والخبرات).
9. (اختياري بعد أول دخول) امسح `ADMIN_PASSWORD` من الـ Environment Variables عشان ما يفضلش مكتوب هناك.

---

## 2) الموقع التاني — Shaimaa Morsy

نفس الخطوات بالظبط، بس:

- **New Project تاني** من نفس الـ repo، باسم مختلف (`shaimaa-morsy-portfolio`).
- `OWNER_NAME` = `Shaimaa Morsy`، و`OWNER_ROLE` لو مسماها مختلف.
- `ADMIN_PASSWORD` = باسورد **مختلف**.
- اعمل **Upstash Redis جديد** و **Blob جديد** (Public) لها هي، وربطهم بالمشروع التاني فقط.

> الأفضل لو شيماء عايزة تملك موقعها فعلًا (الدومين والبيانات): تعمل حساب Vercel خاص بيها وتستورد نفس الـ repo (أو fork منه). وقتها كل حاجة في حسابها.

---

## بعد النشر

- **تحديث الكود:** أي `git push` على `main` بيحدّث المشروعين تلقائي. البيانات والصور **ما بتتأثرش**.
- **دومين خاص:** المشروع ← **Settings ← Domains**.
- **الصور:** أقصى حجم 4MB. الصور الأكبر (PNG/JPG/WEBP) بتتصغّر تلقائي في المتصفح قبل الرفع.
- **الـ SEO / المشاركة:** الموقع بيستخدم دومين الـ production تلقائي. لو ربطت دومين خاص ضيف `SITE_URL`.
- **نسخة احتياطية:** الخطة المجانية في Upstash ما فيهاش نسخ احتياطي تلقائي، فلو في بيانات مهمة خد نسخة من الـ Data Browser كل فترة.

## حل المشاكل

| المشكلة | الحل |
| --- | --- |
| صفحة "No database is connected" | اربط Upstash Redis (خطوة 5) ثم **Redeploy** |
| صفحة "Set the ADMIN_PASSWORD…" | ضيف `ADMIN_PASSWORD` ثم **Redeploy** |
| رفع الصور بيرجّع "Uploads need a Blob store…" أو "…must be PUBLIC" | اعمل Blob **Public** واربطه (خطوة 6) ثم **Redeploy** |
| نسيت باسورد الأدمن | في Upstash ← Data Browser امسح المفتاح `portfolio:auth`، وتأكد إن `ADMIN_PASSWORD` موجود، ثم **Redeploy**. هيتعمل حساب جديد بالباسورد ده (وكل الجلسات القديمة بتتقفل) |
| الموقعين شايفين نفس البيانات | معناه إنك ربطت نفس الـ Redis بالمشروعين. افصله من التاني واعمل واحد جديد |

## بديل: النشر من الـ CLI (من غير GitHub)

```powershell
npm i -g vercel
vercel login
vercel --prod                       # المشروع الأول (سمّيه ahmed-mohamed-portfolio)
vercel env add OWNER_NAME production
vercel env add ADMIN_PASSWORD production
# اربط Redis و Blob من الـ dashboard (خطوة 5 و 6) ثم:
vercel --prod

# للموقع التاني: افصل الربط وابدأ من جديد
Remove-Item -Recurse -Force .vercel
vercel --prod                       # سمّيه shaimaa-morsy-portfolio، وكرر نفس الخطوات
```

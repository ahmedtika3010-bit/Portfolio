# Portfolio + Admin Dashboard

موقع بورتفوليو لـ Full Stack Developer، ومعاه لوحة تحكم (`/admin`) تضيف وتعدّل منها أي حاجة من غير ما تلمس الكود.

## التشغيل

```bash
npm install
npm start          # أو: npm run dev  (بيعمل restart تلقائي لما تعدّل في السيرفر)
```

- الموقع: <http://localhost:3000>
- لوحة التحكم: <http://localhost:3000/admin>

**أول مرة** تشغّل فيها السيرفر بيتعمل حساب الأدمن وبيطبع في الـ terminal:

```
username: admin
password: xxxxxxxxxxxx   (generated - shown only once, save it!)
```

احفظ الباسورد، وغيّره بعد كده من **Admin ← Settings ← Account**.
لو عايز تحدد باسورد بنفسك قبل أول تشغيل: انسخ `.env.example` لـ `.env` واكتب `ADMIN_PASSWORD`.

> المحتوى اللي ظاهر في الأول (Alex Carter + مشاريع تجريبية) مجرد **بيانات تجريبية** — بدّلها من لوحة التحكم.

## تقدر تعمل إيه من لوحة التحكم

| القسم | بتتحكم في إيه |
| --- | --- |
| **Dashboard** | أرقام سريعة (مشاريع، رسائل، زيارات) + قائمة بحاجات ناقصة في البورتفوليو |
| **Profile** | الاسم، المسمى الوظيفي، الجملة الرئيسية، الكلمات المتحركة، الصورة، نبذة عنك، الإيميل، الـ CV (PDF)، حالة "متاح للشغل" |
| **Projects** | إضافة/تعديل/حذف مشاريع: صورة غلاف (رفع)، Tech stack، روابط، Featured، والترتيب بالأسهم |
| **Skills** | المهارات ونسبة الإتقان، بتتجمّع تلقائي حسب الـ Category |
| **Services** | الخدمات اللي بتقدمها (مع اختيار أيقونة) |
| **Experience** | الخبرات والتعليم (Timeline) |
| **Certificates** | الشهادات والكورسات والـ bootcamps والجوايز: صورة الشهادة (رفع)، الجهة المانحة، التاريخ، رقم الـ Credential، **رابط التحقق (Verify)**، والمهارات. الزائر بيفلتر بالنوع ويفتح أي شهادة كبيرة |
| **Stats** | الأرقام المتحركة في قسم About |
| **Social links** | GitHub, LinkedIn, X, Behance, WhatsApp… |
| **Messages** | رسائل فورم "Contact" — مع Reply بالإيميل، وعلامة مقروء/غير مقروء |
| **Settings** | ألوان الموقع (Gradient) بمعاينة فورية، الثيم الافتراضي، الـ SEO، إظهار/إخفاء أي قسم، وتغيير الباسورد |

لتغيير **ألوان الموقع**: Settings ← Accent colour (start / end). الموقع كله واللوحة بيتلوّنوا بنفسهم.

## هيكل المشروع

```
server.js            نقطة التشغيل (Express + الحماية) — بيشتغل محلي وعلى Vercel
src/
  schema.js          تعريف كل الحقول + التحقق منها (والفورمات في الأدمن بتتبني منه تلقائي)
  db.js              طبقة التخزين: ملفات JSON محليًا، أو Upstash Redis على Vercel
  files.js           رفع الملفات: فولدر uploads محليًا، أو Vercel Blob على Vercel
  store.js           قراءة/كتابة المحتوى والرسائل
  auth.js            تسجيل الدخول (bcrypt + JWT في cookie)
  render.js          بيحقن المحتوى في views/index.html (SEO + أسرع ظهور)
  routes/            public.js (contact) و admin.js (الـ API المحمي)
views/               قوالب HTML اللي السيرفر بيقدّمها (index.html, admin.html)
public/              ملفات ثابتة بتتقدّم من الـ CDN (css, js, favicon)
data/, uploads/      بيانات التشغيل المحلي فقط — بتتعمل تلقائي، ومش بتتحط على git
```

> **ليه `views/` مش `public/`؟** على Vercel كل حاجة في `public/` بتتقدّم مباشرة من الـ CDN من غير ما تعدّي على السيرفر، فالصفحة الرئيسية لازم تكون بره `public/` عشان المحتوى يتحقن فيها.

### التخزين: محلي vs Vercel

| | محليًا (`npm start`) | على Vercel |
| --- | --- | --- |
| البيانات | ملفات JSON في `data/` | Upstash Redis |
| الصور / الـ CV | فولدر `uploads/` | Vercel Blob (Public) |
| أقصى حجم رفع | 8MB | 4MB (حد Vercel) — والصور الأكبر بتتصغّر تلقائي |
| بيتبدّل | تلقائي حسب الـ environment variables (`KV_REST_API_URL`… للـ Redis و `BLOB_READ_WRITE_TOKEN` للـ Blob) | |

### إضافة حقل جديد
مثلًا عايز حقل "Client" في المشاريع: أضفه في `collections.projects.fields` جوه [src/schema.js](src/schema.js) — هيظهر في فورم الأدمن ويتحفظ تلقائي، وبعدها اعرضه في [public/js/app.js](public/js/app.js).

## الأمان (اللي متعمل)

- الباسورد متخزّن مشفّر (bcrypt)، والجلسة JWT في cookie بـ `HttpOnly` + `SameSite=Strict`.
- حد أقصى لمحاولات تسجيل الدخول الفاشلة (10 كل 15 دقيقة)، وحد لرسائل الـ Contact.
- كل الـ API بتاع الأدمن محتاج تسجيل دخول + header مخصوص (حماية CSRF).
- كل المدخلات بتتفحص في السيرفر (حقول معروفة بس، أطوال، روابط `http/https` بس).
- رفع الملفات: صور PNG/JPG/WEBP/GIF وPDF بس، بيتفحص محتوى الملف الحقيقي (مش الامتداد)، وحد 8MB.
- النصوص بتتعرض بـ `textContent` مش `innerHTML`، + Content-Security-Policy.

## النشر (Deploy)

### على Vercel (الأسهل)
الشرح خطوة بخطوة، **وإزاي تعمل موقعين من نفس الكود كل واحد بقاعدة بيانات مختلفة**، في [DEPLOY.md](DEPLOY.md).
الملخص: Import الـ repo ← حط `OWNER_NAME` و `ADMIN_PASSWORD` ← اربط **Upstash Redis** و **Blob (Public)** من تاب Storage ← Redeploy.

### على سيرفر عادي
أي استضافة بتشغّل Node.js (VPS، Railway، Render…):

```bash
NODE_ENV=production TRUST_PROXY=1 SITE_URL=https://your-domain.com npm start
```

- لازم HTTPS في الـ production (الـ cookie بتبقى `Secure`).
- فولدرات `data/` و `uploads/` لازم تكون على **disk دائم**، وإلا هتضيع البيانات عند كل deploy (استخدم `DATA_DIR` و `UPLOAD_DIR`).
- **خد نسخة احتياطية** من `data/` و `uploads/` بشكل دوري.
- ما تنساش تغيّر الباسورد الافتراضي.

كل الإعدادات الممكنة في [.env.example](.env.example).

# Servis Sity — Master Build Prompt (V2 — النسخة الكاملة)

نقطة الانطلاق والمرجع المستمر للمشروع.

---

## 1. الرؤية

منصة مغربية للخدمات والأعمال المحلية. أي شخص عندو Business، Service، Freelance، Shop، أو Company يقدر ينشئ Profile احترافي ويجيب زبائن. الهدف: **Google Business + LinkedIn + Marketplace فبلاصة وحدة**، مركزة على السوق المغربي.

**استراتيجية الإطلاق:** ماشي انتظار الزوار العاديين — التركيز الأول هو التوجه المباشر لأصحاب الأعمال والخدمات الموجودين فعلا وتسجيلهم يدويا/بالترويج المباشر، باش يتعمر الموقع بمحتوى حقيقي من البداية.

---

## 2. أنواع المستخدمين (4 أدوار)

### 2.1 Visitor (بلا حساب)
- يبحث، يشوف الخدمات والشركات والتقييمات
- يتواصل مباشرة عبر WhatsApp أو الهاتف (بلا تسجيل)

### 2.2 User (حساب عادي)
- يدير حسابه، يدير Favorites
- يكتب Reviews
- يبعث Report على أي نشاط مشبوه/مخالف
- يراسل أصحاب الخدمات (ميزة مرحلة لاحقة)

### 2.3 Business Owner (الزبون الحقيقي ديال المنصة)
- ينشئ Business، يعدل المعلومات، يزيد Services وGallery
- يحدد ساعات العمل
- يشوف الإحصائيات (Dashboard)
- يجدد الاشتراك
- يرفع وثائق التوثيق (Verification documents)

### 2.4 Admin
- يشوف ويتحكم فكلشي: Users, Businesses, Reports, Categories, Cities, Subscriptions, Analytics

---

## 3. Workflow ديال إضافة Business

```
Create Account
      ↓
Verify Email
      ↓
Create Business
      ↓
Fill Information
      ↓
Upload Logo + Cover
      ↓
Add Services
      ↓
Submit
      ↓
Pending Review  ← ما كيبانش فالبحث العمومي فهاد المرحلة
      ↓
Admin Review (Approve / Reject / Request Changes)
      ↓
Approved
      ↓
Published  ← دابا كيبان فالبحث
```

عند "Request Changes"، الأدمين كيكتب سبب/ملاحظة وصاحب النشاط كيتلقى إشعار بشنو ناقص، النشاط كيرجع لـ `pending_review` بعد التعديل.

---

## 4. التوثيق (Verification)

كل Business يقدر يرفع (اختياري، مدفوع):
- البطاقة الوطنية أو وثيقة مناسبة
- وثيقة تثبت النشاط (السجل التجاري، إلخ — إذا متوفرة)
- تأكيد رقم الهاتف
- تأكيد البريد الإلكتروني

**الحالات:** `pending` → `verified` أو `rejected`

- الطلب كيدخل جدول `verification_requests`، الأدمين كيراجعو من `/admin/verifications`
- Business Verified كيبان عندو Badge خاص فكل مكان (Card، صفحة النشاط، نتائج البحث)
- **مهم:** التوثيق منفصل تماما على الاشتراك (Premium/Business) — التوثيق = ثقة (verification)، الاشتراك = ميزات (features). ماشي نفس الشي.

---

## 5. لوحة تحكم صاحب النشاط (Dashboard)

**Analytics:** عدد الزيارات، عدد النقرات على WhatsApp، عدد المكالمات، عدد Reviews، عدد Leads

**Profile:** Logo، Cover، Description، City، Contact

**Services:** كل خدمة = Price + Description + Photos

**Gallery:** رفع الصور — **الملفات نفسها فـ Supabase Storage/Cloudflare R2/S3، وقاعدة البيانات كتخزن غير الروابط (URLs)**، باش تبقى خفيفة وسريعة

**Opening Hours:** جدول أسبوعي كامل (يوم بيوم، من-إلى)

**Reviews:** يشوف جميع التقييمات ويقدر يرد عليهم

**Subscription:** Free / Premium / Business — إدارة وتجديد الاشتراك

---

## 6. البحث (أهم جزء فالموقع)

واجهة بحال Google:

```
🔍  شنو كتقلب؟  [____________]
📍 المدينة [▼]   Category [▼]   ⭐⭐⭐⭐   Open Now   Verified   Premium
```

**نتائج البحث — كل Card فيها:**
Logo، الاسم، المدينة، التقييم، Badge Verified، Badge Premium، زر WhatsApp، زر الاتصال، زر زيارة الصفحة

---

## 7. التصنيفات (Categories)

مطاعم، مقاهي، كهربائي، سباك، نجار، صباغ، ميكانيكي، مدارس، أطباء، صيدليات، محامون، نقل، تنظيف، حلاقة، تجميل، عقارات... (قابلة للإضافة/الحذف/التعديل من الأدمين — جدول `categories` ديناميكي، ماشي hardcoded)

---

## 8. نظام الترتيب الذكي (Smart Ranking) — مهم بزاف

**بدل** "اللي خلص يطلع الأول" (pay-to-win بسيط)، الترتيب النهائي كيعتمد على معادلة مركبة:

- Premium status (وزن معين)
- Verified status (وزن معين)
- عدد التقييمات + متوسط التقييم
- جودة الملف الشخصي (Description مكتوبة، عدد الصور، الخدمات مكتملة، ساعات العمل محددة)
- النشاط الأخير (آخر تحديث، آخر رد على review)

**مثال معادلة (score قابلة للتعديل):**

```
score = (verified ? 30 : 0)
      + (plan === 'pro' ? 25 : plan === 'premium' ? 15 : 0)
      + min(reviews_count, 50) * 0.4
      + rating_avg * 5
      + profile_completeness_score  // 0-15 حسب اكتمال البروفايل
      + (days_since_last_update < 30 ? 5 : 0)
```

الهدف: الموقع ما يبانش غير "كيبيع المراتب" — لازم يكون فيه استحقاق حقيقي (جودة + ثقة) باش يبقى مفيد للزوار على المدى الطويل، وهادشي كيحافظ على مصداقية الموقع.

---

## 9. لوحة تحكم الأدمين

- **Users:** Ban / Suspend / Delete
- **Businesses:** Approve / Reject / Request Changes
- **Reports:** أي مستخدم يبلغ (report) على نشاط، البلاغ كيوصل للإدارة مع سبب، الأدمين كيقدر يتخذ إجراء (تحذير/تعليق/حذف)
- **Categories:** إضافة / حذف / تعديل
- **Cities:** إضافة / تعديل
- **Subscriptions:** إدارة الباقات والأسعار
- **Analytics:** عدد المستخدمين، عدد الشركات، عدد الاشتراكات، أكثر المدن نشاطا، أكثر التصنيفات نشاطا

---

## 10. SEO — روابط نظيفة (إلزامي)

- كل Business: `/business/garage-atlas-oujda`
- كل Category: `/category/mechanic`
- كل City: `/city/oujda`

هاد البنية كتساعد بزاف فـ Google indexing. كل صفحة خاصها `generateMetadata` ديناميكي (title, description, Open Graph image) مبني على المحتوى الحقيقي ديال الصفحة.

**صفحات City** جديدة يجب إضافتها: `/city/[slug]` — كتعرض كل الأنشطة فمدينة معينة، مع فلترة حسب التصنيف، بحال صفحة category لكن مركزة على المدينة.

---

## 11. Responsive — Mobile First (إلزامي)

التصميم يبدا من الهاتف أولا، وبعدين يتوسع للتابلت والحاسوب. أغلبية الزوار غادي يدخلو من الهاتف. عناصر خاصها تكون sticky/bottom-sheet فالموبايل (فلاتر، أزرار الاتصال/WhatsApp فصفحة النشاط).

---

## 12. الأيقونات والصور

- أيقونات: **lucide-react** (SVG components، بلا ملفات صور، خفيفة بزاف)
- الصور (Logo/Cover/Gallery): تُرفع لـ Supabase Storage، وقاعدة البيانات كتخزن غير الـ URL — ولا صورة تتخزن كـ base64/binary فالـ DB
- تفادي أي PNG/JPG كأيقونات ثابتة فالواجهة — استعمل SVG أو مكتبة أيقونات

---

## 13. الستاك التقني

| الطبقة | التقنية |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) |
| اللغة | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | lucide-react |
| Animation | Framer Motion |
| Dev bundler | Turbopack (`next dev --turbo`) |
| Backend/DB | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (Email/Password + Google OAuth) |
| Storage | Supabase Storage (أو Cloudflare R2/S3) |
| خرائط | Google Maps API أو Leaflet/OpenStreetMap |
| AI | Claude API أو OpenAI API — عبر Server Actions فقط |
| Payment | Stripe (بداية) → دفع محلي مغربي لاحقا |
| Hosting | Vercel |
| i18n | next-intl — ar (RTL) / fr / en |

---

## 14. قاعدة البيانات (SQL كامل — V2)

```sql
create type user_role as enum ('client', 'owner', 'admin');
create type plan_type as enum ('free', 'premium', 'pro');
create type booking_status as enum ('pending', 'confirmed', 'cancelled');
create type business_status as enum ('pending_review', 'approved', 'rejected', 'suspended');
create type verification_status as enum ('none', 'pending', 'verified', 'rejected');


create table profiles (
  id uuid primary key references auth.users(id),
  role user_role default 'client',
  full_name text,
  phone text,
  city text,
  banned boolean default false,
  suspended boolean default false,
  created_at timestamptz default now()
);


create table cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text, name_fr text, name_en text
);


create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  icon text,
  name_ar text, name_fr text, name_en text
);


create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  category_id uuid references categories(id),
  city_id uuid references cities(id),
  slug text unique not null,
  name text not null,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  address text,
  lat float8,
  lng float8,
  plan plan_type default 'free',
  status business_status default 'pending_review',
  status_note text,                    -- سبب الرفض / التعديلات المطلوبة
  verification_status verification_status default 'none',
  verified_at timestamptz,
  rating_avg numeric default 0,
  reviews_count int default 0,
  profile_completeness int default 0,  -- 0-100، محسوب تلقائيا
  last_updated_at timestamptz default now(),
  created_at timestamptz default now()
);


create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  price numeric,
  description text,
  photo_url text
);


create table business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  day_of_week int,
  open_time time,
  close_time time,
  is_closed boolean default false
);


create table media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  type text check (type in ('image','video')),
  url text not null,
  sort_order int default 0
);


create table reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  user_id uuid references profiles(id),
  rating int check (rating between 1 and 5),
  comment text,
  reply text,
  created_at timestamptz default now()
);


create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  business_id uuid references businesses(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, business_id)
);


create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  business_id uuid references businesses(id) on delete cascade,
  reason text,
  status text default 'open', -- open | reviewed | resolved
  created_at timestamptz default now()
);


create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  id_document_url text,
  activity_document_url text,
  status verification_status default 'pending',
  admin_note text,
  created_at timestamptz default now()
);


create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  service_id uuid references services(id),
  client_name text,
  client_phone text,
  booking_date date,
  booking_time time,
  status booking_status default 'pending',
  created_at timestamptz default now()
);


create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  plan plan_type,
  stripe_subscription_id text,
  status text,
  started_at timestamptz default now(),
  expires_at timestamptz
);


create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  event_type text check (event_type in ('view','whatsapp_click','call_click','lead','photo_view')),
  created_at timestamptz default now()
);
```

**RLS الأساسية:**
- `businesses`: SELECT عمومي فقط لـ `status = 'approved'`، أو لصاحبها، أو للأدمين. INSERT/UPDATE فقط لـ owner (بلا تعديل `status`/`verification_status` — هادو غير الأدمين). DELETE فقط admin
- `reports`: INSERT لأي user مسجل، SELECT/UPDATE فقط admin
- `verification_requests`: INSERT/SELECT فقط لصاحب النشاط المعني، UPDATE فقط admin
- `profiles`: UPDATE ديال `banned`/`suspended` فقط admin

---

## 15. مراحل البناء (Roadmap)

**المرحلة 1 — MVP (خدامة/شبه خدامة حسب آخر جلسة)**
Setup + Auth + قاعدة البيانات الأساسية + الصفحات العمومية (Home, Search, Category, Business) + Dashboard أساسي

**المرحلة 2 — Trust & Workflow**
- Business status workflow كامل (`pending_review` → `approved`/`rejected`/`request_changes`)
- Verification system (رفع وثائق + مراجعة أدمين)
- Reports system
- صفحات City (`/city/[slug]`)
- Smart ranking algorithm فـ query البحث
- Admin panel: Businesses review، Reports، Categories، Cities

**المرحلة 3 — Engagement**
- Booking system كامل
- Reviews + الرد عليها
- Favorites
- Analytics فالـ Dashboard

**المرحلة 4 — Monetization**
- نظام الاشتراكات (Stripe)
- ميزات AI (وصف تلقائي، بحث ذكي، ردود)
- إعلانات مدفوعة (منفصلة على smart ranking — sponsored slot واضح "إعلان" ماشي مخفي فالترتيب العادي)
- دفع محلي مغربي

---

## 16. ملاحظات تقنية للـ AI Coding Agent

- كل نشاط جديد كيبدا بـ `status = 'pending_review'` — ما كيبانش فالبحث العمومي حتى الأدمين يوافق
- الترتيب الذكي (smart ranking) خاصو يكون **query واحدة محسوبة server-side** (Postgres function أو computed column)، ماشي client-side sorting بعد الجلب
- افصل بوضوح فالكود بين `verification_status` (ثقة) و `plan` (اشتراك/ميزات) — ماشي نفس المنطق، وما تخليش الـ smart ranking يتحول لـ "اللي خلص كيطلع الأول"
- كل الصور: رفع لـ Supabase Storage، تخزين الـ URL فقط فالـ DB
- استعمل lucide-react لكل الأيقونات، ولا PNG/JPG كأيقونة ثابتة
- Mobile-first فكل component جديد
- بعد كل مرحلة: seed data واقعية (أنشطة بحالات مختلفة: approved/pending/verified) باش تختبر الـ workflow كامل

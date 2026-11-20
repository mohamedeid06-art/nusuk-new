# لوحة تحكم نُسُك برو v2 | Nusuk Dual-Emulator Pro Dashboard

لوحة تحكم عربية متكاملة (**RTL — Dark Mode**) مبنية بـ **React + Vite + Tailwind CSS + Lucide Icons** للتحكم الكامل في محرك نُسُك المحدث `backend/server_pro_v2.py` (**FastAPI + LDPlayer + uiautomator2 + Nusuk Signed API + Rawdah Radar**).

---

## المميزات الرئيسية

1. **لوحة المتابعة الحية والمجموعة النشطة (`GET /api/status`):**
   - تحديث تلقائي لحظي كل 3 ثوانٍ مع مؤشر اتصال بالسيرفر ومؤشر حالة المحاكيات (`busy` / `ready`).
   - عرض الحساب الرئيسي النشط (`leader_name`, `leader_id`) والمرافقين المربوطين وشريط تقدم المجموعة (`companions_count / max_companions`) والدور القادم.
   - عرض عدادات تغيير البصمة (`emu1_counter / 5` و `emu2_counter / 5`).
   - أزرار إنهاء المجموعة الحالية (`POST /api/force-close-group`)، وتصفير الحالة (`POST /api/reset-state` مع خيار `reset_counters`)، ومنزلق التحكم في سرعة الانتظار Anti-Lag (`0.8x` إلى `3.0x` عبر `POST /api/set-speed`).

2. **مركز تسجيل المعتمرين واسترجاع الحسابات (`POST /api/register` و `POST /api/recover`):**
   - إدخال فردي سريع مع قائمة جنسيات قابلة للبحث والكتابة الحرة واختيار الدور (`تلقائي` / `leader` / `companion`).
   - **إدخال جماعي (Bulk Queue / Excel & CSV):** لصق مباشر من Excel أو رفع ملف CSV لتنفيذ القائمة بالتتابع مع إيقاف مؤقت وإعادة محاولة الفاشل وتصدير النتائج CSV متوافق مع العربية.
   - خيارات متقدمة مدمجة في الإدخال الفردي والطابور الجماعي:
     - `auto_close_group`: إغلاق وخروج الحساب الرئيسي تلقائياً بعد اكتمال 4 أفراد (أو إيقافه لإبقاء الجروب مفتوحاً للحجز المباشر).
     - `skip_permit_check`: تخطي فحص التصاريح السابقة يدوياً عند الاسترجاع.
   - عرض بطاقة فحص أحقية تصريح الروضة (`eligible`, `reason`, `details`) بألوان واضحة.

3. **محرك الحجز لأي حد (`POST /api/book/rawdah` و `POST /api/book/for-anyone` و `POST /api/book/login`):**
   - الحجز المباشر للحساب/الجروب المفتوح حالياً على المحاكي، أو الحجز لأي شخص جديد في خطوة واحدة (مع تسجيل دخول تلقائي والتقاط OTP).
   - زر مستقل لتسجيل الدخول فقط (`POST /api/book/login`).
   - خيارات اختيار المحاكي (`emu1`/`emu2`)، النوع (`male`/`female`)، تحديد الكل (`book_all_companions`) أو أسماء مرافقين محددين (`companion_names`)، التاريخ والوقت الاختياريين، خيار الأمان التجريبي (`dry_run`)، وخيار تسجيل الخروج بعد الحجز (`logout_after`).
   - بطاقة نتيجة تعرض الحالة، التاريخ والوقت المختار، رقم التصريح مع زر نسخ، ولقطة شاشة الحجز (`/booking_shots/*.png`) مع تكبير في Modal وتسجيلها في سجل العمليات.

4. **رادار الروضة والمواعيد الحية ومواعيد العمرة:**
   - شريط إعدادات Nusuk API (`Bearer Token`, `Device ID`, `lang`) محفوظ في `localStorage` مع فحص وقت سيرفر نسك (`GET /api/nusuk/server-time`) وتوليد هيدرز موقّعة (`POST /api/nusuk/sign-headers`).
   - تشغيل وإيقاف رادار الروضة التلقائي في الخلفية (`POST /api/rawdah/monitor/start` و `POST /api/rawdah/monitor/stop`) مع Polling كل 3 ثوانٍ (`GET /api/rawdah/monitor/status`) وفحص فوري لمرة واحدة (`POST /api/rawdah/available-slots`).
   - عرض الأيام والفترات المتاحة (`available_days`) بكروت مرتبة مع نسب الإتاحة والألوان والفترات الفورية وزر انتقال مباشر للحجز.
   - تنبيه صوتي فوري (Web Audio API بدون ملفات خارجية) + بانر أخضر بارز + Browser Notification عند فتح أي مواعيد.
   - قسم مخصص لاستعلام مواعيد العمرة المتاحة (`POST /api/umrah/available-dates`).

5. **مراقبة صحة المحاكيات والتحكم بها (`GET /api/health` و `POST /api/randomize-emulator`):**
   - بطاقات مستقلة لـ `emu1` و `emu2` تعرض الاتصال، أبعاد الشاشة، التطبيق المفتوح حالياً، وزر تغيير البصمة وإعادة التشغيل.

6. **أدوات الروضة والـ API (Crypto Lab & Direct Permits API):**
   - تشفير وفك تشفير طلبات `Rawdah v2` (`AES-128-CBC`) مع نسخ `JSON` و `cURL`.
   - قسم إدارة التصاريح المباشرة عبر API: جلب تصاريح الروضة (`POST /api/rawdah/permits`)، إصدار تصريح روضة (`POST /api/rawdah/issue-permit` لمسارات `external-visitor` / `citizen-resident` / `instant-track` مع خيار `encrypt_body`)، تأكيد تصريح (`POST /api/rawdah/confirm-permit`)، إلغاء تصريح (`POST /api/rawdah/cancel-permit`)، وإصدار تصريح عمرة (`POST /api/umrah/issue-permit`) مع دعم `extra_headers`.

7. **سجل العمليات ولقطات الشاشة:**
   - تتبع كل العمليات خلال الجلسة واستعراض صور الحجز (`booking_shots/*.png`) ولقطات الأخطاء (`fail_shots/*.png`) مباشرة داخل الداشبورد مع نافذة تكبير.

---

## هيكل المشروع

```text
.
├── backend/
│   ├── server_pro_v2.py       # السيرفر الأساسي: FastAPI + المحاكيات + رادار الروضة + محرك الحجز + Nusuk API
│   ├── requirements.txt       # حزم بايثون المطلوبة
│   └── .env.example           # نموذج متغيرات البيئة
├── src/                       # كود الواجهة الأمامية (React + Tailwind CSS)
├── .github/workflows/
│   └── deploy.yml             # النشر التلقائي على GitHub Pages
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## أولاً: تشغيل السيرفر المحلي (Backend — FastAPI)

تأكد من تثبيت **Python 3.10+** و **LDPlayer 9** على جهاز Windows ثم نفّذ الخطوات التالية:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

انسخ ملف `.env.example` إلى `.env` وعدّل مسار LDPlayer وأرقام المحاكيات (`EMU1_SERIAL`, `EMU1_INDEX`, `EMU2_SERIAL`, `EMU2_INDEX`) حسب جهازك:

```powershell
copy .env.example .env
```

ثم شغّل السيرفر الأساسي مباشرة عبر Python:

```bash
python server_pro_v2.py
```

أو باستخدام `uvicorn`:

```bash
uvicorn server_pro_v2:app --host 127.0.0.1 --port 8000
```

---

## ثانياً: ربط السيرفر المحلي مع الداشبورد

1. افتح رابط الداشبورد (عبر **GitHub Pages** أو محلياً).
2. انتقل إلى تبويب **إعدادات الاتصال** (`Settings`):
   - **عنوان السيرفر (API Base URL):** اتركه `http://127.0.0.1:8000` إذا كان السيرفر يعمل على نفس الجهاز، ثم اضغط **اختبار الاتصال**.
   - **إيميل استلام الـ OTP (`client_email`) وكلمة مرور التطبيق (`client_pass`):** أدخل بريد Gmail و App Password ليُحفظ محلياً في المتصفح (`localStorage`).
   - اضبط كلمة المرور الافتراضية والجنسية الافتراضية ثم اضغط **حفظ الإعدادات**.

> **ملاحظة حول الاتصال من GitHub Pages (HTTPS):**
> - متصفحات Chromium (Chrome / Edge) تسمح بالاتصال مباشرة بـ `http://127.0.0.1:8000` من صفحات HTTPS طالما أن `NUSUK_ALLOWED_ORIGINS=*` (أو يتضمن رابط GitHub Pages) في ملف `.env`.
> - إذا أردت التحكم في السيرفر من جهاز آخر أو من الموبايل عبر الإنترنت، شغّل نفق HTTPS مثل **Cloudflare Tunnel** (`cloudflared tunnel --url http://127.0.0.1:8000`) أو **ngrok** ثم ضع رابط الـ HTTPS الناتج في حقل `API Base URL` داخل الإعدادات.

---

## ثالثاً: تشغيل الواجهة الأمامية محلياً للتطوير

```bash
npm install
npm run dev
```

ولبناء نسخة الإنتاج في مجلد `dist/`:

```bash
npm run build
```

---

## ملخص نقاط النهاية المدعومة (`server_pro_v2.py`)

| الطريقة | المسار | الوظيفة |
| :--- | :--- | :--- |
| `GET` | `/api/status` | حالة السيرفر، الانشغال، المجموعة النشطة، العدادات، ومعامل السرعة |
| `POST` | `/api/set-speed?multiplier=...` | تعديل معامل سرعة الانتظار Anti-Lag (`0.8` – `3.0`) |
| `GET` | `/api/health` | فحص اتصال وصحة المحاكيين `emu1` و `emu2` |
| `POST` | `/api/reset-state?reset_counters=...` | تصفير المجموعة وحالة السلامة (مع خيار تصفير العدادات) |
| `POST` | `/api/randomize-emulator?emu_key=...` | تغيير البصمة وإعادة تشغيل محاكي محدد |
| `POST` | `/api/force-close-group` | إنهاء المجموعة النشطة وتسجيل خروج الحساب الرئيسي |
| `POST` | `/api/register` | تسجيل معتمر جديد (يدعم `auto_close_group` و `skip_permit_check`) |
| `POST` | `/api/recover` | استرجاع حساب وفحص أحقية تصريح الروضة الشريفة |
| `POST` | `/api/book/login` | تسجيل دخول حساب نسك موجود على المحاكي |
| `POST` | `/api/book/rawdah` | حجز الروضة للحساب أو الجروب المفتوح حالياً (يدعم `dry_run` و `logout_after`) |
| `POST` | `/api/book/for-anyone` | تسجيل الدخول وحجز الروضة لأي شخص في خطوة واحدة |
| `GET` | `/api/nusuk/server-time` | جلب وقت سيرفر نسك الرسمي للتحقق من الاتصال والتوقيع |
| `POST` | `/api/nusuk/sign-headers` | توليد هيدرز نسك الموقّعة (`hash` + `timestamp`) |
| `POST` | `/api/rawdah/available-slots` | فحص فوري مشفّر للأيام والفترات المتاحة في الروضة |
| `POST` | `/api/rawdah/monitor/start` | تشغيل رادار الروضة التلقائي في الخلفية |
| `POST` | `/api/rawdah/monitor/stop` | إيقاف رادار الروضة |
| `GET` | `/api/rawdah/monitor/status` | جلب حالة ونتائج رادار الروضة لحظياً |
| `POST` | `/api/umrah/available-dates` | استعلام مباشر عن التواريخ المتاحة للعمرة |
| `POST` | `/api/rawdah/encrypt` | تشفير طلب الروضة (AES-128-CBC) |
| `POST` | `/api/rawdah/decrypt` | فك تشفير حقل `data` لطلبات الروضة |
| `POST` | `/api/rawdah/permits` | جلب تصاريح الروضة مباشرة عبر API |
| `POST` | `/api/rawdah/issue-permit` | إصدار تصريح روضة مباشر عبر API (`external-visitor` / `citizen-resident` / `instant-track`) |
| `POST` | `/api/rawdah/confirm-permit` | تأكيد تصريح روضة عبر API |
| `POST` | `/api/rawdah/cancel-permit` | إلغاء تصريح روضة عبر API |
| `POST` | `/api/umrah/issue-permit` | إصدار تصريح عمرة عبر API |
| `GET` | `/booking_shots/{file}.png` | عرض لقطات شاشة الحجز المحفوظة من المحاكي |
| `GET` | `/fail_shots/{file}.png` | عرض لقطات شاشة الأخطاء المحفوظة من المحاكي |

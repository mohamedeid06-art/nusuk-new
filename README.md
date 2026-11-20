# لوحة تحكم نُسُك برو | Nusuk Dual-Emulator Pro Dashboard

لوحة تحكم عربية متكاملة (RTL — Dark Mode) مبنية بـ **React + Vite + Tailwind CSS + Lucide Icons** للتحكم الكامل في محرك تسجيل المعتمرين المزدوج `server_merged.py` (**FastAPI + LDPlayer + uiautomator2**).

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
   - عرض بطاقة فحص أحقية تصريح الروضة (`eligible`, `reason`, `details`) بألوان واضحة (أخضر للمؤهل / أحمر لغير المؤهل).

3. **مراقبة صحة المحاكيات والتحكم بها (`GET /api/health` و `POST /api/randomize-emulator`):**
   - بطاقات مستقلة لـ `emu1` (الرئيسي) و `emu2` (المرافق) تعرض الاتصال، أبعاد الشاشة، التطبيق المفتوح حالياً، وهل تطبيق نسك في الواجهة.
   - زر تغيير البصمة وإعادة التشغيل لكل محاكي مع نافذة تأكيد.

4. **مختبر تشفير الروضة (`POST /api/rawdah/encrypt` و `POST /api/rawdah/decrypt`):**
   - تشفير طلبات `Rawdah v2` عبر الحقول الجاهزة أو JSON مخصص، مع نسخ `JSON` و `cURL` بضغطة زر.
   - فك التشفير وعرض الناتج كـ Pretty JSON مع استخراج المفتاح.

5. **سجل العمليات ولقطات الأخطاء:**
   - تتبع كل العمليات خلال الجلسة وعرض صور الأخطاء (`fail_shots/*.png`) مباشرة داخل الداشبورد مع نافذة تكبير.

---

## هيكل المشروع

```text
.
├── backend/
│   ├── server_merged.py       # سيرفر FastAPI ومحرك المحاكيات المزدوج
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

ثم شغّل السيرفر باستخدام `uvicorn`:

```bash
uvicorn server_merged:app --host 127.0.0.1 --port 8000
```

أو مباشرة عبر Python:

```bash
python server_merged.py
```

---

## ثانياً: ربط السيرفر المحلي مع الداشبورد

1. افتح رابط الداشبورد (عبر **GitHub Pages** أو محلياً).
2. انتقل إلى تبويب **إعدادات الاتصال** (`Settings`):
   - **عنوان السيرفر (API Base URL):** اتركه `http://127.0.0.1:8000` إذا كان السيرفر يعمل على نفس الجهاز، ثم اضغط **اختبار الاتصال**.
   - **إيميل استلام الـ OTP (`client_email`) وكلمة مرور التطبيق (`client_pass`):** أدخل بريد Gmail و App Password ليُحفظ محلياً في المتصفح (`localStorage`) ولا تحتاج لإعادة إدخالهما مع كل طلب.
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

## ملخص نقاط النهاية المدعومة (API Endpoints)

| الطريقة | المسار | الوظيفة |
| :--- | :--- | :--- |
| `GET` | `/api/status` | حالة السيرفر، الانشغال، المجموعة النشطة، العدادات، ومعامل السرعة |
| `POST` | `/api/set-speed?multiplier=...` | تعديل معامل سرعة الانتظار Anti-Lag (`0.8` – `3.0`) |
| `GET` | `/api/health` | فحص اتصال وصحة المحاكيين `emu1` و `emu2` |
| `POST` | `/api/reset-state?reset_counters=...` | تصفير المجموعة وحالة السلامة (مع خيار تصفير العدادات) |
| `POST` | `/api/randomize-emulator?emu_key=...` | تغيير البصمة وإعادة تشغيل محاكي محدد |
| `POST` | `/api/force-close-group` | إنهاء المجموعة النشطة وتسجيل خروج الحساب الرئيسي |
| `POST` | `/api/register` | تسجيل معتمر جديد (مع التحويل التلقائي للاسترجاع إذا كان مسجلاً مسبقاً) |
| `POST` | `/api/recover` | استرجاع حساب وفحص أحقية تصريح الروضة الشريفة |
| `POST` | `/api/rawdah/encrypt` | تشفير طلب الروضة (AES-128-CBC) |
| `POST` | `/api/rawdah/decrypt` | فك تشفير حقل `data` لطلبات الروضة |
| `GET` | `/fail_shots/{file}.png` | عرض لقطات شاشة الأخطاء المحفوظة من المحاكي |

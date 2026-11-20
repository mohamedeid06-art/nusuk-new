import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  UserCheck,
  Users,
  Smartphone,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  ShieldAlert,
  LogOut,
  LogIn,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  ZoomIn,
  Sparkles,
  RotateCcw,
  Crown,
  Ticket,
  FlaskConical,
  X,
} from 'lucide-react';
import ToggleSwitch from '../components/ToggleSwitch';
import { buildAssetUrl } from '../services/api';

const STATUS_META = {
  booked: {
    title: 'تم حجز تصريح الروضة بنجاح!',
    badge: 'محجوز (booked)',
    border: 'border-emerald-500/45',
    bg: 'bg-emerald-950/30',
    badgeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
    iconWrap: 'bg-emerald-500/20 text-emerald-400',
    Icon: CheckCircle2,
  },
  dry_run_ready: {
    title: 'التشغيل التجريبي جاهز للتأكيد',
    badge: 'تجريبي (dry_run_ready)',
    border: 'border-amber-500/45',
    bg: 'bg-amber-950/25',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    iconWrap: 'bg-amber-500/20 text-amber-400',
    Icon: FlaskConical,
  },
  logged_in: {
    title: 'تم تسجيل الدخول بنجاح',
    badge: 'تم الدخول (logged_in)',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/25',
    badgeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
    iconWrap: 'bg-emerald-500/20 text-emerald-400',
    Icon: LogIn,
  },
  no_available_slots: {
    title: 'لا توجد فترات زمنية متاحة',
    badge: 'no_available_slots',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/20',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    iconWrap: 'bg-amber-500/20 text-amber-400',
    Icon: AlertTriangle,
  },
  no_available_dates: {
    title: 'لا توجد أيام متاحة حالياً',
    badge: 'no_available_dates',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/20',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    iconWrap: 'bg-amber-500/20 text-amber-400',
    Icon: AlertTriangle,
  },
  ineligible_or_unavailable: {
    title: 'الحساب غير مؤهل أو لا توجد مواعيد',
    badge: 'ineligible_or_unavailable',
    border: 'border-rose-500/45',
    bg: 'bg-rose-950/30',
    badgeCls: 'bg-rose-500/20 text-rose-300 border-rose-500/35',
    iconWrap: 'bg-rose-500/20 text-rose-400',
    Icon: XCircle,
  },
  booking_unconfirmed: {
    title: 'الحجز غير مؤكد — راجع لقطة الشاشة',
    badge: 'booking_unconfirmed',
    border: 'border-amber-500/45',
    bg: 'bg-amber-950/25',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    iconWrap: 'bg-amber-500/20 text-amber-400',
    Icon: AlertTriangle,
  },
  entry_not_found: {
    title: 'لم يتم العثور على قسم الروضة',
    badge: 'entry_not_found',
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/25',
    badgeCls: 'bg-rose-500/20 text-rose-300 border-rose-500/35',
    iconWrap: 'bg-rose-500/20 text-rose-400',
    Icon: XCircle,
  },
  busy: {
    title: 'المحاكيات مشغولة حالياً',
    badge: 'busy',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/20',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
    iconWrap: 'bg-amber-500/20 text-amber-400',
    Icon: AlertTriangle,
  },
  error: {
    title: 'حدث خطأ أثناء تنفيذ العملية',
    badge: 'error',
    border: 'border-rose-500/45',
    bg: 'bg-rose-950/30',
    badgeCls: 'bg-rose-500/20 text-rose-300 border-rose-500/35',
    iconWrap: 'bg-rose-500/20 text-rose-400',
    Icon: XCircle,
  },
};

export default function BookingView({
  settings,
  statusData,
  connectionState,
  bookingLoading,
  lastBookingResult,
  prefillSlot,
  onClearPrefill,
  onBookRawdah,
  onBookForAnyone,
  onBookLogin,
  onCopy,
  onOpenImage,
  onNavigateSettings,
  onNotify,
}) {
  // Mode: 'current' -> POST /api/book/rawdah | 'anyone' -> POST /api/book/for-anyone
  const [mode, setMode] = useState('current');

  // Account credentials (for 'anyone' mode & login-only)
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showAccountPass, setShowAccountPass] = useState(false);

  // OTP email override (defaults to saved settings)
  const [otpEmail, setOtpEmail] = useState(settings.clientEmail || '');
  const [otpPass, setOtpPass] = useState(settings.clientPass || '');
  const [showOtpPass, setShowOtpPass] = useState(false);
  const [otpDirty, setOtpDirty] = useState(false);

  // Booking options
  const [emuKey, setEmuKey] = useState('emu1');
  const [gender, setGender] = useState('male');
  const [bookAllCompanions, setBookAllCompanions] = useState(true);
  const [companionNamesText, setCompanionNamesText] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [logoutAfter, setLogoutAfter] = useState(false);

  // Sync OTP defaults from settings if user hasn't edited them manually
  useEffect(() => {
    if (!otpDirty) {
      setOtpEmail(settings.clientEmail || '');
      setOtpPass(settings.clientPass || '');
    }
  }, [settings.clientEmail, settings.clientPass, otpDirty]);

  // Apply slot prefill when jumping from RadarView
  useEffect(() => {
    if (prefillSlot) {
      if (prefillSlot.date) setTargetDate(prefillSlot.date);
      if (prefillSlot.time) setTargetTime(prefillSlot.time);
      onClearPrefill?.();
    }
  }, [prefillSlot, onClearPrefill]);

  const parsedCompanions = useMemo(() => {
    return companionNamesText
      .split(/[,،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [companionNamesText]);

  const offline = connectionState !== 'connected';
  const busy = Boolean(statusData?.busy);
  const isRunning = Boolean(bookingLoading);

  const handleRestoreSavedOtp = () => {
    setOtpEmail(settings.clientEmail || '');
    setOtpPass(settings.clientPass || '');
    setOtpDirty(false);
    onNotify({ type: 'info', title: 'تمت استعادة بيانات إيميل OTP المحفوظة' });
  };

  const buildCommonBookingPayload = () => ({
    emu_key: emuKey,
    gender,
    book_all_companions: bookAllCompanions,
    companion_names: parsedCompanions.length > 0 ? parsedCompanions : null,
    target_date: targetDate.trim() || null,
    target_time: targetTime.trim() || null,
    dry_run: dryRun,
    logout_after: logoutAfter,
  });

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (mode === 'current') {
      await onBookRawdah(buildCommonBookingPayload());
      return;
    }

    // Mode: 'anyone'
    const cleanEmail = accountEmail.trim();
    const cleanPass = accountPassword || settings.defaultPassword || '';
    if (cleanEmail && !cleanPass) {
      onNotify({
        type: 'warning',
        title: 'كلمة المرور مطلوبة',
        message: 'أدخل كلمة مرور الحساب أو اضبط كلمة مرور افتراضية في الإعدادات.',
      });
      return;
    }

    const payload = {
      ...buildCommonBookingPayload(),
      email: cleanEmail || null,
      password: cleanEmail ? cleanPass : null,
      client_email: otpEmail.trim() || null,
      client_pass: otpPass.trim() || null,
    };

    await onBookForAnyone(payload);
  };

  const handleLoginOnly = async () => {
    const cleanEmail = accountEmail.trim();
    const cleanPass = accountPassword || settings.defaultPassword || '';
    if (!cleanEmail || !cleanPass) {
      onNotify({
        type: 'warning',
        title: 'بيانات الدخول ناقصة',
        message: 'يرجى إدخال إيميل الحساب وكلمة المرور لتسجيل الدخول.',
      });
      return;
    }

    await onBookLogin({
      emu_key: emuKey,
      email: cleanEmail,
      password: cleanPass,
      client_email: otpEmail.trim() || null,
      client_pass: otpPass.trim() || null,
    });
  };

  const renderResultCard = () => {
    if (isRunning) {
      const label =
        bookingLoading === 'login'
          ? 'جاري تسجيل الدخول للحساب على المحاكي...'
          : bookingLoading === 'for-anyone'
            ? dryRun
              ? 'جاري الدخول وتنفيذ تشغيل تجريبي لحجز الروضة...'
              : 'جاري تسجيل الدخول وحجز تصريح الروضة...'
            : dryRun
              ? 'جاري تنفيذ تشغيل تجريبي (Dry Run) لحجز الروضة...'
              : 'جاري حجز تصريح الروضة على المحاكي...';

      return (
        <div className="rounded-2xl border border-amber-500/35 bg-slate-900/75 p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[320px]">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-white">{label}</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
              يتولى المحاكي الآن التنقل داخل تطبيق نسك، اختيار الأفراد والموعد المتاح، والتقاط صورة للنتيجة تلقائياً.
            </p>
          </div>
        </div>
      );
    }

    if (!lastBookingResult) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[320px]">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/70 text-slate-500 flex items-center justify-center">
            <Ticket className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-300">بطاقة نتيجة الحجز ولقطة الشاشة</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              ستظهر هنا حالة الحجز (<code className="font-mono">booked</code> / <code className="font-mono">dry_run_ready</code>)، التاريخ والوقت المختار، رقم التصريح، وصورة التأكيد مباشرة من المحاكي.
            </p>
          </div>
        </div>
      );
    }

    const res = lastBookingResult;
    const resolvedKey =
      res.status || (res.logged_in && res.success ? 'logged_in' : res.success ? 'booked' : 'error');
    const meta = STATUS_META[resolvedKey] || (res.success ? STATUS_META.booked : STATUS_META.error);
    const MetaIcon = meta.Icon;
    const shotUrl = res.screenshot ? buildAssetUrl(settings.apiBaseUrl, res.screenshot) : null;

    return (
      <div className={`rounded-2xl border p-5 space-y-4 shadow-xl shadow-black/20 ${meta.border} ${meta.bg}`}>
        {/* Result Header */}
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.iconWrap}`}>
            <MetaIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-extrabold text-white">{meta.title}</h4>
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeCls}`}
                dir="ltr"
              >
                {meta.badge}
              </span>
            </div>
            {(res.message || res.error) && (
              <p className="text-sm text-slate-200 mt-1.5 leading-relaxed break-words">
                {res.message || res.error}
              </p>
            )}
          </div>
        </div>

        {/* Login Info if present */}
        {(res.login || res.logged_in) && (
          <div className="rounded-xl bg-slate-950/65 border border-emerald-500/25 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
              <LogIn className="w-3.5 h-3.5" />
              <span>تم تسجيل الدخول للحساب بنجاح</span>
            </span>
            <span className="text-slate-400">
              {(res.login?.otp_used ?? res.otp_used) ? 'عبر كود OTP' : 'دخول مباشر بدون OTP'}
            </span>
          </div>
        )}

        {/* Permit Number Highlight */}
        {res.permit_number && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-emerald-300 block">رقم التصريح / الحجز (Permit Number)</span>
              <span className="text-lg font-mono font-extrabold text-white tracking-wide block mt-0.5 select-all" dir="ltr">
                {res.permit_number}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCopy(res.permit_number, 'تم نسخ رقم التصريح')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ</span>
            </button>
          </div>
        )}

        {/* Selected Date & Slot */}
        {(res.selected_date || res.selected_slot) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 px-3.5 py-2.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                التاريخ المختار (selected_date)
              </span>
              <p className="text-sm font-mono font-bold text-slate-100 mt-1" dir="ltr">
                {res.selected_date || 'أقرب يوم متاح'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 px-3.5 py-2.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                الفترة الزمنية (selected_slot)
              </span>
              <p className="text-sm font-bold text-slate-100 mt-1 break-words">
                {res.selected_slot || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Booking Screenshot Preview */}
        {shotUrl && (
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200">لقطة شاشة الحجز من المحاكي</span>
              <button
                type="button"
                onClick={() =>
                  onOpenImage({
                    url: shotUrl,
                    title: meta.title,
                    subtitle: [res.selected_date, res.selected_slot, res.permit_number ? `تصريح #${res.permit_number}` : '']
                      .filter(Boolean)
                      .join(' • '),
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>تكبير الصورة</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenImage({
                  url: shotUrl,
                  title: meta.title,
                  subtitle: res.message || res.error,
                })
              }
              className="group relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center max-h-80"
            >
              <img
                src={shotUrl}
                alt="لقطة شاشة الحجز"
                className="max-h-80 w-auto object-contain group-hover:scale-[1.02] transition-transform"
              />
              <span className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-white">
                  <ZoomIn className="w-4 h-4 text-emerald-400" />
                  <span>عرض بالحجم الكامل</span>
                </span>
              </span>
            </button>

            <p className="text-[11px] font-mono text-slate-500 break-all" dir="ltr">
              {shotUrl}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Booking Mode Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setMode('current')}
          disabled={isRunning}
          className={`text-right rounded-2xl border p-4 transition-all flex items-start gap-3.5 ${
            mode === 'current'
              ? 'bg-emerald-500/15 border-emerald-500/45 shadow-lg shadow-emerald-950/30'
              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              mode === 'current'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-white">حجز للحساب / الجروب المفتوح حالياً</h3>
              <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-emerald-300 border border-slate-800" dir="ltr">
                POST /api/book/rawdah
              </code>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              يحجز مباشرة على الحساب أو المجموعة المفتوحة بالفعل داخل المحاكي المحدد (مثالي بعد التسجيل مع إيقاف الإغلاق التلقائي).
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('anyone')}
          disabled={isRunning}
          className={`text-right rounded-2xl border p-4 transition-all flex items-start gap-3.5 ${
            mode === 'anyone'
              ? 'bg-amber-500/15 border-amber-500/45 shadow-lg shadow-amber-950/30'
              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              mode === 'anyone'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-white">حجز لأي شخص جديد في خطوة واحدة</h3>
              <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-amber-300 border border-slate-800" dir="ltr">
                POST /api/book/for-anyone
              </code>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              يسجّل دخول لأي حساب نسك بالإيميل وكلمة المرور (ويلتقط الـ OTP تلقائياً إن طُلب) ثم يحجز له الروضة فوراً.
            </p>
          </div>
        </button>
      </div>

      {/* Active Group Quick Indicator (when in current mode) */}
      {mode === 'current' && statusData?.leader_active && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-200">
                المجموعة النشطة حالياً على emu1: <span className="text-white">{statusData.leader_name}</span>
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                عدد المرافقين المربوطين: {statusData.companions_count} / {statusData.max_companions} (إجمالي الأفراد:{' '}
                {(statusData.companions_count || 0) + 1})
              </p>
            </div>
          </div>
          {statusData.leader_id && (
            <span className="text-xs font-mono text-emerald-300 bg-slate-950/70 border border-emerald-500/25 px-2.5 py-1 rounded-lg" dir="ltr">
              ID: {statusData.leader_id}
            </span>
          )}
        </div>
      )}

      {/* Main 2-column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Form Column */}
        <form
          onSubmit={handleSubmitBooking}
          className="xl:col-span-7 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5"
        >
          {/* Credentials Section (Only in 'anyone' mode) */}
          {mode === 'anyone' && (
            <div className="rounded-2xl border border-amber-500/25 bg-slate-950/55 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div>
                  <h4 className="text-sm font-extrabold text-amber-200">بيانات حساب نسك المراد الحجز له</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    يمكنك تسجيل الدخول أولاً بشكل مستقل أو تنفيذ الدخول والحجز معاً في خطوة واحدة
                  </p>
                </div>
                <button
                  type="button"
                  disabled={offline || isRunning || busy}
                  onClick={handleLoginOnly}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/35 transition-colors disabled:opacity-45"
                >
                  {bookingLoading === 'login' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>تسجيل دخول فقط</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block" htmlFor="book-email">
                    إيميل الحساب (<code className="font-mono text-amber-300">email</code>)
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                    <input
                      id="book-email"
                      type="email"
                      dir="ltr"
                      disabled={isRunning}
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      placeholder="pilgrim@gmail.com"
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block" htmlFor="book-pass">
                    كلمة المرور (<code className="font-mono text-amber-300">password</code>)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                    <input
                      id="book-pass"
                      type={showAccountPass ? 'text' : 'password'}
                      dir="ltr"
                      disabled={isRunning}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder={settings.defaultPassword ? 'يستخدم الافتراضي إن تُرك فارغاً' : 'كلمة مرور حساب نسك'}
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pr-10 pl-10 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountPass((s) => !s)}
                      className="absolute left-3 text-slate-400 hover:text-slate-200"
                      aria-label="إظهار أو إخفاء كلمة المرور"
                    >
                      {showAccountPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* OTP Email Config (from Settings or custom override) */}
              <div className="pt-2 border-t border-slate-800/70 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>بيانات إيميل استلام OTP (في حال طلب الحساب رمز تحقق عند الدخول)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {otpDirty && (
                      <button
                        type="button"
                        onClick={handleRestoreSavedOtp}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>استعادة المحفوظ</span>
                      </button>
                    )}
                    {!settings.clientEmail && (
                      <button
                        type="button"
                        onClick={onNavigateSettings}
                        className="text-[11px] font-bold text-amber-300 hover:underline"
                      >
                        ضبط في الإعدادات
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    dir="ltr"
                    disabled={isRunning}
                    value={otpEmail}
                    onChange={(e) => {
                      setOtpEmail(e.target.value);
                      setOtpDirty(true);
                    }}
                    placeholder="client_email (Gmail OTP)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/75 px-3.5 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="relative flex items-center">
                    <input
                      type={showOtpPass ? 'text' : 'password'}
                      dir="ltr"
                      disabled={isRunning}
                      value={otpPass}
                      onChange={(e) => {
                        setOtpPass(e.target.value);
                        setOtpDirty(true);
                      }}
                      placeholder="client_pass (App Password)"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/75 pr-3.5 pl-9 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOtpPass((s) => !s)}
                      className="absolute left-2.5 text-slate-400 hover:text-slate-200"
                      aria-label="إظهار أو إخفاء App Password"
                    >
                      {showOtpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Emulator & Gender Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Emulator Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                اختيار المحاكي (<code className="font-mono text-emerald-400">emu_key</code>)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'emu1', label: 'المحاكي الأول', sub: 'emu1 (الرئيسي)' },
                  { id: 'emu2', label: 'المحاكي الثاني', sub: 'emu2 (المرافق)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setEmuKey(opt.id)}
                    className={`rounded-xl border px-3 py-2.5 text-right transition-all ${
                      emuKey === opt.id
                        ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span>{opt.label}</span>
                    </div>
                    <span className="block text-[10px] font-mono opacity-80 mt-0.5" dir="ltr">
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gender Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                قسم الروضة (<code className="font-mono text-emerald-400">gender</code>)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'male', label: 'رجال', sub: 'male (Men)' },
                  { id: 'female', label: 'نساء', sub: 'female (Women)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => setGender(opt.id)}
                    className={`rounded-xl border px-3 py-2.5 text-right transition-all ${
                      gender === opt.id
                        ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{opt.label}</span>
                    </div>
                    <span className="block text-[10px] font-mono opacity-80 mt-0.5" dir="ltr">
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Companions Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  تحديد جميع المرافقين تلقائياً (<code className="font-mono text-emerald-400">book_all_companions</code>)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  يحدد الحساب الرئيسي وكل المرافقين المربوطين في الجروب دفعة واحدة
                </span>
              </div>
              <ToggleSwitch
                checked={bookAllCompanions}
                onChange={setBookAllCompanions}
                disabled={isRunning}
                ariaLabel="تحديد جميع المرافقين"
              />
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 block" htmlFor="book-companions">
                أسماء مرافقين محددين <span className="text-slate-500 font-normal">(اختياري — مفصولة بفواصل)</span>
              </label>
              <input
                id="book-companions"
                type="text"
                disabled={isRunning}
                value={companionNamesText}
                onChange={(e) => setCompanionNamesText(e.target.value)}
                placeholder="مثال: محمد أحمد، سارة علي (اتركه فارغاً لتطبيق خيار تحديد الكل)"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {parsedCompanions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {parsedCompanions.map((name, i) => (
                    <span
                      key={`${name}-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    >
                      {name}
                    </span>
                  ))}
                  <span className="text-[10px] text-amber-300/90">
                    (سيتم تحديد الأسماء المكتوبة فقط)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Target Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300" htmlFor="book-date">
                  التاريخ المطلوب (<code className="font-mono text-emerald-400">target_date</code>)
                </label>
                {targetDate && (
                  <button
                    type="button"
                    onClick={() => setTargetDate('')}
                    className="text-[11px] text-slate-400 hover:text-rose-300 inline-flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> مسح
                  </button>
                )}
              </div>
              <input
                id="book-date"
                type="date"
                dir="ltr"
                disabled={isRunning}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">اتركه فارغاً لاختيار أقرب يوم متاح تلقائياً</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300" htmlFor="book-time">
                  الوقت المطلوب (<code className="font-mono text-emerald-400">target_time</code>)
                </label>
                {targetTime && (
                  <button
                    type="button"
                    onClick={() => setTargetTime('')}
                    className="text-[11px] text-slate-400 hover:text-rose-300 inline-flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> مسح
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Clock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                <input
                  id="book-time"
                  type="text"
                  dir="ltr"
                  disabled={isRunning}
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  placeholder="09:00"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">مثال: 09:00 — أو اتركه فارغاً لأول فترة متاحة</p>
            </div>
          </div>

          {/* Safety Switches: dry_run (Warning highlighted) & logout_after */}
          <div className="space-y-3">
            {/* Prominent Warning dry_run card */}
            <div
              className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all ${
                dryRun
                  ? 'border-amber-400/70 bg-amber-500/15 shadow-md shadow-amber-950/30'
                  : 'border-amber-500/35 bg-amber-950/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-amber-200">
                      وضع التشغيل التجريبي الآمن (Dry Run)
                    </span>
                    <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/35" dir="ltr">
                      dry_run={String(dryRun)}
                    </code>
                  </div>
                  <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                    يصل لخطوة التأكيد النهائي ويلتقط صورة للشاشة <strong>بدون</strong> الضغط على إصدار التصريح فعلياً — مثالي للاختبار الآمن.
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={dryRun}
                onChange={setDryRun}
                disabled={isRunning}
                accent="amber"
                ariaLabel="تفعيل التشغيل التجريبي dry_run"
              />
            </div>

            {/* logout_after switch */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    تسجيل خروج بعد الانتهاء (<code className="font-mono text-emerald-400">logout_after</code>)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    يُغلق الجروب أو يسجل خروج الحساب تلقائياً بعد الحجز (يُتجاهل عند تفعيل dry_run)
                  </span>
                </div>
              </div>
              <ToggleSwitch
                checked={logoutAfter}
                onChange={setLogoutAfter}
                disabled={isRunning}
                ariaLabel="تسجيل خروج بعد الحجز"
              />
            </div>
          </div>

          {/* Primary Submit Button */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <button
              type="submit"
              disabled={offline || isRunning || busy}
              className={`w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-extrabold shadow-lg transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                dryRun
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
              }`}
            >
              {bookingLoading === 'rawdah' || bookingLoading === 'for-anyone' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : dryRun ? (
                <FlaskConical className="w-5 h-5" />
              ) : (
                <CalendarCheck2 className="w-5 h-5" />
              )}
              <span>
                {dryRun
                  ? mode === 'anyone'
                    ? 'بدء التشغيل التجريبي (دخول + فحص حجز الروضة)'
                    : 'بدء التشغيل التجريبي للحساب المفتوح (Dry Run)'
                  : mode === 'anyone'
                    ? 'دخول وحجز تصريح الروضة الآن'
                    : 'حجز تصريح الروضة للحساب/الجروب المفتوح'}
              </span>
            </button>

            {busy && !isRunning && (
              <p className="text-xs text-amber-300 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>المحاكيات مشغولة حالياً بعملية أخرى — انتظر انتهاءها قبل بدء الحجز.</span>
              </p>
            )}
          </div>
        </form>

        {/* Result Column */}
        <section className="xl:col-span-5 space-y-4">
          {renderResultCard()}
        </section>
      </div>
    </div>
  );
}

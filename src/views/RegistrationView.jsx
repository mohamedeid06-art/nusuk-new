import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  RotateCw,
  FileSpreadsheet,
  Play,
  Pause,
  Download,
  Trash2,
  Plus,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ShieldCheck,
  ShieldX,
  Image as ImageIcon,
  RefreshCw,
  Copy,
  Mail,
  Lock,
  CreditCard,
  FileBadge2,
} from 'lucide-react';
import NationalityCombobox from '../components/NationalityCombobox';
import RawdahEligibilityCard from '../components/RawdahEligibilityCard';
import ToggleSwitch from '../components/ToggleSwitch';
import { parseBulkInput, exportQueueToCsv } from '../utils/bulkParser';
import { buildAssetUrl } from '../services/api';

const ROLE_OPTIONS = [
  { value: '', label: 'تلقائي (حسب حالة المجموعة)' },
  { value: 'leader', label: 'رئيسي (leader — emu1)' },
  { value: 'companion', label: 'مرافق (companion — emu2)' },
];

const QUEUE_STATUS_META = {
  pending: {
    label: 'قيد الانتظار',
    cls: 'bg-slate-800 text-slate-300 border-slate-700',
    Icon: Clock,
  },
  running: {
    label: 'جاري التنفيذ...',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    Icon: Loader2,
    spin: true,
  },
  success: {
    label: 'تم التسجيل',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    Icon: CheckCircle2,
  },
  ineligible: {
    label: 'غير مؤهل للروضة',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    Icon: ShieldX,
  },
  error: {
    label: 'خطأ',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    Icon: XCircle,
  },
};

export default function RegistrationView({
  settings,
  statusData,
  connectionState,
  onRunSingle,
  lastSingleResult,
  singleLoading,
  bulkState,
  onAddBulkItems,
  onStartBulk,
  onPauseBulk,
  onClearBulk,
  onRemoveBulkItem,
  onRetryFailedBulk,
  onChangeBulkConfig,
  onCopy,
  onOpenImage,
  onNavigateSettings,
  onNotify,
}) {
  const [activeSubTab, setActiveSubTab] = useState('single'); // 'single' | 'bulk'

  // Single form state
  const [passport, setPassport] = useState('');
  const [visa, setVisa] = useState('');
  const [nationality, setNationality] = useState(settings.defaultNationality || 'مصر');
  const [pilgrimEmail, setPilgrimEmail] = useState('');
  const [pilgrimPassword, setPilgrimPassword] = useState('');
  const [forceRole, setForceRole] = useState('');
  const [autoCloseGroup, setAutoCloseGroup] = useState(true);
  const [skipPermitCheck, setSkipPermitCheck] = useState(false);

  // Bulk paste text
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    if (!nationality && settings.defaultNationality) {
      setNationality(settings.defaultNationality);
    }
  }, [settings.defaultNationality]);

  const missingCreds = !settings.clientEmail?.trim() || !settings.clientPass?.trim();
  const offline = connectionState !== 'connected';
  const busy = Boolean(statusData?.busy);
  const isSingleBusy = Boolean(singleLoading);

  const handleSingleAction = async (mode) => {
    if (missingCreds) {
      onNotify({
        type: 'warning',
        title: 'بيانات إيميل OTP ناقصة',
        message: 'يرجى إدخال client_email و client_pass من صفحة الإعدادات أولاً.',
      });
      return;
    }
    if (!passport.trim() || !visa.trim()) {
      onNotify({
        type: 'warning',
        title: 'حقول مطلوبة',
        message: 'يرجى إدخال رقم الجواز ورقم التأشيرة.',
      });
      return;
    }

    const res = await onRunSingle(mode, {
      passport: passport.trim(),
      visa: visa.trim(),
      nationality: nationality.trim() || settings.defaultNationality || 'مصر',
      email: pilgrimEmail.trim(),
      password: pilgrimPassword.trim(),
      forceRole: forceRole || null,
      autoCloseGroup,
      skipPermitCheck,
    });

    if (res?.success) {
      setPassport('');
      setVisa('');
      setPilgrimEmail('');
    }
  };

  const handleParseBulk = () => {
    if (!pasteText.trim()) {
      onNotify({ type: 'warning', title: 'الحقل فارغ', message: 'الصق صفوف المعتمرين أولاً.' });
      return;
    }
    const { items, skipped } = parseBulkInput(pasteText, settings.defaultNationality || 'مصر');
    if (items.length === 0) {
      onNotify({
        type: 'error',
        title: 'لم يتم العثور على صفوف صالحة',
        message: 'تأكد من وجود عمودين على الأقل (الجواز، التأشيرة) مفصولين بفاصلة أو Tab.',
      });
      return;
    }
    onAddBulkItems(items);
    setPasteText('');
    onNotify({
      type: 'success',
      title: `تمت إضافة ${items.length} معتمر للطابور`,
      message: skipped.length > 0 ? `تم تجاهل ${skipped.length} سطر غير مكتمل.` : 'جاهز للتشغيل التلقائي.',
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const { items, skipped } = parseBulkInput(content, settings.defaultNationality || 'مصر');
      if (items.length === 0) {
        onNotify({
          type: 'error',
          title: 'الملف لا يحتوي على صفوف صالحة',
          message: 'تأكد من تنسيق CSV/TSV: الجواز، التأشيرة، الجنسية، الإيميل.',
        });
      } else {
        onAddBulkItems(items);
        onNotify({
          type: 'success',
          title: `تم استيراد ${items.length} سجل من الملف`,
          message: skipped.length > 0 ? `تم تخطي ${skipped.length} سطر.` : undefined,
        });
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleInsertSample = () => {
    setPasteText(
      [
        'رقم الجواز\tرقم التأشيرة\tالجنسية\tالإيميل',
        'A12345678\t6098765432\tمصر\t',
        'B87654321\t6091122334\tالأردن\tpilgrim2@example.com',
        'C55443322\t6095566778\tالمغرب\t',
      ].join('\n')
    );
  };

  const {
    items: queueItems,
    running: queueRunning,
    paused: queuePaused,
    mode: queueMode,
    forceRole: queueRole,
    autoCloseGroup: queueAutoCloseGroup = true,
    skipPermitCheck: queueSkipPermitCheck = false,
  } = bulkState;
  const stats = {
    total: queueItems.length,
    pending: queueItems.filter((i) => i.status === 'pending').length,
    success: queueItems.filter((i) => i.status === 'success').length,
    ineligible: queueItems.filter((i) => i.status === 'ineligible').length,
    error: queueItems.filter((i) => i.status === 'error').length,
  };
  const completedCount = stats.success + stats.ineligible + stats.error;
  const queueProgress = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Missing OTP Credentials Banner */}
      {missingCreds && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-200">لم يتم ضبط إيميل استلام الـ OTP بعد</p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                أدخل <code className="font-mono">client_email</code> و <code className="font-mono">client_pass</code> مرة واحدة في الإعدادات ليتم إرسالها تلقائياً مع كل طلب.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateSettings}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
          >
            إعداد إيميل الـ OTP
          </button>
        </div>
      )}

      {/* Mode Switcher Tabs + Current Group Mini Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('single')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'single'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>إدخال فردي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('bulk')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeSubTab === 'bulk'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>الإدخال الجماعي (Excel / CSV)</span>
            {stats.total > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-950/50 text-emerald-200 tabular-nums">
                {stats.total}
              </span>
            )}
          </button>
        </div>

        {/* Live Next Role Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs">
          <span className="text-slate-400">الدور التلقائي القادم:</span>
          <span
            className={`font-bold ${
              statusData?.next_role === 'companion' ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {statusData?.next_target || 'المحاكي الأول (حساب رئيسي جديد)'}
          </span>
        </div>
      </div>

      {/* ========================================= */}
      {/* TAB 1: SINGLE REGISTRATION / RECOVERY     */}
      {/* ========================================= */}
      {activeSubTab === 'single' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-7 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-base font-extrabold text-white">بيانات المعتمر</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  عند التسجيل، لو كان الحساب مسجلاً مسبقاً ينتقل السيرفر تلقائياً للاسترجاع وفحص الروضة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Passport */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block" htmlFor="single-passport">
                  رقم الجواز <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                  <input
                    id="single-passport"
                    type="text"
                    dir="ltr"
                    value={passport}
                    disabled={isSingleBusy}
                    onChange={(e) => setPassport(e.target.value)}
                    placeholder="A12345678"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Visa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block" htmlFor="single-visa">
                  رقم التأشيرة <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <FileBadge2 className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                  <input
                    id="single-visa"
                    type="text"
                    dir="ltr"
                    value={visa}
                    disabled={isSingleBusy}
                    onChange={(e) => setVisa(e.target.value)}
                    placeholder="6098765432"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Nationality */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block" htmlFor="single-nat">
                  الجنسية
                </label>
                <NationalityCombobox
                  id="single-nat"
                  value={nationality}
                  disabled={isSingleBusy}
                  onChange={setNationality}
                />
              </div>

              {/* Role selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block" htmlFor="single-role">
                  اختيار الدور (<code className="font-mono text-emerald-400">force_role</code>)
                </label>
                <select
                  id="single-role"
                  value={forceRole}
                  disabled={isSingleBusy}
                  onChange={(e) => setForceRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilgrim Email (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block" htmlFor="single-email">
                  إيميل الحاج <span className="text-slate-500 font-normal">(اختياري)</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                  <input
                    id="single-email"
                    type="email"
                    dir="ltr"
                    value={pilgrimEmail}
                    disabled={isSingleBusy}
                    onChange={(e) => setPilgrimEmail(e.target.value)}
                    placeholder={settings.clientEmail || 'يستخدم client_email تلقائياً'}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block" htmlFor="single-pass">
                  كلمة المرور <span className="text-slate-500 font-normal">(اختياري)</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                  <input
                    id="single-pass"
                    type="text"
                    dir="ltr"
                    value={pilgrimPassword}
                    disabled={isSingleBusy}
                    onChange={(e) => setPilgrimPassword(e.target.value)}
                    placeholder={settings.defaultPassword ? 'محفوظة في الإعدادات' : 'افتراضي السيرفر'}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Extra v2 Switches: auto_close_group & skip_permit_check */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-200 block">
                    إغلاق الجروب تلقائياً (<code className="font-mono text-emerald-400">auto_close_group</code>)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                    خروج الرئيسي تلقائياً بعد اكتمال 4 أفراد — أوقفه لإبقائه مفتوحاً للحجز المباشر
                  </span>
                </div>
                <ToggleSwitch
                  checked={autoCloseGroup}
                  onChange={setAutoCloseGroup}
                  disabled={isSingleBusy}
                  ariaLabel="إغلاق المجموعة تلقائياً"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-200 block">
                    تخطي فحص التصاريح (<code className="font-mono text-amber-300">skip_permit_check</code>)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                    تخطي فحص تصاريح الروضة السابقة يدوياً أثناء الاسترجاع
                  </span>
                </div>
                <ToggleSwitch
                  checked={skipPermitCheck}
                  onChange={setSkipPermitCheck}
                  disabled={isSingleBusy}
                  accent="amber"
                  ariaLabel="تخطي فحص التصاريح السابقة"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                disabled={offline || isSingleBusy || queueRunning}
                onClick={() => handleSingleAction('register')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {singleLoading === 'register' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>تسجيل معتمر جديد</span>
              </button>

              <button
                type="button"
                disabled={offline || isSingleBusy || queueRunning}
                onClick={() => handleSingleAction('recover')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {singleLoading === 'recover' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                <span>استرجاع وفحص الروضة</span>
              </button>
            </div>

            {busy && !singleLoading && (
              <p className="text-xs text-amber-300 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>المحاكيات مشغولة حالياً بعملية أخرى — انتظر انتهاءها أو راقب الشريط العلوي.</span>
              </p>
            )}
          </section>

          {/* Right Result Column */}
          <section className="xl:col-span-5 space-y-4">
            {singleLoading ? (
              <div className="rounded-2xl border border-amber-500/35 bg-slate-900/75 p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[280px]">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">
                    {singleLoading === 'recover'
                      ? 'جاري استرجاع الحساب وفحص تصاريح الروضة...'
                      : 'جاري تنفيذ تسجيل المعتمر على المحاكي...'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                    يقوم السيرفر الآن بملء البيانات، استلام كود الـ OTP من Gmail، وفحص الحالة على تطبيق نسك.
                  </p>
                </div>
              </div>
            ) : lastSingleResult ? (
              <RawdahEligibilityCard
                result={lastSingleResult}
                apiBaseUrl={settings.apiBaseUrl}
                onCopy={onCopy}
                onOpenImage={onOpenImage}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[280px]">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/70 text-slate-500 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">نتيجة العملية وفحص أحقية الروضة</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    ستظهر هنا تفاصيل التسجيل، Nusuk ID المستخرج، وبطاقة فحص أحقية تصريح الروضة (مؤهل بالأخضر / غير مؤهل بالأحمر) فور الانتهاء.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: BULK QUEUE / PASTE FROM EXCEL      */}
      {/* ========================================= */}
      {activeSubTab === 'bulk' && (
        <div className="space-y-6">
          {/* Input & Import Panel */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>لصق قائمة المعتمرين من Excel أو CSV</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ترتيب الأعمدة: <span className="text-slate-200 font-semibold">رقم الجواز، رقم التأشيرة، الجنسية (اختياري)، الإيميل (اختياري)، كلمة المرور (اختياري)</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  مثال توضيحي
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>رفع ملف CSV</span>
                  <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>

            <textarea
              rows={5}
              dir="ltr"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'A12345678\t6098765432\tمصر\tpilgrim@gmail.com\nB87654321,6091122334,الأردن'}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 p-3.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={queueMode}
                  disabled={queueRunning}
                  onChange={(e) => onChangeBulkConfig({ mode: e.target.value })}
                  className="rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2 text-xs font-bold text-slate-200 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                >
                  <option value="register" className="bg-slate-900">نوع التشغيل: تسجيل جديد (/api/register)</option>
                  <option value="recover" className="bg-slate-900">نوع التشغيل: استرجاع وفحص الروضة (/api/recover)</option>
                </select>

                <select
                  value={queueRole}
                  disabled={queueRunning}
                  onChange={(e) => onChangeBulkConfig({ forceRole: e.target.value })}
                  className="rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2 text-xs font-bold text-slate-200 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                      الدور: {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleParseBulk}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة للطابور</span>
              </button>
            </div>

            {/* Bulk Queue v2 Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-200 block">
                    إغلاق الجروب تلقائياً (<code className="font-mono text-emerald-400">auto_close_group</code>)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    إغلاق وخروج الحساب الرئيسي بعد اكتمال 4 أفراد (أوقفه لإبقاء الجروب مفتوحاً للحجز)
                  </span>
                </div>
                <ToggleSwitch
                  checked={queueAutoCloseGroup}
                  onChange={(val) => onChangeBulkConfig({ autoCloseGroup: val })}
                  disabled={queueRunning}
                  ariaLabel="إغلاق الجروب تلقائياً في الطابور"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-200 block">
                    تخطي فحص التصاريح (<code className="font-mono text-amber-300">skip_permit_check</code>)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    تخطي فحص التصاريح السابقة يدوياً عند الاسترجاع داخل الطابور
                  </span>
                </div>
                <ToggleSwitch
                  checked={queueSkipPermitCheck}
                  onChange={(val) => onChangeBulkConfig({ skipPermitCheck: val })}
                  disabled={queueRunning}
                  accent="amber"
                  ariaLabel="تخطي فحص التصاريح في الطابور"
                />
              </div>
            </div>
          </section>

          {/* Queue Controls & Progress */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 tabular-nums">
                  الإجمالي: {stats.total}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/70 text-slate-400 tabular-nums">
                  انتظار: {stats.pending}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 tabular-nums">
                  نجاح: {stats.success}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 tabular-nums">
                  غير مؤهل: {stats.ineligible}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 tabular-nums">
                  أخطاء: {stats.error}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!queueRunning ? (
                  <button
                    type="button"
                    disabled={offline || stats.pending === 0 || Boolean(singleLoading)}
                    onClick={onStartBulk}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{queuePaused ? 'استئناف الطابور' : 'بدء التشغيل التلقائي'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPauseBulk}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/40 transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>إيقاف مؤقت</span>
                  </button>
                )}

                {stats.error > 0 && !queueRunning && (
                  <button
                    type="button"
                    onClick={onRetryFailedBulk}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة الفاشل ({stats.error})</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={stats.total === 0}
                  onClick={() => exportQueueToCsv(queueItems)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors disabled:opacity-45"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير CSV</span>
                </button>

                <button
                  type="button"
                  disabled={stats.total === 0 || queueRunning}
                  onClick={onClearBulk}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-45"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح الكل</span>
                </button>
              </div>
            </div>

            {stats.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {queueRunning
                      ? 'جاري معالجة الطابور بالتتابع (معتمر تلو الآخر)...'
                      : queuePaused
                        ? 'الطابور متوقف مؤقتاً'
                        : 'تقدم الطابور'}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">{queueProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-300"
                    style={{ width: `${queueProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Queue Table */}
            {queueItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-slate-500 text-sm">
                لا توجد صفوف في الطابور بعد. الصق البيانات من Excel أو ارفع ملف CSV أعلاه.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800/90">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3 font-bold">#</th>
                      <th className="py-3 px-3 font-bold">الجواز / التأشيرة</th>
                      <th className="py-3 px-3 font-bold">الجنسية والإيميل</th>
                      <th className="py-3 px-3 font-bold">الحالة</th>
                      <th className="py-3 px-3 font-bold">المعتمر / ID</th>
                      <th className="py-3 px-3 font-bold">أهلية الروضة / النتيجة</th>
                      <th className="py-3 px-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                    {queueItems.map((row, idx) => {
                      const st = QUEUE_STATUS_META[row.status] || QUEUE_STATUS_META.pending;
                      const StIcon = st.Icon;
                      const shotUrl = row.screenshot ? buildAssetUrl(settings.apiBaseUrl, row.screenshot) : null;

                      return (
                        <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-500 tabular-nums">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-slate-100" dir="ltr">
                              {row.passport}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5" dir="ltr">
                              {row.visa}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200">{row.nationality}</div>
                            {row.email && (
                              <div className="font-mono text-[11px] text-slate-400 truncate max-w-[160px]" dir="ltr">
                                {row.email}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border whitespace-nowrap ${st.cls}`}
                            >
                              <StIcon className={`w-3.5 h-3.5 ${st.spin ? 'animate-spin' : ''}`} />
                              <span>{st.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {row.pilgrimName || row.nusukId ? (
                              <div>
                                <div className="font-bold text-slate-100">{row.pilgrimName || '—'}</div>
                                {row.nusukId && (
                                  <button
                                    type="button"
                                    onClick={() => onCopy(row.nusukId, 'تم نسخ Nusuk ID')}
                                    className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-300 hover:underline mt-0.5"
                                    dir="ltr"
                                  >
                                    <span>{row.nusukId}</span>
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="space-y-1">
                              {typeof row.eligible === 'boolean' && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    row.eligible
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {row.eligible ? (
                                    <ShieldCheck className="w-3 h-3" />
                                  ) : (
                                    <ShieldX className="w-3 h-3" />
                                  )}
                                  {row.eligible ? 'مؤهل للروضة' : 'غير مؤهل للروضة'}
                                </span>
                              )}
                              {row.message && (
                                <p className="text-[11px] text-slate-300 leading-relaxed break-words">{row.message}</p>
                              )}
                              {shotUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenImage({
                                      url: shotUrl,
                                      title: `لقطة خطأ — جواز ${row.passport}`,
                                      subtitle: row.message,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200 underline"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>عرض لقطة الخطأ</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              disabled={row.status === 'running'}
                              onClick={() => onRemoveBulkItem(row.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors disabled:opacity-30"
                              title="حذف الصف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

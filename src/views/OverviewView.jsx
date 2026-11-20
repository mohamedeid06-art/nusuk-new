import React, { useEffect, useState } from 'react';
import {
  Users,
  Crown,
  UserCheck,
  Fingerprint,
  Gauge,
  LogOut,
  RotateCcw,
  Copy,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Loader2,
  UserPlus,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { FINGERPRINT_LIMIT } from '../constants/nationalities';

const SPEED_PRESETS = [
  { value: 0.8, label: '0.8x', desc: 'سريع جداً' },
  { value: 1.0, label: '1.0x', desc: 'قياسي' },
  { value: 1.5, label: '1.5x', desc: 'متوازن' },
  { value: 2.0, label: '2.0x', desc: 'مضاد للاج' },
  { value: 3.0, label: '3.0x', desc: 'أقصى ثبات' },
];

export default function OverviewView({
  statusData,
  connectionState,
  onForceCloseGroup,
  onResetState,
  onSetSpeed,
  onCopy,
  onNavigate,
}) {
  const [speedValue, setSpeedValue] = useState(statusData?.speed_multiplier ?? 1.0);
  const [isDraggingSpeed, setIsDraggingSpeed] = useState(false);
  const [savingSpeed, setSavingSpeed] = useState(false);

  const [resetCountersChecked, setResetCountersChecked] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isDraggingSpeed && statusData?.speed_multiplier != null) {
      setSpeedValue(Number(statusData.speed_multiplier));
    }
  }, [statusData?.speed_multiplier, isDraggingSpeed]);

  const offline = connectionState !== 'connected';
  const busy = Boolean(statusData?.busy);
  const leaderActive = Boolean(statusData?.leader_active);
  const companions = statusData?.companions || [];
  const companionsCount = statusData?.companions_count ?? companions.length;
  const maxCompanions = statusData?.max_companions ?? 3;
  const progressPct = maxCompanions > 0 ? Math.min(100, Math.round((companionsCount / maxCompanions) * 100)) : 0;

  const emu1Counter = statusData?.emu1_counter ?? 0;
  const emu2Counter = statusData?.emu2_counter ?? 0;
  const emu1Health = statusData?.health?.emu1 || { ok: true, reason: '' };
  const emu2Health = statusData?.health?.emu2 || { ok: true, reason: '' };

  const applySpeed = async (val) => {
    const clamped = Math.max(0.8, Math.min(3.0, Number(val)));
    setSpeedValue(clamped);
    setSavingSpeed(true);
    try {
      await onSetSpeed(clamped);
    } finally {
      setSavingSpeed(false);
    }
  };

  const handleConfirmForceClose = async () => {
    setActionLoading(true);
    try {
      await onForceCloseGroup();
      setCloseModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setActionLoading(true);
    try {
      await onResetState(resetCountersChecked);
      setResetModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const renderCounterSegments = (count, accent) => (
    <div className="grid grid-cols-5 gap-1.5 mt-3">
      {Array.from({ length: FINGERPRINT_LIMIT }).map((_, idx) => {
        const filled = idx < count;
        const colorClass = filled
          ? count >= 4
            ? 'bg-amber-400 shadow-sm shadow-amber-500/40'
            : accent === 'emerald'
              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
              : 'bg-amber-500 shadow-sm shadow-amber-500/30'
          : 'bg-slate-800';
        return <div key={idx} className={`h-2 rounded-full transition-all ${colorClass}`} />;
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Offline banner */}
      {offline && (
        <div className="rounded-2xl border border-rose-500/35 bg-rose-950/25 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-200">السيرفر المحلي غير متصل حالياً</p>
              <p className="text-xs text-rose-300/80 mt-0.5">
                شغّل <span className="font-mono">uvicorn server_merged:app</span> أو راجع عنوان السيرفر من الإعدادات.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-200 border border-rose-500/35 hover:bg-rose-500/30 transition-colors"
          >
            فتح الإعدادات
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Next Target Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">الدور القادم</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                statusData?.next_role === 'companion'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-white mt-3">
            {statusData?.next_role === 'companion' ? 'مرافق (Companion)' : 'رئيسي (Leader)'}
          </p>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {statusData?.next_target || 'بانتظار الاتصال بالسيرفر'}
          </p>
        </div>

        {/* Group Progress KPI */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">تقدم المجموعة النشطة</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-extrabold text-white tabular-nums">
              {companionsCount} / {maxCompanions}
            </span>
            <span className="text-xs text-slate-400">مرافقين</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* EMU1 Fingerprint Counter */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">بصمة المحاكي الأول (emu1)</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-2xl font-extrabold text-white tabular-nums">
              {emu1Counter} <span className="text-sm font-semibold text-slate-400">/ {FINGERPRINT_LIMIT}</span>
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                emu1Health.ok
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {emu1Health.ok ? 'سليم' : emu1Health.reason || 'تنبيه'}
            </span>
          </div>
          {renderCounterSegments(emu1Counter, 'emerald')}
        </div>

        {/* EMU2 Fingerprint Counter */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">بصمة المحاكي الثاني (emu2)</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-2xl font-extrabold text-white tabular-nums">
              {emu2Counter} <span className="text-sm font-semibold text-slate-400">/ {FINGERPRINT_LIMIT}</span>
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                emu2Health.ok
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {emu2Health.ok ? 'سليم' : emu2Health.reason || 'تنبيه'}
            </span>
          </div>
          {renderCounterSegments(emu2Counter, 'amber')}
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Active Group Card (7 cols) */}
        <section className="xl:col-span-7 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>المجموعة النشطة حالياً</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  رئيسي واحد + حتى {maxCompanions} مرافقين (تُغلق المجموعة تلقائياً عند اكتمال 4 أفراد)
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  leaderActive
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    leaderActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {leaderActive ? 'مجموعة نشطة' : 'لا توجد مجموعة نشطة'}
              </span>
            </div>

            {/* Leader Box */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                leaderActive
                  ? 'border-emerald-500/35 bg-gradient-to-l from-emerald-950/40 via-slate-950/70 to-slate-950/70'
                  : 'border-dashed border-slate-700/90 bg-slate-950/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      leaderActive
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/70 border-slate-700 text-slate-500'
                    }`}
                  >
                    <Crown className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90">
                      الحساب الرئيسي (Leader — emu1)
                    </span>
                    <h4 className="text-base font-extrabold text-white truncate mt-0.5">
                      {leaderActive ? statusData.leader_name || 'معتمر' : 'لم يتم تسجيل حساب رئيسي بعد'}
                    </h4>
                    {leaderActive && statusData.leader_id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">Nusuk ID:</span>
                        <code className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md" dir="ltr">
                          {statusData.leader_id}
                        </code>
                        <button
                          type="button"
                          onClick={() => onCopy(statusData.leader_id, 'تم نسخ Nusuk ID الرئيسي')}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                          title="نسخ Nusuk ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">
                        ابدأ بتسجيل معتمر جديد لفتح مجموعة تلقائياً على المحاكي الأول.
                      </p>
                    )}
                  </div>
                </div>
                {!leaderActive && (
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-colors shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>تسجيل الآن</span>
                  </button>
                )}
              </div>
            </div>

            {/* Companions List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>المرافقون المربوطون ({companionsCount} من {maxCompanions})</span>
                </h4>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">{progressPct}%</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: maxCompanions }).map((_, index) => {
                  const comp = companions[index];
                  if (comp) {
                    return (
                      <div
                        key={comp.id || index}
                        className="rounded-xl border border-amber-500/30 bg-slate-950/75 p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                            مرافق #{index + 1}
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-100 truncate">{comp.name || 'معتمر'}</p>
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <span className="text-[11px] font-mono text-slate-400 truncate" dir="ltr">
                              {comp.id}
                            </span>
                            {comp.id && (
                              <button
                                type="button"
                                onClick={() => onCopy(comp.id, `تم نسخ ID المرافق #${index + 1}`)}
                                className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                                title="نسخ"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-${index}`}
                      className="rounded-xl border border-dashed border-slate-800 bg-slate-950/35 p-3.5 flex flex-col items-center justify-center text-center min-h-[104px]"
                    >
                      <span className="text-xs font-semibold text-slate-500">مرافق #{index + 1}</span>
                      <span className="text-[11px] text-slate-600 mt-1">
                        {leaderActive ? 'بانتظار الربط' : 'مقعد فارغ'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick group action buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={offline || busy || !leaderActive}
              onClick={() => setCloseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              <span>إنهاء المجموعة الحالية</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{leaderActive ? 'إضافة مرافق للمجموعة' : 'بدء تسجيل مجموعة جديدة'}</span>
            </button>
          </div>
        </section>

        {/* Controls Column (5 cols): Anti-Lag Speed & Reset State */}
        <div className="xl:col-span-5 space-y-6">
          {/* Anti-Lag Speed Multiplier Card */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-amber-400" />
                  <span>سرعة الانتظار (Anti-Lag Speed)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  مضاعف زمن الانتظار الذكي بين الخطوات لمقاومة بطء المحاكي أو الإنترنت
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/35">
                {savingSpeed && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                <span className="text-base font-mono font-extrabold text-amber-300 tabular-nums" dir="ltr">
                  {Number(speedValue).toFixed(1)}x
                </span>
              </div>
            </div>

            <div className="pt-2">
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.1"
                dir="ltr"
                disabled={offline}
                value={speedValue}
                onMouseDown={() => setIsDraggingSpeed(true)}
                onTouchStart={() => setIsDraggingSpeed(true)}
                onChange={(e) => setSpeedValue(parseFloat(e.target.value))}
                onMouseUp={(e) => {
                  setIsDraggingSpeed(false);
                  applySpeed(parseFloat(e.currentTarget.value));
                }}
                onTouchEnd={(e) => {
                  setIsDraggingSpeed(false);
                  applySpeed(parseFloat(e.currentTarget.value));
                }}
                onKeyUp={(e) => applySpeed(parseFloat(e.currentTarget.value))}
                className="w-full speed-slider disabled:opacity-50"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2" dir="ltr">
                <span>0.8x (Fast)</span>
                <span>1.5x</span>
                <span>3.0x (Max Stability)</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {SPEED_PRESETS.map((preset) => {
                const active = Math.abs(speedValue - preset.value) < 0.05;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={offline || savingSpeed}
                    onClick={() => applySpeed(preset.value)}
                    className={`rounded-xl py-2 px-1 text-center border transition-all disabled:opacity-50 ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="block text-xs font-mono font-bold" dir="ltr">
                      {preset.label}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 truncate">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Reset State Card */}
          <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <span>تصفير الحالة (Reset State)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                يُصفّر بيانات المجموعة الحالية وحالة سلامة المحاكيات داخل <code className="font-mono text-slate-300">nusuk_state.json</code> دون إجراء تسجيل خروج من التطبيق.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-3 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={resetCountersChecked}
                onChange={(e) => setResetCountersChecked(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-slate-200 block">
                  تصفير عدادات تغيير البصمة أيضاً (reset_counters)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  إعادة عدادي emu1 و emu2 إلى 0 / {FINGERPRINT_LIMIT}
                </span>
              </div>
            </label>

            <button
              type="button"
              disabled={offline || busy}
              onClick={() => setResetModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35 hover:bg-rose-500/25 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تصفير الحالة الآن</span>
            </button>
          </section>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        open={closeModalOpen}
        title="تأكيد إنهاء المجموعة الحالية"
        description={`سيقوم السيرفر بتسجيل خروج الحساب الرئيسي (${statusData?.leader_name || 'الحالي'}) من المحاكي الأول وتصفير المجموعة وزيادة عداد بصمة emu1.`}
        confirmText="نعم، أنهِ المجموعة"
        variant="warning"
        loading={actionLoading}
        onConfirm={handleConfirmForceClose}
        onCancel={() => setCloseModalOpen(false)}
      />

      <ConfirmModal
        open={resetModalOpen}
        title="تأكيد تصفير الحالة"
        description={
          resetCountersChecked
            ? 'سيتم تصفير المجموعة النشطة وحالة السلامة، بالإضافة إلى إعادة عدادي بصمة emu1 و emu2 إلى الصفر.'
            : 'سيتم تصفير المجموعة النشطة وحالة السلامة فقط مع الاحتفاظ بعدادات تغيير البصمة الحالية.'
        }
        confirmText="تأكيد التصفير"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}

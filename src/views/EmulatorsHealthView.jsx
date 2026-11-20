import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  Monitor,
  AppWindow,
  Fingerprint,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { FINGERPRINT_LIMIT } from '../constants/nationalities';

export default function EmulatorsHealthView({
  statusData,
  connectionState,
  healthData,
  healthCheckedAt,
  checkingHealth,
  onCheckHealth,
  onRandomizeEmulator,
}) {
  const [confirmEmu, setConfirmEmu] = useState(null); // 'emu1' | 'emu2' | null
  const [randomizingEmu, setRandomizingEmu] = useState(null);

  useEffect(() => {
    if (connectionState === 'connected' && !healthData && !checkingHealth) {
      onCheckHealth(true);
    }
  }, [connectionState]);

  const offline = connectionState !== 'connected';
  const busy = Boolean(statusData?.busy || healthData?.busy);

  const handleConfirmRandomize = async () => {
    if (!confirmEmu) return;
    const target = confirmEmu;
    setRandomizingEmu(target);
    try {
      await onRandomizeEmulator(target);
      setConfirmEmu(null);
    } finally {
      setRandomizingEmu(null);
    }
  };

  const renderEmuCard = (emuKey, fallbackLabel, accent) => {
    const info = healthData?.emulators?.[emuKey] || null;
    const statusHealth = statusData?.health?.[emuKey];
    const counter = info?.counter ?? statusData?.[`${emuKey}_counter`] ?? 0;
    const healthy = info ? info.healthy : statusHealth?.ok ?? true;
    const reason = info ? info.reason : statusHealth?.reason || '';
    const connected = info ? info.connected : null;
    const label = info?.label || fallbackLabel;

    return (
      <div
        key={emuKey}
        className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 flex flex-col justify-between gap-5"
      >
        <div className="space-y-5">
          {/* Card Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                  accent === 'emerald'
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                }`}
              >
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">{label}</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300" dir="ltr">
                    {emuKey}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5" dir="ltr">
                  {info?.serial || (emuKey === 'emu1' ? 'emulator-5596' : 'emulator-5594')}
                </p>
              </div>
            </div>

            {/* Health status badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                healthy
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
              }`}
            >
              {healthy ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{healthy ? 'سليم (Healthy)' : 'غير سليم'}</span>
            </span>
          </div>

          {/* Alert note or error */}
          {!healthy && reason && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>سبب التنبيه: {reason}</span>
            </div>
          )}

          {info?.note && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-3.5 py-2.5 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{info.note}</span>
            </div>
          )}

          {info?.error && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-950/25 px-3.5 py-2.5 text-xs text-rose-200 break-words">
              <span className="font-bold">خطأ الاتصال: </span>
              <span className="font-mono" dir="ltr">{info.error}</span>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Connection */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                {connected === true ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                )}
                حالة الاتصال (ADB / u2)
              </span>
              <p
                className={`text-sm font-bold mt-1.5 ${
                  connected === true
                    ? 'text-emerald-300'
                    : connected === false
                      ? 'text-rose-400'
                      : 'text-slate-400'
                }`}
              >
                {connected === true
                  ? 'متصل وجاهز'
                  : connected === false
                    ? 'غير متصل'
                    : info?.note
                      ? 'تم التخطي (مشغول)'
                      : 'لم يُفحص بعد'}
              </p>
            </div>

            {/* Screen dimensions */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                أبعاد الشاشة
              </span>
              <p className="text-sm font-mono font-bold text-slate-100 mt-1.5" dir="ltr">
                {info?.screen || '—'}
              </p>
            </div>

            {/* Foreground App */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <AppWindow className="w-3.5 h-3.5 text-amber-400" />
                التطبيق المفتوح حالياً
              </span>
              <p className="text-xs font-mono font-semibold text-slate-200 mt-1.5 truncate" dir="ltr" title={info?.foreground_app || ''}>
                {info?.foreground_app || '—'}
              </p>
            </div>

            {/* Nusuk in Foreground */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
              <span className="text-[11px] text-slate-400 block">هل تطبيق نسك في الواجهة؟</span>
              <div className="mt-1.5 flex items-center gap-1.5">
                {info?.nusuk_in_foreground === true ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-300">نعم، نسك مفتوح</span>
                  </>
                ) : info?.nusuk_in_foreground === false ? (
                  <>
                    <XCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-300">لا، تطبيق آخر</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Fingerprint Counter Bar */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/90 p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                عداد البصمة التلقائي
              </span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">
                {counter} / {FINGERPRINT_LIMIT}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: FINGERPRINT_LIMIT }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx < counter
                      ? counter >= 4
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={offline || busy || Boolean(randomizingEmu)}
          onClick={() => setConfirmEmu(emuKey)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {randomizingEmu === emuKey ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري تغيير البصمة وإعادة التشغيل...</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4" />
              <span>تغيير البصمة وإعادة التشغيل ({emuKey})</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Health Top Toolbar */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl shadow-black/20">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
              healthData?.ok === false
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
            }`}
          >
            {healthData?.ok === false ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-white">الحالة العامة للمحاكيات</h3>
              {healthData && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    healthData.ok
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                  }`}
                >
                  {healthData.ok ? 'الكل سليم (OK)' : 'يوجد تنبيه'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {healthCheckedAt
                  ? `آخر فحص: ${new Date(healthCheckedAt).toLocaleTimeString('ar-EG')}`
                  : 'اضغط "فحص الصحة الفوري" لقراءة حالة ADB والشاشة والتطبيق النشط'}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={offline || checkingHealth}
          onClick={() => onCheckHealth(false)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checkingHealth ? 'animate-spin' : ''}`} />
          <span>{checkingHealth ? 'جاري الفحص...' : 'فحص الصحة الفوري'}</span>
        </button>
      </div>

      {/* Emulator Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderEmuCard('emu1', 'المحاكي الأول (الرئيسي)', 'emerald')}
        {renderEmuCard('emu2', 'المحاكي الثاني (المرافق)', 'amber')}
      </div>

      {/* Confirmation Modal for Randomize */}
      <ConfirmModal
        open={Boolean(confirmEmu)}
        title={`تغيير البصمة وإعادة تشغيل ${confirmEmu === 'emu1' ? 'المحاكي الأول (emu1)' : 'المحاكي الثاني (emu2)'}`}
        description="سيقوم السيرفر بتغيير Android ID و MAC و IMEI عشوائياً ثم إعادة تشغيل المحاكي بالكامل وفتح تطبيق نسك وتصفير العداد. قد تستغرق العملية من 30 ثانية إلى دقيقتين."
        confirmText="نعم، غيّر البصمة وأعد التشغيل"
        variant="warning"
        loading={Boolean(randomizingEmu)}
        onConfirm={handleConfirmRandomize}
        onCancel={() => !randomizingEmu && setConfirmEmu(null)}
      />
    </div>
  );
}

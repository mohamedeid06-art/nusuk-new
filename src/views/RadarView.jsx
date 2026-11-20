import React, { useMemo, useState } from 'react';
import {
  Radar,
  Play,
  Square,
  Search,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Smartphone,
  ShieldCheck,
  Copy,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Zap,
  MapPin,
  RefreshCw,
  ArrowUpLeft,
  Sparkles,
  FileJson,
  X,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../utils/soundAlert';

function getTodayIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sanitizeCssColor(color) {
  if (!color || typeof color !== 'string') return '#10b981';
  const c = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(c) || /^(rgb|hsl)a?\([^)]+\)$/i.test(c) || /^[a-zA-Z]{3,20}$/.test(c)) {
    return c;
  }
  return '#10b981';
}

function formatGenderBadge(gender) {
  if (gender === 1 || gender === '1' || String(gender).toLowerCase() === 'male' || String(gender).toLowerCase() === 'm') {
    return { label: 'رجال', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  }
  if (gender === 2 || gender === '2' || String(gender).toLowerCase() === 'female' || String(gender).toLowerCase() === 'f') {
    return { label: 'نساء', cls: 'bg-pink-500/15 text-pink-300 border-pink-500/30' };
  }
  if (gender == null || gender === '') return null;
  return { label: String(gender), cls: 'bg-slate-800 text-slate-300 border-slate-700' };
}

function extractTimeHHMM(slot) {
  const combined = `${slot?.time_en || ''} ${slot?.time_ar || ''}`;
  const m = combined.match(/\b(\d{1,2}:\d{2})\b/);
  return m ? m[1] : '';
}

function extractDateOnly(rawDate) {
  if (!rawDate) return '';
  const m = String(rawDate).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(rawDate);
}

function extractUmrahDatesList(apiData) {
  if (!apiData || typeof apiData !== 'object') return [];
  const resp = apiData.response || apiData.Response || apiData;
  const inner = resp?.data || resp?.Data || resp;
  const candidates =
    inner?.AvailableDates ||
    inner?.availableDates ||
    inner?.Dates ||
    inner?.dates ||
    (Array.isArray(inner) ? inner : null);
  return Array.isArray(candidates) ? candidates : [];
}

const INTERVAL_PRESETS = [5, 10, 15, 30, 60];

export default function RadarView({
  connectionState,
  nusukApiConfig,
  onUpdateNusukApiConfig,
  radarStatus,
  radarBannerVisible,
  onDismissRadarBanner,
  soundEnabled,
  onToggleSound,
  onTestSound,
  onStartRadar,
  onStopRadar,
  onCheckNowSlots,
  onCheckServerTime,
  onSignHeaders,
  onQueryUmrahDates,
  onBookSlot,
  onCopy,
  onNotify,
}) {
  const [showToken, setShowToken] = useState(false);
  const [notifPerm, setNotifPerm] = useState(() => getNotificationPermission());

  // Server time & sign headers states
  const [timeLoading, setTimeLoading] = useState(false);
  const [serverTimeResult, setServerTimeResult] = useState(null);
  const [signLoading, setSignLoading] = useState(false);
  const [signedHeadersResult, setSignedHeadersResult] = useState(null);

  // Rawdah Radar config
  const [radarCfg, setRadarCfg] = useState({
    date: getTodayIso(0),
    to_date: getTodayIso(30),
    count: 1,
    queue_type: 0,
    service_id: 1,
    latitude: 24.4709,
    longitude: 39.6122,
    interval_seconds: 15,
  });

  const [radarActionLoading, setRadarActionLoading] = useState(null); // 'start' | 'stop' | 'check' | null
  const [instantSlotsResult, setInstantSlotsResult] = useState(null);
  const [slotsSource, setSlotsSource] = useState('auto'); // 'auto' | 'radar' | 'instant'
  const [onlyOpenDays, setOnlyOpenDays] = useState(false);

  // Umrah available dates state
  const [umrahCfg, setUmrahCfg] = useState({
    date: getTodayIso(0),
    to_date: getTodayIso(30),
    count: 1,
    citizen_count: 1,
    service_id: 1,
    date_type: 1,
  });
  const [umrahLoading, setUmrahLoading] = useState(false);
  const [umrahResult, setUmrahResult] = useState(null);

  const offline = connectionState !== 'connected';
  const isRadarRunning = Boolean(radarStatus?.running);

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      onNotify({ type: 'success', title: 'تم تفعيل إشعارات المتصفح', message: 'سيصلك تنبيه فوري فور فتح أي مواعيد في الروضة.' });
    } else if (res === 'denied') {
      onNotify({ type: 'warning', title: 'تم حظر إشعارات المتصفح', message: 'يمكنك تفعيلها لاحقاً من إعدادات الموقع في المتصفح.' });
    }
  };

  const handleServerTime = async () => {
    setTimeLoading(true);
    try {
      const res = await onCheckServerTime();
      setServerTimeResult(res);
    } finally {
      setTimeLoading(false);
    }
  };

  const handleSignHeaders = async () => {
    setSignLoading(true);
    try {
      const res = await onSignHeaders({
        bearer_token: nusukApiConfig.bearerToken.trim() || null,
        device_id: nusukApiConfig.deviceId.trim() || null,
        lang: nusukApiConfig.lang || 'ar',
      });
      setSignedHeadersResult(res);
    } finally {
      setSignLoading(false);
    }
  };

  const buildRawdahQueryPayload = () => ({
    bearer_token: nusukApiConfig.bearerToken.trim() || null,
    device_id: nusukApiConfig.deviceId.trim() || null,
    lang: nusukApiConfig.lang || 'ar',
    count: Number(radarCfg.count) || 1,
    date: radarCfg.date,
    to_date: radarCfg.to_date,
    date_type: 1,
    queue_type: Number(radarCfg.queue_type),
    service_id: Number(radarCfg.service_id) || 1,
    latitude: Number(radarCfg.latitude),
    longitude: Number(radarCfg.longitude),
  });

  const handleStartRadarClick = async () => {
    setRadarActionLoading('start');
    try {
      const interval = Math.max(5, Math.min(300, Number(radarCfg.interval_seconds) || 15));
      await onStartRadar({
        ...buildRawdahQueryPayload(),
        interval_seconds: interval,
      });
      setSlotsSource('radar');
    } finally {
      setRadarActionLoading(null);
    }
  };

  const handleStopRadarClick = async () => {
    setRadarActionLoading('stop');
    try {
      await onStopRadar();
    } finally {
      setRadarActionLoading(null);
    }
  };

  const handleCheckNowClick = async () => {
    setRadarActionLoading('check');
    try {
      const res = await onCheckNowSlots(buildRawdahQueryPayload());
      setInstantSlotsResult(res);
      setSlotsSource('instant');
    } finally {
      setRadarActionLoading(null);
    }
  };

  const handleUmrahSubmit = async (e) => {
    e.preventDefault();
    setUmrahLoading(true);
    try {
      const res = await onQueryUmrahDates({
        bearer_token: nusukApiConfig.bearerToken.trim() || null,
        device_id: nusukApiConfig.deviceId.trim() || null,
        lang: nusukApiConfig.lang || 'ar',
        date: umrahCfg.date,
        to_date: umrahCfg.to_date,
        count: Number(umrahCfg.count) || 1,
        citizen_count: Number(umrahCfg.citizen_count) || 1,
        service_id: Number(umrahCfg.service_id) || 1,
        date_type: Number(umrahCfg.date_type) || 1,
      });
      setUmrahResult(res);
    } finally {
      setUmrahLoading(false);
    }
  };

  // Decide which slots list to display (radar live vs last instant check)
  const activeSource = useMemo(() => {
    if (slotsSource === 'instant' && instantSlotsResult) return 'instant';
    if (slotsSource === 'radar' && radarStatus) return 'radar';
    if (isRadarRunning || (radarStatus?.checks_count || 0) > 0) return 'radar';
    if (instantSlotsResult) return 'instant';
    return 'radar';
  }, [slotsSource, instantSlotsResult, radarStatus, isRadarRunning]);

  const rawDays =
    activeSource === 'instant'
      ? instantSlotsResult?.available_days || []
      : radarStatus?.available_days || [];

  const visibleDays = useMemo(() => {
    if (!onlyOpenDays) return rawDays;
    return rawDays.filter((d) => (d.slots_count ?? d.slots?.length ?? 0) > 0);
  }, [rawDays, onlyOpenDays]);

  const openDaysCount = rawDays.filter((d) => (d.slots_count ?? d.slots?.length ?? 0) > 0).length;
  const totalSlotsCount = rawDays.reduce((acc, d) => acc + (d.slots_count ?? d.slots?.length ?? 0), 0);

  const umrahParsedDates = useMemo(() => extractUmrahDatesList(umrahResult?.data), [umrahResult]);

  return (
    <div className="space-y-6">
      {/* Urgent Green Alert Banner when slots open */}
      {(radarBannerVisible || radarStatus?.has_open_slots || instantSlotsResult?.has_open_slots) && openDaysCount > 0 && (
        <div className="rounded-2xl border-2 border-emerald-400/70 bg-gradient-to-l from-emerald-950/90 via-emerald-900/50 to-slate-900/90 p-5 shadow-2xl shadow-emerald-950/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  تنبيه فوري: تم رصد مواعيد متاحة في الروضة الشريفة!
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950 tabular-nums">
                  {openDaysCount} يوم • {totalSlotsCount} فترة
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1">
                اختر أي فترة من الكروت بالأسفل أو انتقل مباشرة لمحرك الحجز لإصدار التصريح فوراً.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const firstOpenDay = rawDays.find((d) => (d.slots_count ?? d.slots?.length ?? 0) > 0);
                const firstSlot = firstOpenDay?.slots?.[0];
                onBookSlot?.({
                  date: extractDateOnly(firstOpenDay?.date),
                  time: extractTimeHHMM(firstSlot),
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>احجز أقرب موعد الآن</span>
            </button>
            {radarBannerVisible && (
              <button
                type="button"
                onClick={onDismissRadarBanner}
                className="p-2 rounded-xl text-emerald-200 hover:bg-emerald-900/60 transition-colors"
                aria-label="إغلاق البانر"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 1. NUSUK API SETTINGS BAR (Saved in localStorage) */}
      {/* ================================================= */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">إعدادات اتصال Nusuk API (محفوظة تلقائياً)</h3>
              <p className="text-[11px] text-slate-400">
                تُحفظ في <code className="font-mono">localStorage</code> وتُشارك مع تبويب أدوات الروضة والـ API المباشر
              </p>
            </div>
          </div>

          {/* Sound & Notification Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleSound}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'الصوت مفعّل' : 'الصوت مكتوم'}</span>
            </button>

            <button
              type="button"
              onClick={onTestSound}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="تجربة نغمة التنبيه الصوتية"
            >
              تجربة الصوت
            </button>

            {notifPerm !== 'unsupported' && (
              <button
                type="button"
                onClick={handleRequestNotif}
                disabled={notifPerm === 'granted'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  notifPerm === 'granted'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 cursor-default'
                    : notifPerm === 'denied'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/15 border-amber-500/35 text-amber-300 hover:bg-amber-500/25'
                }`}
              >
                {notifPerm === 'granted' ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>
                  {notifPerm === 'granted'
                    ? 'إشعارات المتصفح مفعّلة'
                    : notifPerm === 'denied'
                      ? 'الإشعارات محظورة'
                      : 'تفعيل إشعارات المتصفح'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Inputs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="radar-bearer">
              Bearer Token
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              <input
                id="radar-bearer"
                type={showToken ? 'text' : 'password'}
                dir="ltr"
                value={nusukApiConfig.bearerToken}
                onChange={(e) => onUpdateNusukApiConfig({ bearerToken: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIs... (مع أو بدون كلمة Bearer)"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pr-10 pl-10 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute left-3 text-slate-400 hover:text-slate-200"
                aria-label="إظهار أو إخفاء Bearer Token"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="radar-device">
              Device ID <span className="text-slate-500 font-normal">(اختياري)</span>
            </label>
            <div className="relative flex items-center">
              <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              <input
                id="radar-device"
                type="text"
                dir="ltr"
                value={nusukApiConfig.deviceId}
                onChange={(e) => onUpdateNusukApiConfig({ deviceId: e.target.value })}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pr-10 pl-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="radar-lang">
              اللغة (<code className="font-mono text-emerald-400">lang</code>)
            </label>
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              <select
                id="radar-lang"
                value={nusukApiConfig.lang}
                onChange={(e) => onUpdateNusukApiConfig({ lang: e.target.value })}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pr-9 pl-3 py-2.5 text-xs font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ar" className="bg-slate-900">العربية (ar)</option>
                <option value="en" className="bg-slate-900">English (en)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Utility Buttons: Server Time + Sign Headers */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={offline || timeLoading}
            onClick={handleServerTime}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors disabled:opacity-45"
          >
            {timeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            <span>فحص وقت سيرفر نسك</span>
          </button>

          <button
            type="button"
            disabled={offline || signLoading}
            onClick={handleSignHeaders}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors disabled:opacity-45"
          >
            {signLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>توليد هيدرز موقّعة</span>
          </button>
        </div>

        {/* Inline Output for Server Time / Signed Headers */}
        {(serverTimeResult || signedHeadersResult) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {serverTimeResult && (
              <div
                className={`rounded-xl border p-3.5 space-y-2 ${
                  serverTimeResult.success
                    ? 'border-emerald-500/35 bg-emerald-950/20'
                    : 'border-rose-500/35 bg-rose-950/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {serverTimeResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-slate-100">وقت سيرفر نسك (getSystemDateTime)</span>
                    {serverTimeResult.http_status && (
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-950 text-slate-300" dir="ltr">
                        HTTP {serverTimeResult.http_status}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setServerTimeResult(null)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <pre className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5 font-mono text-[11px] text-emerald-200 overflow-x-auto max-h-36" dir="ltr">
                  {JSON.stringify(serverTimeResult.data ?? serverTimeResult.error, null, 2)}
                </pre>
              </div>
            )}

            {signedHeadersResult?.headers && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-950/15 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>هيدرز نسك الموقّعة (SHA-256)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(JSON.stringify(signedHeadersResult.headers, null, 2), 'تم نسخ الهيدرز الموقّعة')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignedHeadersResult(null)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <pre className="rounded-lg bg-slate-950/80 border border-slate-800 p-2.5 font-mono text-[11px] text-amber-200 overflow-x-auto max-h-36" dir="ltr">
                  {JSON.stringify(signedHeadersResult.headers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* 2. AUTOMATIC RAWDAH RADAR SECTION                 */}
      {/* ================================================= */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                isRadarRunning
                  ? 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Radar className={`w-6 h-6 ${isRadarRunning ? 'animate-spin' : ''}`} style={isRadarRunning ? { animationDuration: '4s' } : undefined} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-white">رادار الروضة التلقائي والمواعيد الحية</h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isRadarRunning
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isRadarRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {isRadarRunning ? `شغّال كل ${radarStatus?.interval_seconds || radarCfg.interval_seconds} ثانية` : 'متوقف'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                يفحص <code className="font-mono text-slate-300" dir="ltr">rawdah/v2/availableSlotDays</code> مشفّراً وموقّعاً في الخلفية وينبهك فور فتح المواعيد
              </p>
            </div>
          </div>

          {/* Radar Control Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isRadarRunning ? (
              <button
                type="button"
                disabled={offline || Boolean(radarActionLoading)}
                onClick={handleStartRadarClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-45"
              >
                {radarActionLoading === 'start' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>تشغيل الرادار في الخلفية</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={offline || Boolean(radarActionLoading)}
                onClick={handleStopRadarClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 transition-all disabled:opacity-45"
              >
                {radarActionLoading === 'stop' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>إيقاف الرادار</span>
              </button>
            )}

            <button
              type="button"
              disabled={offline || radarActionLoading === 'check'}
              onClick={handleCheckNowClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all disabled:opacity-45"
            >
              {radarActionLoading === 'check' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>فحص فوري الآن (مرة واحدة)</span>
            </button>
          </div>
        </div>

        {/* Radar Live Telemetry Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
            <span className="text-[11px] text-slate-400 block">حالة الرادار</span>
            <p className={`text-sm font-extrabold mt-1 ${isRadarRunning ? 'text-emerald-300' : 'text-slate-300'}`}>
              {isRadarRunning ? 'نشط (Polling كل 3ث)' : 'متوقف'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
            <span className="text-[11px] text-slate-400 block">عدد مرات الفحص (checks_count)</span>
            <p className="text-lg font-mono font-extrabold text-white mt-0.5 tabular-nums">
              {radarStatus?.checks_count ?? 0}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
            <span className="text-[11px] text-slate-400 block">آخر وقت فحص (last_check_at)</span>
            <p className="text-xs font-mono font-bold text-slate-200 mt-1.5" dir="ltr">
              {radarStatus?.last_check_at ? radarStatus.last_check_at.replace('T', ' ') : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3.5">
            <span className="text-[11px] text-slate-400 block">آخر كود HTTP (last_http_status)</span>
            <p
              className={`text-lg font-mono font-extrabold mt-0.5 tabular-nums ${
                radarStatus?.last_http_status >= 200 && radarStatus?.last_http_status < 300
                  ? 'text-emerald-400'
                  : radarStatus?.last_http_status
                    ? 'text-rose-400'
                    : 'text-slate-500'
              }`}
              dir="ltr"
            >
              {radarStatus?.last_http_status ?? '—'}
            </p>
          </div>
        </div>

        {/* Radar Error Alert */}
        {(radarStatus?.last_error || (activeSource === 'instant' && instantSlotsResult?.error)) && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-3 text-xs text-rose-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block">خطأ في آخر فحص:</span>
              <span className="font-mono break-all" dir="ltr">
                {activeSource === 'instant' && instantSlotsResult?.error
                  ? instantSlotsResult.error
                  : radarStatus?.last_error}
              </span>
            </div>
          </div>
        )}

        {/* Radar Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              من تاريخ (<code className="font-mono text-emerald-400">date</code>)
            </label>
            <input
              type="date"
              dir="ltr"
              disabled={isRadarRunning}
              value={radarCfg.date}
              onChange={(e) => setRadarCfg((p) => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              إلى تاريخ (<code className="font-mono text-emerald-400">to_date</code>)
            </label>
            <input
              type="date"
              dir="ltr"
              disabled={isRadarRunning}
              value={radarCfg.to_date}
              onChange={(e) => setRadarCfg((p) => ({ ...p, to_date: e.target.value }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              عدد الأفراد (<code className="font-mono text-emerald-400">count</code>)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              dir="ltr"
              disabled={isRadarRunning}
              value={radarCfg.count}
              onChange={(e) => setRadarCfg((p) => ({ ...p, count: e.target.value }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              نوع الطابور (<code className="font-mono text-emerald-400">queue_type</code>)
            </label>
            <select
              disabled={isRadarRunning}
              value={radarCfg.queue_type}
              onChange={(e) => setRadarCfg((p) => ({ ...p, queue_type: Number(e.target.value) }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-bold text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            >
              <option value={0} className="bg-slate-900">0 — عادي (Regular)</option>
              <option value={1} className="bg-slate-900">1 — فوري (Instant)</option>
              <option value={2} className="bg-slate-900">2 — الكل (All)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              معرّف الخدمة (<code className="font-mono text-emerald-400">service_id</code>)
            </label>
            <input
              type="number"
              min="1"
              dir="ltr"
              disabled={isRadarRunning}
              value={radarCfg.service_id}
              onChange={(e) => setRadarCfg((p) => ({ ...p, service_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>خط العرض (<code className="font-mono text-emerald-400">latitude</code>)</span>
            </label>
            <input
              type="number"
              step="0.0001"
              dir="ltr"
              disabled={isRadarRunning}
              value={radarCfg.latitude}
              onChange={(e) => setRadarCfg((p) => ({ ...p, latitude: e.target.value }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>خط الطول (<code className="font-mono text-emerald-400">longitude</code>)</span>
            </label>
            <input
              type="number"
              step="0.0001"
              dir="ltr"
              disabled={isRadarRunning}
              value={radarCfg.longitude}
              onChange={(e) => setRadarCfg((p) => ({ ...p, longitude: e.target.value }))}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-55"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              فاصل الفحص بالثواني (5–300)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="300"
                dir="ltr"
                disabled={isRadarRunning}
                value={radarCfg.interval_seconds}
                onChange={(e) => setRadarCfg((p) => ({ ...p, interval_seconds: e.target.value }))}
                className="w-20 rounded-xl border border-slate-700/80 bg-slate-950/75 px-2.5 py-2 text-xs font-mono text-amber-300 font-bold focus:border-emerald-500 focus:outline-none disabled:opacity-55"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {INTERVAL_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    disabled={isRadarRunning}
                    onClick={() => setRadarCfg((p) => ({ ...p, interval_seconds: sec }))}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-colors disabled:opacity-45 ${
                      Number(radarCfg.interval_seconds) === sec
                        ? 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* AVAILABLE DAYS & SLOTS CARDS                      */}
        {/* ================================================= */}
        <div className="pt-4 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>الأيام والفترات المتاحة (available_days)</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 tabular-nums">
                {rawDays.length} يوم
              </span>
              {openDaysCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 tabular-nums">
                  {openDaysCount} مفتوح ({totalSlotsCount} فترة)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {instantSlotsResult && (radarStatus?.checks_count || 0) > 0 && (
                <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/80 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSlotsSource('radar')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                      activeSource === 'radar' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    الرادار التلقائي
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotsSource('instant')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                      activeSource === 'instant' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    آخر فحص فوري
                  </button>
                </div>
              )}

              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/75 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyOpenDays}
                  onChange={(e) => setOnlyOpenDays(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span>المفتوح فقط</span>
              </label>
            </div>
          </div>

          {visibleDays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 py-12 text-center space-y-2">
              <Radar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">
                {rawDays.length === 0
                  ? 'لا توجد أيام معروضة بعد — اضغط "فحص فوري الآن" أو شغّل الرادار في الخلفية'
                  : 'لا توجد أيام بها فترات مفتوحة حالياً ضمن النتائج'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleDays.map((day, dIdx) => {
                const dayColor = sanitizeCssColor(day.color);
                const pct = day.percentage != null ? Number(day.percentage) : null;
                const slots = day.slots || [];
                const hasSlots = slots.length > 0;
                const cleanDate = extractDateOnly(day.date);

                return (
                  <article
                    key={`${day.date || dIdx}-${dIdx}`}
                    className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
                      hasSlots
                        ? 'border-emerald-500/40 bg-slate-950/80 shadow-lg shadow-emerald-950/25'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: dayColor, boxShadow: `0 0 8px ${dayColor}` }}
                          />
                          <h5 className="text-sm font-mono font-extrabold text-white" dir="ltr">
                            {day.date || '—'}
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {hasSlots ? `${slots.length} فترة متاحة` : 'لا توجد فترات متاحة'}
                        </span>
                      </div>

                      {pct !== null && !Number.isNaN(pct) && (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold border tabular-nums"
                          style={{
                            color: dayColor,
                            borderColor: `${dayColor}66`,
                            backgroundColor: `${dayColor}1f`,
                          }}
                          dir="ltr"
                        >
                          {pct}%
                        </span>
                      )}
                    </div>

                    {/* Availability Progress Bar */}
                    {pct !== null && !Number.isNaN(pct) && (
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(0, Math.min(100, pct))}%`,
                            backgroundColor: dayColor,
                          }}
                        />
                      </div>
                    )}

                    {/* Slots List */}
                    {hasSlots ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pl-1">
                        {slots.map((slot, sIdx) => {
                          const gBadge = formatGenderBadge(slot.gender);
                          const slotColor = sanitizeCssColor(slot.color || day.color);
                          const hhmm = extractTimeHHMM(slot);

                          return (
                            <div
                              key={`${slot.timeslot_id ?? sIdx}-${sIdx}`}
                              className="rounded-xl border border-slate-800/90 bg-slate-900/80 px-3 py-2.5 flex items-center justify-between gap-2 hover:border-emerald-500/40 transition-colors"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: slotColor }}
                                  />
                                  <span className="text-xs font-extrabold text-slate-100">
                                    {slot.time_ar || slot.time_en || 'فترة متاحة'}
                                  </span>
                                  {slot.is_instant && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35">
                                      <Zap className="w-2.5 h-2.5" />
                                      فوري
                                    </span>
                                  )}
                                  {gBadge && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${gBadge.cls}`}>
                                      {gBadge.label}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400" dir="ltr">
                                  {slot.timeslot_id != null && (
                                    <button
                                      type="button"
                                      onClick={() => onCopy(String(slot.timeslot_id), 'تم نسخ Timeslot ID')}
                                      className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
                                      title="نسخ Timeslot ID"
                                    >
                                      <span>#{slot.timeslot_id}</span>
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                  {slot.time_en && slot.time_ar && <span>{slot.time_en}</span>}
                                  {slot.percentage != null && <span>{slot.percentage}%</span>}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onBookSlot?.({ date: cleanDate, time: hhmm })}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/35 transition-colors shrink-0"
                                title="الانتقال لتبويب الحجز بهذا الموعد"
                              >
                                <span>حجز</span>
                                <ArrowUpLeft className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 text-center py-3 rounded-lg bg-slate-900/50 border border-slate-800/70">
                        مغلق / مكتمل
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Raw response preview for immediate check */}
          {instantSlotsResult?.raw != null && (
            <details className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200 flex items-center gap-2">
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  عرض الرد الخام الكامل لآخر فحص فوري (HTTP {instantSlotsResult.http_status ?? '—'})
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onCopy(JSON.stringify(instantSlotsResult.raw, null, 2), 'تم نسخ الرد الخام')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    <Copy className="w-3 h-3" /> نسخ JSON
                  </button>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto max-h-64" dir="ltr">
                  {JSON.stringify(instantSlotsResult.raw, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* 3. SUB-SECTION: UMRAH AVAILABLE DATES             */}
      {/* ================================================= */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">استعلام مواعيد العمرة المتاحة</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                استعلام مباشر عبر <code className="font-mono text-amber-300" dir="ltr">POST /api/umrah/available-dates</code> باستخدام نفس إعدادات API أعلاه
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUmrahSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                من تاريخ (<code className="font-mono text-amber-300">date</code>)
              </label>
              <input
                type="date"
                dir="ltr"
                value={umrahCfg.date}
                onChange={(e) => setUmrahCfg((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                إلى تاريخ (<code className="font-mono text-amber-300">to_date</code>)
              </label>
              <input
                type="date"
                dir="ltr"
                value={umrahCfg.to_date}
                onChange={(e) => setUmrahCfg((p) => ({ ...p, to_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                العدد (<code className="font-mono text-amber-300">count</code>)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                dir="ltr"
                value={umrahCfg.count}
                onChange={(e) => setUmrahCfg((p) => ({ ...p, count: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                عدد المواطنين (<code className="font-mono text-amber-300">citizen_count</code>)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                dir="ltr"
                value={umrahCfg.citizen_count}
                onChange={(e) => setUmrahCfg((p) => ({ ...p, citizen_count: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                الخدمة (<code className="font-mono text-amber-300">service_id</code>)
              </label>
              <input
                type="number"
                min="1"
                dir="ltr"
                value={umrahCfg.service_id}
                onChange={(e) => setUmrahCfg((p) => ({ ...p, service_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={offline || umrahLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/40 transition-all disabled:opacity-45"
          >
            {umrahLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>استعلام مواعيد العمرة الآن</span>
          </button>
        </form>

        {/* Umrah Result Display */}
        {umrahResult && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    umrahResult.success
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                  }`}
                >
                  {umrahResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{umrahResult.success ? 'نجح الاستعلام' : 'فشل الاستعلام'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono text-xs bg-slate-900 text-slate-300 border border-slate-800" dir="ltr">
                  HTTP {umrahResult.http_status ?? '—'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onCopy(JSON.stringify(umrahResult, null, 2), 'تم نسخ نتيجة مواعيد العمرة')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ JSON</span>
              </button>
            </div>

            {umrahParsedDates.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {umrahParsedDates.map((d, i) => {
                  const dateLabel = typeof d === 'string' ? d : d.Date || d.date || d.HijriDate || `#${i + 1}`;
                  const pct = typeof d === 'object' ? d.Percentage ?? d.percentage : null;
                  const col = sanitizeCssColor(typeof d === 'object' ? d.PercentageColor || d.color : null);
                  return (
                    <div
                      key={`${dateLabel}-${i}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2.5 text-center space-y-1"
                    >
                      <span className="text-xs font-mono font-bold text-slate-100 block" dir="ltr">
                        {dateLabel}
                      </span>
                      {pct != null && (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                          style={{ color: col, backgroundColor: `${col}22` }}
                          dir="ltr"
                        >
                          {pct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <pre className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-amber-200 overflow-x-auto max-h-72 leading-relaxed" dir="ltr">
              {JSON.stringify(umrahResult.data ?? umrahResult.error ?? umrahResult, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}

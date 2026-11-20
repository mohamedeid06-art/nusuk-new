import React from 'react';
import {
  Menu,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Gauge,
  Settings,
  Cpu,
  Radar,
} from 'lucide-react';

const TAB_TITLES = {
  overview: {
    title: 'لوحة المتابعة والمجموعة النشطة',
    subtitle: 'مراقبة فورية للحساب الرئيسي والمرافقين وعدادات البصمة وسرعة الانتظار',
  },
  register: {
    title: 'مركز تسجيل المعتمرين واسترجاع الحسابات',
    subtitle: 'تسجيل فردي أو جماعي من Excel مع خيارات إغلاق الجروب وفحص الروضة',
  },
  booking: {
    title: 'الحجز لأي حد (Rawdah Booking Engine)',
    subtitle: 'حجز الروضة الشريفة للحساب المفتوح أو لأي شخص جديد مع وضع التشغيل التجريبي الآمن',
  },
  radar: {
    title: 'رادار الروضة والمواعيد الحية (Rawdah Radar)',
    subtitle: 'مراقبة تلقائية لمواعيد الروضة مع تنبيه صوتي فوري واستعلام مواعيد العمرة',
  },
  health: {
    title: 'مراقبة صحة المحاكيات والتحكم بها',
    subtitle: 'فحص اتصال المحاكيين emu1 و emu2 وتدوير البصمة وإعادة التشغيل',
  },
  crypto: {
    title: 'أدوات الروضة والـ API (Crypto Lab & Direct Permits)',
    subtitle: 'تشفير وفك تشفير AES-128-CBC وإدارة تصاريح الروضة والعمرة المباشرة عبر Nusuk API',
  },
  logs: {
    title: 'سجل العمليات ولقطات الشاشة',
    subtitle: 'تتبع كافة طلبات الجلسة واستعراض لقطات الحجز والأخطاء بدقة عالية',
  },
  settings: {
    title: 'إعدادات الاتصال والحساب الافتراضي',
    subtitle: 'ضبط عنوان السيرفر وإيميل استلام أكواد OTP والإعدادات المحفوظة محلياً',
  },
};

export default function TopBar({
  activeTab,
  onOpenMobileMenu,
  connectionState, // 'connected' | 'offline' | 'connecting'
  statusData,
  radarStatus,
  lastUpdated,
  isRefreshing,
  onManualRefresh,
  onOpenSettings,
  onOpenRadar,
  apiBaseUrl,
}) {
  const meta = TAB_TITLES[activeTab] || TAB_TITLES.overview;
  const isBusy = Boolean(statusData?.busy);
  const radarRunning = Boolean(radarStatus?.running);
  const radarHasOpen = Boolean(radarStatus?.has_open_slots);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Right side: menu + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white truncate">{meta.title}</h2>
            <p className="text-xs text-slate-400 truncate hidden sm:block">{meta.subtitle}</p>
          </div>
        </div>

        {/* Left side: Live status indicators */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Live Radar pill if running or open slots detected */}
          {connectionState === 'connected' && (radarRunning || radarHasOpen) && (
            <button
              type="button"
              onClick={onOpenRadar}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-colors ${
                radarHasOpen
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                  : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
              }`}
              title="فتح رادار الروضة"
            >
              <Radar className="w-3.5 h-3.5" />
              <span>{radarHasOpen ? 'مواعيد مفتوحة!' : `رادار (${radarStatus?.checks_count ?? 0})`}</span>
            </button>
          )}

          {/* Server connection badge */}
          <button
            type="button"
            onClick={onOpenSettings}
            title={`عنوان السيرفر: ${apiBaseUrl}`}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              connectionState === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
                : connectionState === 'connecting'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                  : 'bg-rose-500/10 border-rose-500/35 text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            {connectionState === 'connected' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Wifi className="w-3.5 h-3.5" />
                <span>السيرفر متصل</span>
              </>
            )}
            {connectionState === 'connecting' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>جاري الاتصال...</span>
              </>
            )}
            {connectionState === 'offline' && (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>غير متصل</span>
              </>
            )}
          </button>

          {/* Emulators Busy / Ready indicator */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              connectionState !== 'connected'
                ? 'bg-slate-900 border-slate-800 text-slate-500'
                : isBusy
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${isBusy && connectionState === 'connected' ? 'animate-pulse text-amber-400' : ''}`} />
            <span>
              {connectionState !== 'connected'
                ? 'حالة المحاكيات: —'
                : isBusy
                  ? 'المحاكيات مشغولة (Busy)'
                  : 'جاهز للعمل (Ready)'}
            </span>
          </div>

          {/* Current speed pill */}
          {statusData?.speed_multiplier != null && connectionState === 'connected' && (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-xs font-semibold text-slate-300 tabular-nums">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span dir="ltr">{Number(statusData.speed_multiplier).toFixed(1)}x</span>
            </div>
          )}

          {/* Manual refresh button */}
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            title={lastUpdated ? `آخر تحديث: ${new Date(lastUpdated).toLocaleTimeString('ar-EG')}` : 'تحديث الآن'}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="تحديث الحالة"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="إعدادات الاتصال"
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors"
            aria-label="إعدادات الاتصال"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

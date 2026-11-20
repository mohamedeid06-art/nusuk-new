import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  CalendarCheck2,
  Radar,
  Smartphone,
  Lock,
  ScrollText,
  Settings,
  X,
  AlertTriangle,
  Radio,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'لوحة المتابعة والمجموعة', icon: LayoutDashboard },
  { id: 'register', label: 'التسجيل والاسترجاع', icon: UserPlus },
  { id: 'booking', label: 'الحجز لأي حد', icon: CalendarCheck2 },
  { id: 'radar', label: 'رادار الروضة والمواعيد', icon: Radar },
  { id: 'health', label: 'صحة المحاكيات', icon: Smartphone },
  { id: 'crypto', label: 'أدوات الروضة والـ API', icon: Lock },
  { id: 'logs', label: 'السجل ولقطات الشاشة', icon: ScrollText },
  { id: 'settings', label: 'إعدادات الاتصال', icon: Settings },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  statusData,
  radarStatus,
  logsCount,
  screenshotsCount,
  queueRunning,
  missingOtpCreds,
}) {
  const emuIssue =
    statusData?.health?.emu1?.ok === false || statusData?.health?.emu2?.ok === false;
  const radarRunning = Boolean(radarStatus?.running);
  const radarHasOpen = Boolean(radarStatus?.has_open_slots);

  const renderBadge = (id) => {
    if (id === 'overview' && statusData?.leader_active) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tabular-nums">
          {statusData.companions_count}/{statusData.max_companions}
        </span>
      );
    }
    if (id === 'register' && queueRunning) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Radio className="w-3 h-3 animate-pulse" />
          نشط
        </span>
      );
    }
    if (id === 'radar') {
      if (radarHasOpen) {
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-slate-950 animate-pulse">
            مفتوح!
          </span>
        );
      }
      if (radarRunning) {
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
            <Radio className="w-3 h-3 animate-pulse" />
            شغّال
          </span>
        );
      }
    }
    if (id === 'health' && emuIssue) {
      return (
        <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          تنبيه
        </span>
      );
    }
    if (id === 'logs' && logsCount > 0) {
      return (
        <span className="flex items-center gap-1">
          {screenshotsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 tabular-nums">
              {screenshotsCount} صور
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 tabular-nums">
            {logsCount}
          </span>
        </span>
      );
    }
    if (id === 'settings' && missingOtpCreds) {
      return <AlertTriangle className="w-4 h-4 text-amber-400" title="بيانات إيميل OTP غير مكتملة" />;
    }
    return null;
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 via-emerald-600/15 to-amber-500/20 border border-emerald-500/35 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/40">
            <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none">
              <path
                d="M18 3L30 10V26L18 33L6 26V10L18 3Z"
                stroke="#34d399"
                strokeWidth="2.2"
                fill="#10b981"
                fillOpacity="0.16"
              />
              <path
                d="M18 10L25 14V22L18 26L11 22V14L18 10Z"
                stroke="#fbbf24"
                strokeWidth="1.8"
                fill="#f59e0b"
                fillOpacity="0.18"
              />
              <circle cx="18" cy="18" r="2.8" fill="#34d399" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-white tracking-tight truncate">
              نُسُك برو <span className="text-emerald-400">v2</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate">نظام المحاكيات والرادار والحجز</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {renderBadge(item.id)}
            </button>
          );
        })}
      </nav>

      {/* Footer summary card */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">الدور القادم</span>
            <span
              className={`font-bold ${
                statusData?.next_role === 'companion' ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {statusData?.next_role === 'companion' ? 'مرافق (Companion)' : 'رئيسي (Leader)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed truncate">
            {statusData?.next_target || 'بانتظار الاتصال بالسيرفر...'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 border-l border-slate-800/80 bg-slate-900/75 backdrop-blur-xl sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-slate-900 border-l border-slate-800 shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

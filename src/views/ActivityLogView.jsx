import React, { useMemo, useState } from 'react';
import {
  ScrollText,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldX,
  AlertTriangle,
  Image as ImageIcon,
  ZoomIn,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { buildAssetUrl } from '../services/api';

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'success', label: 'ناجح' },
  { id: 'ineligible', label: 'غير مؤهل للروضة' },
  { id: 'error', label: 'أخطاء' },
  { id: 'screenshots', label: 'بها لقطة شاشة' },
];

export default function ActivityLogView({
  logs,
  apiBaseUrl,
  onClearLogs,
  onOpenImage,
  onCopy,
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (filter === 'success' && entry.outcome !== 'success') return false;
      if (filter === 'ineligible' && entry.outcome !== 'ineligible') return false;
      if (filter === 'error' && entry.outcome !== 'error') return false;
      if (filter === 'screenshots' && !entry.screenshot) return false;
      if (!q) return true;
      const haystack = [
        entry.title,
        entry.endpoint,
        entry.message,
        entry.screenshot,
        JSON.stringify(entry.payload || ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, filter, query]);

  const counts = useMemo(
    () => ({
      all: logs.length,
      success: logs.filter((l) => l.outcome === 'success').length,
      ineligible: logs.filter((l) => l.outcome === 'ineligible').length,
      error: logs.filter((l) => l.outcome === 'error').length,
      screenshots: logs.filter((l) => Boolean(l.screenshot)).length,
    }),
    [logs]
  );

  const getBadge = (outcome) => {
    switch (outcome) {
      case 'success':
        return {
          label: 'نجاح',
          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
          Icon: CheckCircle2,
        };
      case 'ineligible':
        return {
          label: 'غير مؤهل للروضة',
          cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
          Icon: ShieldX,
        };
      case 'warning':
        return {
          label: 'تنبيه',
          cls: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
          Icon: AlertTriangle,
        };
      default:
        return {
          label: 'خطأ',
          cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
          Icon: XCircle,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    active
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-900 text-[10px] tabular-nums">
                    {counts[f.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={logs.length === 0}
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-45"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح السجل</span>
          </button>
        </div>

        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث في سجل العمليات (رقم الجواز، Nusuk ID، نقطة النهاية، رسالة الخطأ...)"
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Log entries */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 py-16 text-center space-y-2">
          <ScrollText className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-400">
            {logs.length === 0
              ? 'لا توجد عمليات مسجلة في هذه الجلسة بعد'
              : 'لا توجد نتائج مطابقة للفلتر أو البحث الحالي'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((entry) => {
            const badge = getBadge(entry.outcome);
            const BadgeIcon = badge.Icon;
            const shotUrl = entry.screenshot ? buildAssetUrl(apiBaseUrl, entry.screenshot) : null;
            const isBookingShot = Boolean(entry.screenshot && String(entry.screenshot).includes('booking_shots'));
            const expanded = Boolean(expandedIds[entry.id]);

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-lg shadow-black/20 space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}
                      >
                        <BadgeIcon className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </span>
                      <h4 className="text-sm font-extrabold text-white">{entry.title}</h4>
                      {entry.endpoint && (
                        <code
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                          dir="ltr"
                        >
                          {entry.endpoint}
                        </code>
                      )}
                      {shotUrl && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            isBookingShot
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>{isBookingShot ? 'لقطة حجز' : 'لقطة خطأ'}</span>
                        </span>
                      )}
                    </div>

                    {entry.message && (
                      <p className="text-xs text-slate-300 leading-relaxed break-words">{entry.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(entry.timestamp).toLocaleString('ar-EG')}</span>
                    </span>
                    {entry.payload && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <span>التفاصيل</span>
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Screenshot Preview (Booking / Failure) */}
                {shotUrl && (
                  <div
                    className={`rounded-xl border bg-slate-950/75 p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                      isBookingShot ? 'border-emerald-500/30' : 'border-rose-500/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onOpenImage({
                          url: shotUrl,
                          title: entry.title,
                          subtitle: entry.message,
                        })
                      }
                      className="group relative w-28 h-44 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0"
                    >
                      <img
                        src={shotUrl}
                        alt={entry.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute inset-0 bg-slate-950/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </span>
                    </button>

                    <div className="space-y-2 min-w-0">
                      <p className={`text-xs font-bold ${isBookingShot ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {isBookingShot ? 'لقطة شاشة الحجز من المحاكي' : 'لقطة شاشة المحاكي عند وقوع الخطأ'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 break-all" dir="ltr">
                        {shotUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenImage({
                            url: shotUrl,
                            title: entry.title,
                            subtitle: entry.message,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          isBookingShot
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/35'
                            : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/35'
                        }`}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>تكبير الصورة في نافذة مستقلة</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expandable JSON Payload */}
                {expanded && entry.payload && (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">استجابة السيرفر الكاملة (JSON)</span>
                      <button
                        type="button"
                        onClick={() => onCopy(JSON.stringify(entry.payload, null, 2), 'تم نسخ استجابة JSON')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto max-h-64" dir="ltr">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

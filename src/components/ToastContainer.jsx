import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const STYLES = {
  success: {
    box: 'border-emerald-500/40 bg-slate-900/95 text-emerald-100',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
  },
  error: {
    box: 'border-rose-500/40 bg-slate-900/95 text-rose-100',
    icon: AlertCircle,
    iconColor: 'text-rose-400',
  },
  warning: {
    box: 'border-amber-500/40 bg-slate-900/95 text-amber-100',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
  },
  info: {
    box: 'border-slate-700 bg-slate-900/95 text-slate-100',
    icon: Info,
    iconColor: 'text-sky-400',
  },
};

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const cfg = STYLES[toast.type] || STYLES.info;
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all ${cfg.box}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && <p className="text-sm font-bold leading-snug">{toast.title}</p>}
              {toast.message && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{toast.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

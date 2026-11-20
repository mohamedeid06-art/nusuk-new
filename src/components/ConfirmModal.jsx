import React, { useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger', // danger | warning | emerald
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      button: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40',
    },
    warning: {
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      button: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40',
    },
    emerald: {
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40',
    },
  }[variant] || {
    iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    button: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-100 leading-snug">{title}</h3>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {description && <p className="text-sm text-slate-300 leading-relaxed">{description}</p>}
          {children}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 bg-slate-950/50 border-t border-slate-800/80">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-60 ${variantStyles.button}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { X, ExternalLink, Download, ImageOff } from 'lucide-react';

export default function ImageModal({ image, onClose }) {
  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100 truncate">{image.title || 'لقطة شاشة الخطأ'}</h3>
            {image.subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{image.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح</span>
            </a>
            <a
              href={image.url}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60">
          {image.url ? (
            <img
              src={image.url}
              alt={image.title || 'Failure screenshot'}
              className="max-h-[75vh] w-auto rounded-xl border border-slate-800 shadow-2xl object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500 py-16">
              <ImageOff className="w-10 h-10" />
              <span className="text-sm">تعذر تحميل الصورة</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

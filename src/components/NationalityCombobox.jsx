import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { NATIONALITIES } from '../constants/nationalities';

export default function NationalityCombobox({
  value,
  onChange,
  placeholder = 'اختر أو اكتب الجنسية...',
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = String(value || '').trim().toLowerCase();
    if (!q) return NATIONALITIES;
    return NATIONALITIES.filter(
      (n) => n.ar.toLowerCase().includes(q) || n.en.toLowerCase().includes(q)
    );
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Globe className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-60"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute left-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors"
          tabIndex={-1}
          aria-label="عرض قائمة الجنسيات"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-40 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 py-1.5">
          {filtered.length > 0 ? (
            filtered.map((nat) => {
              const selected =
                nat.ar === value?.trim() || nat.en.toLowerCase() === value?.trim().toLowerCase();
              return (
                <button
                  key={nat.en}
                  type="button"
                  onClick={() => {
                    onChange(nat.ar);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-right transition-colors ${
                    selected
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                      : 'text-slate-200 hover:bg-slate-800/90'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {selected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{nat.ar}</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400" dir="ltr">
                    {nat.en}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-slate-400">
              سيتم استخدام الجنسية المكتوبة: <span className="text-emerald-300 font-semibold">{value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

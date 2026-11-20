import React from 'react';

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  accent = 'emerald', // 'emerald' | 'amber' | 'rose'
  ariaLabel,
}) {
  const activeBg =
    accent === 'amber'
      ? 'bg-amber-500 border-amber-400'
      : accent === 'rose'
        ? 'bg-rose-500 border-rose-400'
        : 'bg-emerald-500 border-emerald-400';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      dir="ltr"
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-45 disabled:cursor-not-allowed ${
        checked ? activeBg : 'bg-slate-800 border-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

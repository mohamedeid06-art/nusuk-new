import React from 'react';
import {
  ShieldCheck,
  ShieldX,
  Calendar,
  Clock,
  Hash,
  User,
  Copy,
  FileCheck2,
  Hourglass,
  ZoomIn,
} from 'lucide-react';
import { buildAssetUrl } from '../services/api';

export default function RawdahEligibilityCard({ result, apiBaseUrl, onCopy, onOpenImage }) {
  if (!result) return null;

  const hasEligibility = typeof result.eligible === 'boolean';
  const isSuccess = result.success === true;
  const isIneligible = result.status === 'ineligible_permit' || result.eligible === false;

  const name =
    result.leader_name || result.companion_name || result.pilgrim_name || null;
  const nusukId =
    result.leader_id || result.companion_id || result.nusuk_id || null;
  const details = result.details || null;
  const screenshotUrl = result.screenshot
    ? buildAssetUrl(apiBaseUrl, result.screenshot)
    : null;

  let tone = {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconWrap: 'bg-emerald-500/20 text-emerald-400',
    title: hasEligibility ? 'مؤهل لتصريح الروضة الشريفة' : 'تمت العملية بنجاح',
    Icon: ShieldCheck,
  };

  if (isIneligible) {
    tone = {
      border: 'border-rose-500/45',
      bg: 'bg-rose-950/30',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      iconWrap: 'bg-rose-500/20 text-rose-400',
      title: 'غير مؤهل لتصريح الروضة الشريفة',
      Icon: ShieldX,
    };
  } else if (!isSuccess) {
    tone = {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/25',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      iconWrap: 'bg-rose-500/20 text-rose-400',
      title: result.status === 'busy' ? 'المحاكيات مشغولة حالياً' : 'فشل تنفيذ العملية',
      Icon: ShieldX,
    };
  }

  const ToneIcon = tone.Icon;

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${tone.border} ${tone.bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone.iconWrap}`}>
            <ToneIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-slate-100">{tone.title}</h4>
              {hasEligibility && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tone.badge}`}>
                  {result.eligible ? 'ينفع (مؤهل)' : 'مينفعش (غير مؤهل)'}
                </span>
              )}
              {result.role && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {result.role === 'leader' ? 'حساب رئيسي' : 'حساب مرافق'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">
              {result.reason || result.message || result.error}
            </p>
          </div>
        </div>
      </div>

      {(name || nusukId) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {name && (
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 px-3.5 py-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">اسم المعتمر</p>
                <p className="text-sm font-bold text-slate-100 truncate">{name}</p>
              </div>
            </div>
          )}
          {nusukId && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/60 border border-slate-800/80 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Hash className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">Nusuk ID</p>
                  <p className="text-sm font-mono font-semibold text-emerald-300 truncate" dir="ltr">
                    {nusukId}
                  </p>
                </div>
              </div>
              {onCopy && (
                <button
                  type="button"
                  onClick={() => onCopy(nusukId, 'تم نسخ Nusuk ID')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                  title="نسخ Nusuk ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {details && (
        <div className="rounded-xl bg-slate-950/65 border border-slate-800/80 p-3.5">
          <p className="text-xs font-bold text-slate-400 mb-2.5 flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>تفاصيل فحص تصاريح الروضة (details)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2">
              <span className="text-slate-400 block">الحالة</span>
              <span className="font-bold text-slate-100 mt-0.5 block">
                {details.status === 'none'
                  ? 'لا يوجد تصريح سابق'
                  : details.status === 'skipped'
                    ? 'تم التخطي يدوياً'
                    : details.status || '—'}
              </span>
            </div>
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> التاريخ
              </span>
              <span className="font-bold text-slate-100 mt-0.5 block">
                {details.date || '—'}
              </span>
            </div>
            {details.time && (
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> الوقت
                </span>
                <span className="font-mono font-bold text-slate-100 mt-0.5 block" dir="ltr">
                  {details.time}
                </span>
              </div>
            )}
            {typeof details.days_passed === 'number' && (
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <Hourglass className="w-3 h-3" /> الأيام المنقضية
                </span>
                <span className={`font-bold mt-0.5 block tabular-nums ${details.days_passed >= 365 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {details.days_passed} يوم {details.days_passed < 365 ? `(متبقي ${365 - details.days_passed})` : '(أكمل سنة)'}
                </span>
              </div>
            )}
            {details.type && (
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2 col-span-2">
                <span className="text-slate-400 block">نوع التصريح</span>
                <span className="font-bold text-slate-100 mt-0.5 block">{details.type}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {screenshotUrl && (
        <div className="rounded-xl bg-slate-950/70 border border-rose-500/30 p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={() =>
              onOpenImage?.({
                url: screenshotUrl,
                title: 'لقطة شاشة الخطأ من المحاكي',
                subtitle: result.error || result.message,
              })
            }
            className="group relative w-24 h-36 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900"
          >
            <img
              src={screenshotUrl}
              alt="لقطة شاشة الخطأ"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <span className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ZoomIn className="w-5 h-5 text-white" />
            </span>
          </button>
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-bold text-rose-300">تم التقاط صورة لشاشة المحاكي لحظة الخطأ</p>
            <p className="text-xs font-mono text-slate-400 break-all" dir="ltr">
              {result.screenshot}
            </p>
            <button
              type="button"
              onClick={() =>
                onOpenImage?.({
                  url: screenshotUrl,
                  title: 'لقطة شاشة الخطأ من المحاكي',
                  subtitle: result.error || result.message,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/30 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>تكبير لقطة الخطأ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

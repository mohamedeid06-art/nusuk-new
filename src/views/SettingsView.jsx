import React, { useState } from 'react';
import {
  Server,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Wifi,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import NationalityCombobox from '../components/NationalityCombobox';
import { DEFAULT_SETTINGS } from '../constants/nationalities';
import { nusukApi, normalizeBaseUrl } from '../services/api';

export default function SettingsView({ settings, onSaveSettings, onNotify }) {
  const [form, setForm] = useState(settings);
  const [showClientPass, setShowClientPass] = useState(false);
  const [showDefaultPass, setShowDefaultPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const cleaned = {
      ...form,
      apiBaseUrl: normalizeBaseUrl(form.apiBaseUrl),
      clientEmail: form.clientEmail.trim(),
      clientPass: form.clientPass.trim(),
      defaultPassword: form.defaultPassword.trim(),
      defaultNationality: form.defaultNationality.trim() || 'مصر',
    };
    setForm(cleaned);
    onSaveSettings(cleaned);
    onNotify({
      type: 'success',
      title: 'تم حفظ الإعدادات',
      message: 'تم حفظ بيانات الاتصال والإعدادات الافتراضية في المتصفح (localStorage).',
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const targetUrl = normalizeBaseUrl(form.apiBaseUrl);
    try {
      const { data, latencyMs } = await nusukApi.getStatus(targetUrl);
      setTestResult({
        ok: true,
        latencyMs,
        busy: data.busy,
        message: `تم الاتصال بنجاح خلال ${latencyMs}ms — الحالة: ${data.busy ? 'مشغول (Busy)' : 'جاهز (Ready)'}`,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetDefaults = () => {
    setForm({ ...DEFAULT_SETTINGS });
    onSaveSettings({ ...DEFAULT_SETTINGS });
    onNotify({
      type: 'info',
      title: 'تمت استعادة الإعدادات الافتراضية',
      message: 'تمت إعادة عنوان السيرفر إلى http://127.0.0.1:8000',
    });
  };

  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpRemote =
    isHttpsPage &&
    /^http:\/\//i.test(form.apiBaseUrl) &&
    !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(form.apiBaseUrl);

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* API Server Connection Card */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">إعدادات الاتصال بالسيرفر (FastAPI)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              يُحفظ العنوان محلياً في <code className="font-mono text-slate-300">localStorage</code> ويُستخدم لجميع الطلبات ولقطات الأخطاء
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block" htmlFor="apiBaseUrl">
            عنوان السيرفر (API Base URL)
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="apiBaseUrl"
              type="url"
              dir="ltr"
              value={form.apiBaseUrl}
              onChange={(e) => handleChange('apiBaseUrl', e.target.value)}
              placeholder="http://127.0.0.1:8000"
              className="flex-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors disabled:opacity-50 shrink-0"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
              <span>اختبار الاتصال</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2.5 ${
              testResult.ok
                ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200'
                : 'border-rose-500/40 bg-rose-950/35 text-rose-200'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {isHttpRemote && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-xs text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              تعمل الواجهة حالياً عبر <strong>HTTPS</strong>. المتصفح يسمح بالاتصال المحلي المباشر مع{' '}
              <code className="font-mono" dir="ltr">http://127.0.0.1:8000</code>، أما للاتصال بجهاز آخر عبر الإنترنت فاستخدم رابط{' '}
              <strong>HTTPS</strong> (مثل Cloudflare Tunnel أو ngrok).
            </p>
          </div>
        )}

        {/* Polling toggle */}
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 cursor-pointer hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-sm font-bold text-slate-200 block">التحديث التلقائي كل 3 ثوانٍ (Polling)</span>
              <span className="text-xs text-slate-400 block mt-0.5">
                جلب حالة المجموعة والعدادات وانشغال المحاكيات لحظياً من <code className="font-mono">/api/status</code>
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(form.pollingEnabled)}
            onChange={(e) => handleChange('pollingEnabled', e.target.checked)}
            className="w-5 h-5 accent-emerald-500 cursor-pointer shrink-0"
          />
        </label>
      </section>

      {/* OTP Email & Default Pilgrim Settings */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">إيميل استلام الـ OTP والقيم الافتراضية</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تُرسل تلقائياً مع كل طلب تسجيل أو استرجاع لعدم إعادة كتابتها في كل مرة (تُحفظ محلياً فقط على جهازك)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="clientEmail">
              إيميل استلام الـ OTP (<code className="font-mono text-emerald-400">client_email</code>)
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              <input
                id="clientEmail"
                type="email"
                dir="ltr"
                value={form.clientEmail}
                onChange={(e) => handleChange('clientEmail', e.target.value)}
                placeholder="example@gmail.com"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="clientPass">
              كلمة مرور التطبيق (<code className="font-mono text-emerald-400">client_pass</code> — Gmail App Password)
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              <input
                id="clientPass"
                type={showClientPass ? 'text' : 'password'}
                dir="ltr"
                value={form.clientPass}
                onChange={(e) => handleChange('clientPass', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-10 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowClientPass((s) => !s)}
                className="absolute left-3 text-slate-400 hover:text-slate-200"
                aria-label="إظهار أو إخفاء كلمة المرور"
              >
                {showClientPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="defaultPassword">
              كلمة المرور الافتراضية لحسابات المعتمرين (اختياري)
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
              <input
                id="defaultPassword"
                type={showDefaultPass ? 'text' : 'password'}
                dir="ltr"
                value={form.defaultPassword}
                onChange={(e) => handleChange('defaultPassword', e.target.value)}
                placeholder="اتركه فارغاً لاستخدام افتراضي السيرفر"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-10 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowDefaultPass((s) => !s)}
                className="absolute left-3 text-slate-400 hover:text-slate-200"
                aria-label="إظهار أو إخفاء كلمة المرور"
              >
                {showDefaultPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block" htmlFor="defaultNationality">
              الجنسية الافتراضية
            </label>
            <NationalityCombobox
              id="defaultNationality"
              value={form.defaultNationality}
              onChange={(val) => handleChange('defaultNationality', val)}
            />
          </div>
        </div>

        {/* Save / Reset Buttons */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </section>
    </form>
  );
}

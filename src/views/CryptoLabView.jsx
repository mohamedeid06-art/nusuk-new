import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Copy,
  Terminal,
  Sparkles,
  Code2,
  SlidersHorizontal,
  Loader2,
  ArrowLeftRight,
  Braces,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_CUSTOM_JSON = JSON.stringify(
  {
    Request: {
      Count: 1,
      Date: '2026-11-21',
      DateType: 1,
      Location: {
        Latitude: 24.4709,
        Longitude: 39.6122,
      },
      QueueType: 0,
      ServiceID: 1,
      ToDate: '2026-12-21',
    },
  },
  null,
  2
);

function generateRandom16Key() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export default function CryptoLabView({
  connectionState,
  onEncrypt,
  onDecrypt,
  onCopy,
  onNotify,
}) {
  const [subTab, setSubTab] = useState('encrypt'); // 'encrypt' | 'decrypt'

  // Encrypt state
  const [inputMode, setInputMode] = useState('fields'); // 'fields' | 'json'
  const [fields, setFields] = useState({
    count: 1,
    date: '2026-11-21',
    to_date: '2026-12-21',
    date_type: 1,
    queue_type: 0,
    service_id: 1,
    latitude: 24.4709,
    longitude: 39.6122,
  });
  const [customJson, setCustomJson] = useState(DEFAULT_CUSTOM_JSON);
  const [customKey, setCustomKey] = useState('');
  const [encryptLoading, setEncryptLoading] = useState(false);
  const [encryptResult, setEncryptResult] = useState(null);
  const [encryptError, setEncryptError] = useState('');

  // Decrypt state
  const [cipherInput, setCipherInput] = useState('');
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptResult, setDecryptResult] = useState(null);
  const [decryptError, setDecryptError] = useState('');

  const offline = connectionState !== 'connected';

  const handleFieldChange = (name, val) => {
    setFields((prev) => ({ ...prev, [name]: val }));
  };

  const handleFormatCustomJson = () => {
    try {
      const parsed = JSON.parse(customJson);
      setCustomJson(JSON.stringify(parsed, null, 2));
      setEncryptError('');
    } catch (e) {
      setEncryptError(`صيغة JSON غير صحيحة: ${e.message}`);
    }
  };

  const handleRunEncrypt = async (e) => {
    e.preventDefault();
    setEncryptError('');
    setEncryptResult(null);

    if (customKey.trim() && customKey.trim().length !== 16) {
      setEncryptError('المفتاح الاختياري (key) يجب أن يتكون من 16 حرفاً بالضبط.');
      return;
    }

    let body = {};
    if (inputMode === 'json') {
      try {
        const parsed = JSON.parse(customJson);
        body = {
          payload: parsed,
          ...(customKey.trim() ? { key: customKey.trim() } : {}),
        };
      } catch (err) {
        setEncryptError(`خطأ في تحليل JSON المخصص: ${err.message}`);
        return;
      }
    } else {
      body = {
        count: Number(fields.count),
        date: fields.date,
        to_date: fields.to_date,
        date_type: Number(fields.date_type),
        queue_type: Number(fields.queue_type),
        service_id: Number(fields.service_id),
        latitude: Number(fields.latitude),
        longitude: Number(fields.longitude),
        ...(customKey.trim() ? { key: customKey.trim() } : {}),
      };
    }

    setEncryptLoading(true);
    try {
      const res = await onEncrypt(body);
      if (res?.success) {
        setEncryptResult(res);
      } else {
        setEncryptError(res?.error || 'فشلت عملية التشفير');
      }
    } finally {
      setEncryptLoading(false);
    }
  };

  const handleRunDecrypt = async (e) => {
    e.preventDefault();
    setDecryptError('');
    setDecryptResult(null);

    let raw = cipherInput.trim();
    if (!raw) {
      setDecryptError('يرجى إدخال النص المشفر (data).');
      return;
    }

    // Smart unwrap if user pasted {"data": "..."}
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.data === 'string') {
          raw = parsed.data.trim();
        }
      } catch {
        // Proceed with raw string
      }
    }

    setDecryptLoading(true);
    try {
      const res = await onDecrypt(raw);
      if (res?.success) {
        const extractedKey = raw.length >= 16 ? raw.slice(0, 4) + raw.slice(-12) : '';
        setDecryptResult({ ...res, extractedKey });
      } else {
        setDecryptError(res?.error || 'تعذر فك التشفير — تأكد من صحة سلسلة data.');
      }
    } finally {
      setDecryptLoading(false);
    }
  };

  const handleCopyCurl = () => {
    if (!encryptResult?.body) return;
    const jsonBody = JSON.stringify(encryptResult.body);
    const curl = [
      `curl -X POST "https://services.nusuk.sa/rawdah/v2/availableSlotDays" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${jsonBody}'`,
    ].join('\n');
    onCopy(curl, 'تم نسخ أمر cURL بنجاح');
  };

  const handleSendToDecrypt = () => {
    if (!encryptResult?.data) return;
    setCipherInput(encryptResult.data);
    setDecryptResult(null);
    setDecryptError('');
    setSubTab('decrypt');
    onNotify({ type: 'info', title: 'تم النقل لتبويب فك التشفير', message: 'اضغط "فك التشفير الآن" للتحقق من النتيجة.' });
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => setSubTab('encrypt')}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              subTab === 'encrypt'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>تشفير الطلب (Encrypt)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('decrypt')}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              subTab === 'decrypt'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>فك التشفير (Decrypt)</span>
          </button>
        </div>

        <span className="text-xs font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl" dir="ltr">
          AES-128-CBC • K[0:4] + Base64(Cipher) + K[4:16]
        </span>
      </div>

      {/* ========================================= */}
      {/* TAB 1: ENCRYPT                            */}
      {/* ========================================= */}
      {subTab === 'encrypt' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Input Panel */}
          <form
            onSubmit={handleRunEncrypt}
            className="xl:col-span-6 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-5"
          >
            {/* Input Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <h3 className="text-base font-extrabold text-white">إعداد طلب الروضة</h3>
              <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('fields')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-colors ${
                    inputMode === 'fields' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>الحقول الجاهزة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('json')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-colors ${
                    inputMode === 'json' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>JSON مخصص</span>
                </button>
              </div>
            </div>

            {inputMode === 'fields' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    عدد الأفراد (<code className="font-mono text-emerald-400">count</code>)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    dir="ltr"
                    value={fields.count}
                    onChange={(e) => handleFieldChange('count', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    نوع الطابور (<code className="font-mono text-emerald-400">queue_type</code>)
                  </label>
                  <select
                    value={fields.queue_type}
                    onChange={(e) => handleFieldChange('queue_type', Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value={0} className="bg-slate-900">0 — Regular (عادي)</option>
                    <option value={1} className="bg-slate-900">1 — Instant (فوري)</option>
                    <option value={2} className="bg-slate-900">2 — All (الكل)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    من تاريخ (<code className="font-mono text-emerald-400">date</code>)
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={fields.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    إلى تاريخ (<code className="font-mono text-emerald-400">to_date</code>)
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={fields.to_date}
                    onChange={(e) => handleFieldChange('to_date', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    نوع التاريخ (<code className="font-mono text-emerald-400">date_type</code>)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={fields.date_type}
                    onChange={(e) => handleFieldChange('date_type', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    معرّف الخدمة (<code className="font-mono text-emerald-400">service_id</code>)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={fields.service_id}
                    onChange={(e) => handleFieldChange('service_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    خط العرض (<code className="font-mono text-emerald-400">latitude</code>)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    dir="ltr"
                    value={fields.latitude}
                    onChange={(e) => handleFieldChange('latitude', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    خط الطول (<code className="font-mono text-emerald-400">longitude</code>)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    dir="ltr"
                    value={fields.longitude}
                    onChange={(e) => handleFieldChange('longitude', e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-2 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    كائن JSON المخصص (<code className="font-mono text-emerald-400">payload</code>)
                  </label>
                  <button
                    type="button"
                    onClick={handleFormatCustomJson}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <Braces className="w-3 h-3" />
                    <span>تنسيق JSON</span>
                  </button>
                </div>
                <textarea
                  rows={11}
                  dir="ltr"
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/85 p-3.5 text-xs font-mono text-emerald-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}

            {/* Optional 16-char AES Key */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  مفتاح التشفير <code className="font-mono text-emerald-400">key</code> (اختياري — 16 حرفاً)
                </label>
                <span
                  className={`text-[11px] font-mono tabular-nums ${
                    customKey.length === 0
                      ? 'text-slate-500'
                      : customKey.length === 16
                        ? 'text-emerald-400 font-bold'
                        : 'text-amber-400 font-bold'
                  }`}
                  dir="ltr"
                >
                  {customKey.length}/16
                </span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 flex items-center">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={16}
                    dir="ltr"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="اتركه فارغاً لتوليد مفتاح عشوائي تلقائياً"
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 pr-10 pl-3.5 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomKey(generateRandom16Key())}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors shrink-0"
                  title="توليد مفتاح عشوائي من 16 حرفاً"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>توليد</span>
                </button>
              </div>
            </div>

            {encryptError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{encryptError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={offline || encryptLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-45"
            >
              {encryptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>تشفير الطلب الآن</span>
            </button>
          </form>

          {/* Encrypt Output Panel */}
          <section className="xl:col-span-6 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <h3 className="text-base font-extrabold text-white">ناتج التشفير</h3>
              {encryptResult && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onCopy(JSON.stringify(encryptResult.body, null, 2), 'تم نسخ جسم الطلب JSON')
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Copy cURL</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendToDecrypt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>تحقق بالفك</span>
                  </button>
                </div>
              )}
            </div>

            {!encryptResult ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-20 text-center text-slate-500 text-sm">
                اضغط "تشفير الطلب الآن" لعرض <code className="font-mono">key</code> و <code className="font-mono">data</code> و <code className="font-mono">body</code>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">المفتاح المستخدم (key)</span>
                    <button
                      type="button"
                      onClick={() => onCopy(encryptResult.key, 'تم نسخ المفتاح')}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      <Copy className="w-3 h-3" /> نسخ
                    </button>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 font-mono text-sm text-amber-300 select-all" dir="ltr">
                    {encryptResult.key}
                  </div>
                </div>

                {/* Data */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">القيمة المشفرة (data)</span>
                    <button
                      type="button"
                      onClick={() => onCopy(encryptResult.data, 'تم نسخ data المشفر')}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      <Copy className="w-3 h-3" /> نسخ
                    </button>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-emerald-300 break-all max-h-36 overflow-y-auto select-all" dir="ltr">
                    {encryptResult.data}
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">جسم الطلب الجاهز للإرسال (body)</span>
                    <button
                      type="button"
                      onClick={() => onCopy(JSON.stringify(encryptResult.body, null, 2), 'تم نسخ body')}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      <Copy className="w-3 h-3" /> نسخ
                    </button>
                  </div>
                  <pre className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-slate-200 overflow-x-auto max-h-40 whitespace-pre-wrap break-all" dir="ltr">
                    {JSON.stringify(encryptResult.body, null, 2)}
                  </pre>
                </div>

                {/* Request preview */}
                {encryptResult.request && (
                  <details className="rounded-xl bg-slate-950/60 border border-slate-800 px-3.5 py-2.5">
                    <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200">
                      عرض الحمولة الأصلية قبل التشفير (request)
                    </summary>
                    <pre className="mt-2.5 font-mono text-xs text-slate-300 overflow-x-auto" dir="ltr">
                      {JSON.stringify(encryptResult.request, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: DECRYPT                            */}
      {/* ========================================= */}
      {subTab === 'decrypt' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={handleRunDecrypt}
            className="xl:col-span-5 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-4"
          >
            <div>
              <h3 className="text-base font-extrabold text-white">إدخال النص المشفر (data)</h3>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك لصق قيمة <code className="font-mono text-amber-300">data</code> مباشرة أو لصق جسم الطلب الكامل{' '}
                <code className="font-mono text-slate-300" dir="ltr">{'{"data":"..."}'}</code>.
              </p>
            </div>

            <textarea
              rows={9}
              dir="ltr"
              value={cipherInput}
              onChange={(e) => setCipherInput(e.target.value)}
              placeholder="ألصق السلسلة المشفرة هنا..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/85 p-3.5 text-xs font-mono text-amber-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 break-all"
            />

            {decryptError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{decryptError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={offline || decryptLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/50 transition-all disabled:opacity-45"
            >
              {decryptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              <span>فك التشفير الآن</span>
            </button>
          </form>

          <section className="xl:col-span-7 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-xl shadow-black/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">النتيجة بعد فك التشفير (Pretty JSON)</h3>
                {decryptResult?.extractedKey && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30" dir="ltr">
                    Key: {decryptResult.extractedKey}
                  </span>
                )}
              </div>
              {decryptResult?.decrypted && (
                <button
                  type="button"
                  onClick={() =>
                    onCopy(JSON.stringify(decryptResult.decrypted, null, 2), 'تم نسخ JSON المفكوك')
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ JSON</span>
                </button>
              )}
            </div>

            {!decryptResult ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-20 text-center text-slate-500 text-sm">
                سيظهر محتوى الـ JSON المنسّق هنا بعد فك التشفير عبر <code className="font-mono">/api/rawdah/decrypt</code>
              </div>
            ) : (
              <pre className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[420px] leading-relaxed" dir="ltr">
                {JSON.stringify(decryptResult.decrypted, null, 2)}
              </pre>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

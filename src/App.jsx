import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ToastContainer from './components/ToastContainer';
import ImageModal from './components/ImageModal';
import OverviewView from './views/OverviewView';
import RegistrationView from './views/RegistrationView';
import EmulatorsHealthView from './views/EmulatorsHealthView';
import CryptoLabView from './views/CryptoLabView';
import ActivityLogView from './views/ActivityLogView';
import SettingsView from './views/SettingsView';
import { nusukApi } from './services/api';
import {
  loadSettings,
  saveSettings,
  loadActivityLogs,
  saveActivityLogs,
} from './utils/storage';
import { POLLING_INTERVAL_MS } from './constants/nationalities';

function buildPilgrimRequestPayload(settings, input) {
  const pilgrim = {
    passport_number: input.passport,
    visa_number: input.visa,
    nationality: input.nationality || settings.defaultNationality || 'مصر',
  };

  if (input.email) {
    pilgrim.email = input.email;
  }

  const effectivePassword = input.password || settings.defaultPassword;
  if (effectivePassword) {
    pilgrim.password = effectivePassword;
  }

  return {
    client_email: settings.clientEmail.trim(),
    client_pass: settings.clientPass.trim(),
    pilgrim,
    nationality: input.nationality || settings.defaultNationality || 'مصر',
    force_role: input.forceRole || null,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [settings, setSettings] = useState(() => loadSettings());
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Live server status state
  const [connectionState, setConnectionState] = useState('connecting'); // connecting | connected | offline
  const [statusData, setStatusData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const statusInFlightRef = useRef(false);

  // Health state
  const [healthData, setHealthData] = useState(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Registration single state
  const [singleLoading, setSingleLoading] = useState(null); // null | 'register' | 'recover'
  const [lastSingleResult, setLastSingleResult] = useState(null);

  // Bulk queue state (lifted so tab switches never interrupt execution)
  const [bulkState, setBulkState] = useState({
    items: [],
    running: false,
    paused: false,
    mode: 'register', // 'register' | 'recover'
    forceRole: '',
  });
  const bulkStateRef = useRef(bulkState);
  useEffect(() => {
    bulkStateRef.current = bulkState;
  }, [bulkState]);
  const bulkPauseSignalRef = useRef(false);

  // Activity logs
  const [logs, setLogs] = useState(() => loadActivityLogs());

  // Toasts & Image Lightbox
  const [toasts, setToasts] = useState([]);
  const [activeImage, setActiveImage] = useState(null);

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ id, type: 'info', ...toast }, ...prev].slice(0, 5));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const appendLog = useCallback((entry) => {
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    };
    setLogs((prev) => {
      const next = [record, ...prev].slice(0, 200);
      saveActivityLogs(next);
      return next;
    });
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    saveActivityLogs([]);
    addToast({ type: 'info', title: 'تم مسح سجل العمليات' });
  }, [addToast]);

  const handleCopy = useCallback(
    async (text, successMsg = 'تم النسخ للحافظة') => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(String(text));
        } else {
          const ta = document.createElement('textarea');
          ta.value = String(text);
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        addToast({ type: 'success', title: successMsg });
      } catch {
        addToast({ type: 'error', title: 'تعذر النسخ تلقائياً' });
      }
    },
    [addToast]
  );

  // Fetch /api/status
  const fetchStatus = useCallback(async (manual = false) => {
    if (statusInFlightRef.current && !manual) return;
    statusInFlightRef.current = true;
    if (manual) setIsRefreshing(true);

    try {
      const { data } = await nusukApi.getStatus(settingsRef.current.apiBaseUrl);
      setStatusData(data);
      setConnectionState('connected');
      setLastUpdated(Date.now());
    } catch {
      setConnectionState('offline');
    } finally {
      statusInFlightRef.current = false;
      if (manual) setIsRefreshing(false);
    }
  }, []);

  // Automatic 3-second polling
  useEffect(() => {
    fetchStatus(false);
    if (!settings.pollingEnabled) return undefined;

    const timer = setInterval(() => {
      fetchStatus(false);
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [settings.apiBaseUrl, settings.pollingEnabled, fetchStatus]);

  const handleSaveSettings = useCallback(
    (nextSettings) => {
      setSettings(nextSettings);
      settingsRef.current = nextSettings;
      saveSettings(nextSettings);
      setConnectionState('connecting');
      setTimeout(() => fetchStatus(true), 80);
    },
    [fetchStatus]
  );

  // Overview actions
  const handleForceCloseGroup = useCallback(async () => {
    try {
      const { data } = await nusukApi.forceCloseGroup(settingsRef.current.apiBaseUrl);
      appendLog({
        title: 'إنهاء المجموعة الحالية',
        endpoint: 'POST /api/force-close-group',
        outcome: data.success ? 'success' : 'error',
        message: data.message || data.error,
        payload: data,
      });
      addToast({
        type: data.success ? 'success' : 'error',
        title: data.success ? 'تم إنهاء المجموعة' : 'تعذر إنهاء المجموعة',
        message: data.message || data.error,
      });
      fetchStatus(true);
    } catch (err) {
      appendLog({
        title: 'إنهاء المجموعة الحالية',
        endpoint: 'POST /api/force-close-group',
        outcome: 'error',
        message: err.message,
      });
      addToast({ type: 'error', title: 'خطأ في إنهاء المجموعة', message: err.message });
    }
  }, [appendLog, addToast, fetchStatus]);

  const handleResetState = useCallback(
    async (resetCounters) => {
      try {
        const { data } = await nusukApi.resetState(settingsRef.current.apiBaseUrl, resetCounters);
        appendLog({
          title: `تصفير الحالة (reset_counters=${resetCounters})`,
          endpoint: `POST /api/reset-state?reset_counters=${resetCounters}`,
          outcome: data.success ? 'success' : 'error',
          message: data.message || data.error,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : 'error',
          title: data.success ? 'تم تصفير الحالة بنجاح' : 'تعذر تصفير الحالة',
          message: data.message || data.error,
        });
        fetchStatus(true);
      } catch (err) {
        appendLog({
          title: 'تصفير الحالة',
          endpoint: 'POST /api/reset-state',
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'خطأ أثناء تصفير الحالة', message: err.message });
      }
    },
    [appendLog, addToast, fetchStatus]
  );

  const handleSetSpeed = useCallback(
    async (multiplier) => {
      try {
        const { data } = await nusukApi.setSpeed(settingsRef.current.apiBaseUrl, multiplier);
        appendLog({
          title: `تغيير سرعة الانتظار إلى ${data.speed_multiplier}x`,
          endpoint: `POST /api/set-speed?multiplier=${multiplier}`,
          outcome: data.success ? 'success' : 'error',
          message: `معامل الانتظار Anti-Lag أصبح ${data.speed_multiplier}x`,
          payload: data,
        });
        addToast({
          type: 'success',
          title: `تم ضبط السرعة على ${Number(data.speed_multiplier).toFixed(1)}x`,
        });
        fetchStatus(false);
      } catch (err) {
        addToast({ type: 'error', title: 'فشل تحديث السرعة', message: err.message });
      }
    },
    [appendLog, addToast, fetchStatus]
  );

  // Health actions
  const handleCheckHealth = useCallback(
    async (silent = false) => {
      setCheckingHealth(true);
      try {
        const { data } = await nusukApi.getHealth(settingsRef.current.apiBaseUrl);
        setHealthData(data);
        setHealthCheckedAt(Date.now());
        if (!silent) {
          appendLog({
            title: 'فحص صحة المحاكيات',
            endpoint: 'GET /api/health',
            outcome: data.ok ? 'success' : 'warning',
            message: data.ok ? 'جميع المحاكيات سليمة ومتصلة' : 'يوجد محاكي غير متصل أو به تنبيه',
            payload: data,
          });
          addToast({
            type: data.ok ? 'success' : 'warning',
            title: data.ok ? 'المحاكيات سليمة (OK)' : 'انتهى الفحص مع وجود تنبيه',
          });
        }
      } catch (err) {
        if (!silent) {
          appendLog({
            title: 'فحص صحة المحاكيات',
            endpoint: 'GET /api/health',
            outcome: 'error',
            message: err.message,
          });
          addToast({ type: 'error', title: 'فشل فحص الصحة', message: err.message });
        }
      } finally {
        setCheckingHealth(false);
      }
    },
    [appendLog, addToast]
  );

  const handleRandomizeEmulator = useCallback(
    async (emuKey) => {
      try {
        const { data } = await nusukApi.randomizeEmulator(settingsRef.current.apiBaseUrl, emuKey);
        appendLog({
          title: `تغيير البصمة وإعادة التشغيل (${emuKey})`,
          endpoint: `POST /api/randomize-emulator?emu_key=${emuKey}`,
          outcome: data.success ? 'success' : 'error',
          message: data.message || data.error,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : 'error',
          title: data.success ? `تم تدوير بصمة ${emuKey}` : `فشل تدوير بصمة ${emuKey}`,
          message: data.message || data.error,
        });
        fetchStatus(true);
        handleCheckHealth(true);
      } catch (err) {
        appendLog({
          title: `تغيير البصمة (${emuKey})`,
          endpoint: `POST /api/randomize-emulator?emu_key=${emuKey}`,
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'فشل تغيير البصمة', message: err.message });
      }
    },
    [appendLog, addToast, fetchStatus, handleCheckHealth]
  );

  // Single Registration / Recovery
  const handleRunSingle = useCallback(
    async (mode, input) => {
      setSingleLoading(mode);
      const endpoint = mode === 'recover' ? 'POST /api/recover' : 'POST /api/register';
      const opLabel = mode === 'recover' ? 'استرجاع وفحص الروضة' : 'تسجيل معتمر';
      const payload = buildPilgrimRequestPayload(settingsRef.current, input);

      try {
        const { data } =
          mode === 'recover'
            ? await nusukApi.recover(settingsRef.current.apiBaseUrl, payload)
            : await nusukApi.register(settingsRef.current.apiBaseUrl, payload);

        setLastSingleResult(data);

        const isIneligible = data.status === 'ineligible_permit' || data.eligible === false;
        const outcome = data.success ? 'success' : isIneligible ? 'ineligible' : 'error';

        appendLog({
          title: `${opLabel} — جواز ${input.passport}`,
          endpoint,
          outcome,
          message: data.reason || data.message || data.error,
          screenshot: data.screenshot || null,
          payload: data,
        });

        addToast({
          type: data.success ? 'success' : isIneligible ? 'warning' : 'error',
          title: data.success
            ? `${opLabel}: تم بنجاح`
            : isIneligible
              ? 'غير مؤهل لتصريح الروضة'
              : `فشل ${opLabel}`,
          message: data.reason || data.message || data.error,
        });

        fetchStatus(true);
        return data;
      } catch (err) {
        const errObj = { success: false, status: 'error', error: err.message };
        setLastSingleResult(errObj);
        appendLog({
          title: `${opLabel} — جواز ${input.passport}`,
          endpoint,
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: `خطأ في ${opLabel}`, message: err.message });
        return errObj;
      } finally {
        setSingleLoading(null);
      }
    },
    [appendLog, addToast, fetchStatus]
  );

  // Bulk Queue Helpers
  const handleAddBulkItems = useCallback((newItems) => {
    setBulkState((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }));
  }, []);

  const handleRemoveBulkItem = useCallback((id) => {
    setBulkState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  const handleClearBulk = useCallback(() => {
    setBulkState((prev) => ({
      ...prev,
      items: [],
      paused: false,
    }));
  }, []);

  const handleRetryFailedBulk = useCallback(() => {
    setBulkState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.status === 'error'
          ? { ...item, status: 'pending', message: '', screenshot: null, finishedAt: null }
          : item
      ),
    }));
  }, []);

  const handleChangeBulkConfig = useCallback((patch) => {
    setBulkState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePauseBulk = useCallback(() => {
    bulkPauseSignalRef.current = true;
    addToast({
      type: 'warning',
      title: 'جاري الإيقاف المؤقت للطابور',
      message: 'سيتوقف الطابور فور انتهاء المعتمر الجاري تنفيذه حالياً.',
    });
  }, [addToast]);

  const handleStartBulk = useCallback(async () => {
    const cfg = settingsRef.current;
    if (!cfg.clientEmail?.trim() || !cfg.clientPass?.trim()) {
      addToast({
        type: 'warning',
        title: 'بيانات إيميل OTP غير مكتملة',
        message: 'أدخل client_email و client_pass من صفحة الإعدادات قبل تشغيل الطابور.',
      });
      return;
    }
    if (bulkStateRef.current.running) return;

    bulkPauseSignalRef.current = false;
    setBulkState((prev) => ({ ...prev, running: true, paused: false }));

    while (!bulkPauseSignalRef.current) {
      const nextItem = bulkStateRef.current.items.find((i) => i.status === 'pending');
      if (!nextItem) break;

      const mode = bulkStateRef.current.mode;
      const forceRole = bulkStateRef.current.forceRole || null;
      const endpoint = mode === 'recover' ? 'POST /api/recover' : 'POST /api/register';

      setBulkState((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === nextItem.id ? { ...i, status: 'running', message: 'جاري التنفيذ على المحاكي...' } : i
        ),
      }));

      const payload = buildPilgrimRequestPayload(settingsRef.current, {
        passport: nextItem.passport,
        visa: nextItem.visa,
        nationality: nextItem.nationality,
        email: nextItem.email,
        password: nextItem.password,
        forceRole,
      });

      let data = null;
      let errMsg = null;

      // Retry briefly if server responds busy
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const resp =
            mode === 'recover'
              ? await nusukApi.recover(settingsRef.current.apiBaseUrl, payload)
              : await nusukApi.register(settingsRef.current.apiBaseUrl, payload);
          data = resp.data;
          if (data?.status === 'busy' && attempt < 3 && !bulkPauseSignalRef.current) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          break;
        } catch (err) {
          errMsg = err.message;
          break;
        }
      }

      const now = Date.now();

      if (errMsg || !data) {
        const finalMsg = errMsg || 'خطأ غير معروف في الاتصال';
        setBulkState((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === nextItem.id
              ? { ...i, status: 'error', message: finalMsg, finishedAt: now }
              : i
          ),
        }));
        appendLog({
          title: `[طابور] فشل — جواز ${nextItem.passport}`,
          endpoint,
          outcome: 'error',
          message: finalMsg,
        });
      } else {
        const isIneligible = data.status === 'ineligible_permit' || data.eligible === false;
        const rowStatus = data.success ? 'success' : isIneligible ? 'ineligible' : 'error';
        const pilgrimName = data.leader_name || data.companion_name || data.pilgrim_name || '';
        const nusukId = data.leader_id || data.companion_id || data.nusuk_id || '';
        const msg = data.reason || data.message || data.error || '';

        setBulkState((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === nextItem.id
              ? {
                  ...i,
                  status: rowStatus,
                  role: data.role || null,
                  pilgrimName,
                  nusukId,
                  eligible: typeof data.eligible === 'boolean' ? data.eligible : null,
                  message: msg,
                  details: data.details || null,
                  screenshot: data.screenshot || null,
                  finishedAt: now,
                }
              : i
          ),
        }));

        appendLog({
          title: `[طابور] ${mode === 'recover' ? 'استرجاع' : 'تسجيل'} — جواز ${nextItem.passport}`,
          endpoint,
          outcome: rowStatus,
          message: msg,
          screenshot: data.screenshot || null,
          payload: data,
        });
      }

      fetchStatus(false);

      if (!bulkPauseSignalRef.current) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    const wasPaused = bulkPauseSignalRef.current;
    setBulkState((prev) => ({
      ...prev,
      running: false,
      paused: wasPaused,
    }));

    addToast({
      type: wasPaused ? 'info' : 'success',
      title: wasPaused ? 'تم إيقاف الطابور مؤقتاً' : 'اكتمل تشغيل الطابور الجماعي',
    });
  }, [addToast, appendLog, fetchStatus]);

  // Crypto Lab actions
  const handleEncryptRawdah = useCallback(
    async (body) => {
      try {
        const { data } = await nusukApi.encryptRawdah(settingsRef.current.apiBaseUrl, body);
        appendLog({
          title: 'تشفير طلب الروضة (Rawdah v2)',
          endpoint: 'POST /api/rawdah/encrypt',
          outcome: data.success ? 'success' : 'error',
          message: data.success ? `تم التشفير بنجاح | Key: ${data.key}` : data.error,
          payload: data,
        });
        if (data.success) {
          addToast({ type: 'success', title: 'تم تشفير طلب الروضة بنجاح' });
        }
        return data;
      } catch (err) {
        appendLog({
          title: 'تشفير طلب الروضة',
          endpoint: 'POST /api/rawdah/encrypt',
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'فشل التشفير', message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast]
  );

  const handleDecryptRawdah = useCallback(
    async (cipherData) => {
      try {
        const { data } = await nusukApi.decryptRawdah(settingsRef.current.apiBaseUrl, cipherData);
        appendLog({
          title: 'فك تشفير طلب الروضة (Rawdah v2)',
          endpoint: 'POST /api/rawdah/decrypt',
          outcome: data.success ? 'success' : 'error',
          message: data.success ? 'تم فك التشفير بنجاح' : data.error,
          payload: data,
        });
        if (data.success) {
          addToast({ type: 'success', title: 'تم فك التشفير بنجاح' });
        }
        return data;
      } catch (err) {
        appendLog({
          title: 'فك تشفير طلب الروضة',
          endpoint: 'POST /api/rawdah/decrypt',
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'فشل فك التشفير', message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast]
  );

  const screenshotsCount = logs.filter((l) => Boolean(l.screenshot)).length;
  const missingOtpCreds = !settings.clientEmail?.trim() || !settings.clientPass?.trim();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        statusData={statusData}
        logsCount={logs.length}
        screenshotsCount={screenshotsCount}
        queueRunning={bulkState.running}
        missingOtpCreds={missingOtpCreds}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          connectionState={connectionState}
          statusData={statusData}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onManualRefresh={() => fetchStatus(true)}
          onOpenSettings={() => setActiveTab('settings')}
          apiBaseUrl={settings.apiBaseUrl}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              statusData={statusData}
              connectionState={connectionState}
              onForceCloseGroup={handleForceCloseGroup}
              onResetState={handleResetState}
              onSetSpeed={handleSetSpeed}
              onCopy={handleCopy}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'register' && (
            <RegistrationView
              settings={settings}
              statusData={statusData}
              connectionState={connectionState}
              onRunSingle={handleRunSingle}
              lastSingleResult={lastSingleResult}
              singleLoading={singleLoading}
              bulkState={bulkState}
              onAddBulkItems={handleAddBulkItems}
              onStartBulk={handleStartBulk}
              onPauseBulk={handlePauseBulk}
              onClearBulk={handleClearBulk}
              onRemoveBulkItem={handleRemoveBulkItem}
              onRetryFailedBulk={handleRetryFailedBulk}
              onChangeBulkConfig={handleChangeBulkConfig}
              onCopy={handleCopy}
              onOpenImage={setActiveImage}
              onNavigateSettings={() => setActiveTab('settings')}
              onNotify={addToast}
            />
          )}

          {activeTab === 'health' && (
            <EmulatorsHealthView
              statusData={statusData}
              connectionState={connectionState}
              healthData={healthData}
              healthCheckedAt={healthCheckedAt}
              checkingHealth={checkingHealth}
              onCheckHealth={handleCheckHealth}
              onRandomizeEmulator={handleRandomizeEmulator}
            />
          )}

          {activeTab === 'crypto' && (
            <CryptoLabView
              connectionState={connectionState}
              onEncrypt={handleEncryptRawdah}
              onDecrypt={handleDecryptRawdah}
              onCopy={handleCopy}
              onNotify={addToast}
            />
          )}

          {activeTab === 'logs' && (
            <ActivityLogView
              logs={logs}
              apiBaseUrl={settings.apiBaseUrl}
              onClearLogs={handleClearLogs}
              onOpenImage={setActiveImage}
              onCopy={handleCopy}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onNotify={addToast}
            />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ImageModal image={activeImage} onClose={() => setActiveImage(null)} />
    </div>
  );
}

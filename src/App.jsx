import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ToastContainer from './components/ToastContainer';
import ImageModal from './components/ImageModal';
import OverviewView from './views/OverviewView';
import RegistrationView from './views/RegistrationView';
import BookingView from './views/BookingView';
import RadarView from './views/RadarView';
import EmulatorsHealthView from './views/EmulatorsHealthView';
import CryptoLabView from './views/CryptoLabView';
import ActivityLogView from './views/ActivityLogView';
import SettingsView from './views/SettingsView';
import { nusukApi } from './services/api';
import {
  loadSettings,
  saveSettings,
  loadNusukApiConfig,
  saveNusukApiConfig,
  loadActivityLogs,
  saveActivityLogs,
} from './utils/storage';
import {
  playRawdahAlertSound,
  sendBrowserNotification,
} from './utils/soundAlert';
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
    auto_close_group: input.autoCloseGroup !== undefined ? Boolean(input.autoCloseGroup) : true,
    skip_permit_check: Boolean(input.skipPermitCheck),
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

  // Shared Nusuk API Config (Bearer Token, Device ID, Lang) persisted in localStorage
  const [nusukApiConfig, setNusukApiConfig] = useState(() => loadNusukApiConfig());
  const handleUpdateNusukApiConfig = useCallback((patch) => {
    setNusukApiConfig((prev) => {
      const next = { ...prev, ...patch };
      saveNusukApiConfig(next);
      return next;
    });
  }, []);

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

  // Booking engine state
  const [bookingLoading, setBookingLoading] = useState(null); // null | 'rawdah' | 'for-anyone' | 'login'
  const [lastBookingResult, setLastBookingResult] = useState(null);
  const [prefillBookingSlot, setPrefillBookingSlot] = useState(null);

  // Rawdah Radar state
  const [radarStatus, setRadarStatus] = useState(null);
  const [radarBannerVisible, setRadarBannerVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  const prevHasOpenSlotsRef = useRef(false);
  const radarInFlightRef = useRef(false);

  // Bulk queue state (lifted so tab switches never interrupt execution)
  const [bulkState, setBulkState] = useState({
    items: [],
    running: false,
    paused: false,
    mode: 'register', // 'register' | 'recover'
    forceRole: '',
    autoCloseGroup: true,
    skipPermitCheck: false,
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

  // Trigger open slots alert (Audio + Green Banner + Browser Notification + Toast)
  const triggerOpenSlotsAlert = useCallback(
    (days = []) => {
      const openDays = days.filter((d) => (d.slots_count ?? d.slots?.length ?? 0) > 0);
      const totalSlots = openDays.reduce((acc, d) => acc + (d.slots_count ?? d.slots?.length ?? 0), 0);
      const summaryText =
        openDays.length > 0
          ? `تم رصد ${openDays.length} يوم متاح (${totalSlots} فترة) في الروضة الشريفة!`
          : 'تم رصد مواعيد متاحة في الروضة الشريفة الآن!';

      setRadarBannerVisible(true);
      if (soundEnabledRef.current) {
        playRawdahAlertSound();
      }
      sendBrowserNotification('مواعيد الروضة الشريفة متاحة الآن!', summaryText);
      addToast({
        type: 'success',
        title: 'تنبيه رادار الروضة: مواعيد مفتوحة!',
        message: summaryText,
      });
    },
    [addToast]
  );

  // Fetch /api/rawdah/monitor/status
  const fetchRadarStatus = useCallback(async () => {
    if (radarInFlightRef.current) return;
    radarInFlightRef.current = true;
    try {
      const { data } = await nusukApi.getRawdahMonitorStatus(settingsRef.current.apiBaseUrl);
      setRadarStatus(data);

      const hasOpen = Boolean(data?.has_open_slots);
      if (hasOpen && !prevHasOpenSlotsRef.current) {
        triggerOpenSlotsAlert(data.available_days || []);
      }
      prevHasOpenSlotsRef.current = hasOpen;
    } catch {
      // Silently ignore when backend offline
    } finally {
      radarInFlightRef.current = false;
    }
  }, [triggerOpenSlotsAlert]);

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

  // Automatic 3-second polling for server status
  useEffect(() => {
    fetchStatus(false);
    if (!settings.pollingEnabled) return undefined;

    const timer = setInterval(() => {
      fetchStatus(false);
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [settings.apiBaseUrl, settings.pollingEnabled, fetchStatus]);

  // Initial fetch of radar status once connected
  useEffect(() => {
    if (connectionState === 'connected') {
      fetchRadarStatus();
    }
  }, [connectionState, settings.apiBaseUrl, fetchRadarStatus]);

  // Poll /api/rawdah/monitor/status every 3 seconds while radar is running
  useEffect(() => {
    if (connectionState !== 'connected' || !radarStatus?.running) return undefined;

    const timer = setInterval(() => {
      fetchRadarStatus();
    }, 3000);

    return () => clearInterval(timer);
  }, [connectionState, radarStatus?.running, fetchRadarStatus]);

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

  // ==========================================
  // Booking Engine Handlers
  // ==========================================
  const handleBookLogin = useCallback(
    async (payload) => {
      setBookingLoading('login');
      try {
        const { data } = await nusukApi.bookLogin(settingsRef.current.apiBaseUrl, payload);
        setLastBookingResult(data);
        appendLog({
          title: `تسجيل دخول حساب (${payload.email}) على ${payload.emu_key}`,
          endpoint: 'POST /api/book/login',
          outcome: data.success ? 'success' : 'error',
          message: data.success
            ? data.otp_used
              ? 'تم تسجيل الدخول بنجاح عبر OTP'
              : 'تم تسجيل الدخول بنجاح مباشرة'
            : data.error || data.message,
          screenshot: data.screenshot || null,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : 'error',
          title: data.success ? 'تم تسجيل الدخول بنجاح' : 'فشل تسجيل الدخول',
          message: data.error || data.message,
        });
        fetchStatus(true);
        return data;
      } catch (err) {
        const errObj = { success: false, status: 'error', error: err.message };
        setLastBookingResult(errObj);
        appendLog({
          title: `تسجيل دخول (${payload.email})`,
          endpoint: 'POST /api/book/login',
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'خطأ أثناء تسجيل الدخول', message: err.message });
        return errObj;
      } finally {
        setBookingLoading(null);
      }
    },
    [appendLog, addToast, fetchStatus]
  );

  const handleBookRawdah = useCallback(
    async (payload) => {
      setBookingLoading('rawdah');
      try {
        const { data } = await nusukApi.bookRawdah(settingsRef.current.apiBaseUrl, payload);
        setLastBookingResult(data);
        const outcome = data.success
          ? 'success'
          : data.status === 'ineligible_or_unavailable'
            ? 'ineligible'
            : data.status === 'no_available_slots' || data.status === 'no_available_dates'
              ? 'warning'
              : 'error';
        appendLog({
          title: `${payload.dry_run ? '[تجريبي] ' : ''}حجز الروضة للحساب المفتوح (${payload.emu_key})`,
          endpoint: 'POST /api/book/rawdah',
          outcome,
          message: [
            data.message || data.error,
            data.permit_number ? `رقم التصريح: ${data.permit_number}` : '',
            data.selected_slot ? `الموعد: ${data.selected_date || ''} ${data.selected_slot}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
          screenshot: data.screenshot || null,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : outcome === 'warning' ? 'warning' : 'error',
          title:
            data.status === 'booked'
              ? 'تم إصدار تصريح الروضة بنجاح!'
              : data.status === 'dry_run_ready'
                ? 'التشغيل التجريبي جاهز للتأكيد'
                : 'نتيجة محاولة الحجز',
          message: data.message || data.error,
        });
        fetchStatus(true);
        return data;
      } catch (err) {
        const errObj = { success: false, status: 'error', error: err.message };
        setLastBookingResult(errObj);
        appendLog({
          title: `حجز الروضة (${payload.emu_key})`,
          endpoint: 'POST /api/book/rawdah',
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'خطأ في الحجز', message: err.message });
        return errObj;
      } finally {
        setBookingLoading(null);
      }
    },
    [appendLog, addToast, fetchStatus]
  );

  const handleBookForAnyone = useCallback(
    async (payload) => {
      setBookingLoading('for-anyone');
      try {
        const { data } = await nusukApi.bookForAnyone(settingsRef.current.apiBaseUrl, payload);
        setLastBookingResult(data);
        const outcome = data.success
          ? 'success'
          : data.status === 'ineligible_or_unavailable'
            ? 'ineligible'
            : data.status === 'no_available_slots' || data.status === 'no_available_dates'
              ? 'warning'
              : 'error';
        appendLog({
          title: `${payload.dry_run ? '[تجريبي] ' : ''}حجز لأي حد — ${payload.email || 'الحساب المفتوح'} (${payload.emu_key})`,
          endpoint: 'POST /api/book/for-anyone',
          outcome,
          message: [
            data.message || data.error,
            data.permit_number ? `رقم التصريح: ${data.permit_number}` : '',
            data.selected_slot ? `الموعد: ${data.selected_date || ''} ${data.selected_slot}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
          screenshot: data.screenshot || null,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : outcome === 'warning' ? 'warning' : 'error',
          title:
            data.status === 'booked'
              ? 'تم الحجز وإصدار التصريح بنجاح!'
              : data.status === 'dry_run_ready'
                ? 'التشغيل التجريبي جاهز للتأكيد'
                : 'نتيجة الحجز',
          message: data.message || data.error,
        });
        fetchStatus(true);
        return data;
      } catch (err) {
        const errObj = { success: false, status: 'error', error: err.message };
        setLastBookingResult(errObj);
        appendLog({
          title: `حجز لأي حد (${payload.email || payload.emu_key})`,
          endpoint: 'POST /api/book/for-anyone',
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: 'خطأ في الحجز لأي حد', message: err.message });
        return errObj;
      } finally {
        setBookingLoading(null);
      }
    },
    [appendLog, addToast, fetchStatus]
  );

  const handleBookFromRadarSlot = useCallback(
    ({ date, time }) => {
      setPrefillBookingSlot({ date: date || '', time: time || '' });
      setActiveTab('booking');
      addToast({
        type: 'info',
        title: 'تم نقل الموعد لتبويب الحجز',
        message: [date, time].filter(Boolean).join(' • ') || 'جاهز لتنفيذ الحجز',
      });
    },
    [addToast]
  );

  // ==========================================
  // Rawdah Radar & Nusuk API Handlers
  // ==========================================
  const handleCheckServerTime = useCallback(async () => {
    try {
      const { data } = await nusukApi.getNusukServerTime(settingsRef.current.apiBaseUrl);
      appendLog({
        title: 'فحص وقت سيرفر نسك',
        endpoint: 'GET /api/nusuk/server-time',
        outcome: data.success ? 'success' : 'error',
        message: data.success ? `HTTP ${data.http_status} — الاتصال والتوقيع سليمان` : data.error,
        payload: data,
      });
      addToast({
        type: data.success ? 'success' : 'error',
        title: data.success ? 'اتصال سيرفر نسك سليم' : 'فشل الاتصال بسيرفر نسك',
        message: data.http_status ? `HTTP ${data.http_status}` : data.error,
      });
      return data;
    } catch (err) {
      addToast({ type: 'error', title: 'فشل فحص وقت سيرفر نسك', message: err.message });
      return { success: false, error: err.message };
    }
  }, [appendLog, addToast]);

  const handleSignHeaders = useCallback(
    async (payload) => {
      try {
        const { data } = await nusukApi.signNusukHeaders(settingsRef.current.apiBaseUrl, payload);
        appendLog({
          title: 'توليد هيدرز نسك الموقّعة',
          endpoint: 'POST /api/nusuk/sign-headers',
          outcome: data.success ? 'success' : 'error',
          message: data.headers?.timestamp ? `Timestamp: ${data.headers.timestamp}` : data.error,
          payload: data,
        });
        if (data.success) {
          addToast({ type: 'success', title: 'تم توليد الهيدرز الموقّعة بنجاح' });
        }
        return data;
      } catch (err) {
        addToast({ type: 'error', title: 'فشل توليد الهيدرز', message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast]
  );

  const handleStartRadar = useCallback(
    async (payload) => {
      try {
        const { data } = await nusukApi.startRawdahMonitor(settingsRef.current.apiBaseUrl, payload);
        appendLog({
          title: `تشغيل رادار الروضة (كل ${payload.interval_seconds}ث)`,
          endpoint: 'POST /api/rawdah/monitor/start',
          outcome: data.success ? 'success' : 'warning',
          message: data.message || data.error,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : 'warning',
          title: data.success ? 'تم تشغيل رادار الروضة' : 'تنبيه الرادار',
          message: data.message || data.error,
        });
        prevHasOpenSlotsRef.current = false;
        await fetchRadarStatus();
        return data;
      } catch (err) {
        addToast({ type: 'error', title: 'فشل تشغيل الرادار', message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast, fetchRadarStatus]
  );

  const handleStopRadar = useCallback(async () => {
    try {
      const { data } = await nusukApi.stopRawdahMonitor(settingsRef.current.apiBaseUrl);
      appendLog({
        title: 'إيقاف رادار الروضة',
        endpoint: 'POST /api/rawdah/monitor/stop',
        outcome: data.success ? 'success' : 'error',
        message: data.message || data.error,
        payload: data,
      });
      addToast({ type: 'info', title: 'تم إيقاف رادار الروضة', message: data.message });
      await fetchRadarStatus();
      return data;
    } catch (err) {
      addToast({ type: 'error', title: 'فشل إيقاف الرادار', message: err.message });
      return { success: false, error: err.message };
    }
  }, [appendLog, addToast, fetchRadarStatus]);

  const handleCheckNowSlots = useCallback(
    async (payload) => {
      try {
        const { data } = await nusukApi.getRawdahAvailableSlots(settingsRef.current.apiBaseUrl, payload);
        appendLog({
          title: 'فحص فوري لمواعيد الروضة',
          endpoint: 'POST /api/rawdah/available-slots',
          outcome: data.success ? 'success' : 'error',
          message: data.success
            ? `HTTP ${data.http_status} | ${data.available_days?.length || 0} يوم | ${data.has_open_slots ? 'توجد مواعيد متاحة!' : 'لا توجد فترات مفتوحة'}`
            : data.error || `HTTP ${data.http_status}`,
          payload: data,
        });
        if (data.has_open_slots) {
          triggerOpenSlotsAlert(data.available_days || []);
        } else if (data.success) {
          addToast({
            type: 'info',
            title: 'انتهى الفحص الفوري',
            message: `تم جلب ${data.available_days?.length || 0} يوم — لا توجد فترات مفتوحة حالياً.`,
          });
        } else {
          addToast({
            type: 'error',
            title: 'فشل فحص المواعيد',
            message: data.error || `HTTP ${data.http_status}`,
          });
        }
        return data;
      } catch (err) {
        addToast({ type: 'error', title: 'خطأ في فحص المواعيد', message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast, triggerOpenSlotsAlert]
  );

  const handleQueryUmrahDates = useCallback(
    async (payload) => {
      try {
        const { data } = await nusukApi.getUmrahAvailableDates(settingsRef.current.apiBaseUrl, payload);
        appendLog({
          title: 'استعلام مواعيد العمرة المتاحة',
          endpoint: 'POST /api/umrah/available-dates',
          outcome: data.success ? 'success' : 'error',
          message: data.success ? `HTTP ${data.http_status}` : data.error || `HTTP ${data.http_status}`,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : 'error',
          title: data.success ? 'تم جلب مواعيد العمرة' : 'فشل استعلام مواعيد العمرة',
          message: data.http_status ? `HTTP ${data.http_status}` : data.error,
        });
        return data;
      } catch (err) {
        addToast({ type: 'error', title: 'خطأ في استعلام العمرة', message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast]
  );

  // ==========================================
  // Direct Permits API Handler (CryptoLabView)
  // ==========================================
  const handleDirectPermitApi = useCallback(
    async (opId, body) => {
      const apiMap = {
        permits: { fn: nusukApi.getRawdahPermits, title: 'جلب تصاريح الروضة', ep: 'POST /api/rawdah/permits' },
        'issue-rawdah': { fn: nusukApi.issueRawdahPermit, title: `إصدار تصريح روضة (${body.track})`, ep: 'POST /api/rawdah/issue-permit' },
        'confirm-rawdah': { fn: nusukApi.confirmRawdahPermit, title: 'تأكيد تصريح روضة', ep: 'POST /api/rawdah/confirm-permit' },
        'cancel-rawdah': { fn: nusukApi.cancelRawdahPermit, title: 'إلغاء تصريح روضة', ep: 'POST /api/rawdah/cancel-permit' },
        'issue-umrah': { fn: nusukApi.issueUmrahPermit, title: 'إصدار تصريح عمرة', ep: 'POST /api/umrah/issue-permit' },
      };
      const entry = apiMap[opId];
      if (!entry) return { success: false, error: 'عملية غير معروفة' };

      try {
        const { data } = await entry.fn(settingsRef.current.apiBaseUrl, body);
        appendLog({
          title: entry.title,
          endpoint: entry.ep,
          outcome: data.success ? 'success' : 'error',
          message: data.http_status ? `HTTP ${data.http_status}` : data.error,
          payload: data,
        });
        addToast({
          type: data.success ? 'success' : 'error',
          title: data.success ? `${entry.title}: نجاح` : `${entry.title}: فشل`,
          message: data.http_status ? `HTTP ${data.http_status}` : data.error,
        });
        return data;
      } catch (err) {
        appendLog({
          title: entry.title,
          endpoint: entry.ep,
          outcome: 'error',
          message: err.message,
        });
        addToast({ type: 'error', title: `خطأ في ${entry.title}`, message: err.message });
        return { success: false, error: err.message };
      }
    },
    [appendLog, addToast]
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
      const autoCloseGroup = bulkStateRef.current.autoCloseGroup;
      const skipPermitCheck = bulkStateRef.current.skipPermitCheck;
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
        autoCloseGroup,
        skipPermitCheck,
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
        radarStatus={radarStatus}
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
          radarStatus={radarStatus}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
          onManualRefresh={() => {
            fetchStatus(true);
            fetchRadarStatus();
          }}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenRadar={() => setActiveTab('radar')}
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

          {activeTab === 'booking' && (
            <BookingView
              settings={settings}
              statusData={statusData}
              connectionState={connectionState}
              bookingLoading={bookingLoading}
              lastBookingResult={lastBookingResult}
              prefillSlot={prefillBookingSlot}
              onClearPrefill={() => setPrefillBookingSlot(null)}
              onBookRawdah={handleBookRawdah}
              onBookForAnyone={handleBookForAnyone}
              onBookLogin={handleBookLogin}
              onCopy={handleCopy}
              onOpenImage={setActiveImage}
              onNavigateSettings={() => setActiveTab('settings')}
              onNotify={addToast}
            />
          )}

          {activeTab === 'radar' && (
            <RadarView
              connectionState={connectionState}
              nusukApiConfig={nusukApiConfig}
              onUpdateNusukApiConfig={handleUpdateNusukApiConfig}
              radarStatus={radarStatus}
              radarBannerVisible={radarBannerVisible}
              onDismissRadarBanner={() => setRadarBannerVisible(false)}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((s) => !s)}
              onTestSound={() => {
                playRawdahAlertSound();
                addToast({ type: 'info', title: 'تم تشغيل نغمة التنبيه التجريبية' });
              }}
              onStartRadar={handleStartRadar}
              onStopRadar={handleStopRadar}
              onCheckNowSlots={handleCheckNowSlots}
              onCheckServerTime={handleCheckServerTime}
              onSignHeaders={handleSignHeaders}
              onQueryUmrahDates={handleQueryUmrahDates}
              onBookSlot={handleBookFromRadarSlot}
              onCopy={handleCopy}
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
              nusukApiConfig={nusukApiConfig}
              onUpdateNusukApiConfig={handleUpdateNusukApiConfig}
              onEncrypt={handleEncryptRawdah}
              onDecrypt={handleDecryptRawdah}
              onDirectPermitApi={handleDirectPermitApi}
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

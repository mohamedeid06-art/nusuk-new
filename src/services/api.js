export function normalizeBaseUrl(url) {
  const cleaned = String(url || '').trim().replace(/\/+$/, '');
  return cleaned || 'http://127.0.0.1:8000';
}

export function buildAssetUrl(baseUrl, relativePath) {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const base = normalizeBaseUrl(baseUrl);
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

async function request(baseUrl, path, options = {}) {
  const { method = 'GET', body, timeoutMs = 30000 } = options;
  const url = `${normalizeBaseUrl(baseUrl)}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = performance.now();
  try {
    const fetchOpts = {
      method,
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    };

    if (body !== undefined) {
      fetchOpts.headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const latencyMs = Math.round(performance.now() - startedAt);
    const text = await res.text();

    let data = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const msg = data?.detail || data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`;
      const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return { data, latencyMs };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بالسيرفر (Timeout)');
    }
    if (err instanceof TypeError) {
      throw new Error('تعذر الاتصال بالسيرفر — تأكد من تشغيل السيرفر وصحة العنوان وإعدادات CORS');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const nusukApi = {
  async getStatus(baseUrl) {
    return request(baseUrl, '/api/status', { method: 'GET', timeoutMs: 8000 });
  },

  async setSpeed(baseUrl, multiplier) {
    const value = Number(multiplier).toFixed(1);
    return request(baseUrl, `/api/set-speed?multiplier=${encodeURIComponent(value)}`, {
      method: 'POST',
      timeoutMs: 10000,
    });
  },

  async getHealth(baseUrl) {
    return request(baseUrl, '/api/health', { method: 'GET', timeoutMs: 25000 });
  },

  async resetState(baseUrl, resetCounters = false) {
    return request(baseUrl, `/api/reset-state?reset_counters=${resetCounters ? 'true' : 'false'}`, {
      method: 'POST',
      timeoutMs: 30000,
    });
  },

  async randomizeEmulator(baseUrl, emuKey) {
    return request(baseUrl, `/api/randomize-emulator?emu_key=${encodeURIComponent(emuKey)}`, {
      method: 'POST',
      timeoutMs: 260000,
    });
  },

  async forceCloseGroup(baseUrl) {
    return request(baseUrl, '/api/force-close-group', {
      method: 'POST',
      timeoutMs: 90000,
    });
  },

  async register(baseUrl, payload) {
    return request(baseUrl, '/api/register', {
      method: 'POST',
      body: payload,
      timeoutMs: 260000,
    });
  },

  async recover(baseUrl, payload) {
    return request(baseUrl, '/api/recover', {
      method: 'POST',
      body: payload,
      timeoutMs: 260000,
    });
  },

  async encryptRawdah(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/encrypt', {
      method: 'POST',
      body: payload,
      timeoutMs: 15000,
    });
  },

  async decryptRawdah(baseUrl, dataStr) {
    return request(baseUrl, '/api/rawdah/decrypt', {
      method: 'POST',
      body: { data: dataStr },
      timeoutMs: 15000,
    });
  },

  // ==========================================
  // Rawdah Booking Engine (Emulators)
  // ==========================================
  async bookLogin(baseUrl, payload) {
    return request(baseUrl, '/api/book/login', {
      method: 'POST',
      body: payload,
      timeoutMs: 240000,
    });
  },

  async bookRawdah(baseUrl, payload) {
    return request(baseUrl, '/api/book/rawdah', {
      method: 'POST',
      body: payload,
      timeoutMs: 260000,
    });
  },

  async bookForAnyone(baseUrl, payload) {
    return request(baseUrl, '/api/book/for-anyone', {
      method: 'POST',
      body: payload,
      timeoutMs: 300000,
    });
  },

  // ==========================================
  // Nusuk Signed API & Rawdah Radar
  // ==========================================
  async getNusukServerTime(baseUrl) {
    return request(baseUrl, '/api/nusuk/server-time', {
      method: 'GET',
      timeoutMs: 25000,
    });
  },

  async signNusukHeaders(baseUrl, payload) {
    return request(baseUrl, '/api/nusuk/sign-headers', {
      method: 'POST',
      body: payload,
      timeoutMs: 15000,
    });
  },

  async getRawdahAvailableSlots(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/available-slots', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },

  async startRawdahMonitor(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/monitor/start', {
      method: 'POST',
      body: payload,
      timeoutMs: 20000,
    });
  },

  async stopRawdahMonitor(baseUrl) {
    return request(baseUrl, '/api/rawdah/monitor/stop', {
      method: 'POST',
      timeoutMs: 15000,
    });
  },

  async getRawdahMonitorStatus(baseUrl) {
    return request(baseUrl, '/api/rawdah/monitor/status', {
      method: 'GET',
      timeoutMs: 10000,
    });
  },

  async getUmrahAvailableDates(baseUrl, payload) {
    return request(baseUrl, '/api/umrah/available-dates', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },

  // ==========================================
  // Direct Permits API (Rawdah & Umrah)
  // ==========================================
  async getRawdahPermits(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/permits', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },

  async issueRawdahPermit(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/issue-permit', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },

  async confirmRawdahPermit(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/confirm-permit', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },

  async cancelRawdahPermit(baseUrl, payload) {
    return request(baseUrl, '/api/rawdah/cancel-permit', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },

  async issueUmrahPermit(baseUrl, payload) {
    return request(baseUrl, '/api/umrah/issue-permit', {
      method: 'POST',
      body: payload,
      timeoutMs: 35000,
    });
  },
};

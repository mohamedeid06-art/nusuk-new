import { DEFAULT_SETTINGS } from '../constants/nationalities';

const SETTINGS_KEY = 'nusuk_pro_dashboard_settings_v1';
const LOGS_KEY = 'nusuk_pro_dashboard_logs_v1';
const MAX_LOGS = 200;

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiBaseUrl: (parsed.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl).trim(),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadActivityLogs() {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LOGS) : [];
  } catch {
    return [];
  }
}

export function saveActivityLogs(logs) {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch {
    // Ignore storage quota issues
  }
}

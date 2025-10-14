const EXCLUDED_KEY = 'excludedDomains';
const SETTINGS_KEY = 'settings';
const ABSOLUTE_MAX_SPEED = 15;
const MIN_ALLOWED_SPEED = 0.5;

const storageArea = chrome.storage?.sync ?? chrome.storage?.local;
const storageAreaName = chrome.storage?.sync ? 'sync' : 'local';

const DEFAULT_LANGUAGE = (() => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  return lang.startsWith('zh') ? 'zh-CN' : 'en';
})();

const DEFAULT_SETTINGS = Object.freeze({
  maxSpeed: 5,
  displayMode: 'popup', // page | popup | both
  theme: 'dark', // dark | light | auto
  language: DEFAULT_LANGUAGE // en | zh-CN
});

const DISPLAY_MODES = new Set(['page', 'popup', 'both']);
const THEMES = new Set(['dark', 'light', 'auto']);
const LANGUAGES = new Set(['en', 'zh-CN']);

const clampSpeed = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return DEFAULT_SETTINGS.maxSpeed;
  return Math.min(Math.max(MIN_ALLOWED_SPEED, numeric), ABSOLUTE_MAX_SPEED);
};

const normalizeSettings = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const normalized = {
    maxSpeed: clampSpeed(merged.maxSpeed),
    displayMode: DISPLAY_MODES.has(merged.displayMode) ? merged.displayMode : DEFAULT_SETTINGS.displayMode,
    theme: THEMES.has(merged.theme) ? merged.theme : DEFAULT_SETTINGS.theme,
    language: LANGUAGES.has(merged.language) ? merged.language : DEFAULT_SETTINGS.language
  };
  return normalized;
};

export async function getSettings() {
  try {
    const result = await storageArea.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
    return normalizeSettings(result[SETTINGS_KEY]);
  } catch (error) {
    console.warn('[SpeedMaster] Failed to read settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setSettings(settings) {
  const normalized = normalizeSettings(settings);
  try {
    await storageArea.set({ [SETTINGS_KEY]: normalized });
  } catch (error) {
    console.warn('[SpeedMaster] Failed to persist settings:', error);
  }
  return normalized;
}

export async function updateSettings(patch) {
  const current = await getSettings();
  return setSettings({ ...current, ...(patch || {}) });
}

export function onSettingsChange(callback) {
  const listener = (changes, areaName) => {
    if (areaName !== storageAreaName) return;
    if (Object.prototype.hasOwnProperty.call(changes, SETTINGS_KEY)) {
      callback(normalizeSettings(changes[SETTINGS_KEY]?.newValue));
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export async function getExcludedDomains() {
  try {
    const result = await storageArea.get({ [EXCLUDED_KEY]: [] });
    const list = result[EXCLUDED_KEY];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn('[SpeedMaster] Failed to read excluded domains:', error);
    return [];
  }
}

export async function setExcludedDomains(domains) {
  const sanitized = Array.isArray(domains) ? Array.from(new Set(domains.filter(Boolean))) : [];
  try {
    await storageArea.set({ [EXCLUDED_KEY]: sanitized });
  } catch (error) {
    console.warn('[SpeedMaster] Failed to persist excluded domains:', error);
  }
  return sanitized;
}

export async function addExcludedDomain(domain) {
  const normalized = (domain || '').trim().toLowerCase();
  if (!normalized) return getExcludedDomains();
  const current = await getExcludedDomains();
  if (!current.includes(normalized)) {
    current.push(normalized);
    await setExcludedDomains(current);
  }
  return current;
}

export async function removeExcludedDomain(domain) {
  const normalized = (domain || '').trim().toLowerCase();
  if (!normalized) return getExcludedDomains();
  const current = await getExcludedDomains();
  const filtered = current.filter((item) => item !== normalized);
  await setExcludedDomains(filtered);
  return filtered;
}

export function onExcludedDomainsChange(callback) {
  const listener = (changes, areaName) => {
    if (areaName !== storageAreaName) return;
    if (Object.prototype.hasOwnProperty.call(changes, EXCLUDED_KEY)) {
      const next = changes[EXCLUDED_KEY]?.newValue ?? [];
      callback(Array.isArray(next) ? next : []);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export { DEFAULT_SETTINGS };

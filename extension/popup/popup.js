import { getSettings, updateSettings, addExcludedDomain, removeExcludedDomain } from '../shared/storage.js';
import { translate, applyTranslations } from '../shared/i18n.js';
import { SPEED_STEP } from '../content/constants.js';
import { toRegistrableDomain } from '../shared/domains.js';

const ICONS = {
  sun: chrome.runtime.getURL('assets/theme-sun.svg'),
  moon: chrome.runtime.getURL('assets/theme-moon.svg'),
  options: chrome.runtime.getURL('assets/icon-gear.svg'),
  overlay: chrome.runtime.getURL('assets/icon-overlay.svg'),
  domain: chrome.runtime.getURL('assets/icon-site.svg')
};

const statusPanel = document.getElementById('status-panel');
const statusText = document.getElementById('status-text');
const controllerPanel = document.getElementById('controller-panel');
const speedValue = document.getElementById('speed-value');
const speedDownBtn = document.getElementById('speed-down');
const speedUpBtn = document.getElementById('speed-up');
const resetBtn = document.getElementById('reset-speed');
const skipBtn = document.getElementById('skip-ads');
const speedSelect = document.getElementById('speed-select');
const openOverlayBtn = document.getElementById('open-overlay');
const excludeDomainBtn = document.getElementById('exclude-domain');
const themeToggleBtn = document.getElementById('theme-toggle');
const openOptionsBtn = document.getElementById('open-options');
const overlayBtnLabel = openOverlayBtn.querySelector('.label');
const excludeBtnLabel = excludeDomainBtn.querySelector('.label');
const iconTheme = document.getElementById('icon-theme');
const iconOptions = document.getElementById('icon-options');
const iconOverlay = document.getElementById('icon-overlay');
const iconDomain = document.getElementById('icon-domain');

let currentSettings = null;
let currentState = null;
let currentLanguage = 'en';
let prefersDarkMediaQuery = null;
let activeTabId = null;

const t = (key, replacements) => translate(currentLanguage, key, replacements);

const setIconSources = () => {
  iconTheme.src = ICONS.sun;
  iconOptions.src = ICONS.options;
  iconOverlay.src = ICONS.overlay;
  iconDomain.src = ICONS.domain;
};

const setStatus = (text = '', tone = 'info') => {
  if (!text) {
    statusText.textContent = '';
    delete statusPanel.dataset.tone;
    statusPanel.hidden = true;
    return;
  }
  statusPanel.hidden = false;
  statusText.textContent = text;
  if (tone === 'info') {
    delete statusPanel.dataset.tone;
  } else {
    statusPanel.dataset.tone = tone;
  }
};

const updateThemeToggle = () => {
  if (!currentSettings) return;
  const effectiveTheme = currentSettings.theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : currentSettings.theme;
  const icon = effectiveTheme === 'light' ? ICONS.sun : ICONS.moon;
  iconTheme.src = icon;
  const titleKey = effectiveTheme === 'light' ? 'popup.theme.toggle.title.light' : 'popup.theme.toggle.title.dark';
  const title = t(titleKey);
  themeToggleBtn.setAttribute('title', title);
  themeToggleBtn.setAttribute('aria-label', title);
};

const updateAriaLabels = () => {
  speedDownBtn.setAttribute('aria-label', t('controller.button.decrease'));
  speedUpBtn.setAttribute('aria-label', t('controller.button.increase'));
  resetBtn.setAttribute('aria-label', t('controller.button.reset.aria'));
  skipBtn.setAttribute('aria-label', t('controller.button.boost.aria'));
};

const applyLanguage = () => {
  document.documentElement.lang = currentLanguage;
  applyTranslations(document.body, currentLanguage);
  resetBtn.textContent = t('controller.button.reset');
  skipBtn.textContent = currentState?.skipping ? t('controller.button.boostActive') : `${t('controller.button.boost')} 🚀`;
  updateAriaLabels();
  overlayBtnLabel.textContent = t('popup.actions.overlay');
  excludeBtnLabel.textContent = t('popup.actions.domain');
  updateThemeToggle();
};

function handleSystemThemeChange() {
  if (currentSettings?.theme === 'auto') {
    updateThemeToggle();
  }
}

const applyTheme = () => {
  const classList = document.body.classList;
  classList.remove('theme-light', 'theme-dark');
  if (prefersDarkMediaQuery) {
    prefersDarkMediaQuery.removeEventListener('change', handleSystemThemeChange);
    prefersDarkMediaQuery = null;
  }
  if (currentSettings?.theme === 'auto') {
    prefersDarkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDarkMediaQuery.addEventListener('change', handleSystemThemeChange);
    classList.add(prefersDarkMediaQuery.matches ? 'theme-dark' : 'theme-light');
  } else {
    classList.add(currentSettings.theme === 'dark' ? 'theme-dark' : 'theme-light');
  }
  updateThemeToggle();
};

const ensureSettings = async () => {
  if (!currentSettings) {
    currentSettings = await getSettings();
    currentLanguage = currentSettings.language || 'en';
    applyLanguage();
    applyTheme();
  }
  return currentSettings;
};

const getActiveTabId = async () => {
  if (typeof activeTabId === 'number') return activeTabId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || typeof tab.id !== 'number') {
    throw new Error(t('message.error.noMedia'));
  }
  activeTabId = tab.id;
  return activeTabId;
};

const sendCommand = async (type, payload = {}) => {
  const tabId = await getActiveTabId();
  try {
    const response = await chrome.tabs.sendMessage(tabId, { namespace: 'speedmaster', type, ...payload });
    return response;
  } catch (error) {
    if (error?.message?.includes('Receiving end does not exist')) {
      throw new Error(t('message.error.noMedia'));
    }
    throw error;
  }
};

const renderSpeedOptions = (options = []) => {
  const currentValue = speedSelect.value;
  speedSelect.innerHTML = '';
  options.forEach((speed) => {
    const option = document.createElement('option');
    option.value = String(speed);
    option.textContent = `${speed}x`;
    speedSelect.appendChild(option);
  });
  if (options.includes(Number(currentValue))) {
    speedSelect.value = currentValue;
  }
};

const updateStatusFromState = (state) => {
  if (!state) return;
  if (state.isDomainExcluded && state.hostname) {
    setStatus(t('popup.domain.blocked.message', { domain: state.hostname }));
    return;
  }
  if (!state.hasMedia) {
    setStatus(t('popup.status.noMedia'));
    return;
  }
  setStatus('');
};

const updateOverlayButton = (state) => {
  const overlayDisabled = !state.overlayEnabled;
  const overlayActive = Boolean(state.overlayActive);
  const domainBlocked = Boolean(state.isDomainExcluded);

  if (domainBlocked) {
    overlayBtnLabel.textContent = t('popup.overlay.blocked');
    openOverlayBtn.setAttribute('title', t('popup.overlay.blocked.title'));
    openOverlayBtn.setAttribute('aria-label', t('popup.overlay.blocked.title'));
    openOverlayBtn.disabled = true;
    return;
  }

  overlayBtnLabel.textContent = overlayActive ? t('popup.overlay.hide') : t('popup.overlay.show');
  const titleKey = overlayActive ? 'popup.overlay.close.title' : 'popup.overlay.open.title';
  openOverlayBtn.setAttribute('title', t(titleKey));
  openOverlayBtn.setAttribute('aria-label', t(titleKey));
  openOverlayBtn.disabled = false;
  openOverlayBtn.dataset.mode = overlayActive ? 'on' : 'off';
};

const updateDomainButton = (state) => {
  if (!state.hostname) {
    excludeBtnLabel.textContent = t('popup.domain.nohost');
    excludeDomainBtn.setAttribute('title', t('popup.domain.nohost.title'));
    excludeDomainBtn.setAttribute('aria-label', t('popup.domain.nohost.title'));
    excludeDomainBtn.disabled = true;
    return;
  }
  excludeDomainBtn.disabled = false;
  if (state.isDomainExcluded) {
    excludeBtnLabel.textContent = t('popup.domain.unblock');
    excludeDomainBtn.setAttribute('title', t('popup.domain.unblock.title'));
    excludeDomainBtn.setAttribute('aria-label', t('popup.domain.unblock.title'));
  } else {
    excludeBtnLabel.textContent = t('popup.domain.block');
    excludeDomainBtn.setAttribute('title', t('popup.domain.block.title'));
    excludeDomainBtn.setAttribute('aria-label', t('popup.domain.block.title'));
  }
};

const updateUI = (state) => {
  currentState = state;
  controllerPanel.hidden = false;
  const shouldDim = !state.hasMedia || state.isDomainExcluded;
  controllerPanel.classList.toggle('inactive', shouldDim);

  [speedDownBtn, speedUpBtn, resetBtn, speedSelect, skipBtn].forEach((el) => {
    el.disabled = shouldDim;
  });

  if (state.hasMedia) {
    speedValue.textContent = `${state.playbackRate.toFixed(2)}x`;
    renderSpeedOptions(state.speedOptions);
    if (!state.speedOptions.includes(state.playbackRate)) {
      speedSelect.value = '1';
    } else {
      speedSelect.value = String(state.playbackRate);
    }
  } else {
    speedValue.textContent = '1.00x';
  }

  skipBtn.textContent = state.skipping ? t('controller.button.boostActive') : `${t('controller.button.boost')} 🚀`;
  skipBtn.disabled = shouldDim || state.skipTarget <= 1;

  updateOverlayButton(state);
  updateDomainButton(state);
};

const refreshState = async ({ silent = false } = {}) => {
  try {
    await ensureSettings();
    const response = await sendCommand('speedmaster:get-state');
    if (!response?.success) {
      if (!silent) {
        setStatus(response?.error ?? t('message.error.noMedia'), 'error');
        controllerPanel.hidden = true;
      }
      return;
    }
    currentState = response.state;
    if (!currentSettings) {
      currentSettings = {};
    }
    if (currentState?.theme && currentSettings.theme !== currentState.theme) {
      currentSettings.theme = currentState.theme;
      applyTheme();
    }
    if (currentState?.language && currentState.language !== currentLanguage) {
      currentLanguage = currentState.language;
      applyLanguage();
    }
    updateUI(currentState);
    if (!silent) {
      updateStatusFromState(currentState);
    }
  } catch (error) {
    if (!silent) {
      setStatus(error?.message ?? t('message.error.noMedia'), 'error');
      controllerPanel.hidden = true;
    }
  }
};

const handleCommand = async (type, payload = {}) => {
  try {
    await ensureSettings();
    const response = await sendCommand(type, payload);
    if (!response?.success) {
      setStatus(response?.error ?? t('message.error.noMedia'), 'error');
      return;
    }
    currentState = response.state;
    if (!currentSettings) {
      currentSettings = {};
    }
    if (currentState?.theme && currentSettings.theme !== currentState.theme) {
      currentSettings.theme = currentState.theme;
      applyTheme();
    }
    if (currentState?.language && currentState.language !== currentLanguage) {
      currentLanguage = currentState.language;
      applyLanguage();
    }
    updateUI(currentState);
    updateStatusFromState(currentState);
  } catch (error) {
    setStatus(error?.message ?? t('message.error.noMedia'), 'error');
  }
};

const handleRuntimeMessage = async (message, sender) => {
  if (!message || message.namespace !== 'speedmaster' || message.type !== 'state-update') return;
  try {
    await ensureSettings();
    const targetTabId = await getActiveTabId();
    if (sender?.tab?.id !== targetTabId) return;
    currentState = message.state;
    if (currentState?.language && currentState.language !== currentLanguage) {
      currentLanguage = currentState.language;
      applyLanguage();
    }
    if (currentState?.theme && currentSettings?.theme !== currentState.theme) {
      currentSettings = { ...(currentSettings || {}), theme: currentState.theme };
      applyTheme();
    }
    updateUI(currentState);
    updateStatusFromState(currentState);
  } catch (error) {
    console.debug('[SpeedMaster][popup] Failed to apply state update:', error);
  }
};

speedDownBtn.addEventListener('click', () => handleCommand('speedmaster:adjust-speed', { delta: -SPEED_STEP }));
speedUpBtn.addEventListener('click', () => handleCommand('speedmaster:adjust-speed', { delta: SPEED_STEP }));
resetBtn.addEventListener('click', () => handleCommand('speedmaster:reset-speed'));
skipBtn.addEventListener('click', () => handleCommand('speedmaster:toggle-skip'));

openOverlayBtn.addEventListener('click', async () => {
  if (!currentState || openOverlayBtn.disabled) return;
  const nextEnabled = !currentState.overlayActive;
  try {
    await handleCommand('speedmaster:set-overlay', { enabled: nextEnabled });
    if (nextEnabled && currentSettings?.displayMode === 'popup') {
      currentSettings = await updateSettings({ displayMode: 'both' });
    }
    if (nextEnabled) {
      setStatus(t('message.success.overlayEnabled'), 'success');
    } else {
      setStatus(t('message.success.overlayDisabled'), 'success');
    }
  } catch (error) {
    setStatus(error?.message ?? t('message.error.toggleOverlay'), 'error');
  }
});

excludeDomainBtn.addEventListener('click', async () => {
  if (excludeDomainBtn.disabled) return;
  try {
    const tabId = await getActiveTabId();
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.url) throw new Error(t('message.error.updateDomain'));
    const hostname = new URL(tab.url).hostname;
    const domain = toRegistrableDomain(hostname);
    if (!domain) throw new Error(t('message.error.updateDomain'));
    if (currentState?.isDomainExcluded) {
      const list = await removeExcludedDomain(domain);
      if (!list.includes(domain)) {
        setStatus(t('popup.domain.unblocked.message', { domain }), 'success');
      }
    } else {
      const list = await addExcludedDomain(domain);
      if (list.includes(domain)) {
        setStatus(t('popup.domain.block.message', { domain }), 'success');
      }
    }
    currentSettings = null; // force reload to sync language/theme if changed elsewhere
    await refreshState({ silent: true });
  } catch (error) {
    setStatus(error?.message ?? t('message.error.updateDomain'), 'error');
  }
});

speedSelect.addEventListener('change', () => {
  const value = parseFloat(speedSelect.value);
  if (!Number.isFinite(value)) return;
  handleCommand('speedmaster:set-speed', { value });
});

themeToggleBtn.addEventListener('click', async () => {
  await ensureSettings();
  const currentTheme = currentSettings.theme;
  const effective = currentTheme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : currentTheme;
  const nextTheme = effective === 'light' ? 'dark' : 'light';
  currentSettings = await updateSettings({ theme: nextTheme });
  applyTheme();
});

openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

window.addEventListener('focus', () => {
  activeTabId = null;
  refreshState();
});

window.addEventListener('beforeunload', () => {
  if (prefersDarkMediaQuery) {
    prefersDarkMediaQuery.removeEventListener('change', handleSystemThemeChange);
  }
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
});

const init = async () => {
  setIconSources();
  await ensureSettings();
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  refreshState();
};

init();

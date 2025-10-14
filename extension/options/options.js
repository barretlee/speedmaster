import {
  getExcludedDomains,
  addExcludedDomain,
  removeExcludedDomain,
  onExcludedDomainsChange,
  getSettings,
  updateSettings,
  onSettingsChange,
  DEFAULT_SETTINGS
} from '../shared/storage.js';
import { translate, applyTranslations, SUPPORTED_LANGUAGES } from '../shared/i18n.js';

const form = document.getElementById('add-domain-form');
const input = document.getElementById('domain-input');
const list = document.getElementById('domain-list');

const maxSpeedInput = document.getElementById('max-speed-input');
const displayModeRadios = Array.from(document.querySelectorAll('input[name="display-mode"]'));
const themeSelect = document.getElementById('theme-select');
const languageSelect = document.getElementById('language-select');

let domains = [];
let settings = { ...DEFAULT_SETTINGS };
let currentLanguage = DEFAULT_SETTINGS.language;

let unsubscribeDomains = null;
let unsubscribeSettings = null;

const t = (key, replacements) => translate(currentLanguage, key, replacements);

const clampMaxSpeed = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return settings.maxSpeed;
  return Math.min(Math.max(0.5, numeric), 15);
};

const renderDomains = () => {
  list.innerHTML = '';
  if (!domains.length) {
    const empty = document.createElement('li');
    empty.textContent = t('options.domain.empty');
    empty.className = 'empty';
    list.appendChild(empty);
    return;
  }

  domains.forEach((domain) => {
    const item = document.createElement('li');
    item.textContent = domain;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = t('options.domain.remove');
    deleteBtn.addEventListener('click', async () => {
      domains = await removeExcludedDomain(domain);
      renderDomains();
    });

    item.appendChild(deleteBtn);
    list.appendChild(item);
  });
};

const renderSettings = () => {
  maxSpeedInput.value = settings.maxSpeed;
  themeSelect.value = settings.theme;
  languageSelect.value = settings.language || DEFAULT_SETTINGS.language;
  displayModeRadios.forEach((radio) => {
    radio.checked = radio.value === settings.displayMode;
  });
};

const applyLanguage = () => {
  document.documentElement.lang = currentLanguage;
  applyTranslations(document.body, currentLanguage);
  input.placeholder = t('options.addDomain.placeholder');
  renderDomains();
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = (input.value || '').trim().toLowerCase();
  if (!value) return;
  domains = await addExcludedDomain(value);
  input.value = '';
  renderDomains();
});

maxSpeedInput.addEventListener('change', async () => {
  const next = clampMaxSpeed(maxSpeedInput.value);
  maxSpeedInput.value = next;
  settings = await updateSettings({ maxSpeed: next });
});

displayModeRadios.forEach((radio) => {
  radio.addEventListener('change', async () => {
    if (!radio.checked) return;
    settings = await updateSettings({ displayMode: radio.value });
  });
});

themeSelect.addEventListener('change', async () => {
  settings = await updateSettings({ theme: themeSelect.value });
});

languageSelect.addEventListener('change', async () => {
  const nextLanguage = SUPPORTED_LANGUAGES.includes(languageSelect.value) ? languageSelect.value : DEFAULT_SETTINGS.language;
  settings = await updateSettings({ language: nextLanguage });
  currentLanguage = settings.language;
  applyLanguage();
});

const init = async () => {
  const [initialDomains, initialSettings] = await Promise.all([getExcludedDomains(), getSettings()]);
  domains = initialDomains;
  settings = initialSettings;
  currentLanguage = settings.language || DEFAULT_SETTINGS.language;
  applyLanguage();
  renderSettings();

  unsubscribeDomains = onExcludedDomainsChange((next) => {
    domains = next;
    renderDomains();
  });

  unsubscribeSettings = onSettingsChange((next) => {
    settings = next;
    currentLanguage = settings.language || DEFAULT_SETTINGS.language;
    applyLanguage();
    renderSettings();
  });
};

window.addEventListener('beforeunload', () => {
  unsubscribeDomains?.();
  unsubscribeSettings?.();
});

init();

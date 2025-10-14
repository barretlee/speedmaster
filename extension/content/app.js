import { createController } from './controller.js';
import { createMediaWatcher } from './media.js';
import {
  getExcludedDomains,
  addExcludedDomain,
  onExcludedDomainsChange,
  getSettings,
  onSettingsChange,
  DEFAULT_SETTINGS
} from '../shared/storage.js';
import { matchesExcludedDomain, toRegistrableDomain } from '../shared/domains.js';
import { clampSpeed, getSpeedOptions, SPEED_STEP, SKIP_SPEED } from './constants.js';
import { translate } from '../shared/i18n.js';

let controllerHandle = null;
let watcherHandle = null;
let unsubscribeDomains = null;
let unsubscribeSettings = null;
let messageUnsubscribe = null;

let excludedDomains = [];
let settings = { ...DEFAULT_SETTINGS };
let currentMedia = null;
let overlayDisabledForSession = false;
let initialized = false;
let lastStateSignature = null;

const findMediaElement = () => {
  const media = document.querySelector('video, audio');
  if (media && media !== currentMedia) {
    currentMedia = media;
    controllerHandle?.attachMedia(currentMedia, { preserveRate: true });
  }
  return Boolean(media);
};

const hostname = window.location.hostname.toLowerCase();

const overlayEnabledInSettings = () => settings.displayMode === 'page' || settings.displayMode === 'both';
const popupEnabledInSettings = () => settings.displayMode === 'popup' || settings.displayMode === 'both';

const destroyController = () => {
  controllerHandle?.destroy();
  controllerHandle = null;
};

const teardown = () => {
  destroyController();
  watcherHandle?.disconnect();
  watcherHandle = null;
  currentMedia = null;
  overlayDisabledForSession = false;
  if (unsubscribeDomains) {
    unsubscribeDomains();
    unsubscribeDomains = null;
  }
  if (unsubscribeSettings) {
    unsubscribeSettings();
    unsubscribeSettings = null;
  }
  if (messageUnsubscribe) {
    messageUnsubscribe();
    messageUnsubscribe = null;
  }
  initialized = false;
  publishState();
};

const buildState = () => {
  const hasMedia = Boolean(currentMedia);
  const playbackRate = hasMedia ? Number(currentMedia.playbackRate.toFixed(2)) : 1;
  const skipTarget = SKIP_SPEED;
  const skipping = hasMedia && skipTarget > 1 && Math.abs(currentMedia.playbackRate - skipTarget) < 0.001;
  const excluded = matchesExcludedDomain(hostname, excludedDomains);
  return {
    hasMedia,
    playbackRate,
    maxSpeed: settings.maxSpeed,
    speedOptions: getSpeedOptions(settings.maxSpeed),
    displayMode: settings.displayMode,
    theme: settings.theme,
    skipTarget,
    skipping,
    overlayEnabled: overlayEnabledInSettings(),
    overlayActive: Boolean(controllerHandle),
    overlayDisabledForSession,
    popupEnabled: popupEnabledInSettings(),
    hostname,
    isDomainExcluded: excluded,
    language: settings.language
  };
};

const publishState = (force = false) => {
  const state = buildState();
  const signature = JSON.stringify(state);
  const payload = { namespace: 'speedmaster', type: 'state-update', state };

  if (force || signature !== lastStateSignature) {
    lastStateSignature = signature;
    try {
      chrome.runtime.sendMessage(payload).catch(() => {});
    } catch (error) {
      console.debug('[SpeedMaster] Unable to publish state update:', error);
    }
  }
  return state;
};

const syncController = () => {
  if (!currentMedia && !findMediaElement()) {
    destroyController();
    publishState();
    return;
  }

  if (overlayEnabledInSettings() && !overlayDisabledForSession) {
    if (!controllerHandle) {
      controllerHandle = createController({
        media: currentMedia,
        settings,
        onClose: handleOverlayClose,
        onExcludeDomain: handleExcludeDomain,
        onRateChange: () => publishState(true)
      });
    } else {
      controllerHandle.attachMedia(currentMedia, { preserveRate: true });
      controllerHandle.updateSettings(settings);
    }
  } else {
    destroyController();
  }
  publishState();
};

const handleOverlayClose = ({ excluded } = {}) => {
  overlayDisabledForSession = true;
  controllerHandle = null;
  if (excluded) {
    handleExcludeDomain();
  }
  publishState();
};

const handleExcludeDomain = async () => {
  const domain = toRegistrableDomain(hostname);
  const alreadyExcluded = matchesExcludedDomain(hostname, excludedDomains);
  const updated = await addExcludedDomain(domain);
  excludedDomains = updated;
  if (!alreadyExcluded) {
    window.alert(translate(settings.language || 'en', 'popup.domain.block.message', { domain }));
  }
  publishState();
};

const handleMediaFound = (media) => {
  currentMedia = media;
  controllerHandle?.attachMedia(currentMedia, { preserveRate: true });
  syncController();
};

const setPlaybackRate = (value) => {
  if (!currentMedia && !findMediaElement()) return false;
  currentMedia.playbackRate = clampSpeed(value, settings.maxSpeed);
  controllerHandle?.attachMedia(currentMedia);
  publishState(true);
  return true;
};

const adjustPlaybackRate = (delta) => {
  if (!currentMedia && !findMediaElement()) return false;
  const next = clampSpeed(currentMedia.playbackRate + delta, settings.maxSpeed);
  currentMedia.playbackRate = Number(next.toFixed(2));
  controllerHandle?.attachMedia(currentMedia);
  publishState(true);
  return true;
};

const toggleSkip = () => {
  if (!currentMedia && !findMediaElement()) return false;
  const skipTarget = SKIP_SPEED;
  if (skipTarget <= 1) return false;
  const shouldSkip = Math.abs(currentMedia.playbackRate - skipTarget) > 0.001;
  currentMedia.playbackRate = shouldSkip ? skipTarget : 1;
  controllerHandle?.attachMedia(currentMedia, { preserveRate: true });
  publishState(true);
  return true;
};

const resetPlaybackRate = () => setPlaybackRate(1);

const messageListener = (message, _sender, sendResponse) => {
  if (!message || message.namespace !== 'speedmaster') return;

  (async () => {
    try {
      switch (message.type) {
        case 'speedmaster:get-state':
          sendResponse({ success: true, state: publishState() });
          return;
        case 'speedmaster:set-speed': {
          const value = Number(message.value);
          if (!Number.isFinite(value) || !setPlaybackRate(value)) {
            sendResponse({ success: false, error: translate(settings.language || 'en', 'message.error.noMedia') });
            return;
          }
          sendResponse({ success: true, state: publishState() });
          return;
        }
        case 'speedmaster:adjust-speed': {
          const delta = Number(message.delta ?? SPEED_STEP);
          if (!Number.isFinite(delta) || !adjustPlaybackRate(delta)) {
            sendResponse({ success: false, error: translate(settings.language || 'en', 'message.error.noMedia') });
            return;
          }
          sendResponse({ success: true, state: publishState() });
          return;
        }
        case 'speedmaster:reset-speed':
          if (!resetPlaybackRate()) {
            sendResponse({ success: false, error: translate(settings.language || 'en', 'message.error.noMedia') });
            return;
          }
          sendResponse({ success: true, state: publishState() });
          return;
        case 'speedmaster:toggle-skip':
          if (!toggleSkip()) {
            sendResponse({ success: false, error: translate(settings.language || 'en', 'message.error.boostUnavailable') });
            return;
          }
          sendResponse({ success: true, state: publishState() });
          return;
        case 'speedmaster:show-overlay':
          overlayDisabledForSession = false;
          syncController();
          sendResponse({ success: true, state: publishState() });
          return;
        case 'speedmaster:set-overlay': {
          const enabled = Boolean(message.enabled);
          overlayDisabledForSession = !enabled;
          if (!overlayEnabledInSettings()) {
            if (!enabled) {
              destroyController();
            }
            sendResponse({ success: true, state: publishState() });
            return;
          }
          if (enabled) {
            syncController();
          } else {
            destroyController();
            publishState();
          }
          sendResponse({ success: true, state: publishState() });
          return;
        }
        default:
          sendResponse({ success: false, error: translate(settings.language || 'en', 'message.error.unknownCommand') });
      }
    } catch (error) {
      console.error('[SpeedMaster] Message handling failed:', error);
      sendResponse({ success: false, error: error?.message ?? translate(settings.language || 'en', 'message.error.generic') });
    }
  })();

  return true;
};

export async function init() {
  if (initialized) return;

  excludedDomains = await getExcludedDomains();
  settings = await getSettings();

  if (matchesExcludedDomain(hostname, excludedDomains)) {
    console.log('[SpeedMaster] Current hostname is excluded, skipping overlay controller.');
    publishState();
    return;
  }

  initialized = true;

  unsubscribeDomains = onExcludedDomainsChange((domains) => {
    excludedDomains = domains;
    if (matchesExcludedDomain(hostname, excludedDomains)) {
      teardown();
    console.log('[SpeedMaster] Hostname excluded at runtime. Controller detached.');
    }
    publishState();
  });

  unsubscribeSettings = onSettingsChange((next) => {
    const prevDisplayMode = settings.displayMode;
    settings = next;
    if (prevDisplayMode !== settings.displayMode && overlayEnabledInSettings()) {
      overlayDisabledForSession = false;
    }
    if (controllerHandle) {
      controllerHandle.updateSettings(settings);
    }
    syncController();
  });

  watcherHandle = createMediaWatcher({
    onMediaFound: handleMediaFound
  });

  chrome.runtime.onMessage.addListener(messageListener);
  messageUnsubscribe = () => chrome.runtime.onMessage.removeListener(messageListener);

  window.addEventListener('beforeunload', teardown, { once: true });

  publishState();
}

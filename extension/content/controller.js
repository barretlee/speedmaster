import {
  SPEED_STEP,
  SKIP_SPEED,
  MIN_SPEED,
  clampSpeed,
  getSpeedOptions,
  DEFAULT_MAX_SPEED,
  ABSOLUTE_MAX_SPEED
} from './constants.js';
import { translate } from '../shared/i18n.js';

let controllerPosition = { left: null, top: null };

const clampPosition = (left, top, el) => {
  const maxLeft = window.innerWidth - el.offsetWidth - 10;
  const maxTop = window.innerHeight - el.offsetHeight - 10;
  return {
    left: Math.min(Math.max(10, left), maxLeft),
    top: Math.min(Math.max(10, top), maxTop)
  };
};

const createButton = (id, text, ariaLabel) => {
  const button = document.createElement('button');
  button.id = id;
  button.type = 'button';
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  button.textContent = text;
  return button;
};

const addListener = (list, target, type, handler, options) => {
  target.addEventListener(type, handler, options);
  list.push(() => target.removeEventListener(type, handler, options));
};

export function createController({ media, onClose, onExcludeDomain, settings = {} }) {
  if (!media) throw new Error('Media element is required to create controller');

  let currentMedia = media;
  let skipping = false;
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  const cleanupListeners = [];
  let themeMediaQuery = null;

  const config = {
    maxSpeed: clampSpeed(settings.maxSpeed ?? DEFAULT_MAX_SPEED, settings.maxSpeed ?? DEFAULT_MAX_SPEED),
    themeSetting: settings.theme || 'dark',
    theme: 'dark',
    language: settings.language || 'en'
  };

  let speedOptions = getSpeedOptions(config.maxSpeed);

  const t = (key, replacements) => translate(config.language, key, replacements);

  const controller = document.createElement('div');
  controller.id = 'speed-controller';
  if (controllerPosition.left !== null && controllerPosition.top !== null) {
    controller.style.left = `${controllerPosition.left}px`;
    controller.style.top = `${controllerPosition.top}px`;
    controller.style.right = 'auto';
    controller.style.bottom = 'auto';
  }

  const dragHandle = document.createElement('div');
  dragHandle.id = 'drag-handle';
  dragHandle.title = t('controller.drag.handle');
  dragHandle.textContent = '☰';
  controller.appendChild(dragHandle);

  const closeWrapper = document.createElement('div');
  closeWrapper.id = 'close-wrapper';
  controller.appendChild(closeWrapper);

  const minimizeBtn = createButton('minimize-btn', '–', t('controller.button.minimise.aria'));
  minimizeBtn.title = t('controller.button.minimize');
  const closeBtn = createButton('close-btn', '×', t('controller.button.close.aria'));
  closeBtn.title = t('controller.button.close');
  closeBtn.tabIndex = 0;

  const excludeTip = document.createElement('div');
  excludeTip.id = 'exclude-tip';
  const excludeLabel = document.createElement('label');
  excludeLabel.setAttribute('for', 'exclude-checkbox');
  excludeLabel.title = t('controller.exclude.tooltip');
  excludeLabel.textContent = '';
  const excludeCheckbox = document.createElement('input');
  excludeCheckbox.type = 'checkbox';
  excludeCheckbox.id = 'exclude-checkbox';
  excludeCheckbox.setAttribute('aria-label', t('controller.exclude.checkbox'));
  excludeLabel.appendChild(excludeCheckbox);
  const excludeLabelText = document.createTextNode(t('controller.exclude.label'));
  excludeLabel.appendChild(excludeLabelText);
  excludeTip.appendChild(excludeLabel);

  closeWrapper.appendChild(minimizeBtn);
  closeWrapper.appendChild(closeBtn);
  closeWrapper.appendChild(excludeTip);

  const controlRow = document.createElement('div');
  controlRow.id = 'control-row';
  controller.appendChild(controlRow);

  const speedLabel = document.createElement('span');
  speedLabel.textContent = t('controller.speedLabel');
  controlRow.appendChild(speedLabel);

  const speedDownBtn = createButton('speed-down', '－', 'Decrease speed');
  speedDownBtn.tabIndex = 0;
  speedDownBtn.setAttribute('aria-label', t('controller.button.decrease'));
  controlRow.appendChild(speedDownBtn);

  const speedDisplay = document.createElement('span');
  speedDisplay.id = 'speed-display';
  speedDisplay.setAttribute('role', 'status');
  speedDisplay.setAttribute('aria-live', 'polite');
  controlRow.appendChild(speedDisplay);

  const speedUpBtn = createButton('speed-up', '＋', 'Increase speed');
  speedUpBtn.tabIndex = 0;
  speedUpBtn.setAttribute('aria-label', t('controller.button.increase'));
  controlRow.appendChild(speedUpBtn);

  const controlsWrapper = document.createElement('div');
  controller.appendChild(controlsWrapper);

  const speedSelect = document.createElement('select');
  speedSelect.id = 'speed-select';
  speedSelect.tabIndex = 0;
  speedSelect.setAttribute('aria-label', 'Select playback speed');
  controlsWrapper.appendChild(speedSelect);

  const resetBtn = createButton('speed-reset', t('controller.button.reset'), t('controller.button.reset.aria'));
  resetBtn.tabIndex = 0;
  controlsWrapper.appendChild(resetBtn);

  const skipBtn = createButton('skip-ads', `${t('controller.button.boost')} 🚀`, t('controller.button.boost.aria'));
  skipBtn.tabIndex = 0;
  controlsWrapper.appendChild(skipBtn);

  const minimizedBar = document.createElement('div');
  minimizedBar.id = 'minimized-bar';
  minimizedBar.textContent = '▶';
  minimizedBar.setAttribute('title', t('controller.minimised.label'));

  const detachThemeWatcher = () => {
    if (themeMediaQuery) {
      themeMediaQuery.removeEventListener('change', themeWatcherHandler);
      themeMediaQuery = null;
    }
  };

  const updateThemeElements = (theme) => {
    config.theme = theme;
    controller.dataset.theme = theme;
    minimizedBar.dataset.theme = theme;
  };

  const themeWatcherHandler = (event) => {
    updateThemeElements(event.matches ? 'dark' : 'light');
  };

  const applyThemeSetting = (themeSetting) => {
    detachThemeWatcher();
    config.themeSetting = themeSetting || 'dark';
    if (config.themeSetting === 'auto') {
      themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      updateThemeElements(themeMediaQuery.matches ? 'dark' : 'light');
      themeMediaQuery.addEventListener('change', themeWatcherHandler);
    } else {
      updateThemeElements(config.themeSetting === 'light' ? 'light' : 'dark');
    }
  };

  const refreshSpeedSelect = () => {
    speedSelect.innerHTML = '';
    speedOptions = getSpeedOptions(config.maxSpeed);
    speedOptions.forEach((speed) => {
      const option = document.createElement('option');
      option.value = String(speed);
      option.textContent = `${speed}x`;
      speedSelect.appendChild(option);
    });
  };

  document.body.appendChild(controller);
  document.body.appendChild(minimizedBar);
  applyThemeSetting(config.themeSetting);

  const resolveSkipSpeed = () => Math.min(SKIP_SPEED, ABSOLUTE_MAX_SPEED);

  const updateDisplay = () => {
    if (!currentMedia) return;
    const rate = Number(currentMedia.playbackRate.toFixed(2));
    speedDisplay.textContent = `${rate.toFixed(2)}x`;

    const matched = speedOptions.find((option) => Math.abs(option - rate) < 0.001);
    speedSelect.value = matched ? String(matched) : '1';

    const skipTarget = resolveSkipSpeed();
    skipping = Math.abs(currentMedia.playbackRate - skipTarget) < 0.001 && skipTarget > 1;
    skipBtn.textContent = skipping ? t('controller.button.boostActive') : `${t('controller.button.boost')} 🚀`;
    skipBtn.disabled = skipTarget <= 1;
  };

  const attachMedia = (mediaEl, options = {}) => {
    currentMedia = mediaEl;
    if (!currentMedia) return;
    const { preserveRate = false } = options;
    if (!preserveRate) {
      const next = clampSpeed(currentMedia.playbackRate, config.maxSpeed);
      if (Math.abs(next - currentMedia.playbackRate) > 0.001) {
        currentMedia.playbackRate = next;
      }
    } else if (currentMedia.playbackRate < MIN_SPEED) {
      currentMedia.playbackRate = MIN_SPEED;
    }
    updateDisplay();
  };

  const reset = () => {
    if (!currentMedia) return;
    currentMedia.playbackRate = 1;
    skipping = false;
    updateDisplay();
  };

  const adjustSpeed = (delta) => {
    if (!currentMedia) return;
    const next = clampSpeed(currentMedia.playbackRate + delta, config.maxSpeed);
    currentMedia.playbackRate = Number(next.toFixed(2));
    skipping = false;
    updateDisplay();
  };

  const startDrag = (x, y) => {
    isDragging = true;
    controller.classList.add('dragging');
    const rect = controller.getBoundingClientRect();
    offsetX = x - rect.left;
    offsetY = y - rect.top;
  };

  const doDrag = (x, y) => {
    if (!isDragging) return;
    const { left, top } = clampPosition(x - offsetX, y - offsetY, controller);
    controller.style.left = `${left}px`;
    controller.style.top = `${top}px`;
    controller.style.right = 'auto';
    controller.style.bottom = 'auto';
    controllerPosition = { left, top };
  };

  const endDrag = () => {
    isDragging = false;
    controller.classList.remove('dragging');
  };

  addListener(cleanupListeners, dragHandle, 'mousedown', (event) => {
    startDrag(event.clientX, event.clientY);
  });

  addListener(cleanupListeners, document, 'mousemove', (event) => {
    if (!isDragging) return;
    doDrag(event.clientX, event.clientY);
  });

  addListener(cleanupListeners, document, 'mouseup', endDrag);

  addListener(cleanupListeners, dragHandle, 'touchstart', (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  addListener(cleanupListeners, document, 'touchmove', (event) => {
    if (!isDragging) return;
    const touch = event.touches[0];
    if (!touch) return;
    doDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  addListener(cleanupListeners, document, 'touchend', endDrag);

  const resizeHandler = () => {
    if (controllerPosition.left === null || controllerPosition.top === null) return;
    const { left, top } = clampPosition(controllerPosition.left, controllerPosition.top, controller);
    controller.style.left = `${left}px`;
    controller.style.top = `${top}px`;
    controllerPosition = { left, top };
  };
  addListener(cleanupListeners, window, 'resize', resizeHandler);

  addListener(cleanupListeners, minimizeBtn, 'click', () => {
    controller.style.display = 'none';
    minimizedBar.style.display = 'flex';
  });

  addListener(cleanupListeners, minimizedBar, 'click', () => {
    controller.style.display = 'block';
    minimizedBar.style.display = 'none';
  });

  addListener(cleanupListeners, speedDownBtn, 'click', () => adjustSpeed(-SPEED_STEP));
  addListener(cleanupListeners, speedUpBtn, 'click', () => adjustSpeed(SPEED_STEP));
  addListener(cleanupListeners, resetBtn, 'click', reset);

  addListener(cleanupListeners, speedSelect, 'change', () => {
    if (!currentMedia) return;
    const value = parseFloat(speedSelect.value);
    if (Number.isFinite(value)) {
      currentMedia.playbackRate = clampSpeed(value, config.maxSpeed);
      skipping = false;
      updateDisplay();
    }
  });

  addListener(cleanupListeners, skipBtn, 'click', () => {
    if (!currentMedia) return;
    const skipTarget = resolveSkipSpeed();
    if (skipTarget <= 1) return;
    skipping = !skipping;
    currentMedia.playbackRate = skipping ? skipTarget : 1;
    updateDisplay();
  });

  addListener(cleanupListeners, closeBtn, 'click', () => {
    destroy();
    onClose?.({ excluded: excludeCheckbox.checked });
  });

  refreshSpeedSelect();
  attachMedia(currentMedia);

  const destroy = () => {
    cleanupListeners.splice(0).forEach((dispose) => dispose());
    detachThemeWatcher();
    controller.remove();
    minimizedBar.remove();
  };

  return {
    attachMedia,
    destroy,
    updateSettings(nextSettings = {}) {
      if (typeof nextSettings.maxSpeed !== 'undefined') {
        config.maxSpeed = clampSpeed(nextSettings.maxSpeed, nextSettings.maxSpeed ?? config.maxSpeed);
        refreshSpeedSelect();
      }
      if (nextSettings.theme) {
        applyThemeSetting(nextSettings.theme);
      }
      if (nextSettings.language && nextSettings.language !== config.language) {
        config.language = nextSettings.language;
        updateLocalizedText();
      }
      attachMedia(currentMedia, { preserveRate: true });
    },
    refresh() {
      updateDisplay();
    }
  };

  function updateLocalizedText() {
    dragHandle.title = t('controller.drag.handle');
    minimizeBtn.title = t('controller.button.minimize');
    minimizeBtn.setAttribute('aria-label', t('controller.button.minimise.aria'));
    closeBtn.title = t('controller.button.close');
    closeBtn.setAttribute('aria-label', t('controller.button.close.aria'));
    excludeLabel.title = t('controller.exclude.tooltip');
    excludeCheckbox.setAttribute('aria-label', t('controller.exclude.checkbox'));
    excludeLabelText.textContent = t('controller.exclude.label');
    speedLabel.textContent = t('controller.speedLabel');
    speedDownBtn.setAttribute('aria-label', t('controller.button.decrease'));
    speedUpBtn.setAttribute('aria-label', t('controller.button.increase'));
    resetBtn.textContent = t('controller.button.reset');
    resetBtn.setAttribute('aria-label', t('controller.button.reset.aria'));
      skipBtn.textContent = skipping ? t('controller.button.boostActive') : `${t('controller.button.boost')} 🚀`;
    skipBtn.setAttribute('aria-label', t('controller.button.boost.aria'));
    minimizedBar.setAttribute('title', t('controller.minimised.label'));
    minimizedBar.setAttribute('aria-label', t('controller.minimised.label'));
  }

  updateLocalizedText();
}

const ACTIVE_COLOR = '#34c759';
const IDLE_COLOR = '#8a92a6';

const formatBadgeText = (state = {}) => {
  if (!state.hasMedia) return '';
  const rate = Number(state.playbackRate);
  if (!Number.isFinite(rate) || Math.abs(rate - 1) < 0.01) return 'ON';
  if (rate >= 10) return rate.toFixed(0);
  return rate.toFixed(1).replace(/\.0$/, '');
};

const applyBadge = (state = {}, sender = {}) => {
  const text = formatBadgeText(state);
  const color = state.hasMedia ? ACTIVE_COLOR : IDLE_COLOR;

  if (sender?.tab?.id) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text });
    chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color });
  } else {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }
};

chrome.runtime.onInstalled.addListener(() => {
  applyBadge();
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.namespace !== 'speedmaster') return;
  if (message.type === 'state-update') {
    applyBadge(message.state, sender);
  }
});

export function createMediaWatcher({ onMediaFound }) {
  let currentMedia = null;

  const detect = () => {
    const media = document.querySelector('video, audio');
    if (media && media !== currentMedia) {
      currentMedia = media;
      onMediaFound?.(media);
    }
  };

  const observerTarget = document.documentElement || document.body;
  const observer = new MutationObserver(detect);
  observer.observe(observerTarget, { childList: true, subtree: true });

  const intervalId = window.setInterval(detect, 2000);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    detect();
  } else {
    document.addEventListener('DOMContentLoaded', detect, { once: true });
  }

  return {
    disconnect() {
      observer.disconnect();
      window.clearInterval(intervalId);
    }
  };
}

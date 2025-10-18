(async function bootstrap() {
  try {
    const { init } = await import(/* webpackIgnore: true */ chrome.runtime.getURL('content/app.js'));
    init();
  } catch (error) {
    console.error('[SpeedMaster] Failed to initialize:', error);
  }
})();

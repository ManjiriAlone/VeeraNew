// renderer.js
document.addEventListener('DOMContentLoaded', () => {
  const api = window.veeraAPI;

  // Track current class & experiment selected
  let currentClass = null;
  let currentExperiment = null;

  // Log helper (optional)
  function log(...args) {
    console.log('[App]', ...args);
  }

  // ============ Kit → App Events ============

  // When kit sends #C:x$
  api.onKitClassChanged((d) => {
    const cls = Number(d.classNum ?? d);
    if (!cls) return L('Invalid class from kit:', d);
    L('Kit requested class', cls);
    currentClass = cls;
    // If mapping exists, open the class list page
    const page = (window.pageMap && window.pageMap.classPages && window.pageMap.classPages[cls]) ?
      window.pageMap.classPages[cls] : `class${cls}list.html`;
    L('Loading page:', page);
    window.location.href = page;
  });

  // When kit sends #E:x$
  api.onKitExperimentChanged((d) => {
    const exp = Number(d.expNum ?? d);
    if (!exp) return L('Invalid experiment from kit:', d);
    L('Kit requested experiment', exp, 'for currentClass', currentClass);
    currentExp = exp;
    if (!currentClass) {
      L('No current class — ignoring experiment');
      return;
    }
    // Use pageMap if present, otherwise use default naming
    const page = (window.pageMap && window.pageMap.experimentPages && window.pageMap.experimentPages[currentClass] && window.pageMap.experimentPages[currentClass][exp]) ?
      window.pageMap.experimentPages[currentClass][exp] : `C${currentClass}E${exp}.html`;
    L('Loading experiment page:', page);
    window.location.href = page;
  });

  // ============ App → Kit Events ============

  // When user selects a class in app menu
  // Expose functions so existing button onclicks can call them, e.g., onclick="selectClass(5)"
  /*window.selectClass = async function (cls) {
    currentClass = cls;
    L('User selected class', cls, '— sending to kit');
    try {
      const res = await api.sendClass(cls);
      L('sendClass result:', res);
    } catch (e) {
      L('sendClass error', e);
    }
    // navigate UI
    const page = (window.pageMap && window.pageMap.classPages && window.pageMap.classPages[cls]) ?
      window.pageMap.classPages[cls] : `class${cls}list.html`;
    window.location.href = page;
  };

  // When user selects an experiment in app
  window.selectExperiment = async function (exp) {
  if (!currentClass) {
    log('⚠️ No class selected, defaulting to class 5');
    currentClass = 5;
  }

  currentExperiment = exp;
  log(`User selected Experiment ${exp} of Class ${currentClass}`);

  try {
    const res = await api.sendExperiment(exp);
    log('✅ Experiment sent to kit:', res);
  } catch (err) {
    console.error('❌ Error sending experiment:', err);
  }

  // Navigate to page
  const page = `C${currentClass}E${exp}.html`;
  window.location.href = page;

  // After a short delay, send thresholds for that experiment
  setTimeout(async () => {
    const key = `C${currentClass}_E${exp}`;
    try {
      const res = await api.sendThresholdsFor(key);
      log(`📤 Thresholds sent for ${key}`, res);
    } catch (err) {
      console.error(`⚠️ Failed to send thresholds for ${key}:`, err);
    }
  }, 1200);
  };*/

  // replace window.selectClass with this:
  window.selectClass = async function (cls) {
    currentClass = cls;
    log('User selected class', cls, '— sending to kit');
    try {
      const res = await api.sendClass(cls); // will call main -> serialManager
      log('sendClass result:', res);
    } catch (e) {
      log('sendClass error', e);
    }
    const page = (window.pageMap && window.pageMap.classPages && window.pageMap.classPages[cls]) ?
      window.pageMap.classPages[cls] : `class${cls}list.html`;
    // small delay so send occurs before navigation
    setTimeout(() => { window.location.href = page; }, 120);
  };

  // replace window.selectExperiment with this:
  window.selectExperiment = async function (exp) {
    if (!currentClass) {
      log('No current class when selecting experiment; defaulting to 5');
      currentClass = 5;
    }
    currentExperiment = exp;
    log('User selected experiment', exp, 'for class', currentClass);

    try {
      const res = await api.sendExperiment(exp);
      log('sendExperiment result:', res);
    } catch (e) {
      log('sendExperiment error', e);
    }

    const page = (window.pageMap && window.pageMap.experimentPages && window.pageMap.experimentPages[currentClass] && window.pageMap.experimentPages[currentClass][exp]) ?
      window.pageMap.experimentPages[currentClass][exp] : `C${currentClass}E${exp}.html`;

    // navigate and after short delay send thresholds from active set
    window.location.href = page;
    setTimeout(async () => {
      const key = `C${currentClass}_E${exp}`;
      try {
        const thrRes = await api.sendThresholdsFor(key);
        log(`Thresholds send result for ${key}:`, thrRes);
      } catch (err) {
        console.error('Thresholds send error:', err);
      }
    }, 1200);
  };

  // ---------- When a specific experiment HTML loads: auto-send thresholds ----------
  // Detect page filename (e.g., C5E6.html OR C5_E6.html, we normalize to C5_E6)
  // --- Safe threshold auto-send ---
// Runs only after the page fully loads AND the correct class/experiment are active
  window.addEventListener('load', () => {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);
    const match = filename.match(/^C(\d+)[_]?E(\d+)\.html$/i);
    if (!match) return;

    const [_, cls, exp] = match;
    const key = `C${cls}_E${exp}`;
    log(`[AutoThreshold] Page detected: ${key}`);

    // Only send thresholds if app knows same active class & experiment
    if (String(currentClass) === cls && String(currentExperiment) === exp) {
      setTimeout(async () => {
        try {
          const res = await api.sendThresholdsFor(key);
          log(`[AutoThreshold] Thresholds sent for ${key}`, res);
        } catch (err) {
          console.error(`[AutoThreshold] Failed to send thresholds for ${key}`, err);
        }
      }, 1000);
    } else {
      log(`[AutoThreshold] Skipped (page=${key}, active=${currentClass}_${currentExperiment})`);
    }
  });

  // Expose pageMap on window for easier usage (pageMap.js must be included in HTML before this script)
  if (window.pageMap === undefined && typeof require === 'function') {
    try {
      window.pageMap = require('./pageMap'); // for dev when using nodeIntegration false this may fail; optional
    } catch (e) {
      // ignore
    }
  }
});

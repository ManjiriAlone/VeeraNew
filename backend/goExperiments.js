// renderer/js/goExperiment.js
// Generic goExperiment handler used by class list pages.
// It expects buttons to call: onclick="goExperiment(3)"

(function () {
  // Determine current class from the page filename, e.g. class5list.html -> 5
  function detectCurrentClass() {
    const fn = window.location.pathname.split('/').pop().toLowerCase();
    // common patterns: class5list.html or class5.html
    const m = fn.match(/class(\d+)/i);
    if (m) return parseInt(m[1], 10);
    // fallback: maybe page includes data-current-class on body
    const attr = document.body?.getAttribute?.('data-current-class');
    if (attr) return parseInt(attr, 10);
    return null;
  }

  window.goExperiment = async function (expNum) {
    const cls = detectCurrentClass();
    // 1) Tell the kit (app -> kit)
    if (window.selectExperiment) {
      try {
        // send to kit (this calls veeraAPI internally)
        await window.selectExperiment(expNum);
        console.log('[goExperiment] Sent experiment to kit:', expNum);
      } catch (err) {
        console.warn('[goExperiment] Error sending to kit:', err);
      }
    } else if (window.veeraAPI && window.veeraAPI.sendExperiment) {
      // fallback direct call
      try {
        await window.veeraAPI.sendExperiment(expNum);
        console.log('[goExperiment] Sent experiment to kit (direct):', expNum);
      } catch (err) {
        console.warn('[goExperiment] direct sendExperiment error:', err);
      }
    } else {
      console.warn('[goExperiment] No serial API exposed (selectExperiment / veeraAPI.sendExperiment).');
    }

    // 2) Navigate to the correct experiment page for this class
    // prefer explicit class if detected; otherwise assume class5 (safe fallback)
    const classNum = cls || 5;
    // build filename: C{classNum}E{expNum}.html
    const page = `C${classNum}E${expNum}.html`;
    console.log('[goExperiment] Navigating to', page);
    // small delay so kit message is sent before navigation (optional)
    setTimeout(() => { window.location.href = page; }, 150);
  };
})();

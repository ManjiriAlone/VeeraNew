// renderer/js/experimentControls.js
document.addEventListener('DOMContentLoaded', async () => {
  const api = window.veeraAPI;

  // Detect experiment page key from filename
  const filename = window.location.pathname.split('/').pop();
  const match = filename.match(/^C(\d+)E(\d+)\.html$/i);
  if (!match) return; // not an experiment page

  const key = `C${match[1]}_E${match[2]}`.replace('_', '_'); // we'll use C5_E6 format
  // Note: your thresholds keys use format C5_E6 or C5_E6? adjust if necessary.
  // If your keys in thresholds.js are "C5_E6", ensure key matches. If they are "C5E6" change accordingly.

  // Normalize key to match thresholds.js: if thresholds use "C5_E6" keep underscore
  const experimentKey = `C${match[1]}_E${match[2]}`; // e.g., C5_E6
  // Try both formats for compatibility:
  const tryKeys = [experimentKey, `C${match[1]}E${match[2]}`];

  // Find which key exists by asking backend (first available)
  let activeList = null;
  for (const k of tryKeys) {
    activeList = await api.getActiveThresholds(k);
    if (activeList && activeList.length) {
      window.__experimentKey = k; // save chosen key for later
      break;
    }
  }
  if (!activeList) {
    // nothing defined for this experiment
    console.log('No thresholds defined for this experiment key', tryKeys);
    return;
  }

  // Create UI container if not present
  let container = document.getElementById('threshold-controls');
  if (!container) {
    container = document.createElement('div');
    container.id = 'threshold-controls';
    container.style = "border:1px solid #ddd; padding:12px; margin:12px 0;";
    document.body.insertBefore(container, document.body.firstChild);
  }
  container.innerHTML = `<h3>Thresholds (experiment ${window.__experimentKey})</h3>`;

  // Build form inputs for every sensor entry in activeList
  const form = document.createElement('div');
  activeList.forEach((entry, idx) => {
    const code = entry.code;
    const value = entry.value;
    const row = document.createElement('div');
    row.style = 'margin-bottom:8px;';
    row.innerHTML = `
      <label style="width:140px;display:inline-block">${code.toUpperCase()} :</label>
      <input id="thr_${idx}" data-code="${code}" value="${value}" style="width:100px;" />
    `;
    form.appendChild(row);
  });

  // Buttons
  const setBtn = document.createElement('button');
  setBtn.textContent = 'Set Thresholds';
  setBtn.style = 'margin-right:8px;';
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Set to Default';
  const saveMsg = document.createElement('span');
  saveMsg.style = 'margin-left:12px;color:green;';

  container.appendChild(form);
  container.appendChild(setBtn);
  container.appendChild(resetBtn);
  container.appendChild(saveMsg);

  // Handler: Set thresholds (collect the values and send to backend)
  setBtn.addEventListener('click', async () => {
    const inputs = form.querySelectorAll('input[id^="thr_"]');
    const list = [];
    inputs.forEach(i => {
      const code = i.dataset.code;
      const val = i.value;
      list.push({ code, value: isNaN(Number(val)) ? val : Number(val) });
    });
    const res = await api.setActiveThresholds(window.__experimentKey, list);
    if (res && res.ok) {
      saveMsg.textContent = 'Thresholds set & sent to kit ✅';
      setTimeout(()=> saveMsg.textContent = '', 3000);
    } else {
      saveMsg.style.color = 'red';
      saveMsg.textContent = 'Error sending thresholds';
    }
  });

  // Handler: Reset to default for this experiment
  resetBtn.addEventListener('click', async () => {
    const res = await api.resetThresholdsFor(window.__experimentKey);
    if (res && res.ok) {
      const newList = await api.getActiveThresholds(window.__experimentKey);
      // update inputs
      newList.forEach((entry, idx) => {
        const el = document.getElementById(`thr_${idx}`);
        if (el) el.value = entry.value;
      });
      saveMsg.style.color = 'green';
      saveMsg.textContent = 'Defaults restored & sent to kit ✅';
      setTimeout(()=> saveMsg.textContent = '', 3000);
    } else {
      saveMsg.style.color = 'red';
      saveMsg.textContent = 'Error resetting thresholds';
    }
  });
});

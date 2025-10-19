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

api.onKitClassChanged((data) => {
    const classNum = Number(data.classNum || data);
    log(`Class changed on Kit -> ${classNum}`);
    currentClass = classNum;
    openClassPage(classNum);
  });

api.onKitExperimentChanged((data) => {
    const expNum = Number(data.expNum || data);
    log(`Experiment changed on Kit -> ${expNum}`);
    currentExperiment = expNum;
    if (currentClass) {
      openExperimentPage(currentClass, expNum);
    } else {
      console.warn("Received experiment change before class selected!");
    }
  });

window.selectClass = async function (classNum) {
    log(`User selected class ${classNum}`);
    currentClass = classNum;
    await api.sendClass(classNum);
    openClassPage(classNum);
  };

// ============ Navigation Functions ============

  // Navigate to class page
function openClassPage(classNum) {
    const page = `class${classNum}list.html`;
    log(`Opening ${page}`);
    window.location.href = page;
  }

  // Navigate to experiment page
  function openExperimentPage(classNum, expNum) {
    const page = `C${classNum}E${expNum}.html`;
    log(`Opening ${page}`);
    window.location.href = page;
  }

  // ============ Threshold Auto-sending ============

  // When a specific experiment HTML loads, automatically send thresholds
    const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1);
  const match = filename.match(/^C(\d+)E(\d+)\.html$/);
  if (match) {
    const [_, cls, exp] = match;
    const key1 = `C${cls}_E${exp}`;  // try underscore form
    const key2 = `C${cls}E${exp}`;   // try compact form

    // Try sending using whichever key exists
    api.sendThresholdsFor(key1).then(res => {
      if (!res.ok) return api.sendThresholdsFor(key2);
    }).catch(()=> api.sendThresholdsFor(key2));
    }

    log(`Detected experiment page: ${window.__experimentKey}`);
    setTimeout(() => {
      api.sendThresholdsFor(key)
        .then(res => log(`Thresholds sent for ${key}`, res))
        .catch(err => console.error(`Error sending thresholds for ${key}`, err));
    }, 1000); // wait 1 sec after page load
  }
);
// thresholds.js
const defaultThresholds = {
  // Class 5
  "C5_E1": [{ code: 'l', value: 300 }], // Blinking LED demo (LDR threshold)
  "C5_E2": [{ code: 'b', value: 300 }], // Light intensity control (d = LDR)
  "C5_E3": [{ code: 't', value: 30 }], // Food Storage temp threshold 30°C
  "C5_E4": [{ code: 'd', value: 70 }], // Water level (use 'D' for level)
  "C5_E5": [{ code: 'b', value: 300 }], // Home Lighting
  "C5_E6": [{ code: 't', value: 30 }],  // Classroom temp monitoring
  "C5_E7": [{ code: 'w', value: 600 }], // Plant soil (w = water/soil)
  "C5_E8": [{ code: 'm', value: 1 }], // Home automation sample

  // Class 6 - sample
  "C6_E1": [{ code: 'd', value: 30 }], // Object detection (distance < 30cm)
  "C6_E2": [{ code: 't', value: 30 }], // Perishable goods temp
  "C6_E3": [{ code: 's', value: 400 }], // Pollution/gas
  "C6_E4": [{ code: 'b', value: 300 }], // Auto light
  "C6_E5": [{ code: 'm', value: 1 }],   // Motion PIR
  "C6_E6": [{ code: 's', value: 350 }], // Sound+light
  "C6_E7": [{ code: 't', value: 32 }],  // Farm temp
  "C6_E8": [{ code: 'w', value: 600 }], // Farm automation soil

  // Class 7
  "C7_E1": [{ code: 'L', value: 1 }],   // LED matrix control (pattern)
  "C7_E2": [{ code: 't', value: 28 }],
  "C7_E3": [{ code: 'g', value: 200 }], // gas/air quality
  "C7_E4": [{ code: 'd', value: 30 }],
  "C7_E5": [{ code: 'w', value: 600 }],
  "C7_E6": [{ code: 'l', value: 250 }],
  "C7_E7": [{ code: 't', value: 30 }, { code: 'w', value: 600 }],

  // Class 8
  "C8_E1": [{ code: 'd', value: 30 }],
  "C8_E2": [{ code: 's', value: 400 }],
  "C8_E3": [{ code: 'd', value: 30 }],
  "C8_E4": [{ code: 'm', value: 1 }],
  "C8_E5": [{ code: 't', value: 33 }, { code: 'l', value: 300 }],
  "C8_E6": [{ code: 'n', value: 500 }],
  "C8_E7": [{ code: 'D', value: 30 }],
  "C8_E8": [{ code: 't', value: 33 }, { code: 'l', value: 300 }]
};

// Make a deep clone for active thresholds (mutable at runtime)
let activeThresholds = JSON.parse(JSON.stringify(defaultThresholds));

function getDefault(key) {
  return defaultThresholds[key] ? JSON.parse(JSON.stringify(defaultThresholds[key])) : null;
}

function getActive(key) {
  return activeThresholds[key] ? JSON.parse(JSON.stringify(activeThresholds[key])) : null;
}

// replace entire active list for a given experiment key (expects array of {code, value})
function setActive(key, list) {
  if (!defaultThresholds[key]) return false;
  activeThresholds[key] = JSON.parse(JSON.stringify(list));
  return true;
}

// reset one key to default
function resetKeyToDefault(key) {
  if (!defaultThresholds[key]) return false;
  activeThresholds[key] = JSON.parse(JSON.stringify(defaultThresholds[key]));
  return true;
}

// reset all to defaults
function resetAll() {
  activeThresholds = JSON.parse(JSON.stringify(defaultThresholds));
  return true;
}

// get sensor codes assigned for an experiment (helper)
function getSensorCodesForKey(key) {
  const arr = defaultThresholds[key] || [];
  return arr.map(x => x.code);
}

module.exports = {
  defaultThresholds,
  getDefault,
  getActive,
  setActive,
  resetKeyToDefault,
  resetAll,
  getSensorCodesForKey
};

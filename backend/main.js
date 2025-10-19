const { app, BrowserWindow, ipcMain } = require('electron');
const { classPages, experimentPages } = require("./pageMap");
const path = require('path');
const SerialManager = require('./SerialManager');
const thresholdsModule = require('./thresholds');
/*const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');*/

let mainWindow;
let serial;
let currentClass = 5; // default starting class (can be updated when kit sends #C)
let currentExperiment = 1;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, './backend/preload.js') // use preload for ipcRenderer bridging
    }
  });
  mainWindow.loadFile('./pages/index.html');
}

// --- Serial Communication Setup ---
/*let port;
let parser;

function initSerial() {
  port = new SerialPort({ path: 'COM4', baudRate: 9600 }); // change COM port if needed
  parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  parser.on('data', (msg) => {
    console.log("Received from Kit:", msg);
    handleKitMessage(msg.trim());
  });

  port.on('open', () => {
    console.log("✅ Kit Connected");
    mainWindow.webContents.send('serial-status', { connected: true });
  });
  port.on('close', () => {
    console.log("❌ Kit Disconnected");
    mainWindow.webContents.send('serial-status', { connected: false });
  });
}

// Interpret messages coming from kit
function handleKitMessage(raw) {
  // Clean incoming string
  const msg = raw.trim();
  if (!msg.startsWith('#') || !msg.endsWith('$')) return;

  // Remove framing and split
  const content = msg.slice(1, -1); // remove # and $
  const [identifier, value] = content.split(':');
  const upperID = identifier.toUpperCase();

  console.log("📨 From Kit:", upperID, "=", value);

  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  switch (upperID) {
    case 'C':  // Class
      win.webContents.send('change-class', value);
      break;
    case 'E':  // Experiment
      win.webContents.send('change-experiment', value);
      break;
    case 'T':  // Temperature
    case 'H':  // Humidity
    case 'W':  // Soil
    case 'B':  // Brightness
    case 'D':  // Distance
    case 'M':  // Motion
    case 'S':  // Smoke
    case 'L':  // LED state
    case 'N':  // Sound
    case 'V':  // Servo
    case 'R':  // Motor
    case 'P':  // Patvalue
    case 'I':  // IR
    case 'G':  // 7-segment
      win.webContents.send('sensor-update', { id: upperID, value });
      break;
    default:
      console.warn("⚠️ Unknown ID:", msg);
  }
  sendAck(identifier); // optional ACK
}

function sendAck(identifier) {
  if (port && port.isOpen) {
    const ack = `#a:${identifier.toLowerCase()}$`;
    port.write(ack);
    console.log("ACK sent:", ack);
  }
  sendAck(identifier);
}


// Send message to Kit
ipcMain.on('send-to-kit', (event, identifier, value) => {
  if (port && port.isOpen) {
    const msg = `#${identifier.toLowerCase()}:${value}$`;
    port.write(msg);
    console.log("✅ Sent to Kit:", msg);
  } else {
    console.warn("⚠️ Port not open, message not sent");
  }
});

app.whenReady().then(() => {
  createWindow();
  initSerial(); // initialize serial communication here
});*/

app.whenReady().then(() => {
  createWindow();
  serial = new SerialManager({ portPath: 'COM3', baudRate: 9600 });

  // forward serial events to renderer
  serial.on('connected', () => {
    mainWindow.webContents.send('serial-status', { connected: true });
    mainWindow.webContents.send('serial-connected');
  });
  serial.on('disconnected', () => {
    mainWindow.webContents.send('serial-status', { connected: false });
    mainWindow.webContents.send('serial-disconnected')
  });
  serial.on('class-changed', (d) => mainWindow.webContents.send('kit-class-changed', d));
  serial.on('experiment-changed', (d) => mainWindow.webContents.send('kit-experiment-changed', d));
  serial.on('sensor-update', (d) => mainWindow.webContents.send('kit-sensor-update', d));
  serial.on('ack', (d) => mainWindow.webContents.send('kit-ack', d));
  serial.on('error', (err) => mainWindow.webContents.send('kit-error', String(err)));
  serial.on('raw', (r) => mainWindow.webContents.send('kit-raw', r));

  // 🔀 Auto navigation when kit changes class or experiment
  let lastClass = null;
  let lastExperiment = null;
  
  serial.on('class-changed', (d) => {
  const classNum = parseInt(d.classNum, 10);
  if (!classNum || isNaN(classNum)) {
    console.warn('⚠️ Invalid class number from kit:', d);
    return;
  }
  if (classNum === lastClass) return; // avoid duplicate reloads

  lastClass = classNum;
  currentClass = classNum;

  // Make sure path matches your folder structure
  const file = path.join(__dirname, `../pages/class${currentClass}/class${classNum}list.html`);
  console.log(`➡ Switching to Class ${classNum} page:`, file);
  mainWindow.loadFile(file);
  });

  serial.on('experiment-changed', async (d) => {
    const expNum = parseInt(d.expNum, 10);
    if (!expNum || expNum === lastExperiment) return; // avoid duplicate reloads
    lastExperiment = expNum;
    currentExperiment = expNum;
    const file = path.join(__dirname, `../pages/class${currentClass}/C${currentClass}E${expNum}.html`);
    console.log(`➡ Opening Experiment ${expNum} of Class ${currentClass}:`, file);
    mainWindow.loadFile(file);

    // ⏳ Wait 1.5 seconds to let page fully load, then send thresholds
    setTimeout(async () => {
      try {
        const key = `C${currentClass}_E${currentExperiment}`;
        const tset = thresholdsModule.getActive(key);
        if (tset && serial) {
          console.log(`📤 Sending default thresholds for ${key}:`, tset);
          await serial.sendThresholds(tset);
          console.log(`✅ Thresholds sent successfully for ${key}`);
        } else {
          console.warn(`⚠️ No thresholds found for ${key}`);
        }
      } catch (err) {
        console.warn(`❌ Error sending thresholds:`, err.message);
      }
    }, 1200);
  });

  serial.on('error', (err) => mainWindow.webContents.send('kit-error', String(err)));

  // 🚀 Send default thresholds when experiment opens
  const key = `C${currentClass}_E${currentExperiment}`;
  const tset = thresholdsModule.getActive(key);
  if (tset && serial) {
    console.log(`📤 Sending default thresholds for ${key}:`, tset);
    serial.sendThresholds(tset).catch(err =>
      console.warn(`⚠️ Threshold send failed for ${key}:`, err.message)
    );
  }

  // IPC handlers from renderer
  ipcMain.handle('send-class', async (evt, classNum) => {
    if (!serial) return { ok: false, error: 'serial-not-initialized' };
    try {
      await serial.sendClass(classNum);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('send-experiment', async (evt, expNum) => {
    if (!serial) return { ok: false, error: 'serial-not-initialized' };
    try {
      await serial.sendExperiment(expNum);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });


  // 1. Get active thresholds for an experiment key (e.g. "C5_E6")
  ipcMain.handle('get-active-thresholds', async (evt, key) => {
    return thresholdsModule.getActive(key) || [];
  });

  // 2. Set active thresholds for a key (list = [{code, value}, ...]) and immediately send to kit
  ipcMain.handle('set-active-thresholds', async (evt, key, list) => {
    const ok = thresholdsModule.setActive(key, list);
    if (!ok) return { ok: false, error: 'Unknown key' };
    // send to kit the updated set
    try {
      await serial.sendThresholds(list);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 3. Reset a specific experiment to default and send to kit
  ipcMain.handle('reset-thresholds-for', async (evt, key) => {
    const ok = thresholdsModule.resetKeyToDefault(key);
    if (!ok) return { ok: false, error: 'Unknown key' };
    const list = thresholdsModule.getActive(key);
    try {
      await serial.sendThresholds(list);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 4. Reset all thresholds to default and send all to kit
  ipcMain.handle('reset-all-thresholds', async (evt) => {
    thresholdsModule.resetAll();
    const keys = Object.keys(thresholdsModule.defaultThresholds);
    // Send thresholds per key (we may throttle to avoid flooding)
    try {
      for (const key of keys) {
        const list = thresholdsModule.getActive(key);
        if (list && list.length) {
          // small delay to avoid serial overload
          await serial.sendThresholds(list);
          await new Promise(r => setTimeout(r, 150));
        }
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // 5. Ensure existing handler 'send-thresholds-for' uses active thresholds
  ipcMain.handle('send-thresholds-for', async (evt, key) => {
    if (!serial) return { ok: false, error: 'serial-not-initialized' };
    try {
      const list = thresholdsModule.getActive(key) || [];
      if (!list || !list.length) {
      return { ok: false, error: `No thresholds found for ${key}` };
      }
        await serial.sendThresholds(list);
        return { ok: true, sent: list.length };
      } catch (err) {
        console.warn(`⚠️ Failed to send thresholds for ${key}:`, err.message);
        return { ok: false, error: err.message };
      }
  });
});

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  try {
    // reset all thresholds and attempt to send defaults to kit
    thresholdsModule.resetAll();
    if (serial) {
      const keys = Object.keys(thresholdsModule.defaultThresholds);
      for (const key of keys) {
        const list = thresholdsModule.getActive(key);
        if (list && list.length) {
          await serial.sendThresholds(list);
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }
  } catch (e) {
    console.warn('Error while resetting thresholds at quit:', e.message);
  }
});


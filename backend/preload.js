const { contextBridge, ipcRenderer } = require('electron');
const { classPages, experimentPages } = require("./pageMap");

contextBridge.exposeInMainWorld('veeraAPI', {
    // high level commands
  sendClass: (c) => ipcRenderer.invoke('send-class', c),
  sendExperiment: (e) => ipcRenderer.invoke('send-experiment', e),
  sendThresholdsFor: (key) => ipcRenderer.invoke('send-thresholds-for', key),

  // threshold APIs:
  getActiveThresholds: (key) => ipcRenderer.invoke('get-active-thresholds', key),
  setActiveThresholds: (key, list) => ipcRenderer.invoke('set-active-thresholds', key, list),
  resetThresholdsFor: (key) => ipcRenderer.invoke('reset-thresholds-for', key),
  resetAllThresholds: () => ipcRenderer.invoke('reset-all-thresholds'),
  
   // event listeners
  onKitClassChanged: (cb) => ipcRenderer.on('kit-class-changed', (e, d) => cb(d)),
  onKitExperimentChanged: (cb) => ipcRenderer.on('kit-experiment-changed', (e, d) => cb(d)),
  onSensorUpdate: (cb) => ipcRenderer.on('kit-sensor-update', (e, d) => cb(d)),
  onKitAck: (cb) => ipcRenderer.on('kit-ack', (e, d) => cb(d)),

  // serial status events
  onSerialConnected: (cb) => ipcRenderer.on('serial-connected', cb),
  onSerialDisconnected: (cb) => ipcRenderer.on('serial-disconnected', cb),
  onStatus: (callback) => ipcRenderer.on('serial-status', (event, data) => callback(data)),

  // low-level raw send if needed
  sendRaw: (raw) => ipcRenderer.send('send-raw', raw),
  sendToKit: (data) => ipcRenderer.send('send-to-kit', data),
  onClassChange: (callback) => ipcRenderer.on('change-class', (event, classNum) => callback(classNum)),
  onExperimentChange: (callback) => ipcRenderer.on('change-experiment', (event, expName) => callback(expName)),
  onKitData: (callback) => ipcRenderer.on('kit-data', callback)
});

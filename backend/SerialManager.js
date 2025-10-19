// serialManager.js (REPLACE ENTIRE FILE)
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { EventEmitter } = require('events');

class SerialManager extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.portPath = opts.portPath || 'COM3';
    this.baudRate = opts.baudRate || 9600;
    this.ackTimeout = opts.ackTimeout || 1000; // ms
    this.retryLimit = opts.retryLimit || 1;
    this._open = false;
    this._pending = null;
    this._queue = [];
    this._initPort();
  }

  _initPort() {
    this.port = new SerialPort({ path: this.portPath, baudRate: this.baudRate, autoOpen: false });
    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '$' }));

    this.port.on('open', () => {
      this._open = true;
      this.emit('connected');
      this._processQueue();
    });

    this.port.on('close', () => {
      this._open = false;
      this.emit('disconnected');
      setTimeout(() => this._reopen(), 1000);
    });

    this.port.on('error', (err) => this.emit('error', err));

    this.parser.on('data', (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      // parser split by '$' so trimmed may be like '#C:5' -> normalize
      const normalized = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
      this._handleIncoming(normalized);
    });

    this._reopen();
  }

  _reopen() {
    if (this.port.isOpen) return;
    this.port.open((err) => {
      if (err) {
        // retry
        setTimeout(() => this._reopen(), 1000);
      }
    });
  }

  // low-level write: expects cmd WITHOUT trailing '$'
  _writeRawNoDollar(cmdNoDollar) {
    const out = cmdNoDollar + '$';
    if (!this._open) {
      console.warn('[Serial] port closed, queued write:', out);
    }
    this.port.write(out, (err) => {
      if (err) console.error('[Serial] write err', err);
      else console.log('[Serial] ->', out);
    });
  }

  // Queue-based send expecting ACK format
  sendCommand(cmdNoDollar, expectedAck) {
    return new Promise((resolve, reject) => {
      const work = { cmdNoDollar, expectedAck, resolve, reject, retries: 0 };
      this._queue.push(work);
      this._processQueue();
    });
  }

  _processQueue() {
    if (!this._open) return;
    if (this._pending) return;
    const next = this._queue.shift();
    if (!next) return;
    this._pending = next;
    this._sendPending(next);
  }

  _sendPending(pending) {
    this._writeRawNoDollar(pending.cmdNoDollar);
    pending.timer = setTimeout(() => this._onPendingTimeout(pending), this.ackTimeout);
  }

  _onPendingTimeout(pending) {
    pending.retries += 1;
    if (pending.retries <= this.retryLimit) {
      console.warn('[Serial] retry', pending.cmdNoDollar);
      this._writeRawNoDollar(pending.cmdNoDollar);
      pending.timer = setTimeout(() => this._onPendingTimeout(pending), this.ackTimeout);
    } else {
      clearTimeout(pending.timer);
      const rej = pending.reject;
      this._pending = null;
      rej(new Error('ACK timeout: ' + pending.cmdNoDollar));
      setImmediate(() => this._processQueue());
    }
  }

  _handleIncoming(raw) {
    // raw is like '#C:5'
    console.log('[Serial] <-', raw + '$');

    // if pending expectedAck matches, resolve pending
    if (this._pending && this._pending.expectedAck && raw === this._pending.expectedAck) {
      clearTimeout(this._pending.timer);
      this._pending.resolve(raw);
      this._pending = null;
      this.emit('ack', raw);
      setImmediate(() => this._processQueue());
      // continue parsing events below
    }

    if (!raw.startsWith('#')) return;
    const payload = raw.slice(1);
    const [head, ...rest] = payload.split(':');
    const key = head.trim();
    const val = rest.join(':');

    if (key === 'C') this.emit('class-changed', { classNum: val });
    else if (key === 'E') this.emit('experiment-changed', { expNum: val });
    else {
      const num = Number(val);
      this.emit('sensor-update', { sensor: key, value: isNaN(num) ? val : num });
    }
  }

  _expectedAckFor(cmdNoDollar) {
    // cmdNoDollar like '#c:5' -> expected ack '#C:5'
    if (!cmdNoDollar.startsWith('#')) return null;
    const body = cmdNoDollar.slice(1);
    const idx = body.indexOf(':');
    if (idx === -1) return null;
    const letter = body.slice(0, idx);
    const rest = body.slice(idx + 1);
    return '#' + letter.toUpperCase() + ':' + rest;
  }

  // convenience
  async sendClass(classNum) {
    const cmd = `#c:${classNum}`;
    const ack = this._expectedAckFor(cmd);
    return this.sendCommand(cmd, ack);
  }

  async sendExperiment(expNum) {
    const cmd = `#e:${expNum}`;
    const ack = this._expectedAckFor(cmd);
    return this.sendCommand(cmd, ack);
  }

  async sendThreshold(code, value) {
    const valP = String(value).padStart(3, '0');
    const cmd = `#${code.toLowerCase()}:${valP}`;
    const ack = this._expectedAckFor(cmd);
    return this.sendCommand(cmd, ack);
  }

  // send array of {code, value} sequentially (no per-message ACK required)
  async sendThresholds(list) {
    for (const item of list) {
      const cmd = `#${String(item.code).toLowerCase()}:${String(item.value).padStart(3, '0')}`;
      // We use _writeRawNoDollar directly (no ACK expected for thresholds), but DO NOT include extra $
      this._writeRawNoDollar(cmd);
      await new Promise(r => setTimeout(r, 80)); // small gap
    }
  }
}

// serialManager.js
const handleSerialData = (data) => {
  console.log("Raw data from Kit:", data);
  
  // Detect class change
  if (data.startsWith("#C:")) {
    const classNumber = data.match(/#C:(\d+)/)[1];
    console.log("Class selected on kit:", classNumber);
    mainWindow.webContents.send("kit-class-change", classNumber);
  }

  // Detect experiment change
  else if (data.startsWith("#E:")) {
    const expNumber = data.match(/#E:(\d+)/)[1];
    console.log("Experiment selected on kit:", expNumber);
    mainWindow.webContents.send("kit-exp-change", expNumber);
  }

  // Any other sensor or alert data
  else {
    mainWindow.webContents.send("kit-data", data);
  }
};

module.exports = SerialManager;

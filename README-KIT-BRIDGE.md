# Kit Bridge Module

## Overview

The **Kit Bridge** module provides a transport-agnostic interface for communication between the Veera web application and the hardware kit. It handles:

- **Message parsing** from kit hardware
- **Page navigation** based on kit input
- **Sending commands** to kit from the web UI
- **Threshold management** with persistent storage
- **Automatic reset** to defaults on page unload

## Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│   Web UI        │ ◄──────►│  KitBridge   │ ◄──────►│  Hardware   │
│  (HTML/JS)      │         │  (Transport  │         │     Kit     │
│                 │         │   Agnostic)  │         │             │
└─────────────────┘         └──────────────┘         └─────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │  LocalStorage│
                            │  (Thresholds)│
                            └──────────────┘
```

## Files

- **`js/kit-bridge.js`**: Core bridge module (self-contained, no dependencies)
- **`js/app-ui-integration-example.js`**: Example integration showing how to wire up UI elements
- **`README-KIT-BRIDGE.md`**: This documentation file

## Message Formats

### Incoming Messages (Kit → App)

Messages from the kit follow the pattern `#X:Y$` where:
- `#` is the start marker
- `X` is the command type (single letter, case-insensitive)
- `:` is the separator
- `Y` is the value
- `$` is the end marker

#### Class Selection
```
#C:5$    → Kit selected class 5
#C:6$    → Kit selected class 6
#c:7$    → Kit selected class 7 (lowercase also accepted)
```

**Action**: Navigate to `pages/class{n}/class{n}list.html`

#### Experiment Selection
```
#E:1$    → Kit selected experiment 1
#E:2$    → Kit selected experiment 2
#e:3$    → Kit selected experiment 3 (lowercase also accepted)
```

**Action**: Navigate to `pages/class{currentClass}/C{currentClass}E{n}.html`

If `currentClass` is not set, falls back to `defaultClass` (typically 5).

### Outgoing Messages (App → Kit)

#### Class Selection (User clicks in app)
```
#c:5$    → App selected class 5 (lowercase)
#c:6$    → App selected class 6
```

#### Experiment Selection (User clicks in app)
```
#e:1$    → App selected experiment 1 (lowercase)
#e:2$    → App selected experiment 2
```

#### Threshold Messages
```
#t:030$  → Temperature threshold = 30°C (zero-padded to 3 digits)
#d:050$  → Distance threshold = 50cm
#l:300$  → Light (LDR) threshold = 300
#b:250$  → Brightness threshold = 250
#w:600$  → Water/soil moisture threshold = 600
#s:400$  → Sound/gas sensor threshold = 400
#m:001$  → Motion (PIR) threshold = 1
#D:070$  → Water level percentage = 70%
#g:200$  → Gas/air quality threshold = 200
```

**Note**: Threshold codes are sent in **lowercase**, values are **zero-padded to 3 digits**.

## Usage

### 1. Include the Scripts

Add both scripts to your HTML page:

```html
<!-- Core bridge module (required) -->
<script src="/js/kit-bridge.js"></script>

<!-- Example integration (customize for your needs) -->
<script src="/js/app-ui-integration-example.js"></script>
```

### 2. Initialize the Bridge

```javascript
// Define your transport function
function sendToKitAdapter(message) {
  // Replace with actual serial/websocket/bluetooth implementation
  console.log('Sending to kit:', message);
  
  // Example for Electron with serialport:
  // window.serialPort.write(message);
  
  // Example for WebSocket:
  // window.kitSocket.send(message);
}

// Define default thresholds
var defaultThresholds = {
  "C5_E1": [{ code: 'l', value: 300 }],
  "C5_E2": [{ code: 'b', value: 300 }],
  "C5_E3": [{ code: 't', value: 30 }],
  // ... more experiments
};

// Initialize bridge
var bridge = window.KitBridge.initKitBridge({
  sendToKit: sendToKitAdapter,
  defaultClass: 5,
  defaultExperiment: 1,
  defaultThresholds: defaultThresholds
});
```

### 3. Wire UI Elements for Class Selection

Add `data-select-class` attribute to buttons:

```html
<button data-select-class="5">Class 5</button>
<button data-select-class="6">Class 6</button>
<button data-select-class="7">Class 7</button>
```

Wire them up with JavaScript:

```javascript
document.querySelectorAll('[data-select-class]').forEach(function(el) {
  el.addEventListener('click', function() {
    var classNum = parseInt(this.getAttribute('data-select-class'), 10);
    bridge.selectClass(classNum);
  });
});
```

### 4. Wire UI Elements for Experiment Selection

Add `data-select-exp` attribute to buttons:

```html
<button data-select-exp="1">Experiment 1: Blinking LED</button>
<button data-select-exp="2">Experiment 2: Light Control</button>
<button data-select-exp="3">Experiment 3: Temp Monitor</button>
```

Wire them up:

```javascript
document.querySelectorAll('[data-select-exp]').forEach(function(el) {
  el.addEventListener('click', function() {
    var expNum = parseInt(this.getAttribute('data-select-exp'), 10);
    bridge.selectExperiment(expNum);
  });
});
```

### 5. Wire Threshold Input Fields

Add `data-threshold-input` attribute with the threshold code:

```html
<label>
  Temperature Threshold (°C):
  <input type="number" data-threshold-input="t" value="30" />
</label>

<label>
  Distance Threshold (cm):
  <input type="number" data-threshold-input="d" value="50" />
</label>

<label>
  Light Threshold:
  <input type="number" data-threshold-input="l" value="300" />
</label>
```

Wire them up:

```javascript
document.querySelectorAll('[data-threshold-input]').forEach(function(el) {
  el.addEventListener('change', function() {
    var code = this.getAttribute('data-threshold-input');
    var value = parseInt(this.value, 10);
    bridge.setManualThresholdForCurrent(code, value);
  });
});
```

### 6. Handle Incoming Kit Messages

When your transport layer receives data from the kit, pass it to the bridge:

```javascript
// Example: Serial port
serialPort.on('data', function(data) {
  bridge.handleIncomingMessage(data);
});

// Example: WebSocket
socket.onmessage = function(event) {
  bridge.handleIncomingMessage(event.data);
};

// Example: Electron IPC
window.electronAPI.onKitMessage(function(message) {
  bridge.handleIncomingMessage(message);
});
```

## API Reference

### `KitBridge.initKitBridge(opts)`

Initialize the bridge and return API object.

**Parameters:**
- `opts.sendToKit` (Function, required): Function to send messages to kit
- `opts.defaultClass` (Number, optional): Default class number (default: 5)
- `opts.defaultExperiment` (Number, optional): Default experiment number (default: 1)
- `opts.defaultThresholds` (Object, optional): Default threshold mappings
- `opts.onNavigate` (Function, optional): Callback before navigation `(url) => void`
- `opts.onError` (Function, optional): Error handler `(error) => void`
- `opts.onMessageReceived` (Function, optional): Callback after message parsed `(parsed) => void`

**Returns:** Bridge API object with methods

### Bridge API Methods

#### `handleIncomingMessage(rawMessage)`

Parse and handle incoming message from kit.

```javascript
bridge.handleIncomingMessage('#C:6$');  // Navigate to class 6
bridge.handleIncomingMessage('#E:2$');  // Navigate to experiment 2
```

#### `selectClass(classNum)`

Select a class from the app (sends `#c:n$` to kit).

```javascript
bridge.selectClass(5);  // Sends '#c:5$' to kit
```

#### `selectExperiment(expNum)`

Select an experiment from the app (sends `#e:n$` to kit and threshold messages).

```javascript
bridge.selectExperiment(2);  // Sends '#e:2$' and thresholds to kit
```

#### `setManualThresholdForCurrent(code, value)`

Override threshold for current experiment. Persists to localStorage.

```javascript
bridge.setManualThresholdForCurrent('t', 35);  // Set temp to 35°C
bridge.setManualThresholdForCurrent('d', 25);  // Set distance to 25cm
```

#### `setToDefaultForCurrent()`

Reset current experiment to default thresholds.

```javascript
bridge.setToDefaultForCurrent();
```

#### `resetToDefaults()`

Reset all experiments to default thresholds.

```javascript
bridge.resetToDefaults();
```

#### `getThreshold(key)`

Get thresholds for a specific experiment (or current if key not provided).

```javascript
var thresholds = bridge.getThreshold('C5_E2');
// Returns: [{ code: 'b', value: 300 }]

var current = bridge.getThreshold();
// Returns thresholds for current experiment
```

#### `getCurrent()`

Get current class and experiment numbers.

```javascript
var current = bridge.getCurrent();
// Returns: { class: 5, experiment: 2, key: 'C5_E2' }
```

## Threshold Codes Reference

| Code | Sensor Type | Value Range | Unit |
|------|-------------|-------------|------|
| `t` | Temperature | 0-100 | °C |
| `d` | Distance | 0-500 | cm |
| `l` | Light/LDR | 0-1023 | raw |
| `b` | Brightness | 0-1023 | raw |
| `w` | Water/Soil Moisture | 0-1023 | raw |
| `s` | Sound/Gas Sensor | 0-1023 | raw |
| `m` | Motion/PIR | 0-1 | boolean |
| `D` | Water Level | 0-100 | % |
| `g` | Gas/Air Quality | 0-1023 | raw |
| `L` | LED Matrix Pattern | varies | pattern |

## LocalStorage Persistence

Manual threshold overrides are persisted in localStorage under the key:

```
veera_thresholds_v1
```

Format:
```json
{
  "C5_E1": [{ "code": "l", "value": 350 }],
  "C5_E2": [{ "code": "b", "value": 280 }],
  "C7_E7": [
    { "code": "t", "value": 32 },
    { "code": "w", "value": 650 }
  ]
}
```

## Debugging

The example integration exposes the bridge on `window.__VEERA_BRIDGE` for debugging:

```javascript
// In browser console:
__VEERA_BRIDGE.getCurrent()
// { class: 5, experiment: 2, key: 'C5_E2' }

__VEERA_BRIDGE.getThreshold('C5_E3')
// [{ code: 't', value: 30 }]

__VEERA_BRIDGE.selectClass(6)
// Sends '#c:6$' to kit

// Simulate incoming kit message:
__simulateKitMessage('#E:3$')
// Navigates to experiment 3
```

## Transport Implementation Examples

### Electron with SerialPort

```javascript
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '$' }));

// Send to kit
function sendToKitAdapter(message) {
  port.write(message);
}

// Receive from kit
parser.on('data', (data) => {
  bridge.handleIncomingMessage(data);
});
```

### WebSocket

```javascript
const socket = new WebSocket('ws://localhost:8080');

// Send to kit
function sendToKitAdapter(message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message);
  }
}

// Receive from kit
socket.onmessage = (event) => {
  bridge.handleIncomingMessage(event.data);
};
```

### Web Bluetooth

```javascript
let bluetoothCharacteristic = null;

// Connect to device and get characteristic
async function connectBluetooth() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['your-service-uuid'] }]
  });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('your-service-uuid');
  bluetoothCharacteristic = await service.getCharacteristic('your-char-uuid');
  
  // Listen for notifications
  await bluetoothCharacteristic.startNotifications();
  bluetoothCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
    const decoder = new TextDecoder();
    const message = decoder.decode(event.target.value);
    bridge.handleIncomingMessage(message);
  });
}

// Send to kit
function sendToKitAdapter(message) {
  if (bluetoothCharacteristic) {
    const encoder = new TextEncoder();
    bluetoothCharacteristic.writeValue(encoder.encode(message));
  }
}
```

## Notes and Best Practices

1. **Transport Independence**: The bridge doesn't care how messages are sent/received. You provide the `sendToKit` function.

2. **Message Format**: Always follow the `#X:Y$` format. The bridge is case-insensitive for incoming commands but sends lowercase for outgoing class/experiment selections.

3. **Zero-Padding**: Threshold values are automatically zero-padded to 3 digits (`30` → `030`).

4. **Persistence**: Manual threshold overrides are saved to localStorage and survive page refreshes.

5. **Auto-Reset**: When a page unloads, the bridge automatically sends default thresholds to the kit.

6. **Error Handling**: Provide an `onError` callback to handle errors gracefully in production.

7. **Navigation**: The bridge navigates by setting `window.location.href`. For SPAs, provide a custom `onNavigate` callback.

8. **Multiple Thresholds**: Some experiments have multiple thresholds (e.g., C7_E7 has both temperature and water). The bridge handles arrays of thresholds.

9. **Debugging**: Use `window.__VEERA_BRIDGE` in the console to inspect state and test commands during development.

10. **Testing**: Use `__simulateKitMessage('#C:5$')` to test message handling without hardware.

## License

MIT

/**
 * app-ui-integration-example.js
 * 
 * Example integration demonstrating how to use the KitBridge module
 * in a web application. This file shows:
 * - Setting up default thresholds
 * - Creating a transport adapter (placeholder for serial/websocket/bluetooth)
 * - Wiring UI elements to bridge methods
 * - Exposing bridge instance for debugging
 */

(function() {
  'use strict';

  // ============================================================================
  // 1. Define default thresholds for experiments
  // ============================================================================
  
  /**
   * Default threshold values for each class and experiment
   * Format: "C{class}_E{experiment}": [{code: 'x', value: nnn}, ...]
   * 
   * Threshold codes:
   * - t: temperature (Celsius)
   * - d: distance (cm)
   * - l: light/LDR (0-1023)
   * - b: brightness/LDR (0-1023)
   * - w: water/soil moisture (0-1023)
   * - s: sound/gas sensor (0-1023)
   * - m: motion/PIR (0 or 1)
   * - D: water level percentage (0-100)
   * - g: gas/air quality (0-1023)
   */
  var defaultThresholds = {
    // Class 5 Experiments
    "C5_E1": [{ code: 'l', value: 300 }],  // Blinking LED (LDR threshold)
    "C5_E2": [{ code: 'b', value: 300 }],  // Light intensity control
    "C5_E3": [{ code: 't', value: 30 }],   // Food storage temp monitoring
    "C5_E4": [{ code: 'D', value: 70 }],   // Water level alerting
    "C5_E5": [{ code: 'b', value: 300 }],  // Home lighting system
    "C5_E6": [{ code: 't', value: 30 }],   // Classroom temp monitoring
    "C5_E7": [{ code: 'w', value: 600 }],  // Plant soil monitoring
    
    // Class 6 Experiments
    "C6_E1": [{ code: 'd', value: 30 }],   // Object detection (distance < 30cm)
    "C6_E2": [{ code: 't', value: 30 }],   // Perishable goods temp
    "C6_E3": [{ code: 's', value: 400 }],  // Pollution/gas sensor
    "C6_E4": [{ code: 'b', value: 300 }],  // Auto light system
    "C6_E5": [{ code: 'm', value: 1 }],    // Motion detection (PIR)
    "C6_E6": [{ code: 's', value: 350 }],  // Sound + light
    
    // Class 7 Experiments
    "C7_E1": [{ code: 'L', value: 1 }],    // LED matrix control
    "C7_E2": [{ code: 't', value: 28 }],   // Temperature monitoring
    "C7_E3": [{ code: 'g', value: 200 }],  // Gas/air quality
    "C7_E4": [{ code: 'd', value: 30 }],   // Distance sensor
    "C7_E5": [{ code: 'w', value: 600 }],  // Soil moisture
    "C7_E6": [{ code: 'l', value: 250 }],  // Light sensor
    "C7_E7": [
      { code: 't', value: 30 },            // Multi-sensor experiment
      { code: 'w', value: 600 }
    ],
    
    // Class 8 Experiments
    "C8_E1": [{ code: 'd', value: 30 }],   // Distance sensor
    "C8_E2": [{ code: 's', value: 400 }],  // Sound sensor
    "C8_E3": [{ code: 'd', value: 30 }],   // Distance tracking
    "C8_E4": [{ code: 'm', value: 1 }],    // Motion PIR
    "C8_E5": [
      { code: 't', value: 33 },            // Multi-sensor
      { code: 'l', value: 300 }
    ],
    "C8_E6": [{ code: 'n', value: 500 }],  // Noise sensor
    "C8_E7": [{ code: 'D', value: 30 }],   // Water level
    "C8_E8": [
      { code: 't', value: 33 },            // Multi-sensor
      { code: 'l', value: 300 }
    ]
  };

  // ============================================================================
  // 2. Create transport adapter (placeholder for real implementation)
  // ============================================================================
  
  /**
   * Placeholder function to send messages to the kit
   * Replace this with actual serial/websocket/bluetooth implementation
   * 
   * Examples:
   * - Serial: Use Web Serial API or Electron's serialport
   * - WebSocket: Use WebSocket API to communicate with backend
   * - Bluetooth: Use Web Bluetooth API
   */
  function sendToKitAdapter(message) {
    // For development/testing: just log the message
    console.log('[SendToKit]', message);
    
    // TODO: Replace with actual transport implementation
    // Example for serial (Electron with serialport):
    // if (window.serialPort) {
    //   window.serialPort.write(message);
    // }
    
    // Example for WebSocket:
    // if (window.kitSocket && window.kitSocket.readyState === WebSocket.OPEN) {
    //   window.kitSocket.send(message);
    // }
    
    // Example for IPC in Electron:
    // if (window.electronAPI) {
    //   window.electronAPI.sendToKit(message);
    // }
  }

  // ============================================================================
  // 3. Initialize KitBridge
  // ============================================================================
  
  var bridge = null;
  
  try {
    bridge = window.KitBridge.initKitBridge({
      sendToKit: sendToKitAdapter,
      defaultClass: 5,
      defaultExperiment: 1,
      defaultThresholds: defaultThresholds,
      
      // Optional: callback before navigation
      onNavigate: function(url) {
        console.log('[KitBridge] About to navigate to:', url);
      },
      
      // Optional: error handler
      onError: function(error) {
        console.error('[KitBridge] Error:', error);
        // Could show user-friendly error message here
      },
      
      // Optional: callback when message received
      onMessageReceived: function(parsed) {
        console.log('[KitBridge] Message parsed:', parsed);
      }
    });
    
    console.log('[App] KitBridge initialized successfully');
    
  } catch (error) {
    console.error('[App] Failed to initialize KitBridge:', error);
    alert('Failed to initialize kit communication: ' + error.message);
  }

  // ============================================================================
  // 4. Wire UI elements - Class selection
  // ============================================================================
  
  /**
   * Setup click handlers for elements with data-select-class attribute
   * Usage in HTML: <button data-select-class="5">Class 5</button>
   */
  function wireClassSelectionElements() {
    var elements = document.querySelectorAll('[data-select-class]');
    
    elements.forEach(function(element) {
      element.addEventListener('click', function() {
        var classNum = parseInt(this.getAttribute('data-select-class'), 10);
        if (!isNaN(classNum) && bridge) {
          bridge.selectClass(classNum);
        }
      });
    });
    
    console.log('[App] Wired', elements.length, 'class selection elements');
  }

  // ============================================================================
  // 5. Wire UI elements - Experiment selection
  // ============================================================================
  
  /**
   * Setup click handlers for elements with data-select-exp attribute
   * Usage in HTML: <button data-select-exp="2">Experiment 2</button>
   */
  function wireExperimentSelectionElements() {
    var elements = document.querySelectorAll('[data-select-exp]');
    
    elements.forEach(function(element) {
      element.addEventListener('click', function() {
        var expNum = parseInt(this.getAttribute('data-select-exp'), 10);
        if (!isNaN(expNum) && bridge) {
          bridge.selectExperiment(expNum);
        }
      });
    });
    
    console.log('[App] Wired', elements.length, 'experiment selection elements');
  }

  // ============================================================================
  // 6. Wire UI elements - Threshold inputs
  // ============================================================================
  
  /**
   * Setup change handlers for elements with data-threshold-input attribute
   * Usage in HTML: <input data-threshold-input="t" type="number" />
   * The attribute value should be the threshold code (e.g., 't', 'd', 'l')
   */
  function wireThresholdInputElements() {
    var elements = document.querySelectorAll('[data-threshold-input]');
    
    elements.forEach(function(element) {
      element.addEventListener('change', function() {
        var code = this.getAttribute('data-threshold-input');
        var value = parseInt(this.value, 10);
        
        if (code && !isNaN(value) && bridge) {
          bridge.setManualThresholdForCurrent(code, value);
        }
      });
    });
    
    console.log('[App] Wired', elements.length, 'threshold input elements');
  }

  // ============================================================================
  // 7. Wire reset buttons
  // ============================================================================
  
  /**
   * Setup reset-to-default buttons
   * Usage in HTML: <button data-reset-threshold>Reset to Defaults</button>
   */
  function wireResetButtons() {
    // Reset current experiment
    var resetCurrentButtons = document.querySelectorAll('[data-reset-threshold-current]');
    resetCurrentButtons.forEach(function(element) {
      element.addEventListener('click', function() {
        if (bridge) {
          bridge.setToDefaultForCurrent();
        }
      });
    });
    
    // Reset all experiments
    var resetAllButtons = document.querySelectorAll('[data-reset-threshold-all]');
    resetAllButtons.forEach(function(element) {
      element.addEventListener('click', function() {
        if (bridge && confirm('Reset all thresholds to defaults?')) {
          bridge.resetToDefaults();
        }
      });
    });
    
    console.log('[App] Wired reset buttons');
  }

  // ============================================================================
  // 8. Setup incoming message handler
  // ============================================================================
  
  /**
   * Example: Handle incoming messages from kit
   * This would be called by your transport layer when data arrives
   * 
   * For serial in Electron:
   *   serialPort.on('data', (data) => handleIncomingKitMessage(data));
   * 
   * For WebSocket:
   *   socket.onmessage = (event) => handleIncomingKitMessage(event.data);
   */
  function handleIncomingKitMessage(data) {
    if (bridge) {
      bridge.handleIncomingMessage(data);
    }
  }

  // ============================================================================
  // 9. Expose bridge for debugging
  // ============================================================================
  
  /**
   * Expose bridge instance on window for debugging in console
   * Usage in browser console:
   *   __VEERA_BRIDGE.getCurrent()
   *   __VEERA_BRIDGE.selectClass(6)
   *   __VEERA_BRIDGE.getThreshold('C5_E2')
   */
  window.__VEERA_BRIDGE = bridge;
  console.log('[App] Bridge exposed as window.__VEERA_BRIDGE for debugging');

  // ============================================================================
  // 10. Initialize on DOM ready
  // ============================================================================
  
  /**
   * Wire everything up when DOM is ready
   */
  function initializeApp() {
    if (!bridge) {
      console.error('[App] Cannot initialize: bridge not created');
      return;
    }
    
    wireClassSelectionElements();
    wireExperimentSelectionElements();
    wireThresholdInputElements();
    wireResetButtons();
    
    console.log('[App] All UI elements wired successfully');
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    // DOM already loaded
    initializeApp();
  }

  // ============================================================================
  // 11. Example: Simulate receiving kit messages (for testing)
  // ============================================================================
  
  /**
   * For testing purposes only - simulate kit messages
   * Remove or comment out in production
   */
  window.__simulateKitMessage = function(message) {
    console.log('[Test] Simulating kit message:', message);
    handleIncomingKitMessage(message);
  };
  
  // Example usage in console:
  // __simulateKitMessage('#C:6$')  // Simulate class 6 selection
  // __simulateKitMessage('#E:3$')  // Simulate experiment 3 selection

})();

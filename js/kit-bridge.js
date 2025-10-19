/**
 * kit-bridge.js
 * 
 * A transport-agnostic frontend module for handling communication between
 * the web application and the kit hardware.
 * 
 * Features:
 * - Parse incoming kit messages (#C:5$, #E:3$, etc.)
 * - Navigate to appropriate pages based on kit input
 * - Send messages to kit when user selects class/experiment
 * - Manage threshold settings with localStorage persistence
 * - Provide methods for manual threshold overrides
 * - Reset to defaults on window unload
 */

(function(window) {
  'use strict';

  /**
   * Initialize the KitBridge
   * 
   * @param {Object} opts - Configuration options
   * @param {Function} opts.sendToKit - Function to send messages to kit (required)
   * @param {number} [opts.defaultClass=5] - Default class number
   * @param {number} [opts.defaultExperiment=1] - Default experiment number
   * @param {Object} [opts.defaultThresholds={}] - Default thresholds mapping
   * @param {Function} [opts.onNavigate] - Callback before navigation (url) => void
   * @param {Function} [opts.onError] - Error handler (error) => void
   * @param {Function} [opts.onMessageReceived] - Callback after message parsed (msg) => void
   * @returns {Object} Bridge API
   */
  function initKitBridge(opts) {
    if (!opts || typeof opts.sendToKit !== 'function') {
      throw new Error('KitBridge requires opts.sendToKit function');
    }

    // Configuration
    var config = {
      sendToKit: opts.sendToKit,
      defaultClass: opts.defaultClass || 5,
      defaultExperiment: opts.defaultExperiment || 1,
      defaultThresholds: opts.defaultThresholds || {},
      onNavigate: opts.onNavigate || null,
      onError: opts.onError || null,
      onMessageReceived: opts.onMessageReceived || null
    };

    // State
    var state = {
      currentClass: null,
      currentExperiment: null
    };

    // LocalStorage key for persisting threshold overrides
    var STORAGE_KEY = 'veera_thresholds_v1';

    /**
     * Get stored threshold overrides from localStorage
     */
    function getStoredThresholds() {
      try {
        var stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        handleError(e);
        return {};
      }
    }

    /**
     * Save threshold overrides to localStorage
     */
    function saveThresholds(thresholds) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      } catch (e) {
        handleError(e);
      }
    }

    /**
     * Handle errors with optional callback
     */
    function handleError(error) {
      console.error('[KitBridge]', error);
      if (config.onError) {
        config.onError(error);
      }
    }

    /**
     * Parse incoming kit message
     * Expected formats:
     * - #C:5$ - Class selection (case-insensitive)
     * - #E:3$ - Experiment selection
     * - Other sensor data messages
     */
    function parseMessage(rawMessage) {
      if (!rawMessage || typeof rawMessage !== 'string') {
        return null;
      }

      // Normalize: remove trailing $ if present, trim whitespace
      var msg = rawMessage.trim();
      if (msg.endsWith('$')) {
        msg = msg.slice(0, -1);
      }

      // Ensure message starts with #
      if (!msg.startsWith('#')) {
        return null;
      }

      // Extract type and value: #C:5 -> type='C', value='5'
      var payload = msg.slice(1); // Remove #
      var colonIndex = payload.indexOf(':');
      if (colonIndex === -1) {
        return null;
      }

      var type = payload.slice(0, colonIndex).toUpperCase();
      var value = payload.slice(colonIndex + 1).trim();

      return { type: type, value: value, raw: rawMessage };
    }

    /**
     * Navigate to a URL with optional callback
     */
    function navigateTo(url) {
      if (config.onNavigate) {
        config.onNavigate(url);
      }
      window.location.href = url;
    }

    /**
     * Handle incoming message from kit
     * Parses and acts on class/experiment change messages
     */
    function handleIncomingMessage(rawMessage) {
      var parsed = parseMessage(rawMessage);
      
      if (!parsed) {
        console.log('[KitBridge] Unparseable message:', rawMessage);
        return;
      }

      console.log('[KitBridge] Received:', parsed);

      if (config.onMessageReceived) {
        config.onMessageReceived(parsed);
      }

      // Handle class selection: #C:5$ -> navigate to class5list.html
      if (parsed.type === 'C') {
        var classNum = parseInt(parsed.value, 10);
        if (!isNaN(classNum)) {
          state.currentClass = classNum;
          var classUrl = 'pages/class' + classNum + '/class' + classNum + 'list.html';
          console.log('[KitBridge] Navigating to class list:', classUrl);
          navigateTo(classUrl);
        }
      }
      // Handle experiment selection: #E:3$ -> navigate to C{currentClass}E{3}.html
      else if (parsed.type === 'E') {
        var expNum = parseInt(parsed.value, 10);
        if (!isNaN(expNum)) {
          state.currentExperiment = expNum;
          var classForNav = state.currentClass || config.defaultClass;
          var expUrl = 'pages/class' + classForNav + '/C' + classForNav + 'E' + expNum + '.html';
          console.log('[KitBridge] Navigating to experiment:', expUrl);
          navigateTo(expUrl);
        }
      }
    }

    /**
     * Select a class from the app (user action)
     * Sends #c:n$ message to kit
     */
    function selectClass(classNum) {
      if (typeof classNum !== 'number' || classNum < 1) {
        handleError(new Error('Invalid class number: ' + classNum));
        return;
      }

      state.currentClass = classNum;
      var message = '#c:' + classNum + '$';
      console.log('[KitBridge] Selecting class:', message);
      
      try {
        config.sendToKit(message);
      } catch (e) {
        handleError(e);
      }
    }

    /**
     * Select an experiment from the app (user action)
     * Sends #e:m$ message to kit
     */
    function selectExperiment(expNum) {
      if (typeof expNum !== 'number' || expNum < 1) {
        handleError(new Error('Invalid experiment number: ' + expNum));
        return;
      }

      state.currentExperiment = expNum;
      var message = '#e:' + expNum + '$';
      console.log('[KitBridge] Selecting experiment:', message);
      
      try {
        config.sendToKit(message);
      } catch (e) {
        handleError(e);
      }

      // Send threshold messages for this experiment
      sendThresholdsForCurrent();
    }

    /**
     * Get current experiment key (e.g., "C5_E2")
     */
    function getCurrentKey() {
      var cls = state.currentClass || config.defaultClass;
      var exp = state.currentExperiment || config.defaultExperiment;
      return 'C' + cls + '_E' + exp;
    }

    /**
     * Get thresholds for current experiment
     * Returns array of {code, value} objects
     */
    function getThreshold(key) {
      key = key || getCurrentKey();
      
      // Check for manual overrides first
      var stored = getStoredThresholds();
      if (stored[key]) {
        return stored[key];
      }

      // Fall back to defaults
      return config.defaultThresholds[key] || [];
    }

    /**
     * Get current class and experiment numbers
     */
    function getCurrent() {
      return {
        class: state.currentClass || config.defaultClass,
        experiment: state.currentExperiment || config.defaultExperiment,
        key: getCurrentKey()
      };
    }

    /**
     * Set manual threshold override for current experiment
     * 
     * @param {string} code - Threshold code (e.g., 't', 'd', 'l')
     * @param {number} value - Threshold value
     */
    function setManualThresholdForCurrent(code, value) {
      var key = getCurrentKey();
      var stored = getStoredThresholds();
      
      // Get current thresholds (from storage or defaults)
      var current = stored[key] || (config.defaultThresholds[key] ? 
        JSON.parse(JSON.stringify(config.defaultThresholds[key])) : []);
      
      // Update or add the threshold
      var found = false;
      for (var i = 0; i < current.length; i++) {
        if (current[i].code === code) {
          current[i].value = value;
          found = true;
          break;
        }
      }
      
      if (!found) {
        current.push({ code: code, value: value });
      }
      
      // Save to storage
      stored[key] = current;
      saveThresholds(stored);
      
      console.log('[KitBridge] Manual threshold set:', key, code, value);
      
      // Send updated thresholds to kit
      sendThresholdsToKit(current);
    }

    /**
     * Reset current experiment to default thresholds
     */
    function setToDefaultForCurrent() {
      var key = getCurrentKey();
      var stored = getStoredThresholds();
      
      // Remove override
      delete stored[key];
      saveThresholds(stored);
      
      console.log('[KitBridge] Reset to defaults:', key);
      
      // Send default thresholds to kit
      sendThresholdsForCurrent();
    }

    /**
     * Reset all experiments to default thresholds
     */
    function resetToDefaults() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        console.log('[KitBridge] All thresholds reset to defaults');
        
        // Send current experiment's defaults to kit
        sendThresholdsForCurrent();
      } catch (e) {
        handleError(e);
      }
    }

    /**
     * Send threshold messages to kit
     * Format: #t:034$ (code 't', value 034 zero-padded to 3 digits)
     * 
     * @param {Array} thresholds - Array of {code, value} objects
     */
    function sendThresholdsToKit(thresholds) {
      if (!thresholds || !Array.isArray(thresholds)) {
        return;
      }

      thresholds.forEach(function(threshold) {
        var code = String(threshold.code).toLowerCase();
        var value = String(threshold.value).padStart(3, '0');
        var message = '#' + code + ':' + value + '$';
        
        console.log('[KitBridge] Sending threshold:', message);
        
        try {
          config.sendToKit(message);
        } catch (e) {
          handleError(e);
        }
      });
    }

    /**
     * Send thresholds for current experiment
     */
    function sendThresholdsForCurrent() {
      var thresholds = getThreshold();
      sendThresholdsToKit(thresholds);
    }

    /**
     * Setup window.beforeunload handler to reset to defaults
     */
    function setupBeforeUnload() {
      window.addEventListener('beforeunload', function() {
        console.log('[KitBridge] Page unloading, sending defaults...');
        
        // Best-effort: send default thresholds
        var defaults = config.defaultThresholds[getCurrentKey()] || [];
        sendThresholdsToKit(defaults);
      });
    }

    // Initialize
    setupBeforeUnload();

    // Return public API
    return {
      handleIncomingMessage: handleIncomingMessage,
      selectClass: selectClass,
      selectExperiment: selectExperiment,
      setManualThresholdForCurrent: setManualThresholdForCurrent,
      setToDefaultForCurrent: setToDefaultForCurrent,
      resetToDefaults: resetToDefaults,
      getThreshold: getThreshold,
      getCurrent: getCurrent
    };
  }

  // Export to global scope
  if (typeof window.KitBridge === 'undefined') {
    window.KitBridge = {
      initKitBridge: initKitBridge
    };
  }

})(window);

/**
 * Voice Interface Content Script
 * Provides voice control overlay and accessibility features
 */

(function () {
  'use strict';

  let voiceOverlay = null;
  let isListening = false;
  let recognition = null;
  let synthesis = window.speechSynthesis;

  // Initialize speech recognition
  function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SpeechRecognition();
    
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';
    
    return recog;
  }

  // Create voice control overlay
  function createVoiceOverlay() {
    if (voiceOverlay) return voiceOverlay;

    const overlay = document.createElement('div');
    overlay.id = 'web-agent-voice-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: none;
      animation: slideIn 0.3s ease-out;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        #web-agent-voice-overlay .listening {
          animation: pulse 1.5s infinite;
        }
      </style>
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div id="voice-status-icon" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-right: 12px;">
          🎤
        </div>
        <div>
          <div style="font-weight: 600; font-size: 16px;">Voice Control</div>
          <div id="voice-status-text" style="font-size: 12px; opacity: 0.9;">Ready</div>
        </div>
      </div>
      <div id="voice-transcript" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; min-height: 60px; margin-bottom: 12px; font-size: 14px;">
        Say a command...
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="voice-start-btn" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background: rgba(255,255,255,0.9); color: #667eea; font-weight: 600; cursor: pointer;">
          Start
        </button>
        <button id="voice-stop-btn" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; font-weight: 600; cursor: pointer;">
          Stop
        </button>
        <button id="voice-close-btn" style="padding: 10px 16px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; cursor: pointer;">
          ✕
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    overlay.querySelector('#voice-start-btn').addEventListener('click', startListening);
    overlay.querySelector('#voice-stop-btn').addEventListener('click', stopListening);
    overlay.querySelector('#voice-close-btn').addEventListener('click', hideVoiceOverlay);

    voiceOverlay = overlay;
    return overlay;
  }

  function showVoiceOverlay() {
    const overlay = createVoiceOverlay();
    overlay.style.display = 'block';
  }

  function hideVoiceOverlay() {
    if (voiceOverlay) {
      voiceOverlay.style.display = 'none';
      stopListening();
    }
  }

  function updateVoiceStatus(status, transcript = '') {
    if (!voiceOverlay) return;

    const statusText = voiceOverlay.querySelector('#voice-status-text');
    const statusIcon = voiceOverlay.querySelector('#voice-status-icon');
    const transcriptEl = voiceOverlay.querySelector('#voice-transcript');

    statusText.textContent = status;
    
    if (transcript) {
      transcriptEl.textContent = transcript;
    }

    if (status === 'Listening...') {
      statusIcon.classList.add('listening');
    } else {
      statusIcon.classList.remove('listening');
    }
  }

  function startListening() {
    if (isListening) return;

    if (!recognition) {
      recognition = initVoiceRecognition();
      if (!recognition) {
        updateVoiceStatus('Not supported');
        return;
      }
    }

    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const transcript = results
        .map((result) => result[0].transcript)
        .join(' ');
      
      const isFinal = results[results.length - 1].isFinal;
      
      updateVoiceStatus(isFinal ? 'Processing...' : 'Listening...', transcript);

      if (isFinal) {
        // Send command to background
        chrome.runtime.sendMessage({
          type: 'VOICE_COMMAND',
          transcript,
        }).catch(() => {});

        // Auto-stop after command
        setTimeout(() => stopListening(), 1000);
      }
    };

    recognition.onerror = (event) => {
      updateVoiceStatus('Error: ' + event.error);
      isListening = false;
    };

    recognition.onend = () => {
      isListening = false;
      updateVoiceStatus('Ready');
    };

    try {
      recognition.start();
      isListening = true;
      updateVoiceStatus('Listening...');
    } catch (err) {
      updateVoiceStatus('Error starting');
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
      updateVoiceStatus('Ready');
    }
  }

  // Speak text (for accessibility)
  function speak(text, options = {}) {
    if (!synthesis) return;

    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = options.lang || 'en-US';

    synthesis.speak(utterance);
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SHOW_VOICE_OVERLAY') {
      showVoiceOverlay();
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === 'HIDE_VOICE_OVERLAY') {
      hideVoiceOverlay();
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === 'SPEAK_TEXT') {
      speak(msg.text, msg.options || {})
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'NARRATE_PAGE') {
      narratePage();
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  // Narrate page content for accessibility
  function narratePage() {
    const title = document.title;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .slice(0, 5)
      .map((h) => h.textContent.trim())
      .filter(Boolean);
    
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
      .slice(0, 5)
      .map((b) => b.textContent.trim())
      .filter(Boolean);

    let narration = `Page title: ${title}. `;
    
    if (headings.length > 0) {
      narration += `Main sections: ${headings.join(', ')}. `;
    }

    if (buttons.length > 0) {
      narration += `Available actions: ${buttons.join(', ')}.`;
    }

    speak(narration);
  }

  // Keyboard shortcut listener
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+V or Cmd+Shift+V
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      if (voiceOverlay && voiceOverlay.style.display === 'block') {
        hideVoiceOverlay();
      } else {
        showVoiceOverlay();
      }
    }
  });

  console.log('Web Agent Voice Interface loaded');
})();

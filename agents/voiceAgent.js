/**
 * Voice Agent — Natural language interface for accessibility and hands-free operation.
 * Supports: speech-to-text input, text-to-speech output, voice commands.
 * Use cases: accessibility, driving, multitasking, natural interaction.
 */

class VoiceAgent {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.voiceEnabled = false;
  }

  /**
   * Initialize voice recognition
   */
  async initialize() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.voiceEnabled = true;
    return { success: true };
  }

  /**
   * Start listening for voice input
   */
  async startListening(onResult, onError) {
    if (!this.recognition) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const transcript = results
          .map((result) => result[0].transcript)
          .join(' ');
        
        const isFinal = results[results.length - 1].isFinal;
        
        if (onResult) {
          onResult({ transcript, isFinal });
        }

        if (isFinal) {
          resolve(transcript);
        }
      };

      this.recognition.onerror = (event) => {
        if (onError) onError(event.error);
        reject(new Error(event.error));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
        this.isListening = true;
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text, options = {}) {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported');
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      utterance.lang = options.lang || 'en-US';

      // Select voice if specified
      if (options.voice) {
        const voices = this.synthesis.getVoices();
        const voice = voices.find((v) => v.name === options.voice);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        reject(new Error(event.error));
      };

      this.synthesis.speak(utterance);
      this.isSpeaking = true;
    });
  }

  /**
   * Stop speaking
   */
  stopSpeaking() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Get available voices
   */
  getVoices() {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Parse voice command
   */
  parseCommand(transcript) {
    const normalized = transcript.toLowerCase().trim();
    
    // Navigation commands
    if (normalized.startsWith('go to') || normalized.startsWith('open')) {
      const target = normalized.replace(/^(go to|open)\s+/, '');
      return { type: 'navigate', target };
    }

    // Search commands
    if (normalized.startsWith('search for') || normalized.startsWith('find')) {
      const query = normalized.replace(/^(search for|find)\s+/, '');
      return { type: 'search', query };
    }

    // Action commands
    if (normalized.includes('click') || normalized.includes('press')) {
      const target = normalized.replace(/(click|press)\s+(on\s+)?/, '');
      return { type: 'click', target };
    }

    // Read commands
    if (normalized.startsWith('read') || normalized.startsWith('what')) {
      return { type: 'read', target: normalized };
    }

    // Control commands
    if (normalized === 'stop' || normalized === 'cancel') {
      return { type: 'stop' };
    }

    if (normalized === 'pause') {
      return { type: 'pause' };
    }

    if (normalized === 'continue' || normalized === 'resume') {
      return { type: 'resume' };
    }

    // Default: treat as general goal
    return { type: 'goal', text: transcript };
  }

  /**
   * Narrate page content (accessibility)
   */
  async narratePage(pageData, options = {}) {
    const parts = [];

    // Page title
    if (pageData.title) {
      parts.push(`Page title: ${pageData.title}`);
    }

    // Important text
    if (pageData.important_text && pageData.important_text.length > 0) {
      parts.push('Main content:');
      parts.push(pageData.important_text.slice(0, 5).join('. '));
    }

    // Interactive elements
    if (pageData.buttons && pageData.buttons.length > 0) {
      parts.push(`Found ${pageData.buttons.length} buttons.`);
      if (options.detailed) {
        const buttonNames = pageData.buttons.slice(0, 5).map((b) => b.text).filter(Boolean);
        if (buttonNames.length > 0) {
          parts.push(`Buttons: ${buttonNames.join(', ')}`);
        }
      }
    }

    if (pageData.links && pageData.links.length > 0) {
      parts.push(`Found ${pageData.links.length} links.`);
    }

    if (pageData.forms && pageData.forms.length > 0) {
      parts.push(`Found ${pageData.forms.length} forms.`);
    }

    const narration = parts.join('. ');
    await this.speak(narration, options);
    return narration;
  }

  /**
   * Provide voice feedback for agent actions
   */
  async narrateAction(action, result) {
    const type = (action.type || '').toUpperCase();
    let message = '';

    switch (type) {
      case 'NAVIGATE':
        message = `Navigating to ${action.url}`;
        break;
      case 'CLICK':
        message = `Clicking ${action.selector}`;
        break;
      case 'TYPE':
        message = `Typing into ${action.label || 'field'}`;
        break;
      case 'SUBMIT_FORM':
        message = 'Submitting form';
        break;
      default:
        message = `Performing ${type}`;
    }

    if (result && result.error) {
      message += `. Error: ${result.error}`;
    } else if (result && result.success) {
      message += '. Done.';
    }

    await this.speak(message, { rate: 1.2 });
    return message;
  }

  /**
   * Voice-guided form filling
   */
  async guideFormFilling(form, onInput) {
    for (const input of form.inputs || []) {
      const label = input.label || input.name || 'field';
      await this.speak(`Please provide ${label}`);
      
      const value = await this.startListening();
      if (onInput) {
        onInput({ input, value });
      }
    }
  }
}

// Agent function for integration with orchestrator
async function voiceAgent(state, options = {}) {
  const agent = new VoiceAgent();
  
  if (!agent.voiceEnabled) {
    try {
      await agent.initialize();
    } catch (err) {
      return {
        ...state,
        voiceError: err.message,
        voiceEnabled: false,
      };
    }
  }

  // If voice input is requested
  if (options.listenForInput) {
    const transcript = await agent.startListening();
    const command = agent.parseCommand(transcript);
    
    return {
      ...state,
      voiceInput: transcript,
      voiceCommand: command,
      voiceEnabled: true,
    };
  }

  // If narration is requested
  if (options.narratePage && state.pageData) {
    const narration = await agent.narratePage(state.pageData, options);
    
    return {
      ...state,
      narration,
      voiceEnabled: true,
    };
  }

  return {
    ...state,
    voiceEnabled: true,
  };
}


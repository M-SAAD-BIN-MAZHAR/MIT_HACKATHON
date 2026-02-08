/**
 * Memory Agent — Maintains context across sessions, learns user preferences.
 * Stores: browsing history, preferences, past actions, successful workflows.
 * Privacy-first: all data stored locally, user controls retention.
 */

const MEMORY_PROMPT = `You are a memory and context agent. You maintain user preferences, browsing history, and learned patterns.

Given a user goal and current context, retrieve relevant memories and preferences.

Respond ONLY with valid JSON:
{
  "relevant_memories": [
    {"type": "preference", "key": "budget", "value": "under $300", "confidence": 0.9},
    {"type": "history", "action": "booked flight to NYC", "timestamp": "2024-01-15", "outcome": "success"},
    {"type": "pattern", "workflow": "flight search", "steps": ["google flights", "kayak", "compare"], "success_rate": 0.85}
  ],
  "user_profile": {
    "preferences": {"budget_conscious": true, "prefers_direct_flights": true},
    "constraints": {"max_budget": 300, "preferred_airlines": ["Delta", "JetBlue"]},
    "accessibility": {"screen_reader": false, "high_contrast": false, "voice_preferred": false}
  },
  "suggestions": ["Check Google Flights first", "Filter by direct flights", "Set price alert"]
}`;

class MemoryAgent {
  constructor() {
    this.storageKey = 'uwa_memory';
    this.maxMemories = 1000;
    this.retentionDays = 90;
  }

  /**
   * Store a memory
   */
  async store(memory) {
    const data = await this.loadMemories();
    const entry = {
      ...memory,
      id: this.generateId(),
      timestamp: Date.now(),
      expires: Date.now() + (this.retentionDays * 24 * 60 * 60 * 1000),
    };

    data.memories.push(entry);
    
    // Cleanup old memories
    data.memories = data.memories.filter((m) => m.expires > Date.now());
    
    // Keep only recent memories if exceeding limit
    if (data.memories.length > this.maxMemories) {
      data.memories.sort((a, b) => b.timestamp - a.timestamp);
      data.memories = data.memories.slice(0, this.maxMemories);
    }

    await this.saveMemories(data);
    return entry;
  }

  /**
   * Retrieve memories relevant to current context
   */
  async retrieve(context, callLLM) {
    const data = await this.loadMemories();
    
    // Filter memories by relevance
    const relevant = data.memories.filter((m) => {
      if (m.expires < Date.now()) return false;
      if (context.url && m.url && this.isSameDomain(context.url, m.url)) return true;
      if (context.goal && m.goal && this.isSimilarGoal(context.goal, m.goal)) return true;
      return false;
    });

    // Use LLM to rank and structure memories
    if (callLLM && relevant.length > 0) {
      const messages = [
        { role: 'system', content: MEMORY_PROMPT },
        {
          role: 'user',
          content: `Current goal: ${context.goal || 'unknown'}\nCurrent URL: ${context.url || 'unknown'}\nAvailable memories:\n${JSON.stringify(relevant.slice(0, 20), null, 2)}`,
        },
      ];

      try {
        const response = await callLLM(messages);
        const parsed = await this.parseJsonFromResponse(response);
        return parsed;
      } catch (err) {
        console.warn('Failed to process memories with LLM:', err);
      }
    }

    return {
      relevant_memories: relevant.slice(0, 10),
      user_profile: data.profile || {},
      suggestions: [],
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    const data = await this.loadMemories();
    data.profile = {
      ...data.profile,
      ...updates,
      updated: Date.now(),
    };
    await this.saveMemories(data);
    return data.profile;
  }

  /**
   * Learn from successful workflow
   */
  async learnWorkflow(workflow) {
    const memory = {
      type: 'workflow',
      goal: workflow.goal,
      steps: workflow.steps,
      outcome: workflow.outcome,
      duration: workflow.duration,
      success: workflow.success,
      url: workflow.url,
    };
    return await this.store(memory);
  }

  /**
   * Learn from user preference
   */
  async learnPreference(key, value, context = {}) {
    const memory = {
      type: 'preference',
      key,
      value,
      context,
      confidence: 1.0,
    };
    return await this.store(memory);
  }

  /**
   * Get user preferences
   */
  async getPreferences() {
    const data = await this.loadMemories();
    const prefs = data.memories.filter((m) => m.type === 'preference');
    
    // Aggregate preferences by key
    const aggregated = {};
    prefs.forEach((p) => {
      if (!aggregated[p.key]) {
        aggregated[p.key] = { value: p.value, confidence: p.confidence, count: 1 };
      } else {
        // Update confidence based on frequency
        aggregated[p.key].count++;
        aggregated[p.key].confidence = Math.min(1.0, aggregated[p.key].confidence + 0.1);
      }
    });

    return aggregated;
  }

  /**
   * Clear all memories (privacy control)
   */
  async clearAll() {
    await chrome.storage.local.set({
      [this.storageKey]: {
        memories: [],
        profile: {},
        version: 1,
      },
    });
  }

  /**
   * Clear memories older than N days
   */
  async clearOld(days = 30) {
    const data = await this.loadMemories();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    data.memories = data.memories.filter((m) => m.timestamp > cutoff);
    await this.saveMemories(data);
    return data.memories.length;
  }

  /**
   * Export memories (for user backup)
   */
  async export() {
    const data = await this.loadMemories();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import memories (from backup)
   */
  async import(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      const data = await this.loadMemories();
      
      // Merge memories, avoiding duplicates
      const existingIds = new Set(data.memories.map((m) => m.id));
      const newMemories = imported.memories.filter((m) => !existingIds.has(m.id));
      
      data.memories = [...data.memories, ...newMemories];
      data.profile = { ...data.profile, ...imported.profile };
      
      await this.saveMemories(data);
      return { imported: newMemories.length };
    } catch (err) {
      throw new Error(`Import failed: ${err.message}`);
    }
  }

  // Helper methods

  async loadMemories() {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey] || {
      memories: [],
      profile: {},
      version: 1,
    };
  }

  async saveMemories(data) {
    await chrome.storage.local.set({ [this.storageKey]: data });
  }

  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isSameDomain(url1, url2) {
    try {
      const d1 = new URL(url1).hostname.replace(/^www\./, '');
      const d2 = new URL(url2).hostname.replace(/^www\./, '');
      return d1 === d2;
    } catch (_) {
      return false;
    }
  }

  isSimilarGoal(goal1, goal2) {
    const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const g1 = normalize(goal1);
    const g2 = normalize(goal2);
    
    // Simple similarity: check if one contains the other or share significant words
    if (g1.includes(g2) || g2.includes(g1)) return true;
    
    const words1 = new Set(g1.split(/\s+/).filter((w) => w.length > 3));
    const words2 = new Set(g2.split(/\s+/).filter((w) => w.length > 3));
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    
    return intersection.size >= 2;
  }

  async parseJsonFromResponse(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { relevant_memories: [], user_profile: {}, suggestions: [] };
    return JSON.parse(match[0]);
  }
}

// Agent function for integration with orchestrator
async function memoryAgent(state, callLLM) {
  const agent = new MemoryAgent();
  
  const context = {
    goal: state.userGoal,
    url: state.currentUrl,
    taskId: state.taskId,
  };

  const memories = await agent.retrieve(context, callLLM);
  
  return {
    ...state,
    memories: memories.relevant_memories || [],
    userProfile: memories.user_profile || {},
    memorySuggestions: memories.suggestions || [],
  };
}


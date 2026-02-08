/**
 * Capability Tier Manager
 * Enforces graduated capability tiers for the Web Agent API.
 * 
 * Tier 1: Core AI & Tooling (LLM access, MCP tools, no browser authority)
 * Tier 2: Browser Context (read page, navigate, limited interaction)
 * Tier 3: Full Automation (forms, multi-tab, cross-site workflows)
 */

const TIERS = {
  TIER_1: {
    level: 1,
    name: 'Core AI & Tooling',
    description: 'LLM access and MCP tool calling without browser authority',
    capabilities: [
      'llm_access',
      'mcp_tools',
      'structured_output',
      'text_generation',
    ],
    permissions: [],
    restrictions: {
      no_dom_access: true,
      no_navigation: true,
      no_user_data: true,
    },
  },
  TIER_2: {
    level: 2,
    name: 'Browser Context',
    description: 'Read page content and navigate, limited interaction',
    capabilities: [
      'llm_access',
      'mcp_tools',
      'read_page',
      'navigate',
      'extract_data',
      'search',
    ],
    permissions: ['READ_PAGE', 'NAVIGATE'],
    restrictions: {
      read_only: true,
      no_form_submission: true,
      no_cross_site: true,
    },
  },
  TIER_3: {
    level: 3,
    name: 'Full Automation',
    description: 'Complete browser automation with multi-site coordination',
    capabilities: [
      'llm_access',
      'mcp_tools',
      'read_page',
      'navigate',
      'fill_forms',
      'submit_forms',
      'multi_tab',
      'cross_site',
      'memory_access',
      'voice_interface',
    ],
    permissions: ['READ_PAGE', 'NAVIGATE', 'FILL_FORM', 'SUBMIT_ACTION', 'OPEN_TAB', 'ACCESS_MEMORY'],
    restrictions: {},
  },
};

class TierManager {
  constructor() {
    this.currentTier = TIERS.TIER_3; // Default to Tier 3 for full automation
    this.tierHistory = [];
  }

  /**
   * Set the current capability tier
   */
  async setTier(tierLevel) {
    const tier = Object.values(TIERS).find((t) => t.level === tierLevel);
    if (!tier) {
      throw new Error(`Invalid tier level: ${tierLevel}`);
    }

    // Log tier change
    this.tierHistory.push({
      from: this.currentTier.level,
      to: tier.level,
      timestamp: Date.now(),
    });

    this.currentTier = tier;
    
    // Persist tier preference
    await chrome.storage.local.set({ uwa_capability_tier: tierLevel });
    
    return tier;
  }

  /**
   * Get current tier
   */
  getTier() {
    return this.currentTier;
  }

  /**
   * Check if a capability is allowed in current tier
   */
  isCapabilityAllowed(capability) {
    return this.currentTier.capabilities.includes(capability);
  }

  /**
   * Check if a permission is required for current tier
   */
  isPermissionRequired(permission) {
    return this.currentTier.permissions.includes(permission);
  }

  /**
   * Check if an action is allowed in current tier
   */
  async checkAction(action, context = {}) {
    const type = (action.type || '').toUpperCase();
    
    // Tier 1: No browser actions allowed
    if (this.currentTier.level === 1) {
      if (['NAVIGATE', 'CLICK', 'TYPE', 'SUBMIT_FORM'].includes(type)) {
        return {
          allowed: false,
          reason: 'Browser actions not allowed in Tier 1',
          requiredTier: 2,
        };
      }
    }

    // Tier 2: Read-only, no form submission
    if (this.currentTier.level === 2) {
      if (['TYPE', 'SUBMIT_FORM'].includes(type)) {
        return {
          allowed: false,
          reason: 'Form interaction not allowed in Tier 2',
          requiredTier: 3,
        };
      }
    }

    // Check restrictions
    if (this.currentTier.restrictions.read_only && ['TYPE', 'SUBMIT_FORM'].includes(type)) {
      return {
        allowed: false,
        reason: 'Read-only mode active',
        requiredTier: 3,
      };
    }

    if (this.currentTier.restrictions.no_cross_site && context.crossSite) {
      return {
        allowed: false,
        reason: 'Cross-site workflows not allowed in current tier',
        requiredTier: 3,
      };
    }

    return { allowed: true };
  }

  /**
   * Request tier upgrade
   */
  async requestTierUpgrade(requiredTier, reason) {
    // Notify user that tier upgrade is needed
    const notification = {
      type: 'tier_upgrade_request',
      currentTier: this.currentTier.level,
      requiredTier,
      reason,
      timestamp: Date.now(),
    };

    // Broadcast to UI
    chrome.runtime.sendMessage({
      type: 'TIER_UPGRADE_REQUEST',
      ...notification,
    }).catch(() => {});

    // Wait for user response
    return new Promise((resolve) => {
      const listener = (msg) => {
        if (msg.type === 'TIER_UPGRADE_RESPONSE') {
          chrome.runtime.onMessage.removeListener(listener);
          if (msg.approved) {
            this.setTier(requiredTier).then(() => resolve(true));
          } else {
            resolve(false);
          }
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });
  }

  /**
   * Get tier recommendations based on user goal
   */
  async recommendTier(userGoal, callLLM) {
    const prompt = `Analyze this user goal and recommend the minimum capability tier needed.

Tier 1: LLM access and MCP tools only (no browser interaction)
Tier 2: Read page content and navigate (no form submission)
Tier 3: Full automation including forms and cross-site workflows

User goal: ${userGoal}

Respond with JSON:
{
  "recommended_tier": 1|2|3,
  "reason": "explanation",
  "required_capabilities": ["capability1", "capability2"],
  "risks": ["potential risk 1", "risk 2"]
}`;

    try {
      const response = await callLLM([
        { role: 'system', content: 'You are a capability tier advisor.' },
        { role: 'user', content: prompt },
      ]);

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (err) {
      console.warn('Failed to get tier recommendation:', err);
    }

    // Default: recommend Tier 2 for most tasks
    return {
      recommended_tier: 2,
      reason: 'Default recommendation for general browsing tasks',
      required_capabilities: ['read_page', 'navigate'],
      risks: [],
    };
  }

  /**
   * Get tier statistics
   */
  async getStatistics() {
    const data = await chrome.storage.local.get('uwa_tier_stats');
    const stats = data.uwa_tier_stats || {
      tier1_usage: 0,
      tier2_usage: 0,
      tier3_usage: 0,
      upgrades_requested: 0,
      upgrades_approved: 0,
    };

    return stats;
  }

  /**
   * Log tier usage
   */
  async logUsage() {
    const data = await chrome.storage.local.get('uwa_tier_stats');
    const stats = data.uwa_tier_stats || {
      tier1_usage: 0,
      tier2_usage: 0,
      tier3_usage: 0,
      upgrades_requested: 0,
      upgrades_approved: 0,
    };

    const key = `tier${this.currentTier.level}_usage`;
    stats[key] = (stats[key] || 0) + 1;

    await chrome.storage.local.set({ uwa_tier_stats: stats });
  }

  /**
   * Export tier configuration
   */
  exportConfig() {
    return {
      currentTier: this.currentTier,
      history: this.tierHistory,
      tiers: TIERS,
    };
  }
}

// Global tier manager instance
const tierManager = new TierManager();

// Initialize from storage
chrome.storage.local.get('uwa_capability_tier').then((data) => {
  if (data.uwa_capability_tier) {
    tierManager.setTier(data.uwa_capability_tier);
  }
});


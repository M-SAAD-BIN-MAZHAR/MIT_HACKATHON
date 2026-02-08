# Web Agent API - Developer Documentation

## 🚀 Getting Started

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/web-agent-api.git
cd web-agent-api

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select project folder
```

### Basic Usage

```javascript
// Start a session
chrome.runtime.sendMessage({
  type: 'START_SESSION',
  userGoal: 'Search for laptops under $1000'
}, (response) => {
  if (response.ok) {
    console.log('Session completed:', response.state);
  }
});
```

---

## 📡 Message API

### Background Messages

#### START_SESSION
Start an agent session with a user goal.

```javascript
chrome.runtime.sendMessage({
  type: 'START_SESSION',
  userGoal: string,           // Required: User's goal
  context?: {                 // Optional: Additional context
    budget?: number,
    preferences?: object,
    memory?: boolean
  }
}, (response) => {
  // response: { ok: boolean, state?: object, error?: string }
});
```

#### START_VOICE_SESSION
Start a voice-controlled session.

```javascript
chrome.runtime.sendMessage({
  type: 'START_VOICE_SESSION'
}, (response) => {
  // response: { ok: boolean, message?: string }
});
```

#### PAUSE_SESSION
Pause the current session.

```javascript
chrome.runtime.sendMessage({
  type: 'PAUSE_SESSION'
}, (response) => {
  // response: { ok: boolean }
});
```

#### STOP_SESSION
Stop the current session.

```javascript
chrome.runtime.sendMessage({
  type: 'STOP_SESSION'
}, (response) => {
  // response: { ok: boolean }
});
```

#### APPROVE_ACTION
Approve a pending action.

```javascript
chrome.runtime.sendMessage({
  type: 'APPROVE_ACTION'
}, (response) => {
  // response: { ok: boolean }
});
```

#### DENY_ACTION
Deny a pending action.

```javascript
chrome.runtime.sendMessage({
  type: 'DENY_ACTION'
}, (response) => {
  // response: { ok: boolean }
});
```

---

## 🔌 MCP Integration API

### Register MCP Server

```javascript
chrome.runtime.sendMessage({
  type: 'MCP_REGISTER_SERVER',
  name: string,               // Server identifier
  config: {
    transport: 'http' | 'websocket',
    url: string,              // Server endpoint
    auth?: {                  // Optional authentication
      type: 'bearer' | 'basic',
      token?: string,
      username?: string,
      password?: string
    }
  }
}, (response) => {
  // response: { success: boolean, server?: string, error?: string }
});
```

### Call MCP Tool

```javascript
chrome.runtime.sendMessage({
  type: 'MCP_CALL_TOOL',
  toolName: string,           // Format: "server:tool"
  params: object,             // Tool parameters
  context: {
    taskId?: string,
    url?: string,
    user?: string
  }
}, (response) => {
  // response: { ok: boolean, result?: any, error?: string }
});
```

### Example: Weather MCP

```javascript
// Register weather server
await chrome.runtime.sendMessage({
  type: 'MCP_REGISTER_SERVER',
  name: 'weather-mcp',
  config: {
    transport: 'http',
    url: 'http://localhost:3000/mcp'
  }
});

// Call weather tool
const result = await chrome.runtime.sendMessage({
  type: 'MCP_CALL_TOOL',
  toolName: 'weather-mcp:get_weather',
  params: {
    location: 'New York',
    units: 'imperial'
  },
  context: {
    taskId: 'task_123'
  }
});

console.log('Weather:', result.result);
```

---

## 🧠 Memory API

### Memory Agent Class

```javascript
class MemoryAgent {
  // Store a memory
  async store(memory: {
    type: 'preference' | 'workflow' | 'history',
    key?: string,
    value?: any,
    goal?: string,
    url?: string,
    ...
  }): Promise<Memory>

  // Retrieve relevant memories
  async retrieve(context: {
    goal?: string,
    url?: string,
    taskId?: string
  }, callLLM?: Function): Promise<{
    relevant_memories: Memory[],
    user_profile: object,
    suggestions: string[]
  }>

  // Update user profile
  async updateProfile(updates: object): Promise<object>

  // Learn from workflow
  async learnWorkflow(workflow: {
    goal: string,
    steps: Action[],
    outcome: string,
    duration: number,
    success: boolean,
    url: string
  }): Promise<Memory>

  // Learn preference
  async learnPreference(
    key: string,
    value: any,
    context?: object
  ): Promise<Memory>

  // Get preferences
  async getPreferences(): Promise<object>

  // Clear all memories
  async clearAll(): Promise<void>

  // Clear old memories
  async clearOld(days: number): Promise<number>

  // Export memories
  async export(): Promise<string>

  // Import memories
  async import(jsonData: string): Promise<{ imported: number }>
}
```

### Example: Store Preference

```javascript
const memoryAgent = new MemoryAgent();

// Store budget preference
await memoryAgent.learnPreference('budget', 1000, {
  category: 'electronics',
  url: 'https://amazon.com'
});

// Retrieve preferences
const prefs = await memoryAgent.getPreferences();
console.log('Budget:', prefs.budget.value); // 1000
```

---

## 🎤 Voice API

### Voice Agent Class

```javascript
class VoiceAgent {
  // Initialize voice recognition
  async initialize(): Promise<{ success: boolean }>

  // Start listening
  async startListening(
    onResult?: (result: { transcript: string, isFinal: boolean }) => void,
    onError?: (error: string) => void
  ): Promise<string>

  // Stop listening
  stopListening(): void

  // Speak text
  async speak(text: string, options?: {
    rate?: number,      // 0.1 - 10, default 1.0
    pitch?: number,     // 0 - 2, default 1.0
    volume?: number,    // 0 - 1, default 1.0
    lang?: string,      // default 'en-US'
    voice?: string      // Voice name
  }): Promise<void>

  // Stop speaking
  stopSpeaking(): void

  // Get available voices
  getVoices(): SpeechSynthesisVoice[]

  // Parse voice command
  parseCommand(transcript: string): {
    type: 'navigate' | 'search' | 'click' | 'read' | 'stop' | 'pause' | 'resume' | 'goal',
    target?: string,
    query?: string,
    text?: string
  }

  // Narrate page
  async narratePage(pageData: object, options?: {
    detailed?: boolean,
    rate?: number
  }): Promise<string>

  // Narrate action
  async narrateAction(action: Action, result: any): Promise<string>
}
```

### Example: Voice Control

```javascript
const voiceAgent = new VoiceAgent();

// Initialize
await voiceAgent.initialize();

// Listen for command
const transcript = await voiceAgent.startListening(
  (result) => {
    console.log('Heard:', result.transcript);
  }
);

// Parse command
const command = voiceAgent.parseCommand(transcript);
// { type: 'search', query: 'laptops under $1000' }

// Speak response
await voiceAgent.speak('Searching for laptops under $1000');
```

---

## 🎚️ Capability Tier API

### Tier Manager Class

```javascript
class TierManager {
  // Set capability tier
  async setTier(tierLevel: 1 | 2 | 3): Promise<Tier>

  // Get current tier
  getTier(): Tier

  // Check if capability is allowed
  isCapabilityAllowed(capability: string): boolean

  // Check if permission is required
  isPermissionRequired(permission: string): boolean

  // Check if action is allowed
  async checkAction(action: Action, context?: object): Promise<{
    allowed: boolean,
    reason?: string,
    requiredTier?: number
  }>

  // Request tier upgrade
  async requestTierUpgrade(
    requiredTier: number,
    reason: string
  ): Promise<boolean>

  // Get tier recommendation
  async recommendTier(
    userGoal: string,
    callLLM: Function
  ): Promise<{
    recommended_tier: number,
    reason: string,
    required_capabilities: string[],
    risks: string[]
  }>

  // Get statistics
  async getStatistics(): Promise<object>

  // Log usage
  async logUsage(): Promise<void>
}
```

### Example: Tier Management

```javascript
const tierManager = new TierManager();

// Get current tier
const tier = tierManager.getTier();
console.log('Current tier:', tier.level); // 2

// Check if action is allowed
const check = await tierManager.checkAction({
  type: 'SUBMIT_FORM',
  selector: 'form#login'
});

if (!check.allowed) {
  // Request upgrade
  const upgraded = await tierManager.requestTierUpgrade(
    check.requiredTier,
    'Form submission requires Tier 3'
  );
  
  if (upgraded) {
    // Proceed with action
  }
}
```

---

## 🔐 Permission API

### Permission Manager Functions

```javascript
// Check permission
async function checkPermission(
  type: 'READ_PAGE' | 'NAVIGATE' | 'FILL_FORM' | 'SUBMIT_ACTION' | 'OPEN_TAB' | 'ACCESS_MEMORY' | 'CROSS_SITE',
  context?: {
    url?: string,
    taskId?: string,
    tool?: string
  }
): Promise<{
  allowed: boolean | null,
  reason: string,
  requiresApproval?: boolean
}>

// Grant permission
async function grantPermission(
  type: string,
  context: object,
  mode: 'once' | 'task' | 'session' | 'always'
): Promise<{ allowed: boolean }>

// Deny permission
async function denyPermission(
  type: string,
  context: object
): Promise<{ allowed: boolean }>

// Revoke permission
async function revokePermission(
  type: string,
  context: object
): Promise<{ revoked: boolean }>

// Expire task permissions
async function expireTaskPermissions(
  taskId: string
): Promise<void>
```

### Example: Permission Check

```javascript
// Check if form filling is allowed
const check = await checkPermission('FILL_FORM', {
  url: 'https://example.com',
  taskId: 'task_123'
});

if (check.requiresApproval) {
  // Request user approval
  const approved = await requestUserApproval('FILL_FORM');
  
  if (approved) {
    await grantPermission('FILL_FORM', {
      url: 'https://example.com',
      taskId: 'task_123'
    }, 'task'); // Grant for this task only
  }
}
```

---

## 🤖 Agent API

### Agent Interface

```javascript
interface Agent {
  name: string;
  role: string;
  
  execute(
    state: State,
    callLLM: Function,
    ...args: any[]
  ): Promise<State>;
}
```

### Built-in Agents

#### Decision Agent
Plans workflows and reasons about goals.

```javascript
async function decisionAgent(
  state: State,
  callLLM: Function
): Promise<State>
```

#### Navigator Agent
Handles navigation and URL decisions.

```javascript
async function navigatorAgent(
  state: State,
  callLLM: Function
): Promise<State>
```

#### Reader Agent
Extracts and structures page content.

```javascript
async function readerAgent(
  state: State,
  callLLM: Function
): Promise<State>
```

#### Executor Agent
Performs browser actions.

```javascript
async function executorAgent(
  state: State,
  sendToContent: Function
): Promise<State>
```

#### Retry Agent
Recovers from action failures.

```javascript
async function retryAgent(
  failedAction: Action,
  errorMsg: string,
  state: State,
  callLLM: Function
): Promise<Action | null>
```

#### Memory Agent
Maintains context across sessions.

```javascript
async function memoryAgent(
  state: State,
  callLLM: Function
): Promise<State>
```

#### Voice Agent
Natural language interface.

```javascript
async function voiceAgent(
  state: State,
  options?: {
    listenForInput?: boolean,
    narratePage?: boolean
  }
): Promise<State>
```

---

## 📊 State Object

### State Structure

```typescript
interface State {
  // Core
  userGoal: string;
  currentUrl: string;
  tabId: number;
  taskId: string;
  
  // Control
  paused: boolean;
  stopped: boolean;
  
  // Page Data
  domSnapshot: string;
  pageData: {
    buttons: Button[];
    forms: Form[];
    links: Link[];
    inputs: Input[];
    important_text: string[];
    full_text: string;
  };
  
  // Planning
  actions: Action[];
  requiredPermissions: string[];
  
  // Memory
  memories: Memory[];
  userProfile: object;
  memorySuggestions: string[];
  
  // Results
  executionResults: Result[];
  
  // Voice
  voiceInput?: string;
  voiceCommand?: object;
  voiceEnabled?: boolean;
  narration?: string;
}
```

---

## 🎨 Content Script API

### DOM Extraction

```javascript
// Get DOM snapshot
chrome.tabs.sendMessage(tabId, {
  type: 'GET_DOM_SNAPSHOT',
  waitForJs: boolean  // Wait for JS rendering
}, (response) => {
  // response: { ok: boolean, data: PageData }
});
```

### Action Execution

```javascript
// Execute action
chrome.tabs.sendMessage(tabId, {
  type: 'EXECUTE_ACTION',
  action: {
    type: 'CLICK' | 'TYPE' | 'SUBMIT_FORM' | 'NAVIGATE',
    selector?: string,
    value?: string,
    url?: string
  }
}, (response) => {
  // response: { ok: boolean, result?: any, error?: string }
});
```

### Voice Interface

```javascript
// Show voice overlay
chrome.tabs.sendMessage(tabId, {
  type: 'SHOW_VOICE_OVERLAY'
});

// Speak text
chrome.tabs.sendMessage(tabId, {
  type: 'SPEAK_TEXT',
  text: string,
  options?: {
    rate?: number,
    pitch?: number,
    volume?: number
  }
});

// Narrate page
chrome.tabs.sendMessage(tabId, {
  type: 'NARRATE_PAGE'
});
```

---

## 🔧 Configuration

### Storage Keys

```javascript
// LLM Configuration
'llm_api_key': string
'llm_api_url': string
'llm_model': string

// Features
'uwa_capability_tier': 1 | 2 | 3
'uwa_trust_mode': boolean
'uwa_auto_fill_forms': boolean
'uwa_voice_enabled': boolean
'uwa_memory_enabled': boolean

// User Data
'uwa_user_profile': {
  name: string,
  email: string,
  phone: string
}

// Memory
'uwa_memory': {
  memories: Memory[],
  profile: object,
  version: number
}

// Audit
'mcp_audit_log': AuditEntry[]

// Statistics
'uwa_tier_stats': {
  tier1_usage: number,
  tier2_usage: number,
  tier3_usage: number,
  upgrades_requested: number,
  upgrades_approved: number
}
```

---

## 📚 TypeScript Definitions

```typescript
// Action types
type ActionType = 'NAVIGATE' | 'CLICK' | 'TYPE' | 'SUBMIT_FORM' | 'READ_PAGE';

interface Action {
  type: ActionType;
  selector?: string;
  value?: string;
  url?: string;
  label?: string;
  name?: string;
}

// Memory types
interface Memory {
  id: string;
  type: 'preference' | 'workflow' | 'history';
  timestamp: number;
  expires: number;
  [key: string]: any;
}

// Tier types
interface Tier {
  level: 1 | 2 | 3;
  name: string;
  description: string;
  capabilities: string[];
  permissions: string[];
  restrictions: object;
}

// Page data types
interface PageData {
  url: string;
  title: string;
  buttons: Button[];
  links: Link[];
  forms: Form[];
  inputs: Input[];
  important_text: string[];
  full_text: string;
  html: string;
}
```

---

## 🚨 Error Handling

### Error Types

```javascript
// LLM Errors
'LLM API key not set'
'LLM error: 401' // Authentication failed
'Empty LLM response'

// Permission Errors
'Permission denied: FILL_FORM'
'User denied'

// Action Errors
'Selector not found: button.submit'
'Action failed'
'Form not found'

// MCP Errors
'Tool not found: weather-mcp:get_weather'
'Server not connected: weather-mcp'
'Tool call failed: 500'
```

### Error Handling Example

```javascript
try {
  const response = await chrome.runtime.sendMessage({
    type: 'START_SESSION',
    userGoal: 'Search for laptops'
  });
  
  if (!response.ok) {
    throw new Error(response.error);
  }
} catch (err) {
  if (err.message.includes('API key')) {
    // Prompt user to set API key
    openSettings();
  } else if (err.message.includes('Permission denied')) {
    // Request permission
    requestPermission();
  } else {
    // Generic error handling
    console.error('Session failed:', err);
  }
}
```

---

**For more examples, see [examples/use-cases.md](../examples/use-cases.md)**

# Testing Guide - Web Agent API

## 🧪 Testing Strategy

### Test Levels

1. **Unit Tests**: Individual agent functions
2. **Integration Tests**: Agent coordination
3. **End-to-End Tests**: Complete workflows
4. **Manual Tests**: User experience validation

---

## 🔬 Manual Testing Checklist

### Basic Functionality

#### ✅ Extension Installation
- [ ] Load unpacked extension
- [ ] Extension icon appears in toolbar
- [ ] Side panel opens on click
- [ ] No console errors

#### ✅ Configuration
- [ ] Enter API key
- [ ] Save settings
- [ ] Settings persist after reload
- [ ] Invalid API key shows error

#### ✅ Basic Session
- [ ] Enter goal: "Search for laptops"
- [ ] Click "Start AI"
- [ ] Agent activates (purple bar)
- [ ] Actions appear in feed
- [ ] Session completes successfully

---

### Tier System Testing

#### Tier 1: Core AI & Tooling
```
Test Goal: "Summarize this page"
Expected: 
- ✅ LLM generates summary
- ✅ No browser actions
- ✅ No permission requests
```

#### Tier 2: Browser Context
```
Test Goal: "Find the refund policy"
Expected:
- ✅ Reads page content
- ✅ Navigates to policy page
- ✅ No form interactions
- ✅ READ_PAGE auto-granted
- ✅ NAVIGATE asks once
```

#### Tier 3: Full Automation
```
Test Goal: "Fill out this form with my profile"
Expected:
- ✅ Requests FILL_FORM permission
- ✅ Auto-fills from profile
- ✅ Requests SUBMIT_ACTION permission
- ✅ Submits only after approval
```

---

### Permission System Testing

#### Permission Types

**READ_PAGE (Auto-granted)**
```
Test: Navigate to any page
Expected: ✅ No permission request
```

**NAVIGATE (Ask once per domain)**
```
Test: "Go to Amazon"
Expected:
- ✅ First time: Permission request
- ✅ Second time: Auto-granted
- ✅ Different domain: New request
```

**FILL_FORM (Confirm per form)**
```
Test: "Fill out login form"
Expected:
- ✅ Permission request shown
- ✅ Form preview displayed
- ✅ User can approve/deny
- ✅ Denied: Form not filled
```

**SUBMIT_ACTION (Always confirm)**
```
Test: "Submit this form"
Expected:
- ✅ Always requests permission
- ✅ Never auto-granted
- ✅ Shows action preview
```

#### Grant Modes

**Once**
```
Test: Grant NAVIGATE once
Expected:
- ✅ Works for single navigation
- ✅ Next navigation requests again
```

**Task**
```
Test: Grant FILL_FORM for task
Expected:
- ✅ Works for all forms in task
- ✅ Expires when task completes
- ✅ New task requests again
```

**Session**
```
Test: Grant OPEN_TAB for session
Expected:
- ✅ Works until browser close
- ✅ Persists across tasks
- ✅ Cleared on browser restart
```

**Always**
```
Test: Grant READ_PAGE always
Expected:
- ✅ Never asks again
- ✅ Persists across sessions
- ✅ User can revoke in settings
```

---

### Memory System Testing

#### Store Preference
```javascript
// Test code
const memoryAgent = new MemoryAgent();
await memoryAgent.learnPreference('budget', 1000);

// Verify
const prefs = await memoryAgent.getPreferences();
console.assert(prefs.budget.value === 1000);
```

#### Retrieve Memories
```javascript
// Store workflow
await memoryAgent.learnWorkflow({
  goal: 'book flight',
  steps: [...],
  success: true
});

// Retrieve
const memories = await memoryAgent.retrieve({
  goal: 'book flight'
});

console.assert(memories.relevant_memories.length > 0);
```

#### Clear Old Memories
```javascript
// Clear memories older than 30 days
const count = await memoryAgent.clearOld(30);
console.log('Cleared:', count);
```

---

### Voice Interface Testing

#### Voice Activation
```
Test: Press Ctrl+Shift+V
Expected:
- ✅ Voice overlay appears
- ✅ Microphone icon shows
- ✅ Status: "Ready"
```

#### Voice Commands
```
Test: Say "Search for laptops"
Expected:
- ✅ Transcript appears
- ✅ Command parsed correctly
- ✅ Agent starts session
- ✅ Voice feedback: "Searching..."
```

#### Page Narration
```
Test: Say "Read this page"
Expected:
- ✅ Page title spoken
- ✅ Main sections listed
- ✅ Available actions described
- ✅ Clear, understandable speech
```

---

### MCP Integration Testing

#### Register Server
```javascript
// Test code
const result = await chrome.runtime.sendMessage({
  type: 'MCP_REGISTER_SERVER',
  name: 'test-mcp',
  config: {
    transport: 'http',
    url: 'http://localhost:3000/mcp'
  }
});

console.assert(result.success === true);
```

#### Call Tool
```javascript
// Test code
const result = await chrome.runtime.sendMessage({
  type: 'MCP_CALL_TOOL',
  toolName: 'test-mcp:echo',
  params: { message: 'hello' },
  context: { taskId: 'test_123' }
});

console.assert(result.ok === true);
console.assert(result.result.message === 'hello');
```

#### Permission Check
```javascript
// Tool with 'write' capability should require SUBMIT_ACTION
const result = await chrome.runtime.sendMessage({
  type: 'MCP_CALL_TOOL',
  toolName: 'test-mcp:write_data',
  params: { data: 'test' },
  context: { taskId: 'test_123' }
});

// Should request permission first
console.assert(result.error.includes('Permission denied'));
```

---

### Cross-Site Workflow Testing

#### Multi-Tab Coordination
```
Test Goal: "Compare prices on Amazon and Best Buy"
Expected:
- ✅ Opens Amazon in current tab
- ✅ Searches for product
- ✅ Extracts price
- ✅ Requests OPEN_TAB permission
- ✅ Opens Best Buy in new tab
- ✅ Searches for same product
- ✅ Extracts price
- ✅ Compares and reports
```

#### Context Sharing
```
Test Goal: "Find flights and check my calendar"
Expected:
- ✅ Searches flights
- ✅ Opens calendar in new tab
- ✅ Shares flight dates with calendar
- ✅ Checks availability
- ✅ Returns to flights with results
```

---

### Error Handling Testing

#### Selector Not Found
```
Test: Action with invalid selector
Expected:
- ✅ Error logged
- ✅ Retry agent activated
- ✅ Alternative selector tried
- ✅ Max retries: 5
- ✅ Graceful failure message
```

#### LLM Error
```
Test: Invalid API key
Expected:
- ✅ Clear error message
- ✅ Prompt to check settings
- ✅ No infinite retries
- ✅ Session stops cleanly
```

#### Permission Denied
```
Test: User denies FILL_FORM
Expected:
- ✅ Form not filled
- ✅ Session continues
- ✅ Alternative path offered
- ✅ No error thrown
```

#### Network Error
```
Test: Disconnect internet during session
Expected:
- ✅ Error caught
- ✅ User notified
- ✅ Session paused
- ✅ Retry option offered
```

---

## 🎯 Test Scenarios

### Scenario 1: E-commerce Shopping

**Goal**: "Find wireless mouse under $30 on Amazon"

**Steps**:
1. Start session
2. Navigate to Amazon
3. Search for "wireless mouse"
4. Apply price filter
5. Sort by rating
6. Select top result
7. Add to cart

**Validation**:
- ✅ All steps complete
- ✅ Correct product selected
- ✅ Price under $30
- ✅ Added to cart successfully
- ✅ 2-3 permission requests max

---

### Scenario 2: Research Task

**Goal**: "Compare iPhone 15 specs on Apple and GSMArena"

**Steps**:
1. Navigate to Apple.com
2. Find iPhone 15 page
3. Extract specs
4. Open GSMArena in new tab
5. Search for iPhone 15
6. Extract detailed specs
7. Compare and summarize

**Validation**:
- ✅ Both sites visited
- ✅ Specs extracted correctly
- ✅ Comparison accurate
- ✅ Summary clear and concise
- ✅ Multi-tab coordination works

---

### Scenario 3: Form Filling

**Goal**: "Fill out contact form with my profile"

**Steps**:
1. Detect form on page
2. Request FILL_FORM permission
3. Auto-fill name, email, phone
4. Show preview to user
5. Request SUBMIT_ACTION permission
6. Submit form

**Validation**:
- ✅ All fields filled correctly
- ✅ Profile data used
- ✅ User confirms before submit
- ✅ Form submitted successfully
- ✅ Confirmation received

---

### Scenario 4: Accessibility

**Goal**: Voice-controlled shopping for screen reader user

**Steps**:
1. Activate voice control
2. Say "Go to Amazon"
3. Say "Search for headphones"
4. Listen to results narration
5. Say "Filter by price under $50"
6. Say "Read product 1"
7. Say "Add to cart"

**Validation**:
- ✅ All voice commands recognized
- ✅ Clear voice feedback
- ✅ Page narration accurate
- ✅ Actions confirmed verbally
- ✅ No mouse/keyboard needed

---

## 📊 Performance Testing

### Metrics to Track

#### Response Time
```
- Page extraction: < 2s
- LLM response: < 5s
- Action execution: < 1s
- Total task: < 30s
```

#### Success Rate
```
- Simple tasks (search): > 95%
- Medium tasks (compare): > 85%
- Complex tasks (multi-site): > 75%
```

#### Resource Usage
```
- Memory: < 100MB
- CPU: < 10% average
- Network: Minimal (LLM calls only)
```

---

## 🐛 Known Issues & Workarounds

### Issue 1: Selector Brittleness
**Problem**: Page structure changes break selectors
**Workaround**: Retry agent tries alternatives
**Fix**: Improve selector generation with multiple strategies

### Issue 2: LLM Hallucination
**Problem**: Plans actions for non-existent elements
**Workaround**: Validate selectors before execution
**Fix**: Better prompt engineering, validation layer

### Issue 3: Permission Fatigue
**Problem**: Too many permission requests
**Workaround**: Use task-scoped permissions
**Fix**: Batch permission requests, smarter defaults

### Issue 4: Voice Recognition Errors
**Problem**: Misheard commands
**Workaround**: Show transcript, allow correction
**Fix**: Better noise filtering, confirmation prompts

---

## ✅ Test Checklist Summary

### Core Functionality
- [ ] Extension loads without errors
- [ ] Settings save and persist
- [ ] Basic session completes
- [ ] Actions execute correctly
- [ ] Errors handled gracefully

### Tier System
- [ ] Tier 1: LLM only, no browser actions
- [ ] Tier 2: Read and navigate
- [ ] Tier 3: Full automation
- [ ] Tier upgrades work
- [ ] Tier restrictions enforced

### Permissions
- [ ] READ_PAGE auto-granted
- [ ] NAVIGATE asks once
- [ ] FILL_FORM confirms
- [ ] SUBMIT_ACTION always confirms
- [ ] Grant modes work (once, task, session, always)
- [ ] Revocation works

### Memory
- [ ] Preferences stored
- [ ] Workflows learned
- [ ] Retrieval works
- [ ] Export/import works
- [ ] Clear works

### Voice
- [ ] Activation works
- [ ] Commands recognized
- [ ] Narration clear
- [ ] Feedback provided
- [ ] Accessibility features work

### MCP
- [ ] Server registration works
- [ ] Tool discovery works
- [ ] Tool calls work
- [ ] Permissions checked
- [ ] Audit logged

### Cross-Site
- [ ] Multi-tab works
- [ ] Context shared
- [ ] Coordination works
- [ ] Permissions requested

### Error Handling
- [ ] Selector errors retry
- [ ] LLM errors handled
- [ ] Permission denials handled
- [ ] Network errors handled
- [ ] Graceful degradation

---

## 🚀 Automated Testing (Future)

### Unit Tests
```javascript
// Example: Test memory storage
describe('MemoryAgent', () => {
  it('should store preference', async () => {
    const agent = new MemoryAgent();
    const memory = await agent.learnPreference('budget', 1000);
    expect(memory.type).toBe('preference');
    expect(memory.value).toBe(1000);
  });
});
```

### Integration Tests
```javascript
// Example: Test agent coordination
describe('Agent Graph', () => {
  it('should execute workflow', async () => {
    const state = await runGraph(initialState, handlers);
    expect(state.actions.length).toBeGreaterThan(0);
    expect(state.executionResults).toBeDefined();
  });
});
```

### E2E Tests
```javascript
// Example: Test complete workflow
describe('E-commerce Workflow', () => {
  it('should complete shopping task', async () => {
    const result = await startSession('Find mouse under $30');
    expect(result.ok).toBe(true);
    expect(result.state.executionResults).toHaveLength(5);
  });
});
```

---

**Testing is crucial for ensuring the Web Agent API works reliably and safely. Follow this guide to validate all features before deployment.**

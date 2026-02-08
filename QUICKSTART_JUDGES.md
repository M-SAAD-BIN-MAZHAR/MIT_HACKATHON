# Quick Start Guide for Judges & Evaluators

## ⚡ 5-Minute Setup

### Prerequisites
- Chrome or Chromium browser
- OpenAI API key (or compatible)

### Installation

1. **Download/Clone Repository**
   ```bash
   git clone [repository-url]
   cd web-agent-api
   ```

2. **Load Extension**
   - Open Chrome
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the project folder

3. **Configure API Key**
   - Click extension icon (should appear in toolbar)
   - Side panel opens
   - Enter your OpenAI API key
   - Click outside to save

**You're ready!** 🎉

---

## 🎯 Demo Scenarios (5 minutes each)

### Scenario 1: Basic Search (Tier 2)

**Goal**: Demonstrate read-only browser automation

1. Navigate to Amazon.com
2. Open extension side panel
3. Enter goal: `"Search for wireless mouse under $30"`
4. Click "Start AI"
5. Watch the agent:
   - Extract page structure
   - Type in search box
   - Click search button
   - Filter by price
   - Present results

**Expected**: 
- ✅ No permission requests (Tier 2 read-only)
- ✅ Real-time feed shows each action
- ✅ Completes in ~15 seconds

---

### Scenario 2: Voice Control (Accessibility)

**Goal**: Demonstrate hands-free operation

1. Navigate to any website
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
3. Voice overlay appears
4. Click "Start" button
5. Say: `"Read this page"`
6. Agent narrates page content
7. Say: `"Find the contact link"`
8. Agent finds and highlights link

**Expected**:
- ✅ Voice recognition works
- ✅ Clear voice feedback
- ✅ Page narration accurate
- ✅ Completely hands-free

---

### Scenario 3: Memory & Learning (Tier 3)

**Goal**: Demonstrate context persistence

1. Open extension side panel
2. Go to Settings (gear icon)
3. Fill in User Profile:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Budget preference: $1000
4. Save profile
5. Navigate to any e-commerce site
6. Enter goal: `"Find laptops within my budget"`
7. Agent uses remembered budget preference

**Expected**:
- ✅ Profile data persisted
- ✅ Agent retrieves preferences
- ✅ Filters by remembered budget
- ✅ No need to repeat preferences

---

### Scenario 4: Permission System (Tier 3)

**Goal**: Demonstrate graduated permissions

1. Navigate to a site with a form
2. Enter goal: `"Fill out this form with my profile"`
3. Agent requests `FILL_FORM` permission
4. Approve permission
5. Agent auto-fills from profile
6. Agent requests `SUBMIT_ACTION` permission
7. Approve or deny

**Expected**:
- ✅ Clear permission requests
- ✅ User can approve/deny
- ✅ Form preview shown
- ✅ Submission only after approval

---

### Scenario 5: Cross-Site Workflow (Advanced)

**Goal**: Demonstrate multi-tab coordination

1. Enter goal: `"Compare iPhone 15 prices on Amazon and Best Buy"`
2. Agent:
   - Searches Amazon
   - Extracts price
   - Requests `OPEN_TAB` permission
   - Opens Best Buy in new tab
   - Searches for same product
   - Extracts price
   - Compares and reports

**Expected**:
- ✅ Multi-tab coordination
- ✅ Context shared between tabs
- ✅ Permission requested for new tab
- ✅ Comparison accurate

---

## 🔍 Key Features to Evaluate

### 1. Graduated Capability Tiers

**Test**: Try different goals at different tiers

**Tier 1** (LLM only):
- Goal: `"Summarize this page"`
- Expected: Text summary, no browser actions

**Tier 2** (Read + Navigate):
- Goal: `"Find the refund policy"`
- Expected: Navigation and reading, no form interaction

**Tier 3** (Full Automation):
- Goal: `"Fill out this form"`
- Expected: Form filling with permission requests

**Evaluation Points**:
- [ ] Clear tier boundaries
- [ ] Appropriate permission requests
- [ ] User understands limitations
- [ ] Tier upgrades work

### 2. Permission Design

**Test**: Observe permission requests during tasks

**Evaluation Points**:
- [ ] Permissions are scoped (task, not global)
- [ ] Time-bounded (expire after task)
- [ ] Clear descriptions
- [ ] User can deny without breaking
- [ ] Audit trail maintained

**Check Audit Log**:
1. Open Settings
2. Scroll to "Audit & Privacy"
3. Click "View Audit Log"
4. Verify all actions logged

### 3. Memory System

**Test**: Store and retrieve preferences

**Steps**:
1. Store preference: Budget $500
2. Complete a shopping task
3. Start new session
4. Agent should remember budget

**Evaluation Points**:
- [ ] Preferences persist
- [ ] Workflows learned
- [ ] Context retrieved correctly
- [ ] Privacy controls available
- [ ] Export/import works

### 4. Voice Interface

**Test**: Complete task using only voice

**Evaluation Points**:
- [ ] Voice recognition accurate
- [ ] Commands parsed correctly
- [ ] Voice feedback clear
- [ ] Page narration helpful
- [ ] Completely hands-free

### 5. Error Handling

**Test**: Cause intentional errors

**Scenarios**:
- Invalid selector: Goal with non-existent element
- Permission denied: Deny a required permission
- Network error: Disconnect internet mid-task

**Evaluation Points**:
- [ ] Errors caught gracefully
- [ ] Retry mechanism works
- [ ] User notified clearly
- [ ] Session doesn't crash
- [ ] Alternative paths offered

---

## 📊 Evaluation Checklist

### Clarity of Execution Boundaries
- [ ] Task start/stop explicit
- [ ] Real-time action feed
- [ ] Clear permission requests
- [ ] Tier restrictions visible
- [ ] User always in control

### Thoughtful Use of Browser Context
- [ ] Context used intentionally
- [ ] Read-only by default
- [ ] Tier system prevents over-access
- [ ] Memory enhances experience
- [ ] Cross-site only when needed

### Permission Design
- [ ] Task-scoped permissions
- [ ] Time-bounded grants
- [ ] Multiple grant modes
- [ ] Complete audit trail
- [ ] Easy revocation

### Legibility & User Control
- [ ] Visual feed of actions
- [ ] Pause/Stop always available
- [ ] Settings accessible
- [ ] Audit log exportable
- [ ] Voice feedback option

### Judgment & Restraint
- [ ] Tier system enforces limits
- [ ] LLM recommends minimum tier
- [ ] Sensitive actions confirmed
- [ ] Failures handled gracefully
- [ ] User can deny anything

---

## 🐛 Known Issues & Workarounds

### Issue 1: Selector Not Found
**Symptom**: "Selector not found" error  
**Cause**: Page structure different than expected  
**Workaround**: Retry agent tries alternatives (automatic)

### Issue 2: LLM Timeout
**Symptom**: "LLM error: timeout"  
**Cause**: Slow API response  
**Workaround**: Increase timeout in settings (future feature)

### Issue 3: Voice Not Working
**Symptom**: Voice overlay doesn't appear  
**Cause**: Browser doesn't support Web Speech API  
**Workaround**: Use text input instead

### Issue 4: Permission Fatigue
**Symptom**: Too many permission requests  
**Cause**: Complex multi-step task  
**Workaround**: Use "Trust Mode" (Settings) or grant "always"

---

## 💡 Tips for Best Experience

### 1. Start Simple
Begin with Tier 2 tasks (search, navigate) before trying Tier 3 (forms, automation)

### 2. Use Clear Goals
Be specific: "Search for laptops under $1000" vs "Find laptops"

### 3. Enable Memory
Memory makes subsequent tasks faster and more personalized

### 4. Try Voice
Voice control is especially impressive for accessibility demonstration

### 5. Check Settings
Explore the settings page to see all configuration options

---

## 📹 Video Demos (If Available)

1. **Quick Start** (2 min): Installation and first task
2. **Voice Control** (3 min): Hands-free shopping
3. **Memory System** (3 min): Learning preferences
4. **Cross-Site** (5 min): Multi-tab workflow
5. **Accessibility** (5 min): Screen reader user experience

---

## 📚 Additional Resources

- **Full Documentation**: See README.md
- **Architecture**: See ARCHITECTURE.md
- **Use Cases**: See examples/use-cases.md
- **API Reference**: See docs/API.md
- **Testing Guide**: See docs/TESTING.md

---

## 🎯 Evaluation Focus Areas

### Innovation (30%)
- Novel approach to browser-level AI
- MCP integration
- Graduated capability tiers
- Memory system

### Implementation (30%)
- Code quality
- Feature completeness
- Error handling
- Performance

### User Experience (20%)
- Ease of use
- Clear feedback
- Permission design
- Accessibility

### Documentation (10%)
- Completeness
- Clarity
- Examples
- API reference

### Impact (10%)
- Addresses hackathon goals
- Solves real problems
- Accessibility improvements
- Future potential

---

## ⏱️ Time Estimates

- **Installation**: 2 minutes
- **Basic Demo**: 5 minutes
- **All Scenarios**: 25 minutes
- **Deep Dive**: 60 minutes
- **Code Review**: 120 minutes

---

## 🤝 Support

If you encounter any issues during evaluation:

1. Check console for errors (F12)
2. Verify API key is set
3. Try reloading extension
4. Check Known Issues section above
5. Contact: your.email@example.com

---

## 🎉 Thank You!

Thank you for taking the time to evaluate the Web Agent API. This project represents our vision for making AI a browser primitive - portable, user-controlled, and permission-mediated.

We believe this approach can transform how users interact with the web, especially for accessibility, productivity, and privacy.

**We hope you enjoy exploring it as much as we enjoyed building it!** 🚀

---

**Built with ❤️ for the Mozilla "Bring Your Own AI to Every Website" Hackathon**

# Web Agent API - Mozilla Hackathon Submission

## 🎯 Project Overview

**Bring Your Own AI to Every Website - The Universal Web Agent**

A browser-level SDK that makes AI a first-class capability, not a website feature. Users bring their own AI, preferences travel with them, and the browser mediates permissions and execution.

## 🌟 Hero Features Implemented

### 1. Graduated Capability Tiers ✅

**Tier 1: Core AI & Tooling**
- LLM access (OpenAI, local models, any OpenAI-compatible API)
- MCP (Model Context Protocol) tool calling
- Structured outputs
- No browser authority by default

**Tier 2: Browser Context**
- Read page content
- Navigate between pages
- Extract structured data
- Limited interaction (read-only by default)

**Tier 3: Full Automation**
- Form filling and submission
- Multi-tab coordination
- Cross-site workflows
- Persistent memory

### 2. MCP Integration ✅

- Connect to local and remote MCP servers
- Expose domain-specific tools from websites
- Route tool calls through permission system
- Complete audit trail for all tool invocations
- Support for HTTP and WebSocket transports

### 3. Memory & Context ✅

- Persistent memory across sessions
- Learn user preferences automatically
- Store successful workflows
- Privacy-first: all data stored locally
- User controls retention and can export/import data

### 4. Voice Interface ✅

- Speech-to-text for natural commands
- Text-to-speech for accessibility
- Voice-guided form filling
- Page narration for screen reader users
- Keyboard shortcuts (Ctrl+Shift+V)

### 5. Permission System ✅

**Permission Types:**
- `READ_PAGE`: Auto-granted, read-only
- `NAVIGATE`: Ask once per domain
- `FILL_FORM`: Confirm per form
- `SUBMIT_ACTION`: Always confirm
- `OPEN_TAB`: Ask once per session
- `ACCESS_MEMORY`: Confirm per task
- `CROSS_SITE`: Confirm per workflow

**Grant Modes:**
- `once`: Single use, expires after action
- `task`: Valid for current task only
- `session`: Valid until browser close
- `always`: Persistent (requires explicit user action)

### 6. Multi-Agent Architecture ✅

- **Decision Agent**: Plans workflows, reasons about goals
- **Navigator Agent**: Handles cross-site navigation
- **Reader Agent**: Extracts and structures page content
- **Executor Agent**: Performs browser actions
- **Retry Agent**: Recovers from failures
- **Memory Agent**: Maintains context across sessions
- **Voice Agent**: Natural language interface

## 🎬 Example Use Cases

### Use Case 1: Visual Search & Action
```
User: "What keyboard is this?" [shows image]
Agent:
1. Identifies product from image (Tier 1: LLM vision)
2. Searches on Amazon (Tier 2: Navigate + Read)
3. Filters by user preferences from memory (budget, brand)
4. Ranks options (Tier 1: LLM reasoning)
5. Asks permission to purchase (Tier 3: Form submission)
```

### Use Case 2: Voice-Native Navigation
```
User: "Find the refund policy and summarize it"
Agent:
1. Activates voice interface (Ctrl+Shift+V)
2. Searches page for refund policy link (Tier 2: Read)
3. Navigates to policy page (Tier 2: Navigate)
4. Extracts and summarizes policy (Tier 1: LLM)
5. Reads summary aloud (Voice: TTS)
```

### Use Case 3: Cross-Site Workflow
```
User: "Find flights to NYC under $300, check my calendar, draft an email"
Agent:
1. Checks memory for travel preferences (Tier 3: Memory)
2. Searches Google Flights (Tier 2: Navigate + Read)
3. Opens calendar in new tab (Tier 3: Multi-tab)
4. Checks availability (Tier 2: Read)
5. Drafts email with flight options (Tier 1: LLM)
6. Asks permission to send (Tier 3: Submit)
```

### Use Case 4: Memory-Aware Browsing
```
User: "Is this similar to what I bought last year?"
Agent:
1. Retrieves purchase history from memory (Tier 3: Memory)
2. Extracts current product details (Tier 2: Read)
3. Compares features and price (Tier 1: LLM)
4. Provides recommendation based on past satisfaction
```

### Use Case 5: Accessibility-First Experience
```
User: [Screen reader user] "Read this page"
Agent:
1. Activates voice narration
2. Reads page title and main headings
3. Lists available actions (buttons, links)
4. Waits for voice command
5. Executes command hands-free
```

## 🔐 Permission Design Philosophy

### Execution Boundaries
- **Clear start/end**: Every task has explicit begin and completion
- **Inspectable**: Users can see what the agent is doing in real-time
- **Interruptible**: Pause/Stop buttons always available
- **Confirmable**: Sensitive actions require explicit approval

### Thoughtful Use of Browser Context
- Browser context used intentionally, not just because it's available
- Read-only by default (Tier 2)
- Write operations require tier upgrade and permission
- Cross-site coordination requires explicit user consent

### Permission Scoping
- **Task-scoped**: Permissions expire when task completes
- **Time-bounded**: Automatic expiry after inactivity
- **Contextual**: Different permissions for different domains
- **Revocable**: User can revoke at any time

### Legibility & User Control
- Real-time feed shows agent actions
- Color-coded by agent type (Decision, Navigator, Reader, Executor)
- Audit log for all actions and permissions
- Export/import for user data portability

### Judgment & Restraint
- Tier system prevents over-automation
- LLM recommends minimum required tier
- User must approve tier upgrades
- Sensitive actions (form submission) always require confirmation

## 🏗️ Architecture Highlights

### Browser as Coordinator
```
User Intent → Agent Graph → Permission Check → Browser Action → Audit Log
     ↓            ↓              ↓                  ↓              ↓
  Memory      MCP Tools      Tier Check        DOM/Tabs       Storage
```

### Data Flow
1. **Input**: Voice or text command
2. **Planning**: Decision agent analyzes goal, checks memory
3. **Tier Check**: Determine required capabilities
4. **Permission**: Request user approval if needed
5. **Execution**: Coordinate agents to complete task
6. **Learning**: Store successful workflow in memory

### Security Boundaries
- Each MCP server runs in isolated context
- Website tools cannot access browser APIs directly
- All actions mediated through permission system
- Input sanitization and output validation
- Complete audit trail

## 📊 Evaluation Criteria Addressed

### ✅ Clarity of Execution Boundaries
- Explicit task start/stop
- Real-time action feed
- Clear permission requests
- Tier-based capability limits

### ✅ Thoughtful Use of Browser Context
- Graduated tiers prevent unnecessary access
- Read-only by default
- Context used for user benefit (memory, preferences)
- Cross-site coordination only when needed

### ✅ Permission Design
- Task-scoped, time-bounded permissions
- Agent vs. task-level tradeoffs explicit
- Multiple grant modes (once, task, session, always)
- Complete revocation control

### ✅ Legibility & User Control
- Visual feed of all actions
- Pause/Stop/Approve controls
- Audit log exportable
- Voice feedback for accessibility

### ✅ Judgment & Restraint
- Tier system enforces restraint
- LLM recommends minimum tier
- Sensitive actions require confirmation
- Failure modes logged and recoverable

## 🚀 Advanced Features

### 1. Retry & Recovery
- Automatic retry with alternative selectors
- LLM-powered error recovery
- Graceful degradation

### 2. Form Intelligence
- Auto-fill from user profile
- Smart field detection (email, name, phone)
- Voice-guided form completion
- User confirmation before submission

### 3. Cross-Site Coordination
- Multi-tab workflow support
- Context sharing between sites
- Aggregate results from multiple sources

### 4. Accessibility
- Voice control for hands-free operation
- Page narration for screen readers
- High-contrast mode support
- Keyboard shortcuts

### 5. Privacy & Security
- All data stored locally
- No telemetry or tracking
- User controls data retention
- Export/import for portability
- Complete audit trail

## 🎓 What We Learned

### New Questions Raised
1. **Permission Granularity**: How fine-grained should permissions be? Per-action vs. per-task vs. per-session?
2. **Tier Transitions**: Should tier upgrades be permanent or temporary? Should they auto-downgrade?
3. **Memory Privacy**: How to balance personalization with privacy? Should memory be domain-scoped?
4. **Cross-Site Trust**: How to handle workflows that span trusted and untrusted sites?
5. **MCP Security**: How to sandbox MCP tools from different sources?

### Edge Cases Discovered
1. **Infinite Loops**: Agent navigates in circles without making progress
2. **Permission Deadlock**: Task requires permission that user denies, but agent can't proceed
3. **Memory Pollution**: Bad workflows stored in memory, affecting future tasks
4. **Voice Ambiguity**: Similar-sounding commands with different intents
5. **Tier Confusion**: User doesn't understand why action is blocked

### Failure Modes
1. **Selector Brittleness**: Page structure changes break selectors
2. **LLM Hallucination**: Agent plans actions for non-existent elements
3. **Permission Fatigue**: Too many permission requests annoy users
4. **Context Overload**: Too much memory/context confuses LLM
5. **Voice Recognition Errors**: Misheard commands cause wrong actions

## 🔮 Future Directions

1. **Federated Learning**: Learn from user behavior without sending data
2. **Collaborative Filtering**: Share anonymized preferences
3. **Progressive Enhancement**: Graceful degradation for unsupported sites
4. **Developer Tools**: Debug agent behavior, inspect decisions
5. **Marketplace**: Share and discover MCP tools and agents
6. **Multi-User**: Family/team shared preferences with privacy
7. **Offline Mode**: Local LLM support for privacy-sensitive tasks
8. **Browser Integration**: Native browser APIs for better performance

## 📦 Installation & Setup

### Prerequisites
- Chrome/Chromium browser (Manifest V3 support)
- LLM API key (OpenAI, Azure OpenAI, or compatible)

### Quick Start
1. Clone repository
2. Go to `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked"
5. Select project folder
6. Click extension icon to open side panel
7. Enter API key in settings
8. Navigate to any website
9. Enter goal and click "Start AI"

### Configuration
- **API Key**: Required for LLM access
- **API URL**: Default OpenAI, can use local LLM
- **Model**: Default gpt-4o-mini, configurable
- **Trust Mode**: Auto-approve all actions (use with caution)
- **Voice**: Enable voice control
- **Memory**: Enable context persistence

## 🎯 Why This Matters

This isn't about building another chatbot. It's about what happens when intelligence becomes a browser primitive — portable, user-controlled, permission-mediated.

**For accessibility**: Voice-first browsing, intent-based navigation, automatic simplification become defaults, not add-ons.

**For productivity**: Fewer clicks, fewer tabs, fewer manual workflows. Express goals, not learn interfaces.

**For developers**: Plumbing becomes platform infrastructure, not application code.

**For users**: Your AI, your preferences, your control. Not locked into website-specific implementations.

Just as browsers once standardized how we access information, this project asks: **what would it mean to standardize how we act on it?**

Not as a chatbot. Not as a plugin. But as a foundational capability of the web.

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Mozilla for the hackathon opportunity
- Model Context Protocol (MCP) specification
- LangGraph for multi-agent inspiration
- OpenAI for LLM API
- Chrome Extensions team for Manifest V3

---

**Built with ❤️ for the Mozilla "Bring Your Own AI" Hackathon**

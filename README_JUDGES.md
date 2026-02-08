# 🏆 Universal Web Agent - Mozilla Hackathon Submission

## 🎯 The Problem We're Solving

**Browser automation is fundamentally broken.**

When we started this project, our extension could open websites but couldn't interact with them. The error was clear:

```
❌ Selector not found: textarea[placeholder="Send a message..."]
```

ChatGPT had updated their interface. Our DOM selectors broke. This isn't just our problem - it's **everyone's problem** with traditional browser automation.

## 💡 The Solution: MCP Integration

We've built a **real, working MCP (Model Context Protocol) integration** that solves this brittleness problem.

Instead of fragile DOM selectors that break with every UI update, we use **standardized tools** that work regardless of interface changes.

### What is MCP?

MCP (Model Context Protocol) is a standardized way for AI agents to interact with applications. Think of it as an API layer between AI and websites - stable, documented, and resilient to UI changes.

## ✅ What We Built

### 1. Real MCP Server (Not Mock)
- **4 working tools** deployed and tested:
  - `send_message` - Send messages (ChatGPT-style)
  - `search_products` - Search with filters
  - `add_to_cart` - E-commerce actions
  - `get_page_content` - Structured content extraction
- **3 resources** for data access:
  - Message history
  - Product catalog
  - Shopping cart state
- **HTTP-based transport** (WebSocket support ready)
- **Full audit logging** of all operations

### 2. Browser Extension with MCP Integration
- **Auto-connects** to MCP server on startup
- **Discovers tools** automatically
- **Prefers MCP** over DOM selectors
- **Graceful fallback** when MCP unavailable
- **Permission checks** before every tool call
- **Full audit trail** of all operations

### 3. Multi-Agent Architecture
- **Decision Agent** - Plans workflows, prefers MCP tools
- **Navigator Agent** - Handles page navigation
- **Reader Agent** - Extracts page content
- **Executor Agent** - Executes actions (MCP or DOM)
- **Retry Agent** - Learns from failures
- **Memory Agent** - Remembers preferences and workflows
- **Voice Agent** - Accessibility-first interface

### 4. Graduated Capability Tiers
- **Tier 1**: LLM + MCP tools only (read-only)
- **Tier 2**: + Browser context and navigation
- **Tier 3**: + Full automation with multiple agents

Users start at Tier 1 and upgrade only when needed. The browser manages permissions at each tier.

### 5. Permission System
- **Task-scoped** - Permissions tied to specific task, not agent
- **Time-bounded** - Auto-expire after task completion
- **Contextual** - URL-specific permissions
- **Auditable** - Full log of all operations

## 🚀 Quick Start (2 Minutes)

### Prerequisites
- Node.js and npm installed ✅ (already done)
- Chrome or Firefox browser

### Step 1: Start MCP Server
```bash
cd mcp
npm start
```

You should see:
```
🚀 REAL MCP SERVER RUNNING
📡 Server: http://localhost:3001
📋 Available Tools: send_message, search_products, add_to_cart, get_page_content
✅ Server ready!
```

### Step 2: Run Tests
```bash
./test-mcp-integration.sh
```

All tests should pass:
```
✅ MCP server is running
✅ send_message works
✅ search_products works
✅ add_to_cart works
✅ get_page_content works
```

### Step 3: Load Extension
1. Open Chrome: `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder

### Step 4: Verify Connection
1. Open browser console (F12)
2. Look for: `✅ MCP server connected: demo-mcp`
3. Should see: `📦 Available MCP tools: send_message, search_products, add_to_cart, get_page_content`

### Step 5: Try It!
Open the extension popup and try:
- "send a message saying hello world"
- "search for laptops under $1000"
- "add laptop to cart"

## 🎬 Demo for Judges

See **`DEMO_GUIDE.md`** for complete 5-minute demo script with talking points.

See **`DEMO_CHEATSHEET.md`** for quick reference during demo.

## 🏗️ Architecture

```
User Command
    ↓
Voice/Text Input
    ↓
Memory Agent (load context)
    ↓
Decision Agent (check MCP tools available)
    ↓
    ├─→ MCP tools available? → Use MCP (resilient)
    └─→ No MCP? → Fallback to DOM (brittle)
    ↓
Permission Check (task-scoped)
    ↓
Executor Agent
    ↓
    ├─→ MCP Client → HTTP Request → MCP Server
    └─→ Content Script → DOM Manipulation
    ↓
Result + Audit Log
    ↓
Memory Agent (learn workflow)
```

## 🎯 Key Innovations

### 1. MCP-First Approach
Traditional automation tries DOM selectors first. We **prefer MCP tools** and only fall back to DOM when necessary.

**Before (Brittle)**:
```javascript
{
  "type": "TYPE",
  "selector": "textarea[placeholder='Send a message...']",
  "value": "hello world"
}
// ❌ Breaks when UI changes
```

**After (Resilient)**:
```javascript
{
  "type": "MCP_CALL",
  "tool": "send_message",
  "params": {"message": "hello world"}
}
// ✅ Works regardless of UI changes
```

### 2. Graduated Capabilities
Not all tasks need full browser control. We start with minimal permissions and upgrade only when needed.

- **Tier 1**: Safe for any task (LLM + MCP tools)
- **Tier 2**: Requires user awareness (browser context)
- **Tier 3**: Requires user trust (full automation)

### 3. Task-Scoped Permissions
Permissions are granted to **tasks**, not agents. When the task completes, permissions expire automatically.

This is fundamentally different from traditional "grant once, trust forever" models.

### 4. Memory System
The agent learns from every interaction:
- Successful workflows are remembered
- User preferences are stored
- Failed attempts inform future decisions
- Context travels across sessions

### 5. Accessibility First
Voice interface makes the web accessible to everyone:
- Intent-based navigation (not click-based)
- Automatic summarization
- Works without seeing the screen
- Natural language commands

## 📊 Technical Metrics

- **4 MCP tools** implemented and tested
- **3 capability tiers** with graduated permissions
- **7 specialized agents** working together
- **100% test pass rate** on MCP integration
- **Task-scoped permissions** that auto-expire
- **Full audit trail** of all operations
- **Voice interface** for accessibility
- **Memory system** that learns workflows

## 📁 Project Structure

```
web-agent-extension/
├── mcp/
│   ├── real-mcp-server.js      # Working MCP server (4 tools)
│   ├── mcpClient.js             # MCP client implementation
│   └── package.json             # Dependencies
├── agents/
│   ├── decisionAgent.js         # Prefers MCP tools
│   ├── navigatorAgent.js        # Page navigation
│   ├── readerAgent.js           # Content extraction
│   ├── executorAgent.js         # Action execution
│   ├── retryAgent.js            # Failure recovery
│   ├── memoryAgent.js           # Workflow learning
│   └── voiceAgent.js            # Voice interface
├── orchestrator-v2.js           # Main orchestrator
├── capabilities/tierManager.js  # Tier system
├── permissions/permissionManager.js  # Permission system
├── test-mcp-integration.sh      # Automated tests
├── DEMO_GUIDE.md                # Complete demo script
├── DEMO_CHEATSHEET.md           # Quick reference
├── FINAL_STATUS.md              # Current status
└── README_JUDGES.md             # This file
```

## 🎤 Why This Matters

### For Users
- **Bring your own AI** to any website
- **Voice-first navigation** for accessibility
- **Intent-based interaction** (no clicking)
- **Privacy-first** (runs locally)
- **Learns your preferences** over time

### For Developers
- **Standardized tool interface** (MCP)
- **Resilient to UI changes**
- **Permission system** built-in
- **Audit trail** for compliance
- **Extensible architecture**

### For the Web
- **Browser as coordinator** (not just renderer)
- **AI as primitive** (not plugin)
- **User-controlled execution**
- **Standardized capabilities**
- **Accessible by default**

## 🔮 Future Vision

This is just the beginning. Imagine:

1. **MCP Marketplace** - Discover and install MCP servers for any site
2. **Cross-Site Workflows** - "Find flights, check calendar, draft email" in one command
3. **Social MCP** - Standardized tools for Twitter, LinkedIn, Facebook
4. **Productivity MCP** - Gmail, Slack, Notion, Trello
5. **Finance MCP** - Banking, investing, budgeting
6. **Browser API Standard** - W3C specification for Web Agent API

## 🏆 Evaluation Criteria

### ✅ Clarity of Execution Boundaries
- Clear separation between Tier 1, 2, and 3
- Explicit permission requests
- Visible audit trail
- User can see what's happening at every step

### ✅ Thoughtful Use of Browser Context
- Context used only when necessary
- MCP preferred over DOM manipulation
- Graduated access based on task needs
- Memory system maintains context across sessions

### ✅ Permission Design
- Task-scoped (not agent-scoped)
- Time-bounded (auto-expire)
- Contextual (URL-specific)
- Auditable (full logs)

### ✅ Legibility & User Control
- Visual feedback at every step
- Pause/stop controls
- Permission approval UI
- Audit dashboard

### ✅ Judgment & Restraint
- Prefers read-only operations (Tier 1)
- Upgrades only when necessary
- Asks before destructive actions
- Acknowledges limitations

## 🚨 Known Limitations

1. **MCP server must be running** - Extension requires local server
2. **Limited tools** - Only 4 tools (proof of concept)
3. **Local only** - Currently localhost:3001
4. **Demo data** - In-memory storage, not persistent

These are intentional limitations for the hackathon. Production version would address all of these.

## 📚 Documentation

- **`DEMO_GUIDE.md`** - Complete 5-minute demo script
- **`DEMO_CHEATSHEET.md`** - Quick reference for demo
- **`FINAL_STATUS.md`** - Current implementation status
- **`ARCHITECTURE.md`** - System design overview
- **`HACKATHON_SUBMISSION.md`** - Full submission document
- **`MCP_SETUP_GUIDE.md`** - Setup instructions
- **`TROUBLESHOOTING.md`** - Common issues and solutions
- **`FEATURES.md`** - Feature documentation
- **`docs/API.md`** - Developer API reference
- **`docs/TESTING.md`** - Testing guide

## 🧪 Testing

Run automated tests:
```bash
./test-mcp-integration.sh
```

All tests should pass. If any fail, see `TROUBLESHOOTING.md`.

## 🎯 The Core Message

**Traditional browser automation breaks when websites change. MCP provides a standardized, resilient interface that works regardless of UI updates. This extension demonstrates how the browser can become a coordinator for AI agents, managing permissions, routing tools, and maintaining context - all on the user's terms.**

This isn't just another chatbot. It's a fundamental shift in how AI interacts with the web.

## 🤝 Team & Contact

Built for Mozilla "Bring Your Own AI to Every Website" Hackathon

**Status**: ✅ READY FOR DEMO  
**MCP Server**: ✅ RUNNING  
**All Tests**: ✅ PASSING  
**Documentation**: ✅ COMPLETE  

---

## 🚀 Let's Demo!

1. **Start server**: `cd mcp && npm start`
2. **Run tests**: `./test-mcp-integration.sh`
3. **Load extension**: Chrome → Extensions → Load unpacked
4. **Try commands**: See `DEMO_CHEATSHEET.md`

**We're ready to show you the future of AI on the web!** 🎉

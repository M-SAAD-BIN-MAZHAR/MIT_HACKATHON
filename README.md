# Web Agent API - Universal AI Browser

**Bring Your Own AI to Every Website** - A browser-level SDK that makes AI a first-class capability, not a website feature.

[![Mozilla Hackathon](https://img.shields.io/badge/Mozilla-Hackathon-orange)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)](manifest.json)

---

## 🏆 FOR JUDGES: Quick Start

**Want to see it working in 2 minutes?** → See **[README_JUDGES.md](README_JUDGES.md)**

**Ready to demo?** → See **[DEMO_CHEATSHEET.md](DEMO_CHEATSHEET.md)**

**Current status?** → See **[FINAL_STATUS.md](FINAL_STATUS.md)**

### TL;DR
1. `cd mcp && npm start` - Start MCP server
2. `./test-mcp-integration.sh` - Run tests (all pass ✅)
3. Load extension in Chrome
4. Try: "send a message saying hello world"

**Key Innovation**: Real MCP integration that solves the brittleness problem in browser automation. DOM selectors break when sites update → MCP tools work regardless of UI changes.

---

## 🌟 Features

### Graduated Capability Tiers
- **Tier 1**: LLM access + MCP tool calling (no browser authority)
- **Tier 2**: Browser context + navigation (read-only)
- **Tier 3**: Full automation (forms, multi-tab, cross-site)

### Core Capabilities
- 🤖 **Multi-Agent System**: Decision, Navigator, Reader, Executor, Memory, Voice agents
- 🔌 **MCP Integration**: Connect to Model Context Protocol servers (REAL, not mock)
- 🧠 **Persistent Memory**: Learn preferences, remember workflows
- 🎤 **Voice Control**: Hands-free operation, accessibility-first
- 🔐 **Permission System**: Task-scoped, time-bounded, revocable
- 📊 **Audit Trail**: Complete logging of all actions

## 🚀 Quick Start

### Prerequisites
- Chrome/Chromium browser (Manifest V3)
- LLM API key (OpenAI, Azure OpenAI, or compatible)
- Node.js and npm (for MCP server)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/web-agent-api.git
   cd web-agent-api
   ```

2. **Load extension in Chrome**
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the project folder

3. **Configure API Key**
   - Click extension icon to open side panel
   - Enter your LLM API key
   - Optionally configure API URL and model

### Getting an API Key

- **OpenAI**: https://platform.openai.com/api-keys
- **Azure OpenAI**: Your Azure portal
- **Local LLM**: Any OpenAI-compatible endpoint

## 📖 Usage

### Basic Usage

1. Navigate to any webpage
2. Open the extension side panel
3. Enter your goal (e.g., "Find flights to NYC under $300")
4. Click **Start AI**
5. Monitor progress in real-time feed
6. Approve permissions when requested

### Voice Control

1. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
2. Speak your command
3. Agent executes automatically
4. Voice feedback confirms actions

### Example Commands

```
"Search for laptops under $1000"
"Find the refund policy and summarize it"
"Compare prices on Amazon and Best Buy"
"Fill out this form with my profile"
"Read this page aloud"
```

## 🏗️ Architecture

### Multi-Agent System

```
User Intent
    ↓
Decision Agent (plans workflow)
    ↓
Navigator Agent (handles navigation)
    ↓
Reader Agent (extracts page content)
    ↓
Executor Agent (performs actions)
    ↓
Memory Agent (learns from success)
```

### Capability Tiers

| Tier | Capabilities | Permissions | Use Cases |
|------|-------------|-------------|-----------|
| 1 | LLM + MCP tools | None | Text generation, analysis |
| 2 | Read + Navigate | READ_PAGE, NAVIGATE | Research, comparison |
| 3 | Full automation | All | Form filling, purchases |

### Permission Model

- **Task-scoped**: Permissions expire when task completes
- **Time-bounded**: Automatic expiry after inactivity
- **Revocable**: User can revoke at any time
- **Auditable**: Complete log of all grants

## 🔌 MCP Integration

### Connecting MCP Servers

```javascript
// Register a weather MCP server
chrome.runtime.sendMessage({
  type: 'MCP_REGISTER_SERVER',
  name: 'weather-mcp',
  config: {
    transport: 'http',
    url: 'http://localhost:3000/mcp'
  }
});
```

### Calling MCP Tools

```javascript
// Call a tool through MCP
chrome.runtime.sendMessage({
  type: 'MCP_CALL_TOOL',
  toolName: 'weather-mcp:get_weather',
  params: { location: 'New York', units: 'imperial' },
  context: { taskId: 'task_123' }
});
```

### Example MCP Servers

See `mcp/examples/` for sample server configurations:
- `weather-server.json` - Weather information
- `ecommerce-server.json` - Product search and purchase

## 🎤 Voice Interface

### Activation
- Keyboard: `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)
- UI: Click voice button in side panel

### Voice Commands
- **Navigation**: "Go to Amazon", "Open Google"
- **Search**: "Search for laptops", "Find refund policy"
- **Actions**: "Click submit button", "Fill out form"
- **Reading**: "Read this page", "What's on this page?"
- **Control**: "Stop", "Pause", "Continue"

### Accessibility Features
- Page narration for screen readers
- Voice-guided form filling
- Hands-free operation
- High-contrast mode support

## 🧠 Memory System

### What Gets Remembered
- User preferences (budget, brands, etc.)
- Successful workflows
- Browsing patterns
- Form data (with permission)

### Privacy Controls
- All data stored locally
- User controls retention period
- Export/import for portability
- Clear all data anytime

### Memory Commands
```javascript
// Store a preference
memoryAgent.learnPreference('budget', 'under $300');

// Retrieve memories
const memories = await memoryAgent.retrieve({
  goal: 'book flight',
  url: 'https://flights.google.com'
});

// Clear old memories
await memoryAgent.clearOld(30); // Clear older than 30 days
```

## 🔐 Security & Privacy

### Security Boundaries
- MCP servers run in isolated contexts
- Website tools cannot access browser APIs directly
- All actions mediated through permission system
- Input sanitization and output validation

### Privacy Guarantees
- No telemetry or tracking
- All data stored locally
- User controls all data
- Complete audit trail
- Export/import for portability

### Permission Best Practices
- Start with Tier 2 (read-only)
- Upgrade only when needed
- Use task-scoped permissions
- Review audit log regularly
- Revoke unused permissions

## 📊 Configuration

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | LLM API key | Required |
| API URL | LLM endpoint | OpenAI |
| Model | LLM model | gpt-4o-mini |
| Trust Mode | Auto-approve actions | Off |
| Voice | Enable voice control | Off |
| Memory | Enable context persistence | On |
| Tier | Capability tier | 2 |

### Advanced Configuration

Edit `chrome.storage.local` for advanced settings:
- `uwa_capability_tier`: Set default tier (1-3)
- `uwa_memory_retention`: Days to keep memories (default: 90)
- `uwa_auto_fill_forms`: Auto-fill from profile (default: false)
- `uwa_voice_enabled`: Enable voice interface (default: false)

## 🎯 Use Cases

### 1. Visual Search & Action
"What keyboard is this?" → identify → search → filter → rank → purchase

### 2. Voice-Native Navigation
"Find the refund policy and summarize it" - No clicking required

### 3. Cross-Site Workflows
"Find flights, check my calendar, draft an email" - One intent, multiple sites

### 4. Memory-Aware Browsing
"Is this similar to what I bought last year?" - Your AI, your history

### 5. Accessibility-First
Voice control, page narration, hands-free operation for all users

## 🛠️ Development

### Project Structure

```
web-agent-api/
├── agents/              # Multi-agent system
│   ├── decisionAgent.js
│   ├── navigatorAgent.js
│   ├── readerAgent.js
│   ├── executorAgent.js
│   ├── retryAgent.js
│   ├── memoryAgent.js
│   └── voiceAgent.js
├── capabilities/        # Tier management
│   └── tierManager.js
├── content/            # Content scripts
│   ├── reader.js
│   ├── executor.js
│   └── voiceInterface.js
├── graph/              # Agent orchestration
│   └── agentGraph.js
├── llm/                # LLM integration
│   └── llmClient.js
├── mcp/                # MCP integration
│   ├── mcpClient.js
│   └── examples/
├── permissions/        # Permission system
│   └── permissionManager.js
├── ui/                 # User interface
│   ├── popup.html
│   └── popup.js
├── orchestrator-v2.js  # Main orchestrator
└── manifest.json       # Extension manifest
```

### Building

No build step required - load directly as unpacked extension.

### Testing

1. Load extension in Chrome
2. Navigate to test page
3. Open DevTools console
4. Monitor agent actions in side panel
5. Check audit log in storage

## 📚 Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Hackathon Submission](HACKATHON_SUBMISSION.md)
- [MCP Integration Guide](mcp/README.md)
- [Permission System](permissions/README.md)

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Mozilla for the hackathon opportunity
- Model Context Protocol (MCP) specification
- LangGraph for multi-agent inspiration
- OpenAI for LLM API
- Chrome Extensions team for Manifest V3

## 📧 Contact

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/web-agent-api/issues)
- Email: your.email@example.com

---

**Built with ❤️ for the Mozilla "Bring Your Own AI" Hackathon**

*Making AI a browser primitive, not a website feature.*

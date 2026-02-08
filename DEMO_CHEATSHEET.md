# 🎯 Demo Cheatsheet - Quick Reference

## 🚀 Setup (30 seconds)

```bash
# Terminal 1: Start MCP server
cd mcp && npm start

# Terminal 2: Run tests
./test-mcp-integration.sh
```

**Load Extension**: `chrome://extensions` → Load unpacked → Select folder

**Verify**: Console should show `✅ MCP server connected: demo-mcp`

---

## 🎬 Demo Commands (Copy-Paste Ready)

### Command 1: Send Message (MCP)
```
send a message saying hello world
```
**What happens**: Uses MCP `send_message` tool, no DOM selectors needed

### Command 2: Search Products (MCP)
```
search for laptops under $1000
```
**What happens**: Uses MCP `search_products` tool with price filter

### Command 3: Add to Cart (MCP)
```
add laptop to cart
```
**What happens**: Uses MCP `add_to_cart` tool

### Command 4: Show the Problem (DOM Failure)
```
open ChatGPT and write hello
```
**What happens**: 
- ❌ OLD: Tries DOM selector → Fails "Selector not found"
- ✅ NEW: Falls back to MCP `send_message` → Works!

---

## 💬 Talking Points (30 seconds each)

### 1. The Problem
"Traditional browser automation breaks when websites update. ChatGPT changed their UI, our selectors stopped working. This is the fundamental brittleness problem."

### 2. The Solution
"MCP - Model Context Protocol - provides a standardized interface. Instead of brittle DOM selectors, we use standardized tools that work regardless of UI changes."

### 3. The Innovation
"We've built 3 capability tiers with graduated permissions. Start read-only, upgrade only when needed. The browser becomes the coordinator, managing permissions and routing tools."

### 4. The Impact
"For accessibility, this is transformative. Voice-first navigation, intent-based interaction, no clicking required. For productivity, it changes everything - fewer clicks, fewer tabs, just express your goal."

### 5. The Future
"This isn't a chatbot. It's a browser primitive. Just as browsers standardized how we access information, this standardizes how we act on it."

---

## 🧪 Test Commands (Terminal)

```bash
# Test 1: Capabilities
curl http://localhost:3001/mcp/capabilities

# Test 2: Send message
curl -X POST http://localhost:3001/mcp/tools/send_message \
  -H "Content-Type: application/json" \
  -d '{"params":{"message":"Hello World"}}'

# Test 3: Search products
curl -X POST http://localhost:3001/mcp/tools/search_products \
  -H "Content-Type: application/json" \
  -d '{"params":{"query":"laptop","max_price":1000}}'

# Test 4: Add to cart
curl -X POST http://localhost:3001/mcp/tools/add_to_cart \
  -H "Content-Type: application/json" \
  -d '{"params":{"product_id":"1","quantity":2}}'
```

---

## 📊 Key Metrics (Memorize)

- **4 MCP tools** implemented
- **3 capability tiers** (graduated permissions)
- **7 specialized agents** (Decision, Navigator, Reader, Executor, Retry, Memory, Voice)
- **100% test pass rate**
- **Task-scoped permissions** (auto-expire)
- **Full audit trail**

---

## 🎯 Demo Flow (5 minutes)

### Minute 1: Show the Problem
1. Open extension
2. Try: "open ChatGPT and write hello"
3. Show error: "Selector not found"
4. Explain: "ChatGPT changed their UI"

### Minute 2: Show MCP Server
1. Show terminal with MCP server running
2. Point out 4 tools available
3. Run test command to show it works

### Minute 3: Show MCP Integration
1. Show console: "MCP server connected"
2. Try: "send a message saying hello world"
3. Show it works without DOM selectors
4. Show console logs of MCP tool call

### Minute 4: Show Advanced Features
1. Try: "search for laptops under $1000"
2. Show structured results
3. Try: "add laptop to cart"
4. Show cart updated

### Minute 5: Explain Architecture
1. Show capability tiers
2. Explain permission system
3. Show memory and voice features
4. Discuss future potential

---

## 🚨 Troubleshooting

### MCP Server Not Running
```bash
cd mcp
npm install
npm start
```

### Extension Not Connecting
1. Check console for errors
2. Verify MCP server is on port 3001
3. Reload extension
4. Check `orchestrator-v2.js` line 30 for auto-connect

### Tools Not Working
1. Check MCP server logs
2. Verify tool names match
3. Check permission settings
4. Enable trust mode for demo

---

## 🎁 Bonus Points to Mention

1. **Voice interface** - "Try saying your command"
2. **Memory system** - "It learns your preferences"
3. **Cross-site workflows** - "One command, multiple sites"
4. **Accessibility** - "Works without seeing the screen"
5. **Privacy** - "Your AI, your data, your control"

---

## 📱 Console Commands (Browser)

```javascript
// Manual MCP connection
chrome.runtime.sendMessage({
  type: "MCP_REGISTER_SERVER",
  name: "demo-mcp",
  config: { transport: "http", url: "http://localhost:3001/mcp" }
});

// List available tools
chrome.runtime.sendMessage({
  type: "MCP_LIST_TOOLS"
});

// Call tool directly
chrome.runtime.sendMessage({
  type: "MCP_CALL_TOOL",
  toolName: "demo-mcp:send_message",
  params: { message: "Hello from console" }
});
```

---

## 🏆 Closing Statement

"We've built a real MCP integration that solves the brittleness problem in browser automation. With graduated capabilities, thoughtful permissions, and accessibility-first design, this represents a fundamental shift in how AI interacts with the web. The browser becomes the coordinator, and the user stays in control. This is the future of AI on the web."

---

## 📞 Q&A Prep

**Q: Why MCP instead of just better selectors?**
A: Selectors will always break. MCP provides a stable, standardized interface that websites can implement once and works forever.

**Q: How do you handle permissions?**
A: Task-scoped, time-bounded, contextual. Permissions expire after the task, not granted to the agent forever.

**Q: What about privacy?**
A: Everything runs locally. Your AI, your data. MCP servers can be self-hosted. Full audit trail of all operations.

**Q: Can this work with any LLM?**
A: Yes! Bring your own AI. Works with OpenAI, Anthropic, local models, anything with a chat API.

**Q: What's next?**
A: More MCP servers (social media, productivity), remote MCP support, browser API standardization, tool marketplace.

---

**Remember**: Confidence, clarity, and enthusiasm. This is a real solution to a real problem. Let's show them the future! 🚀

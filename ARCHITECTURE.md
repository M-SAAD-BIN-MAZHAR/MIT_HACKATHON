# Web Agent API - Architecture Overview

## Vision
A browser-level SDK that makes AI a first-class capability, not a website feature. Users bring their own AI, preferences travel with them, and the browser mediates permissions and execution.

## Core Principles

### 1. Graduated Capability Tiers
- **Tier 1**: LLM access + MCP tool calling (text and structured outputs)
- **Tier 2**: Browser context and page interaction (read, navigate, act)
- **Tier 3**: Coordinated workflows (multiple agents with distinct roles)

### 2. Permission-First Design
- Permissions are scoped to tasks, not sessions
- Time-bounded grants with automatic expiry
- Explicit user confirmation for sensitive actions
- Audit trail for all agent actions

### 3. Browser as Coordinator
- Identity and context live in the browser
- Websites provide domain-specific tools (MCP servers)
- AI inference is user-controlled, not site-controlled
- Memory and preferences are portable

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (Popup, Side Panel, Voice Input, Accessibility)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Orchestration Layer                         │
│  (Agent Graph, Task Coordinator, Session Manager)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────┬──────────────────┬───────────────────┐
│   Agent Layer    │  Capability API  │   MCP Integration │
│  (Decision,      │  (Tier 1-3)      │   (Tool Calling)  │
│   Navigator,     │                  │                   │
│   Reader,        │                  │                   │
│   Executor)      │                  │                   │
└──────────────────┴──────────────────┴───────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Permission & Security Layer                 │
│  (Permission Manager, Audit Log, Sandbox)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Browser Primitives                       │
│  (Tabs, DOM, Storage, Network, Identity)                │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### Multi-Agent System
- **Decision Agent**: Plans workflows, reasons about goals
- **Navigator Agent**: Handles cross-site navigation
- **Reader Agent**: Extracts and structures page content
- **Executor Agent**: Performs browser actions
- **Retry Agent**: Recovers from failures
- **Memory Agent**: Maintains context across sessions
- **Voice Agent**: Natural language interface

### MCP Integration
- Connect to local and remote MCP servers
- Expose domain-specific tools from websites
- Route tool calls through permission system
- Support structured outputs and streaming

### Capability Tiers

**Tier 1: Core AI & Tooling**
- LLM access (OpenAI, local models, etc.)
- MCP tool calling
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

### Permission Model

**Permission Types:**
- `READ_PAGE`: Auto-granted, read-only access
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

**Audit Trail:**
- All actions logged with timestamp
- Permission grants tracked
- User can review and revoke at any time

## Data Flow

### 1. User Intent → Agent Activation
```
User: "Find flights to NYC under $300"
  ↓
Voice/Text Input → Intent Parser → Task Coordinator
  ↓
Create Task Context (goal, constraints, permissions)
```

### 2. Planning Phase
```
Decision Agent:
  - Analyze goal
  - Identify required sites (Google Flights, Kayak, etc.)
  - Plan navigation sequence
  - Request permissions
```

### 3. Execution Phase
```
For each site:
  Navigator → Navigate to site
  Reader → Extract page structure
  Decision → Plan actions
  Executor → Perform actions
  Memory → Store results
```

### 4. Coordination Phase
```
Memory Agent:
  - Aggregate results from multiple sites
  - Apply user preferences (budget, dates, etc.)
  - Rank and filter options
  
Decision Agent:
  - Present options to user
  - Handle follow-up actions
```

## Security Boundaries

### Isolation
- Each MCP server runs in isolated context
- Website tools cannot access browser APIs directly
- All actions mediated through permission system

### Validation
- Input sanitization for all user data
- Output validation for LLM responses
- Action verification before execution

### Audit
- Complete action history
- Permission grant log
- Error and failure tracking

## Extensibility

### MCP Server Protocol
Websites can expose tools via MCP:
```json
{
  "name": "search_products",
  "description": "Search for products on this site",
  "parameters": {
    "query": "string",
    "filters": "object"
  }
}
```

### Custom Agents
Users can define specialized agents:
```json
{
  "name": "accessibility-helper",
  "role": "Simplify and narrate page content",
  "capabilities": ["READ_PAGE", "VOICE_OUTPUT"],
  "triggers": ["page_load", "user_request"]
}
```

## Future Directions

1. **Federated Learning**: Learn from user behavior without sending data
2. **Collaborative Filtering**: Share anonymized preferences
3. **Progressive Enhancement**: Graceful degradation for unsupported sites
4. **Developer Tools**: Debug agent behavior, inspect decisions
5. **Marketplace**: Share and discover MCP tools and agents

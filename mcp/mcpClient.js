/**
 * MCP (Model Context Protocol) Client
 * Connects to local and remote MCP servers, routes tool calls through permission system.
 * Supports: stdio, HTTP, WebSocket transports.
 */

class MCPClient {
  constructor() {
    this.servers = new Map();
    this.tools = new Map();
    this.resources = new Map();
  }

  /**
   * Register an MCP server
   * @param {string} name - Server identifier
   * @param {object} config - Server configuration
   */
  async registerServer(name, config) {
    const server = {
      name,
      config,
      transport: config.transport || 'http',
      url: config.url,
      tools: [],
      resources: [],
      connected: false,
    };

    try {
      await this.connectServer(server);
      this.servers.set(name, server);
      await this.discoverCapabilities(server);
      return { success: true, server: name };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Connect to MCP server based on transport type
   */
  async connectServer(server) {
    if (server.transport === 'http' || server.transport === 'https') {
      // HTTP/HTTPS transport - simple fetch-based
      server.connected = true;
      return;
    }
    
    if (server.transport === 'websocket') {
      // WebSocket transport for streaming
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(server.url);
        ws.onopen = () => {
          server.ws = ws;
          server.connected = true;
          resolve();
        };
        ws.onerror = (err) => reject(err);
      });
    }

    throw new Error(`Unsupported transport: ${server.transport}`);
  }

  /**
   * Discover tools and resources from MCP server
   */
  async discoverCapabilities(server) {
    try {
      const response = await fetch(`${server.url}/mcp/capabilities`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to discover capabilities: ${response.status}`);
      }

      const data = await response.json();
      server.tools = data.tools || [];
      server.resources = data.resources || [];

      // Register tools globally
      server.tools.forEach((tool) => {
        this.tools.set(`${server.name}:${tool.name}`, {
          server: server.name,
          ...tool,
        });
      });

      // Register resources
      server.resources.forEach((resource) => {
        this.resources.set(`${server.name}:${resource.uri}`, {
          server: server.name,
          ...resource,
        });
      });

      return { tools: server.tools.length, resources: server.resources.length };
    } catch (err) {
      console.warn(`Failed to discover capabilities for ${server.name}:`, err);
      return { tools: 0, resources: 0 };
    }
  }

  /**
   * Call a tool on an MCP server
   * @param {string} toolName - Fully qualified tool name (server:tool)
   * @param {object} params - Tool parameters
   * @param {object} context - Execution context (permissions, user, etc.)
   */
  async callTool(toolName, params, context = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const server = this.servers.get(tool.server);
    if (!server || !server.connected) {
      throw new Error(`Server not connected: ${tool.server}`);
    }

    // Check permissions before calling tool
    const permissionCheck = await this.checkToolPermission(tool, context);
    if (!permissionCheck.allowed) {
      throw new Error(`Permission denied: ${permissionCheck.reason}`);
    }

    // Log tool call for audit
    await this.logToolCall(tool, params, context);

    try {
      const response = await fetch(`${server.url}/mcp/tools/${tool.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          params,
          context: {
            user: context.user,
            task: context.taskId,
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: ${response.status}`);
      }

      const result = await response.json();
      await this.logToolResult(tool, result, context);
      return result;
    } catch (err) {
      await this.logToolError(tool, err, context);
      throw err;
    }
  }

  /**
   * Check if tool call is permitted
   */
  async checkToolPermission(tool, context) {
    // Determine required permission based on tool capabilities
    const capabilities = tool.capabilities || [];
    let requiredPermission = 'READ_PAGE';

    if (capabilities.includes('write') || capabilities.includes('modify')) {
      requiredPermission = 'SUBMIT_ACTION';
    } else if (capabilities.includes('navigate')) {
      requiredPermission = 'NAVIGATE';
    } else if (capabilities.includes('form')) {
      requiredPermission = 'FILL_FORM';
    }

    // Check permission through permission manager
    const check = await checkPermission(requiredPermission, {
      url: context.url,
      taskId: context.taskId,
      tool: tool.name,
    });

    return check;
  }

  /**
   * Get a resource from an MCP server
   */
  async getResource(resourceUri, context = {}) {
    const resource = this.resources.get(resourceUri);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceUri}`);
    }

    const server = this.servers.get(resource.server);
    if (!server || !server.connected) {
      throw new Error(`Server not connected: ${resource.server}`);
    }

    const response = await fetch(`${server.url}/mcp/resources/${encodeURIComponent(resource.uri)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Resource fetch failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * List all available tools
   */
  listTools(serverName = null) {
    if (serverName) {
      return Array.from(this.tools.values()).filter((t) => t.server === serverName);
    }
    return Array.from(this.tools.values());
  }

  /**
   * List all available resources
   */
  listResources(serverName = null) {
    if (serverName) {
      return Array.from(this.resources.values()).filter((r) => r.server === serverName);
    }
    return Array.from(this.resources.values());
  }

  /**
   * Disconnect from a server
   */
  async disconnectServer(name) {
    const server = this.servers.get(name);
    if (!server) return;

    if (server.ws) {
      server.ws.close();
    }

    // Remove tools and resources
    server.tools.forEach((tool) => {
      this.tools.delete(`${name}:${tool.name}`);
    });
    server.resources.forEach((resource) => {
      this.resources.delete(`${name}:${resource.uri}`);
    });

    this.servers.delete(name);
  }

  /**
   * Audit logging
   */
  async logToolCall(tool, params, context) {
    const log = {
      type: 'tool_call',
      tool: tool.name,
      server: tool.server,
      params,
      context,
      timestamp: Date.now(),
    };
    await chrome.storage.local.get('mcp_audit_log').then((data) => {
      const logs = data.mcp_audit_log || [];
      logs.push(log);
      // Keep last 1000 entries
      if (logs.length > 1000) logs.shift();
      chrome.storage.local.set({ mcp_audit_log: logs });
    });
  }

  async logToolResult(tool, result, context) {
    const log = {
      type: 'tool_result',
      tool: tool.name,
      server: tool.server,
      success: true,
      context,
      timestamp: Date.now(),
    };
    await chrome.storage.local.get('mcp_audit_log').then((data) => {
      const logs = data.mcp_audit_log || [];
      logs.push(log);
      if (logs.length > 1000) logs.shift();
      chrome.storage.local.set({ mcp_audit_log: logs });
    });
  }

  async logToolError(tool, error, context) {
    const log = {
      type: 'tool_error',
      tool: tool.name,
      server: tool.server,
      error: error.message,
      context,
      timestamp: Date.now(),
    };
    await chrome.storage.local.get('mcp_audit_log').then((data) => {
      const logs = data.mcp_audit_log || [];
      logs.push(log);
      if (logs.length > 1000) logs.shift();
      chrome.storage.local.set({ mcp_audit_log: logs });
    });
  }
}

// Global MCP client instance
const mcpClient = new MCPClient();


#!/usr/bin/env node

/**
 * REAL MCP Server Implementation
 * This is a working MCP server that can be deployed on any website
 * 
 * Usage:
 * 1. Install: npm install express cors
 * 2. Run: node mcp/real-mcp-server.js
 * 3. Connect extension to: http://localhost:3001/mcp
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Enable CORS for browser extension
app.use(cors());
app.use(express.json());

// Store for demo purposes (in production, use database)
const demoData = {
  messages: [],
  products: [
    { id: '1', name: 'Laptop', price: 999, category: 'electronics' },
    { id: '2', name: 'Mouse', price: 29, category: 'electronics' },
    { id: '3', name: 'Keyboard', price: 79, category: 'electronics' },
  ],
  cart: [],
};

// ============================================
// MCP PROTOCOL ENDPOINTS
// ============================================

/**
 * GET /mcp/capabilities
 * Returns all available tools and resources
 */
app.get('/mcp/capabilities', (req, res) => {
  res.json({
    server: {
      name: 'demo-mcp-server',
      version: '1.0.0',
      description: 'Demo MCP server showing real integration',
    },
    tools: [
      {
        name: 'send_message',
        description: 'Send a message (like ChatGPT)',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to send',
            },
          },
          required: ['message'],
        },
        capabilities: ['write'],
      },
      {
        name: 'search_products',
        description: 'Search for products',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            max_price: {
              type: 'number',
              description: 'Maximum price filter',
            },
          },
          required: ['query'],
        },
        capabilities: ['read'],
      },
      {
        name: 'add_to_cart',
        description: 'Add product to cart',
        parameters: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Product ID',
            },
            quantity: {
              type: 'number',
              default: 1,
            },
          },
          required: ['product_id'],
        },
        capabilities: ['write', 'modify'],
      },
      {
        name: 'get_page_content',
        description: 'Get structured page content',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch',
            },
          },
          required: ['url'],
        },
        capabilities: ['read'],
      },
    ],
    resources: [
      {
        uri: 'messages://all',
        name: 'All Messages',
        description: 'All conversation messages',
      },
      {
        uri: 'products://catalog',
        name: 'Product Catalog',
        description: 'All available products',
      },
      {
        uri: 'cart://current',
        name: 'Shopping Cart',
        description: 'Current user cart',
      },
    ],
  });
});

/**
 * POST /mcp/tools/:toolName
 * Execute a specific tool
 */
app.post('/mcp/tools/:toolName', (req, res) => {
  const { toolName } = req.params;
  const { params, context } = req.body;

  console.log(`[MCP] Tool called: ${toolName}`, params);

  try {
    switch (toolName) {
      case 'send_message':
        return handleSendMessage(params, context, res);
      
      case 'search_products':
        return handleSearchProducts(params, context, res);
      
      case 'add_to_cart':
        return handleAddToCart(params, context, res);
      
      case 'get_page_content':
        return handleGetPageContent(params, context, res);
      
      default:
        res.status(404).json({ error: `Tool not found: ${toolName}` });
    }
  } catch (error) {
    console.error(`[MCP] Error in ${toolName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /mcp/resources/:resourceUri
 * Get a specific resource
 */
app.get('/mcp/resources/:resourceUri', (req, res) => {
  const { resourceUri } = req.params;
  
  console.log(`[MCP] Resource requested: ${resourceUri}`);

  try {
    switch (resourceUri) {
      case 'messages://all':
        res.json({ messages: demoData.messages });
        break;
      
      case 'products://catalog':
        res.json({ products: demoData.products });
        break;
      
      case 'cart://current':
        res.json({ cart: demoData.cart });
        break;
      
      default:
        res.status(404).json({ error: `Resource not found: ${resourceUri}` });
    }
  } catch (error) {
    console.error(`[MCP] Error fetching resource:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

function handleSendMessage(params, context, res) {
  const { message } = params;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Store message
  const msg = {
    id: Date.now().toString(),
    text: message,
    timestamp: new Date().toISOString(),
    user: context?.user || 'anonymous',
  };
  
  demoData.messages.push(msg);

  // Simulate AI response
  const response = {
    id: (Date.now() + 1).toString(),
    text: `Echo: ${message}`,
    timestamp: new Date().toISOString(),
    user: 'assistant',
  };
  
  demoData.messages.push(response);

  res.json({
    success: true,
    message: msg,
    response: response,
  });
}

function handleSearchProducts(params, context, res) {
  const { query, max_price } = params;
  
  let results = demoData.products;

  // Filter by query
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    );
  }

  // Filter by price
  if (max_price) {
    results = results.filter(p => p.price <= max_price);
  }

  res.json({
    success: true,
    query,
    count: results.length,
    products: results,
  });
}

function handleAddToCart(params, context, res) {
  const { product_id, quantity = 1 } = params;
  
  const product = demoData.products.find(p => p.id === product_id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Add to cart
  const cartItem = {
    product_id,
    product_name: product.name,
    price: product.price,
    quantity,
    added_at: new Date().toISOString(),
  };
  
  demoData.cart.push(cartItem);

  res.json({
    success: true,
    cart_item: cartItem,
    cart_total: demoData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  });
}

function handleGetPageContent(params, context, res) {
  const { url } = params;
  
  // In production, this would fetch and parse the actual page
  // For demo, return mock data
  res.json({
    success: true,
    url,
    content: {
      title: 'Demo Page',
      headings: ['Welcome', 'Products', 'About'],
      links: [
        { text: 'Home', href: '/' },
        { text: 'Products', href: '/products' },
      ],
      forms: [],
    },
  });
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('🚀  REAL MCP SERVER RUNNING');
  console.log('🚀 ========================================');
  console.log('');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔌 MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log('');
  console.log('📋 Available Tools:');
  console.log('   • send_message - Send a message');
  console.log('   • search_products - Search products');
  console.log('   • add_to_cart - Add to cart');
  console.log('   • get_page_content - Get page content');
  console.log('');
  console.log('📦 Available Resources:');
  console.log('   • messages://all - All messages');
  console.log('   • products://catalog - Product catalog');
  console.log('   • cart://current - Shopping cart');
  console.log('');
  console.log('🧪 Test Commands:');
  console.log('');
  console.log('1. Get capabilities:');
  console.log(`   curl http://localhost:${PORT}/mcp/capabilities`);
  console.log('');
  console.log('2. Send message:');
  console.log(`   curl -X POST http://localhost:${PORT}/mcp/tools/send_message \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"params":{"message":"Hello World"}}'`);
  console.log('');
  console.log('3. Search products:');
  console.log(`   curl -X POST http://localhost:${PORT}/mcp/tools/search_products \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"params":{"query":"laptop","max_price":1000}}'`);
  console.log('');
  console.log('🔗 Connect from Extension:');
  console.log('   chrome.runtime.sendMessage({');
  console.log('     type: "MCP_REGISTER_SERVER",');
  console.log('     name: "demo-mcp",');
  console.log(`     config: { transport: "http", url: "http://localhost:${PORT}/mcp" }`);
  console.log('   });');
  console.log('');
  console.log('✅ Server ready! Connect your extension now.');
  console.log('');
});

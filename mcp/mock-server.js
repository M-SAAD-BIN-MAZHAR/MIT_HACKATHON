/**
 * Mock MCP Server for Testing
 * Run with: node mcp/mock-server.js
 * Then connect extension to: http://localhost:3000/mcp
 */

const http = require('http');
const url = require('url');

const PORT = 3000;

// Mock data
const mockWeather = {
  'New York': { temp: 72, condition: 'Sunny', humidity: 45 },
  'London': { temp: 15, condition: 'Cloudy', humidity: 70 },
  'Tokyo': { temp: 25, condition: 'Clear', humidity: 60 }
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // MCP Capabilities endpoint
  if (parsedUrl.pathname === '/mcp/capabilities' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tools: [
        {
          name: 'get_weather',
          description: 'Get current weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'City name' },
              units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' }
            },
            required: ['location']
          },
          capabilities: ['read']
        }
      ],
      resources: [
        {
          uri: 'weather://current',
          name: 'Current Weather',
          description: 'Real-time weather data'
        }
      ]
    }));
    return;
  }

  // MCP Tool execution endpoint
  if (parsedUrl.pathname === '/mcp/tools/get_weather' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const location = data.params?.location || 'New York';
        const weather = mockWeather[location] || mockWeather['New York'];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          location,
          ...weather,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Mock MCP Server running at http://localhost:${PORT}/mcp`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/mcp/capabilities`);
  console.log(`  POST http://localhost:${PORT}/mcp/tools/get_weather`);
  console.log('');
  console.log('Test with:');
  console.log(`  curl http://localhost:${PORT}/mcp/capabilities`);
  console.log('');
  console.log('Connect from extension:');
  console.log('  1. Open extension');
  console.log('  2. Run: chrome.runtime.sendMessage({');
  console.log('       type: "MCP_REGISTER_SERVER",');
  console.log('       name: "weather-mcp",');
  console.log('       config: { transport: "http", url: "http://localhost:3000/mcp" }');
  console.log('     })');
});

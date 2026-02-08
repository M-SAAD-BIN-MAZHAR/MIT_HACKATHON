#!/bin/bash

echo "🧪 Testing MCP Integration"
echo "=========================="
echo ""

# Check if MCP server is running
echo "1. Checking MCP server..."
if curl -s http://localhost:3001/mcp/capabilities > /dev/null 2>&1; then
    echo "   ✅ MCP server is running"
else
    echo "   ❌ MCP server is NOT running"
    echo "   💡 Start it with: cd mcp && npm start"
    exit 1
fi

echo ""
echo "2. Testing capabilities endpoint..."
CAPABILITIES=$(curl -s http://localhost:3001/mcp/capabilities)
echo "   Response: $CAPABILITIES"

TOOL_COUNT=$(echo $CAPABILITIES | grep -o '"name"' | wc -l)
echo "   ✅ Found $TOOL_COUNT tools"

echo ""
echo "3. Testing send_message tool..."
RESULT=$(curl -s -X POST http://localhost:3001/mcp/tools/send_message \
  -H "Content-Type: application/json" \
  -d '{"params":{"message":"Hello from test script"}}')
echo "   Response: $RESULT"

if echo $RESULT | grep -q "success"; then
    echo "   ✅ send_message works"
else
    echo "   ❌ send_message failed"
fi

echo ""
echo "4. Testing search_products tool..."
RESULT=$(curl -s -X POST http://localhost:3001/mcp/tools/search_products \
  -H "Content-Type: application/json" \
  -d '{"params":{"query":"laptop","max_price":1000}}')
echo "   Response: $RESULT"

if echo $RESULT | grep -q "products"; then
    echo "   ✅ search_products works"
else
    echo "   ❌ search_products failed"
fi

echo ""
echo "5. Testing add_to_cart tool..."
RESULT=$(curl -s -X POST http://localhost:3001/mcp/tools/add_to_cart \
  -H "Content-Type: application/json" \
  -d '{"params":{"product_id":"1","quantity":2}}')
echo "   Response: $RESULT"

if echo $RESULT | grep -q "success"; then
    echo "   ✅ add_to_cart works"
else
    echo "   ❌ add_to_cart failed"
fi

echo ""
echo "6. Testing get_page_content tool..."
RESULT=$(curl -s -X POST http://localhost:3001/mcp/tools/get_page_content \
  -H "Content-Type: application/json" \
  -d '{"params":{"url":"https://example.com"}}')
echo "   Response: $RESULT"

if echo $RESULT | grep -q "content"; then
    echo "   ✅ get_page_content works"
else
    echo "   ❌ get_page_content failed"
fi

echo ""
echo "=========================="
echo "✅ All MCP tests passed!"
echo ""
echo "Next steps:"
echo "1. Load extension in Chrome: chrome://extensions"
echo "2. Check console for: ✅ MCP server connected"
echo "3. Try command: 'send a message saying hello world'"
echo ""

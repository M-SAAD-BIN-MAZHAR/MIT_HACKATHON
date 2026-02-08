#!/bin/bash

echo "🔍 Checking JavaScript syntax..."
echo ""

errors=0

# Check all JavaScript files
for file in orchestrator-v2.js \
            agents/*.js \
            capabilities/*.js \
            content/*.js \
            graph/*.js \
            llm/*.js \
            mcp/mcpClient.js \
            permissions/*.js \
            ui/*.js; do
    if [ -f "$file" ]; then
        echo -n "Checking $file... "
        if node --check "$file" 2>/dev/null; then
            echo "✅"
        else
            echo "❌ SYNTAX ERROR"
            node --check "$file"
            errors=$((errors + 1))
        fi
    fi
done

echo ""
if [ $errors -eq 0 ]; then
    echo "✅ All files passed syntax check!"
    echo ""
    echo "🚀 Ready to load in Chrome!"
    echo ""
    echo "Next steps:"
    echo "1. Open Chrome and go to: chrome://extensions"
    echo "2. Enable 'Developer mode' (top right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select this folder"
else
    echo "❌ Found $errors file(s) with syntax errors"
    echo "Please fix the errors above before loading the extension"
fi

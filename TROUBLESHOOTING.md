# Troubleshooting Guide

## Common Issues & Solutions

### ❌ "tier: Action blocked"

**Problem**: Tier system is blocking the action

**Solutions**:
1. **Reload extension** - The fix sets default to Tier 3
2. **Enable Trust Mode** - Check "Trust mode" in popup
3. **Manual override**:
   ```javascript
   chrome.storage.local.set({ uwa_capability_tier: 3 });
   ```

---

### ❌ "LLM API key not set"

**Problem**: No API key configured

**Solution**:
1. Click extension icon
2. Enter your OpenAI API key in the "LLM API Key" field
3. Key is saved automatically on blur

**Get API key**: https://platform.openai.com/api-keys

---

### ❌ "Async response error"

**Problem**: Message channel closed before response

**Solution**: Already fixed in FIXES.md - reload extension

---

### ❌ Actions not executing

**Checklist**:
- [ ] API key is set
- [ ] Tier is set to 3 (or Trust Mode enabled)
- [ ] You're on a webpage (not chrome:// pages)
- [ ] Extension has permissions
- [ ] No console errors

**Debug**:
1. Open console (F12)
2. Look for red errors
3. Check what step failed

---

### ❌ "Selector not found"

**Problem**: Page structure different than expected

**What happens**:
- Retry agent tries alternatives (up to 5 times)
- If all fail, action is skipped

**Solutions**:
- Try a simpler goal
- Check if page loaded completely
- Some sites have anti-bot protection

---

### ❌ ChatGPT not working

**Checklist**:
- [ ] You're logged into ChatGPT
- [ ] Page fully loaded (wait 6 seconds)
- [ ] ChatGPT didn't change their HTML

**Common issues**:
- Not logged in → Shows login page
- Page slow → Increase wait time
- HTML changed → Selectors break

---

### ❌ Voice overlay not appearing

**Problem**: Ctrl+Shift+V doesn't show overlay

**Solutions**:
1. Check browser supports Web Speech API
2. Reload page
3. Check console for errors
4. Try different website

---

### ❌ Memory not persisting

**Problem**: Preferences not remembered

**Solutions**:
1. Check "Memory & Learning" is enabled in settings
2. Verify chrome.storage.local permissions
3. Check console for storage errors

---

## 🔍 Debugging Steps

### Step 1: Check Extension Loaded
```
chrome://extensions
→ Find "Web Agent API"
→ Should be enabled
→ No errors shown
```

### Step 2: Check Console
```
Right-click extension icon
→ Inspect popup
→ Console tab
→ Look for errors
```

### Step 3: Check Background Service Worker
```
chrome://extensions
→ Click "service worker" link
→ Console tab
→ Look for errors
```

### Step 4: Test Basic Functionality
```javascript
// In extension console
chrome.runtime.sendMessage({
  type: 'START_SESSION',
  userGoal: 'test'
}, console.log);
```

---

## 📊 Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| "LLM API key not set" | No API key | Enter API key |
| "tier: Action blocked" | Tier too low | Set tier to 3 |
| "Selector not found" | Element missing | Retry or different goal |
| "Permission denied" | User denied | Grant permission |
| "No active tab" | No tab open | Open a webpage |
| "Service worker registration failed" | Load error | Check file paths |

---

## 🎯 Quick Fixes

### Reset Everything
```javascript
// Clear all storage
chrome.storage.local.clear();

// Reload extension
// Then reconfigure API key
```

### Force Tier 3
```javascript
chrome.storage.local.set({ 
  uwa_capability_tier: 3,
  uwa_trust_mode: true 
});
```

### Check What's Stored
```javascript
chrome.storage.local.get(null, console.log);
```

---

## 💡 Tips

1. **Start Simple**: Try "Search for test" before complex goals
2. **Check Logs**: Feed shows what's happening
3. **Use Trust Mode**: For testing, enable trust mode
4. **Reload Often**: After code changes, reload extension
5. **Check Console**: Most errors show in console

---

## 🆘 Still Not Working?

1. **Check all files exist**:
   ```bash
   ls -la agents/ capabilities/ content/ mcp/ ui/
   ```

2. **Verify no syntax errors**:
   ```bash
   ./test-syntax.sh
   ```

3. **Check manifest.json**:
   - Valid JSON
   - All paths correct
   - Permissions listed

4. **Try old orchestrator**:
   - Change manifest.json: `"service_worker": "orchestrator.js"`
   - Reload extension

---

**If all else fails**: Check FIXES.md for recent fixes applied

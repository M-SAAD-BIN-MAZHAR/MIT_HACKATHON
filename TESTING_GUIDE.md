# 🧪 Testing Guide - Web Agent Extension

## ✅ Fixes Applied

### Problem
The extension could open websites (like ChatGPT) but couldn't interact with them:
- ❌ Error: "Selector not found: textarea"
- ❌ ChatGPT uses contenteditable divs, not textareas
- ❌ Selectors were too specific and broke when sites updated

### Solution
Enhanced the executor with smart fallback logic:
1. **Flexible Element Finding** - Tries multiple selector strategies
2. **ContentEditable Support** - Properly handles ChatGPT-style inputs
3. **Button Text Matching** - Finds buttons by text content
4. **Generic Selectors** - Works with simple selectors like "textarea" or "button"

## 🚀 How to Test

### Step 1: Load the Extension
1. Open Chrome/Edge
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select this folder

### Step 2: Test on Local Page
1. Open `test-page.html` in your browser
2. Click the extension icon to open the side panel
3. Try these commands:

```
write hello world
```
**Expected:** Types "hello world" in the textarea

```
click send
```
**Expected:** Clicks the Send Message button

```
type test in chat
```
**Expected:** Types "test" in the contenteditable div (ChatGPT-style)

### Step 3: Test on Real ChatGPT
1. Make sure you have an OpenAI API key configured
2. Try this command:

```
open ChatGPT and write hello world
```

**Expected:**
1. ✅ Navigates to https://chat.openai.com
2. ✅ Waits for page to load (8 seconds)
3. ✅ Finds the input field (contenteditable or textarea)
4. ✅ Types "hello world"
5. ✅ Clicks the send button

### Step 4: Test on Google
```
open Google and search for AI
```

**Expected:**
1. ✅ Navigates to https://www.google.com
2. ✅ Types "AI" in search box
3. ✅ Clicks search button

## 🔧 Configuration

### Required Settings
1. Click extension icon
2. Go to Settings tab
3. Enter your OpenAI API key
4. (Optional) Enable Trust Mode for auto-execution

### Trust Mode
- **OFF**: You approve each action
- **ON**: Actions execute automatically

## 🐛 Troubleshooting

### Issue: "Selector not found"
**Solution:** The new code has fallback logic, but if it still fails:
- Check if the page is fully loaded
- Try a simpler command first
- Check browser console for errors

### Issue: Types but doesn't click
**Solution:** 
- The extension now waits 500ms after typing
- Make sure the button is visible on the page
- Try clicking manually to verify the button works

### Issue: ChatGPT doesn't work
**Checklist:**
- [ ] You're logged into ChatGPT
- [ ] Page fully loaded (wait 8 seconds)
- [ ] Extension has permissions for the site
- [ ] Check if ChatGPT changed their UI again

## 📊 What Changed

### Files Modified
1. **content/executor.js** - Added smart element finding and contenteditable support
2. **agents/decisionAgent.js** - Simplified selectors, better ChatGPT handling
3. **content/reader.js** - Better detection of contenteditable elements
4. **orchestrator-v2.js** - Added delay after TYPE actions
5. **test-page.html** - Enhanced with contenteditable test cases

### Key Improvements
- ✅ Handles contenteditable divs (ChatGPT, modern chat apps)
- ✅ Fallback selector strategies (finds elements even with generic selectors)
- ✅ Button text matching (finds "Send" button by text)
- ✅ Better event triggering (input, change, keydown, keyup)
- ✅ Delay after typing (ensures content is registered)

## 🎯 Test Cases

### Basic Tests
- [x] Type in regular textarea
- [x] Type in contenteditable div
- [x] Click button by selector
- [x] Click button by text
- [x] Submit form

### Advanced Tests
- [x] Navigate to ChatGPT and type
- [x] Navigate to Google and search
- [x] Handle missing elements gracefully
- [x] Work with generic selectors

### Edge Cases
- [x] Empty input fields
- [x] Hidden elements
- [x] Dynamic content (JS-rendered)
- [x] Multiple inputs on page

## 📝 Notes

### Why Generic Selectors Work Now
The old code used `document.querySelector(selector)` which required exact matches.

The new code tries multiple strategies:
1. Exact selector match
2. Generic type match (all textareas)
3. Contenteditable elements
4. Button text matching
5. Fallback to first available element

### ChatGPT Compatibility
ChatGPT uses a contenteditable div, not a textarea. The new code:
- Detects contenteditable elements
- Uses proper event triggering
- Clears existing content before typing
- Triggers input, change, keydown, and keyup events

## 🚀 Next Steps

### For Production
1. Add more robust error handling
2. Implement retry logic with different selectors
3. Add visual feedback when typing
4. Support for more complex interactions (drag, hover, etc.)

### For Hackathon Demo
1. Test on test-page.html first
2. Show it working with contenteditable
3. Then demo on real ChatGPT
4. Explain the fallback logic

## 📚 Resources

- [MDN: ContentEditable](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)
- [Chrome Extensions: Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [DOM Events](https://developer.mozilla.org/en-US/docs/Web/Events)

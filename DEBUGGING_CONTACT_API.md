# 🔧 DEBUGGING STEPS - Contact API 404 Error

## Problem
Getting 404 error when trying to add contact: "User or company not found"

## Steps to Debug

### Step 1: Hard Refresh Browser
**IMPORTANT:** The browser may be using cached JavaScript code.

1. Open your app in the browser (http://localhost:5173 or wherever it's running)
2. **Do a HARD REFRESH:**
   - **Windows/Linux:** Press `Ctrl + Shift + R` or `Ctrl + F5`
   - **Mac:** Press `Cmd + Shift + R`
3. If that doesn't work, **Clear Cache:**
   - Open DevTools (F12)
   - Right-click on the reload button
   - Select "Empty Cache and Hard Reload"

### Step 2: Open Test Page
1. Open this file in your browser: `d:\b2b Main web\b2bbillings\Frontend\test-contact-api.html`
2. Click "Check localStorage" button
3. **COPY AND SEND ME** the output from this step
4. Click "Test Create Contact" button
5. **COPY AND SEND ME** the output from this step

### Step 3: Check Browser Console Logs
1. Open your main app (where TeamChats is)
2. Open Browser DevTools (Press F12)
3. Go to the Console tab
4. Try to add a contact again
5. Look for these logs:
   - `🔍 DEBUG - Context:` 
   - `🔍 Contact API Request:`
6. **COPY AND SEND ME** both of these log outputs

### Step 4: Check Network Tab
1. In DevTools, go to Network tab
2. Try to add a contact again
3. Find the request to `/api/contacts` (it will be red/failed)
4. Click on it
5. Go to "Headers" tab
6. **COPY AND SEND ME:**
   - Request URL
   - Request Headers (especially Authorization and x-company-id)
7. Go to "Response" tab
8. **COPY AND SEND ME** the response body

## What I Need From You

Please send me:
1. ✅ Output from test-contact-api.html (both localStorage check and API test)
2. ✅ Console logs showing the `🔍 DEBUG - Context:` log
3. ✅ Console logs showing the `🔍 Contact API Request:` log  
4. ✅ Network tab details (URL, headers, response)

## Quick Checks

Run these in Browser Console (F12 → Console tab):

```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token') ? 'EXISTS (length: ' + localStorage.getItem('token').length + ')' : 'MISSING');

// Check if company exists
console.log('Company:', localStorage.getItem('selectedCompany'));

// Try to parse company
try {
  const raw = localStorage.getItem('selectedCompany');
  const parsed = JSON.parse(raw);
  console.log('Parsed company:', parsed);
  console.log('Company ID:', parsed?.id || parsed?._id || raw);
} catch (e) {
  console.log('Company parse error:', e.message);
  console.log('Raw value:', localStorage.getItem('selectedCompany'));
}
```

Copy the output and send it to me!

## Expected Values

✅ **Token should:** 
- Exist in localStorage
- Be a JWT string (looks like: `eyJhbGciOiJIUzI1NiIs...`)
- Length > 100 characters

✅ **selectedCompany should:**
- Exist in localStorage
- Be either:
  - A 24-character hex string (MongoDB ObjectId): `507f1f77bcf86cd799439011`
  - OR a JSON object: `{"id": "507f1f77bcf86cd799439011", "name": "..."}`

## If Values Are Missing

If token or selectedCompany are missing:
1. You need to **login again** in the app
2. After login, **select a company**
3. Then try adding contact again

# 🏦 Bank Account Setup & Testing Guide

## 🚀 Quick Start

### 1. Start Backend
```powershell
cd Backend
npm install
npm start
```
Backend should run on: `http://localhost:5000`

### 2. Start Frontend
```powershell
cd Frontend
npm install
npm run dev
```
Frontend should run on: `http://localhost:5173` or similar

---

## 🔍 Troubleshooting Company ID Issue

### Problem: "Please select a company first"

This error occurs when the company ID is not found in localStorage/sessionStorage.

### Solution Steps:

#### Option 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs starting with `🏢 Bank Account Dashboard`
4. Check which storage keys are available

#### Option 2: Manually Set Company ID (For Testing)
Open browser console and run:

```javascript
// Method 1: Set company ID directly
localStorage.setItem('selectedCompanyId', 'YOUR_COMPANY_ID_HERE');

// Method 2: Set as JSON object
localStorage.setItem('selectedCompany', JSON.stringify({ 
  _id: 'YOUR_COMPANY_ID_HERE',
  name: 'Your Company Name'
}));

// Then refresh the page
location.reload();
```

#### Option 3: Get Company ID from Database
1. Check your MongoDB database
2. Find your company document in the `companies` collection
3. Copy the `_id` value
4. Use one of the methods above to set it

#### Option 4: Check Company Selection Flow
Look for where companies are selected in your app:
- Login page
- Company selector dropdown
- Dashboard
- Settings page

The company ID should be set when user selects a company.

---

## ✅ Testing Checklist

### Before Testing Form:
- [ ] Backend is running
- [ ] Frontend is running
- [ ] Company ID is set in localStorage
- [ ] User is logged in (token exists)
- [ ] No console errors

### Form Testing:
- [ ] Navigate to Bank Accounts page
- [ ] Click "Add Bank Account" button
- [ ] Fill in required fields marked with *
- [ ] Test keyboard shortcuts:
  - ALT + S (Save)
  - ALT + C (Cancel)
  - ALT + D (Discard)
  - ESC (Close)
- [ ] Toggle account number visibility
- [ ] Change Active/Inactive status
- [ ] Submit form
- [ ] Check console for success message
- [ ] Verify data appears in list

### Database Verification:
```javascript
// In MongoDB or using backend API
db.bankaccounts.find({ companyId: "YOUR_COMPANY_ID" })
```

Should see document with all fields:
- accountDisplayName
- shortName
- email
- mobileNo
- accountHolderName
- accountNumber
- ifscCode
- bankName
- branchName
- branchAddress
- openingBalance
- balanceType
- status
- notes

---

## 🔑 Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| Account Display Name | ✅ | Main identifier |
| Account Holder Name | ✅ | Person/Company name |
| Account Number | ✅ | Bank account number |
| IFSC Code | ✅ | 11-character code |
| Bank Name | ✅ | Name of the bank |

---

## 🎹 Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| ALT + S | Save form | When in form |
| ALT + C | Cancel | When in form |
| ALT + D | Discard | When in form |
| ESC | Close/Cancel | When in form |
| ← / → | Toggle status | When focused on status |

---

## 📊 Expected API Endpoints

```
GET    /api/companies/:companyId/bank-accounts
POST   /api/companies/:companyId/bank-accounts
GET    /api/companies/:companyId/bank-accounts/:accountId
PUT    /api/companies/:companyId/bank-accounts/:accountId
DELETE /api/companies/:companyId/bank-accounts/:accountId
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Company ID Not Found
**Fix:** Check console logs and set company ID manually (see Option 2 above)

### Issue 2: CORS Error
**Fix:** Ensure backend CORS is configured for frontend URL

### Issue 3: 401 Unauthorized
**Fix:** Check that auth token exists in localStorage

### Issue 4: Validation Errors
**Fix:** Ensure all required fields are filled correctly

### Issue 5: IFSC Code Format Error
**Fix:** IFSC must be 11 characters: ABCD0123456 (4 letters, 0, 6 alphanumeric)

---

## 📞 Need Help?

1. Check browser console for detailed error messages
2. Check backend logs for API errors
3. Verify MongoDB connection
4. Check network tab in DevTools for API calls
5. Review this guide's troubleshooting section

---

## ✨ Features Implemented

- ✅ Full form with all fields
- ✅ Keyboard shortcuts with visual display
- ✅ Form validation
- ✅ Account number show/hide toggle
- ✅ Status toggle (Active/Inactive)
- ✅ Opening balance with Dr/Cr
- ✅ Auto-uppercase IFSC code
- ✅ Bank name suggestions
- ✅ Responsive design
- ✅ Error handling
- ✅ Success notifications
- ✅ Database integration

---

Good luck! 🚀

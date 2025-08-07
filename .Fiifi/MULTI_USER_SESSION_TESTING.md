# Multi-User Session Management Testing Guide

## 🎯 **Testing Scenario: Multiple Users on Same Device**

### **Problem Solved:**
- Multiple users can now use the same device without session conflicts
- No persistent sessions after logout
- Clean login page for new users
- No auto-sign-in of previous user

## 🧪 **Testing Steps:**

### **1. Initial Setup Test**
```bash
# Start the development server
npm run dev
```

### **2. User A Login Test**
1. **Navigate to:** `http://localhost:5173/login`
2. **Login as User A** (e.g., `afiifi@qna336.onmicrosoft.com`)
3. **Verify:** User A is logged in and can access dashboard
4. **Check Console:** Should see authentication logs

### **3. User A Logout Test**
1. **Click Logout** in the application
2. **Verify:** 
   - User is redirected to login page
   - URL contains `?logout=true&forceReLogin=true`
   - No auto-sign-in occurs
   - Clean login form is shown

### **4. User B Login Test**
1. **Open same browser/device** (or new tab)
2. **Navigate to:** `http://localhost:5173/login`
3. **Verify:**
   - No auto-sign-in of User A
   - Clean login form is shown
   - No previous user data is visible
4. **Login as User B** (different account)
5. **Verify:** User B can log in successfully

### **5. Session Clearing Verification**
1. **Open Browser DevTools** → Application tab
2. **Check Storage:**
   - localStorage should be empty (or minimal)
   - sessionStorage should be empty (or minimal)
   - No MSAL-related keys should persist
3. **Check Cookies:** Should be minimal or empty

### **6. Force Re-authentication Test**
1. **Navigate to:** `http://localhost:5173/login?forceReLogin=true`
2. **Verify:** 
   - All session data is cleared
   - User must enter credentials again
   - No cached login information

## 🔧 **Technical Verification:**

### **Console Logs to Check:**
```javascript
// Should see these logs during logout:
[Auth] Starting logout process...
[SessionUtils] Starting comprehensive session clearing...
[SessionUtils] ✅ Cleared localStorage, sessionStorage, and MSAL keys
[SessionUtils] ✅ Cleared cookies
[SessionUtils] ✅ Cleared MSAL cache
[SessionUtils] ✅ Cleared application cache
[SessionUtils] ✅ Session clearing completed

// Should see these logs during login after logout:
[Auth] Returning from logout redirect
[Auth] Failed to clear MSAL cache: (if any)
[Auth] Loading staff IDs only...
```

### **Session Status Check:**
```javascript
// In browser console:
import { getSessionStatus, isSessionCleared } from '@/utils/sessionUtils';
console.log('Session Status:', getSessionStatus());
console.log('Session Cleared:', isSessionCleared());
```

## 🧪 **Advanced Testing:**

### **1. Multiple Tab Test**
1. **Open multiple tabs** with different users
2. **Logout from one tab**
3. **Verify:** Other tabs also clear their sessions

### **2. Browser Restart Test**
1. **Login as User A**
2. **Close browser completely**
3. **Reopen browser**
4. **Navigate to login page**
5. **Verify:** No auto-sign-in occurs

### **3. Network Interruption Test**
1. **Login as User A**
2. **Disconnect network**
3. **Try to logout**
4. **Verify:** Fallback logout still works
5. **Reconnect network**
6. **Verify:** Clean login page

### **4. Cache Persistence Test**
1. **Login as User A**
2. **Use application features** (create data, upload files)
3. **Logout**
4. **Login as User B**
5. **Verify:** No User A's data is visible to User B

## 🚨 **Expected Behaviors:**

### **✅ Success Indicators:**
- Clean login page after logout
- No auto-sign-in of previous user
- Fast authentication process
- Proper error handling without false alarms
- Session data completely cleared

### **❌ Failure Indicators:**
- Auto-sign-in of previous user
- Persistent session data
- Slow authentication process
- False error messages
- User A's data visible to User B

## 🔍 **Debugging Tools:**

### **Session Test Component:**
Navigate to: `/session-test` (if route exists)
- Check session status
- Clear session data manually
- Test logout functionality
- Force re-login

### **Browser DevTools:**
1. **Application Tab:**
   - localStorage
   - sessionStorage
   - Cookies
   - IndexedDB

2. **Console Tab:**
   - Authentication logs
   - Session clearing logs
   - Error messages

### **Network Tab:**
- Check authentication requests
- Verify redirect URLs
- Monitor logout requests

## 📋 **Test Checklist:**

- [ ] **User A can login successfully**
- [ ] **User A can logout completely**
- [ ] **No auto-sign-in after logout**
- [ ] **User B can login on same device**
- [ ] **No User A data visible to User B**
- [ ] **Session data is completely cleared**
- [ ] **Force re-login works correctly**
- [ ] **Multiple tabs handle logout properly**
- [ ] **Browser restart doesn't auto-login**
- [ ] **Network interruptions handled gracefully**

## 🎯 **Success Criteria:**

1. **Multiple users can use the same device**
2. **No session conflicts between users**
3. **Complete session clearing on logout**
4. **Clean login experience for new users**
5. **Fast and reliable authentication**
6. **Proper error handling**

## 🔧 **Troubleshooting:**

### **If Auto-sign-in Still Occurs:**
1. Check MSAL cache configuration
2. Verify sessionStorage is being used
3. Clear browser cache completely
4. Check for persistent cookies

### **If Session Data Persists:**
1. Verify session clearing utility
2. Check IndexedDB cache clearing
3. Monitor console for clearing errors
4. Test with different browsers

### **If Authentication is Slow:**
1. Check timeout configurations
2. Monitor network requests
3. Verify MSAL initialization
4. Check for hanging promises

## 📝 **Notes:**

- **sessionStorage** is used instead of localStorage for MSAL cache
- **Comprehensive session clearing** includes all browser storage
- **Force re-authentication** prevents auto-login
- **Timeout protection** prevents hanging during auth
- **Error handling** distinguishes between actual errors and expected scenarios 
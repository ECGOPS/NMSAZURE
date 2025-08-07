# 🔐 Advanced Authentication System with Smart Name Mapping - IMPLEMENTED

## ✅ **COMPREHENSIVE AUTHENTICATION FLOW WITH NAME MAPPING**

### **1. Authentication: User authenticates via Azure AD**
- ✅ **Azure AD Login** - Users authenticate through Microsoft Azure AD
- ✅ **JWT Token Acquisition** - Frontend acquires valid JWT tokens with timeout
- ✅ **Token Validation** - Backend validates JWT tokens using `express-oauth2-jwt-bearer`

### **2. ID Lookup: Try to find user by Azure AD ID first**
- ✅ **Primary Lookup** - Backend queries database by `uid = req.auth.payload.sub`
- ✅ **Exact Match** - If found, user gets immediate access with existing role
- ✅ **Logging** - Proper logging for authentication events

### **3. Email Lookup: If not found by ID, try by email**
- ✅ **Fallback Lookup** - Backend queries database by email address
- ✅ **Smart Name Mapping** - Configurable name mapping strategies
- ✅ **UID Update** - Updates existing user's UID to match JWT token
- ✅ **Data Preservation** - Preserves all existing user data (role, region, district, etc.)

### **4. Existing User: If found, preserve data and apply smart name mapping**
- ✅ **Data Preservation** - All existing user data is preserved
- ✅ **Configurable Name Mapping** - 4 different strategies available
- ✅ **UID Synchronization** - Updates UID to match current JWT token
- ✅ **Role Retention** - User keeps their existing role (district_engineer, system_admin, etc.)

### **5. New User: If not found, create with pending role and pre_registered status**
- ✅ **Pending Role** - New users get `role: 'pending'`
- ✅ **Pre-registered Status** - New users get `status: 'pre_registered'`
- ✅ **Complete User Data** - All required fields are populated
- ✅ **Database Creation** - User is created in Cosmos DB

### **6. Access Control: New users are redirected to pending approval page, existing users get immediate access**
- ✅ **Frontend Role Detection** - Frontend fetches actual user role from `/api/users/me`
- ✅ **Pending User Redirect** - Users with `role: 'pending'` or `status: 'pre_registered'` go to approval page
- ✅ **Approved User Access** - Users with proper roles go directly to dashboard
- ✅ **Protected Routes** - All routes check user role and status

## 🔧 **NAME MAPPING STRATEGIES**

### **Configuration Options:**
```javascript
export const NAME_MAPPING_CONFIG = {
  strategy: import.meta.env.VITE_NAME_MAPPING_STRATEGY || 'app_first',
  autoCorrectNames: import.meta.env.VITE_AUTO_CORRECT_NAMES === 'true',
  showNameCorrectionNotifications: import.meta.env.VITE_SHOW_NAME_CORRECTIONS === 'true'
};
```

### **Available Strategies:**

#### **1. `app_first` (Default)**
- **Behavior**: Always use app name if it exists, fallback to Azure AD
- **Use Case**: Preserve existing app names, only use Azure AD as backup
- **Notifications**: Warns when names don't match but uses app name
- **Example**: App="John Smith" vs Azure="John" → Uses "John Smith"

#### **2. `azure_first`**
- **Behavior**: Always use Azure AD name, fallback to app name
- **Use Case**: Keep names synchronized with Azure AD
- **Notifications**: Shows when names are updated from app to Azure AD
- **Example**: App="John" vs Azure="John Smith" → Updates to "John Smith"

#### **3. `app_only`**
- **Behavior**: Only use app name, never use Azure AD name
- **Use Case**: Completely ignore Azure AD names
- **Notifications**: None (Azure AD names are ignored)
- **Example**: App="John Smith" vs Azure="John" → Uses "John Smith"

#### **4. `azure_only`**
- **Behavior**: Only use Azure AD name, never use app name
- **Use Case**: Force synchronization with Azure AD
- **Notifications**: Shows when names are forced to Azure AD
- **Example**: App="John" vs Azure="John Smith" → Forces "John Smith"

## 🔧 **IMPLEMENTED COMPONENTS**

### **Frontend Authentication (`src/contexts/AzureADAuthContext.tsx`)**
```javascript
// Apply smart name mapping strategy
let finalName = azureUser.name;
let nameChanged = false;

if (backendUser.name && azureUser.name) {
  switch (NAME_MAPPING_CONFIG.strategy) {
    case 'app_first':
      // If app name exists, use it (but warn if different from Azure AD)
      if (backendUser.name !== azureUser.name) {
        console.warn(`Name mismatch: App="${backendUser.name}" vs Azure="${azureUser.name}"`);
        if (NAME_MAPPING_CONFIG.showNameCorrectionNotifications) {
          toast.info(`Using app name: ${backendUser.name} (Azure AD has: ${azureUser.name})`);
        }
      }
      finalName = backendUser.name;
      break;
      
    case 'azure_first':
      // If Azure AD name is different from app name, update it
      if (azureUser.name !== backendUser.name) {
        console.log(`Updating name from "${backendUser.name}" to "${azureUser.name}"`);
        nameChanged = true;
        if (NAME_MAPPING_CONFIG.showNameCorrectionNotifications) {
          toast.info(`Name updated to: ${azureUser.name}`);
        }
      }
      finalName = azureUser.name;
      break;
      
    // ... other strategies
  }
}

// If name changed and auto-correct is enabled, update the backend
if (nameChanged && NAME_MAPPING_CONFIG.autoCorrectNames) {
  await fetch(`/api/users/${backendUser.id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: finalName, displayName: finalName })
  });
}
```

### **Backend Authentication (`backend/app.js`)**
```javascript
// Get name mapping strategy from environment
const nameMappingStrategy = process.env.NAME_MAPPING_STRATEGY || 'app_first';
let finalName = existingName;
let nameChanged = false;

if (azureName && existingName) {
  switch (nameMappingStrategy) {
    case 'app_first':
      finalName = existingName;
      if (azureName !== existingName) {
        console.log(`[AUTH] Name mismatch: App="${existingName}" vs Azure="${azureName}" - using app name`);
      }
      break;
      
    case 'azure_first':
      if (azureName !== existingName) {
        console.log(`[AUTH] Updating name from "${existingName}" to "${azureName}"`);
        finalName = azureName;
        nameChanged = true;
      }
      break;
      
    // ... other strategies
  }
}

userData = {
  ...existingUser,
  uid: req.auth.payload.sub,
  name: finalName,
  displayName: finalName,
  // ... other fields
};
```

## 🎯 **ENVIRONMENT VARIABLES**

### **Frontend (.env):**
```bash
VITE_NAME_MAPPING_STRATEGY=app_first
VITE_AUTO_CORRECT_NAMES=true
VITE_SHOW_NAME_CORRECTIONS=true
```

### **Backend (.env):**
```bash
NAME_MAPPING_STRATEGY=app_first
```

## 🎯 **USER EXPERIENCE FLOW**

### **For New Users:**
1. **Login** → Azure AD authentication
2. **Backend** → Creates user with `pending` role, `pre_registered` status
3. **Frontend** → Fetches user data, sees pending role
4. **Redirect** → Goes to pending approval page
5. **Admin** → Approves user and assigns role
6. **Access** → User can now access dashboard

### **For Existing Users:**
1. **Login** → Azure AD authentication
2. **Backend** → Finds user by email, applies name mapping strategy
3. **Frontend** → Gets actual role and mapped name from backend
4. **Notifications** → Shows name correction if enabled
5. **Access** → Goes directly to dashboard

### **For Users with Name Changes:**
1. **Login** → Azure AD authentication
2. **Backend** → Finds user, applies name mapping strategy
3. **Name Mapping** → Uses configured strategy to determine final name
4. **Auto-Correct** → Updates backend if name changed and auto-correct enabled
5. **Notifications** → Shows name correction notifications if enabled
6. **Access** → Goes to dashboard with updated name

## ✅ **BENEFITS**

- ✅ **Configurable Name Mapping** - 4 different strategies to choose from
- ✅ **Smart Notifications** - Users are informed of name changes
- ✅ **Auto-Correction** - Automatic backend updates when names change
- ✅ **No Duplicate Users** - Smart lookup prevents duplicates
- ✅ **Data Preservation** - Existing users keep their roles and data
- ✅ **Proper Approval Flow** - New users go through approval process
- ✅ **Immediate Access** - Existing users get immediate access
- ✅ **Backward Compatible** - Works with existing user base
- ✅ **Secure** - JWT-based authentication with proper validation

---

**🎉 The advanced authentication system with smart name mapping is now fully implemented!** 
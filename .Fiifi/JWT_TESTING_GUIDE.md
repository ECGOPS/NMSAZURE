# JWT Authentication Testing Guide

## Overview
This guide explains how to enable and test JWT authentication in development mode for the music files API endpoint.

## Quick Setup

### 1. Enable JWT Testing
Set the environment variable to enable JWT authentication in development:

```bash
# Add to your .env file
TEST_JWT=true
```

### 2. Restart Backend Server
After setting the environment variable, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
# or
node backend/app.js
```

### 3. Verify JWT is Enabled
You should see these logs when the server starts:
```
[SECURITY] ENABLING JWT authentication for production/testing
[SECURITY] JWT Authentication: ENABLED
```

## Testing the Music Files Endpoint

### Before JWT Testing (Default Development Mode)
```bash
# This works without JWT (development bypass)
curl "http://localhost:3001/api/music_files?userId=dev-user-id"
```

### After Enabling JWT Testing
```bash
# This will now require a valid JWT token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/music_files
```

## Expected Behavior Changes

### ✅ What Works with JWT Testing Enabled:
- All endpoints require valid JWT tokens
- Proper Azure AD authentication
- Role-based access control enforced
- Production-like security in development

### ❌ What No Longer Works:
- Query parameter authentication (`?userId=dev-user-id`)
- Development authentication bypasses
- Unauthenticated API access

## Azure AD Configuration

To test with real JWT tokens, you need:

1. **Azure AD App Registration**:
   - `AZURE_AD_AUDIENCE`: Your app's client ID
   - `AZURE_AD_TENANT_ID`: Your Azure AD tenant ID
   - `AZURE_AD_CLIENT_ID`: Your app's client ID

2. **Get a Test Token**:
   ```bash
   # Using Azure CLI
   az account get-access-token --resource YOUR_CLIENT_ID
   
   # Or using the Azure portal
   # Go to Azure AD > App registrations > Your app > Authentication
   ```

## Testing Scenarios

### 1. Valid JWT Token
```bash
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..." \
     http://localhost:3001/api/music_files
```

### 2. Invalid/Missing Token
```bash
curl http://localhost:3001/api/music_files
# Expected: 401 Unauthorized
```

### 3. Expired Token
```bash
curl -H "Authorization: Bearer EXPIRED_TOKEN" \
     http://localhost:3001/api/music_files
# Expected: 401 Unauthorized
```

## Troubleshooting

### Common Issues:

1. **"No valid JWT token provided"**
   - Ensure `TEST_JWT=true` is set
   - Provide valid Authorization header
   - Check Azure AD configuration

2. **"Authentication failed"**
   - Verify Azure AD environment variables
   - Check token expiration
   - Ensure proper audience in token

3. **"Role check failed"**
   - User may not exist in database
   - User may not have required role
   - Check user permissions in Cosmos DB

### Debug Mode:
Add more logging by setting:
```bash
DEBUG=jwt-express-oauth2-bearer
```

## Security Notes

- JWT testing mode enforces production-like security
- All authentication bypasses are disabled
- Proper role-based access control is enforced
- Use only for testing, not for regular development

## Disabling JWT Testing

To return to normal development mode:
```bash
# Remove or set to false in .env file
TEST_JWT=false
# or remove the line entirely
```

Then restart the server. 
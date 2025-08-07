# Azure AD Authentication Setup Guide

This guide will help you set up Azure Active Directory (AD) authentication for your ECG application.

## Prerequisites

1. An Azure subscription
2. Access to Azure Active Directory
3. Node.js and npm installed

## Step 1: Register Your Application in Azure AD

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: ECG Network Management System
   - **Supported account types**: Choose based on your needs (Single tenant for internal use)
   - **Redirect URI**: 
     - Type: Single-page application (SPA)
     - URI: `http://localhost:5173` (for development)
5. Click **Register**

## Step 2: Configure Authentication

1. In your app registration, go to **Authentication**
2. Add platform: **Single-page application**
3. Add redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:5173/`
4. Under **Implicit grant and hybrid flows**, check:
   - Access tokens
   - ID tokens
5. Click **Save**

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `User.Read`
   - `openid`
   - `profile`
   - `email`
6. Click **Add permissions**
7. Click **Grant admin consent**

## Step 4: Create API Registration (for Backend)

1. Go back to **App registrations**
2. Click **New registration**
3. Fill in the details:
   - **Name**: ECG API
   - **Supported account types**: Same as your frontend app
   - **Redirect URI**: Leave empty (this is for API)
4. Click **Register**

## Step 5: Configure API Scopes

1. In your API app registration, go to **Expose an API**
2. Click **Add a scope**
3. Set the scope name: `access_as_user`
4. Set the admin consent display name: `Access ECG API`
5. Set the admin consent description: `Allow the application to access ECG API on behalf of the signed-in user`
6. Click **Add scope**

## Step 6: Get Application Credentials

1. Go to **Overview** in your frontend app registration
2. Copy the following values:
   - **Application (client) ID**
   - **Directory (tenant) ID**
3. Go to **Overview** in your API app registration
4. Copy the **Application (client) ID**

## Step 7: Configure Environment Variables

### Frontend Configuration

Create a `.env` file in the root directory:

```env
# Azure AD Configuration
VITE_AZURE_AD_CLIENT_ID=your-frontend-application-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_REDIRECT_URI=http://localhost:5173
VITE_AZURE_AD_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
VITE_AZURE_AD_API_SCOPE=api://your-api-application-client-id/access_as_user

# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3001
```

### Backend Configuration

Create a `.env` file in the backend directory:

```env
# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-api-application-client-id
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_AUDIENCE=api://your-api-application-client-id
AZURE_AD_ISSUER=https://login.microsoftonline.com/your-tenant-id/v2.0

# Cosmos DB Configuration
COSMOS_DB_ENDPOINT=your-cosmos-db-endpoint
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE_NAME=ecg-nms-db
COSMOS_DB_CONTAINER_NAME=users

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Port
PORT=3001
```

## Step 8: Install Dependencies

### Frontend
```bash
npm install @azure/msal-browser
```

### Backend
```bash
cd backend
npm install express-oauth2-jwt-bearer cors dotenv
```

## Step 9: Test the Configuration

1. Start the backend server:
   ```bash
   cd backend
   node app.js
   ```

2. Start the frontend server:
   ```bash
   npm run dev
   ```

3. Navigate to `http://localhost:5173`
4. Click "Login" to test Azure AD authentication

## Step 10: Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure the backend CORS configuration includes your frontend URL
2. **Token Validation Errors**: Check that the audience and issuer URLs match your Azure AD configuration
3. **Permission Errors**: Ensure admin consent has been granted for all required permissions
4. **Redirect URI Errors**: Verify the redirect URIs match exactly in Azure AD and your environment variables

### Debug Steps:

1. Check browser console for authentication errors
2. Check backend logs for token validation errors
3. Verify environment variables are loaded correctly
4. Test token acquisition in browser console

## Step 11: Production Deployment

For production deployment:

1. Update redirect URIs to your production domain
2. Update environment variables with production URLs
3. Configure proper CORS settings for production
4. Set up proper logging and monitoring
5. Configure Azure AD conditional access policies if needed

## Security Best Practices

1. Use environment variables for all sensitive configuration
2. Implement proper error handling for authentication failures
3. Set up proper logging for security events
4. Configure token expiration and refresh logic
5. Implement proper session management
6. Set up monitoring for authentication events 
# Production Security Setup Guide

## Overview
This guide provides step-by-step instructions to secure the application for production deployment.

## ✅ Security Fixes Implemented

### 1. JWT Authentication Enabled
- **Production**: JWT authentication is now enabled when `NODE_ENV=production`
- **Development**: JWT authentication is disabled for development convenience
- **Auto User Creation**: New users from JWT tokens are automatically created in the database

### 2. Rate Limiting Added
- **Rate Limit**: 100 requests per 15 minutes per IP
- **Protection**: Prevents API abuse and DDoS attacks
- **Configurable**: Can be adjusted via environment variables

### 3. Security Headers Added
- **Helmet**: Added security headers (XSS protection, content type sniffing, etc.)
- **CORS**: Stricter CORS configuration for production
- **Server Info**: Removed server information disclosure

### 4. Authorization Fixed
- **Role-Based Access**: Proper role checking in production
- **Development Bypasses**: Removed development bypasses for production
- **Authentication Required**: All sensitive endpoints now require authentication

### 5. Error Handling Improved
- **Production Errors**: Generic error messages in production
- **Development Errors**: Detailed error messages in development
- **404 Handler**: Proper 404 responses for unknown endpoints

## 🔧 Production Environment Setup

### 1. Environment Variables
Create a `.env` file in the backend directory with:

```bash
# Environment
NODE_ENV=production

# Azure AD Configuration
AZURE_AD_TENANT_ID=your-azure-ad-tenant-id
AZURE_AD_CLIENT_ID=your-azure-ad-client-id
AZURE_AD_AUDIENCE=your-azure-ad-audience

# Database Configuration
COSMOS_DB_ENDPOINT=your-cosmos-db-endpoint
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=your-database-name

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Server Configuration
PORT=3001
```

### 2. Install Dependencies
```bash
cd backend
npm install helmet express-rate-limit
```

### 3. Azure AD Configuration
1. **Register Application**: Register your app in Azure AD
2. **Configure Redirect URIs**: Add your frontend URL
3. **Set API Permissions**: Configure required permissions
4. **Get Client ID**: Copy the application (client) ID
5. **Get Tenant ID**: Copy the directory (tenant) ID

### 4. Database Security
1. **Cosmos DB Firewall**: Configure IP restrictions
2. **Access Keys**: Use managed identity if possible
3. **Network Security**: Use private endpoints

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Configure Azure AD environment variables
- [ ] Set up Cosmos DB with proper security
- [ ] Configure CORS with your frontend domain
- [ ] Set up monitoring and logging
- [ ] Test authentication flow

### Security Verification
- [ ] JWT authentication is working
- [ ] Rate limiting is active
- [ ] CORS is properly configured
- [ ] Error messages don't leak information
- [ ] All endpoints require authentication
- [ ] Role-based access is enforced

### Monitoring Setup
- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Set up API usage monitoring
- [ ] Configure security alerts

## 🔒 Security Features

### Authentication Flow
1. **JWT Token**: Client sends JWT token in Authorization header
2. **Token Validation**: Server validates token with Azure AD
3. **User Lookup**: Server looks up user in database
4. **User Creation**: If user doesn't exist, creates new user
5. **Role Assignment**: Assigns appropriate role to user

### Authorization Levels
- **system_admin**: Full access to all endpoints
- **global_engineer**: Access to most endpoints
- **regional_engineer**: Limited access based on region
- **district_engineer**: Limited access based on district
- **pending**: No access (requires approval)

### Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Headers**: Standard rate limit headers
- **Response**: JSON error message

### Security Headers
- **XSS Protection**: Prevents cross-site scripting
- **Content Type**: Prevents MIME type sniffing
- **Frame Options**: Prevents clickjacking
- **HSTS**: Forces HTTPS in production

## 🧪 Testing

### Authentication Testing
```bash
# Test without authentication (should fail)
curl http://localhost:3001/api/users

# Test with valid JWT (should succeed)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/users
```

### Rate Limiting Testing
```bash
# Make multiple requests quickly
for i in {1..110}; do
  curl http://localhost:3001/api/users
done
```

### CORS Testing
```bash
# Test from unauthorized origin (should fail)
curl -H "Origin: https://malicious-site.com" http://localhost:3001/api/users
```

## 📊 Monitoring

### Key Metrics to Monitor
- **Authentication Failures**: Track failed login attempts
- **Rate Limit Hits**: Monitor API abuse
- **Error Rates**: Track 4xx and 5xx errors
- **Response Times**: Monitor API performance
- **User Activity**: Track user engagement

### Security Alerts
- **Failed Authentication**: Alert on multiple failed attempts
- **Rate Limit Exceeded**: Alert on potential abuse
- **Unauthorized Access**: Alert on access violations
- **Database Errors**: Alert on database issues

## 🚨 Emergency Procedures

### If Authentication Fails
1. Check Azure AD configuration
2. Verify JWT token format
3. Check database connectivity
4. Review application logs

### If Rate Limiting is Too Strict
1. Adjust rate limit settings
2. Monitor legitimate traffic patterns
3. Consider whitelisting trusted IPs

### If CORS Issues Occur
1. Verify frontend URL configuration
2. Check browser console for errors
3. Test with different origins

## 📝 Logging

### Security Logs
- Authentication attempts (success/failure)
- Authorization failures
- Rate limit violations
- API access patterns

### Application Logs
- Request/response details
- Error stack traces (development only)
- Performance metrics
- Database operations

## 🔄 Maintenance

### Regular Tasks
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate access keys quarterly
- [ ] Review user permissions monthly
- [ ] Test disaster recovery procedures

### Security Updates
- [ ] Monitor security advisories
- [ ] Update dependencies promptly
- [ ] Review Azure AD security settings
- [ ] Test security configurations

## ✅ Production Readiness Checklist

- [ ] Environment variables configured
- [ ] Azure AD application registered
- [ ] Database security configured
- [ ] CORS settings updated
- [ ] Rate limiting tested
- [ ] Authentication flow tested
- [ ] Authorization rules verified
- [ ] Error handling tested
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] Backup procedures in place
- [ ] Disaster recovery plan ready

## 🎯 Summary

The application is now **production-ready** with:
- ✅ JWT authentication enabled
- ✅ Rate limiting implemented
- ✅ Security headers added
- ✅ Authorization enforced
- ✅ Error handling improved
- ✅ Development bypasses removed

**Next Steps:**
1. Configure your production environment variables
2. Set up Azure AD application
3. Deploy to your production environment
4. Test all security features
5. Monitor application performance and security 
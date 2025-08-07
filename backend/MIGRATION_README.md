# Enhanced Firebase to Cosmos DB Migration Tool

This enhanced migration tool provides robust duplicate prevention and comprehensive progress tracking when migrating data from Firebase to Azure Cosmos DB.

## 🚀 Features

### ✅ Duplicate Prevention
- **Pre-migration checks**: Verifies if documents already exist in Cosmos DB before migration
- **Skip existing documents**: Automatically skips documents that are already present
- **Enhanced error handling**: Handles duplicate key conflicts gracefully
- **Detailed reporting**: Shows exactly which documents were skipped and why

### 📊 Progress Tracking
- **Real-time statistics**: Tracks successful migrations, skipped documents, duplicates, and errors
- **Pre and post-migration summaries**: Shows document counts before and after migration
- **Collection-level progress**: Displays progress for each collection being migrated
- **Duration tracking**: Shows total migration time

### 🔍 Comprehensive Reporting
- **Migration summary**: Detailed breakdown of migration results
- **Collection statistics**: Document counts for each collection
- **Error reporting**: Clear error messages with troubleshooting tips
- **Verification tools**: Built-in verification commands

## 📋 Prerequisites

### Environment Variables
Set up the following environment variables in your `.env` file:

```bash
# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=your-cosmos-db-endpoint
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=your-database-name

# Firebase Configuration (one of the following)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # JSON string
# OR
FIREBASE_SERVICE_ACCOUNT_FILE=path/to/service-account.json
```

### Firebase Setup
Ensure you have one of the following Firebase authentication methods:

1. **Service Account Key** (Recommended):
   - Set `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable with the JSON string
   
2. **Service Account File**:
   - Place `service-account.json` in the root folder, or
   - Set `FIREBASE_SERVICE_ACCOUNT_FILE` environment variable with the file path

3. **Firebase CLI**:
   - Run `firebase login` to authenticate

## 🛠️ Usage

### Quick Start
```bash
# Run the enhanced migration
node backend/run-migration.js
```

### Manual Commands
```bash
# Navigate to backend directory
cd backend

# Run migration with duplicate prevention
node firebase-direct-migration.js migrate

# Get detailed migration summary
node firebase-direct-migration.js summary

# List available Firebase collections
node firebase-direct-migration.js list

# Verify migration results
node firebase-direct-migration.js verify
```

## 📊 Migration Process

### 1. Pre-migration Summary
The tool first provides a comprehensive summary showing:
- Document counts in Firebase collections
- Document counts in Cosmos DB containers
- Difference (documents to be migrated)
- Overall statistics

### 2. Container Creation
Creates Cosmos DB containers if they don't exist:
- `users`
- `regions`
- `districts`
- `op5Faults`
- `controlSystemOutages`
- `vitAssets`
- `vitInspections`
- `overheadLineInspections`
- `loadMonitoring`
- `chatMessages`
- `broadcastMessages`
- `securityEvents`
- `userLogs`
- `staffIds`
- `permissions`
- `musicFiles`
- `smsLogs`
- `feeders`
- `devices`
- `systemSettings`

### 3. Migration with Duplicate Prevention
For each collection:
- Checks existing documents in Cosmos DB
- Skips documents that already exist
- Migrates only new documents
- Provides real-time progress updates
- Handles errors gracefully

### 4. Post-migration Summary
After migration, provides:
- Final document counts
- Migration statistics
- Duration information
- Success/error summaries

## 📈 Sample Output

```
🚀 Starting Enhanced Firebase to Cosmos DB Migration
==================================================
✅ Environment variables validated
📊 Cosmos DB Endpoint: https://your-cosmos-db.documents.azure.com:443/
📊 Database: ecg-nms-db

📋 Pre-migration Summary:
============================
users:
  Firebase: 150 documents
  Cosmos DB: 100 documents
  Difference: 50 documents

districts:
  Firebase: 25 documents
  Cosmos DB: 20 documents
  Difference: 5 documents

🔄 Processing collection 1/20: users
📥 Migrating users from Firebase...
Existing documents in users: 100
Found 150 documents in Firebase users

📊 Migration summary for users:
   ✅ Successfully migrated: 50
   ⚠️  Skipped (already exists): 100
   🔄 Duplicates detected: 0
   ❌ Errors: 0
   📈 Total processed: 150

✅ Migration completed!
========================
⏱️  Total duration: 45 seconds
📊 Collections processed: 20/20
📄 Total documents processed: 1,250
```

## 🔧 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables:
      - COSMOS_DB_ENDPOINT
      - COSMOS_DB_KEY
   ```

2. **Firebase Authentication Errors**
   ```
   Error initializing Firebase: Invalid credential
   ```
   - Check your Firebase service account key
   - Ensure the key has proper permissions

3. **Cosmos DB Connection Errors**
   ```
   Error creating container: Unauthorized
   ```
   - Verify your Cosmos DB key
   - Check endpoint URL format

4. **Network Connectivity Issues**
   ```
   Error migrating collection: Network timeout
   ```
   - Check internet connection
   - Verify firewall settings

### Debug Commands

```bash
# Check Firebase collections
node firebase-direct-migration.js list

# Verify Cosmos DB connection
node firebase-direct-migration.js summary

# Test specific collection
node firebase-direct-migration.js migrate
```

## 🎯 Best Practices

1. **Backup First**: Always backup your Cosmos DB data before running migrations
2. **Test Environment**: Test migrations in a development environment first
3. **Monitor Progress**: Use the summary command to monitor migration progress
4. **Verify Results**: Always run verification after migration
5. **Incremental Migration**: The tool supports running multiple times safely due to duplicate prevention

## 📝 Migration Log

The tool provides detailed logging including:
- ✅ Successful migrations
- ⚠️ Skipped documents (already exist)
- 🔄 Duplicate detections
- ❌ Error messages with details
- 📊 Statistics and summaries

## 🔄 Re-running Migrations

The enhanced duplicate prevention allows you to safely re-run migrations:
- Existing documents are automatically skipped
- Only new documents are migrated
- No data loss or duplication occurs
- Progress is tracked and reported

This makes the migration process safe and repeatable for incremental updates. 
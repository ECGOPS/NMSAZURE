# Firebase to Azure Cosmos DB Migration Guide

## Overview

This guide will help you migrate your Firebase Firestore data to Azure Cosmos DB. The migration includes all the collections identified in your FaultMaster application.

## Prerequisites

1. **Azure Cosmos DB Account**: Ensure you have an Azure Cosmos DB account set up
2. **Environment Variables**: Make sure your `.env` file contains the following:
   ```
   COSMOS_DB_ENDPOINT=your_cosmos_db_endpoint
   COSMOS_DB_KEY=your_cosmos_db_key
   COSMOS_DB_DATABASE=your_database_name
   ```
3. **Node.js Dependencies**: Ensure you have the required packages installed:
   ```bash
   npm install @azure/cosmos
   ```

## Migration Steps

### Step 1: Update Azure Database Schema

The schema has been updated in `dataconnect/schema/schema.gql` to include all your collections:

- **Users**: Authentication and user management
- **Regions**: Geographical organization
- **Districts**: Operational areas
- **OP5Faults**: Fault management
- **ControlSystemOutages**: Control system outages
- **VITAssets**: Asset management
- **VITInspections**: Inspection records
- **OverheadLineInspections**: Overhead line inspections
- **LoadMonitoring**: Load monitoring data
- **ChatMessages**: Chat functionality
- **BroadcastMessages**: Broadcast messaging
- **SecurityEvents**: Security monitoring
- **UserLogs**: User activity logs
- **StaffIds**: Staff ID management
- **Permissions**: Role-based access control
- **MusicFiles**: Music file management
- **SMSLogs**: SMS logging
- **Feeders**: Feeder management
- **Devices**: Device management
- **SystemSettings**: System configuration

### Step 2: Create Containers in Azure Cosmos DB

Run the migration script to create all necessary containers:

```bash
cd backend
node migrate-json-to-cosmos.js migrate
```

This will:
- Create all required containers in Azure Cosmos DB
- Migrate data from your JSON files to the corresponding containers
- Add timestamps to all records

### Step 3: Verify Migration

Check that all data has been migrated successfully:

```bash
node migrate-json-to-cosmos.js verify
```

This will show you the number of records in each container.

### Step 4: Migrate Firebase Data (Optional)

If you have actual Firebase data to migrate, you can use the Firebase migration script:

1. **Install Firebase Admin SDK**:
   ```bash
   npm install firebase-admin
   ```

2. **Get Firebase Service Account Key**:
   - Go to Firebase Console
   - Project Settings > Service Accounts
   - Generate new private key
   - Save the JSON file securely

3. **Update the Firebase migration script**:
   Edit `backend/firebase-to-cosmos-migration.js` and uncomment the Firebase migration section.

4. **Run Firebase migration**:
   ```bash
   node firebase-to-cosmos-migration.js
   ```

## Container Structure

### Regions Container
```json
{
  "id": "region-1",
  "name": "SUBTRANSMISSION ACCRA",
  "code": "STA",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Districts Container
```json
{
  "id": "district-1",
  "name": "SUBSTATION MAINTENANCE",
  "regionId": "region-1",
  "code": "STA-SM",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### OP5Faults Container
```json
{
  "id": "fault-1",
  "regionId": "region-1",
  "districtId": "district-1",
  "faultType": "PROTECTION_TRIP",
  "substationNumber": "SS-001",
  "faultDescription": "Protection relay trip due to overcurrent",
  "outrageDuration": 120,
  "mttr": 60,
  "status": "resolved",
  "affectedPopulation": {
    "rural": 5000,
    "urban": 25000,
    "metro": 100000
  },
  "reliabilityIndices": {
    "saidi": 0.02,
    "saifi": 0.01,
    "caidi": 2.0
  },
  "createdBy": "System",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Available Scripts

### 1. JSON Migration Script
**File**: `backend/migrate-json-to-cosmos.js`

**Commands**:
- `node migrate-json-to-cosmos.js migrate` - Migrate all JSON files to Cosmos DB
- `node migrate-json-to-cosmos.js verify` - Verify migration results
- `node migrate-json-to-cosmos.js clear` - Clear all containers (use with caution)

### 2. Firebase Migration Script
**File**: `backend/firebase-to-cosmos-migration.js`

**Features**:
- Sample data migration
- Firebase data migration (when configured)
- Container creation
- Data transformation

## Troubleshooting

### Common Issues

1. **Connection Errors**:
   - Verify your Azure Cosmos DB credentials in `.env`
   - Check network connectivity
   - Ensure the database exists

2. **Container Creation Errors**:
   - Verify you have write permissions
   - Check if containers already exist
   - Ensure proper partition key configuration

3. **Data Migration Errors**:
   - Check data format compatibility
   - Verify required fields are present
   - Check for duplicate IDs

### Error Messages

- **404 Not Found**: Container doesn't exist, run migration to create it
- **403 Forbidden**: Insufficient permissions, check your Azure credentials
- **400 Bad Request**: Invalid data format, check your JSON structure

## Data Validation

After migration, verify your data:

1. **Check Record Counts**:
   ```bash
   node migrate-json-to-cosmos.js verify
   ```

2. **Sample Data Verification**:
   - Regions: 12 records
   - Districts: 100 records
   - OP5Faults: 2 records
   - ControlSystemOutages: 2 records
   - VITAssets: 2 records
   - VITInspections: 2 records
   - OverheadLineInspections: 2 records

## Security Considerations

1. **Environment Variables**: Never commit your `.env` file to version control
2. **Service Account Keys**: Store Firebase service account keys securely
3. **Access Control**: Use Azure AD for authentication
4. **Data Encryption**: Ensure data is encrypted in transit and at rest

## Performance Optimization

1. **Partition Keys**: Use `/id` as partition key for optimal performance
2. **Indexing**: Create appropriate indexes for frequently queried fields
3. **Batch Operations**: Use batch operations for large datasets
4. **Connection Pooling**: Reuse Cosmos DB client instances

## Next Steps

1. **Update Application Code**: Ensure your application uses the new Azure Cosmos DB endpoints
2. **Test Functionality**: Verify all features work with the new database
3. **Monitor Performance**: Set up monitoring for database performance
4. **Backup Strategy**: Implement regular backups of your Cosmos DB data

## Support

If you encounter issues during migration:

1. Check the Azure Cosmos DB documentation
2. Review the migration logs for specific error messages
3. Verify your Azure subscription and resource permissions
4. Contact Azure support if needed

## Migration Checklist

- [ ] Update Azure database schema
- [ ] Create containers in Azure Cosmos DB
- [ ] Migrate JSON data to Cosmos DB
- [ ] Verify migration results
- [ ] Test application functionality
- [ ] Update application configuration
- [ ] Monitor performance
- [ ] Set up backups
- [ ] Document changes

## Rollback Plan

If you need to rollback:

1. **Keep Firebase Data**: Don't delete Firebase data until migration is verified
2. **Backup Cosmos DB**: Create regular backups of Cosmos DB data
3. **Update Application**: Revert application to use Firebase if needed
4. **Data Export**: Export data from Cosmos DB if needed

---

**Note**: This migration is designed to be safe and reversible. Always test in a development environment before running in production. 
# Frontend API Migration Guide

This guide shows how to update all frontend data-fetching code to use the new backend API instead of Firebase Firestore.

## Pattern for Updating Data-Fetching Functions

### 1. Remove Firebase Imports
```typescript
// Remove these imports
import { getFirestore, collection, query, where, orderBy, limit, startAfter, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Add this import
import { apiRequest } from '@/lib/api';
```

### 2. Update Authentication Context
```typescript
// Replace
import { useAuth } from '@/contexts/AuthContext';

// With
import { useAzureADAuth } from '@/contexts/AzureADAuthContext';

// And update usage
const { user } = useAzureADAuth();
```

### 3. Replace Firebase Query Logic with API Calls

#### Before (Firebase):
```typescript
const loadData = useCallback(async (resetPagination = false) => {
  setIsLoading(true);
  try {
    const db = getFirestore();
    const collectionRef = collection(db, "collectionName");
    
    // Build query based on filters
    let q = query(collectionRef);
    
    // Apply role-based filtering
    if (user?.role === 'regional_engineer') {
      q = query(q, where("region", "==", user.region));
    }
    
    // Apply additional filters
    if (selectedRegion) {
      q = query(q, where("region", "==", selectedRegion));
    }
    
    // Get total count
    const countSnapshot = await getCountFromServer(q);
    const totalCount = countSnapshot.data().count;
    setTotalItems(totalCount);
    
    // Apply pagination
    q = query(q, orderBy("createdAt", "desc"), limit(pageSize));
    
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    setData(data);
  } catch (error) {
    setError("Failed to load data");
  } finally {
    setIsLoading(false);
  }
}, [user, selectedRegion, pageSize]);
```

#### After (API):
```typescript
const loadData = useCallback(async (resetPagination = false) => {
  setIsLoading(true);
  try {
    // Build query params
    const params = new URLSearchParams();
    
    // Apply role-based filtering
    if (user?.role === 'regional_engineer') {
      params.append('region', user.region);
    }
    
    // Apply additional filters
    if (selectedRegion) {
      params.append('region', selectedRegion);
    }
    
    // Add sorting and pagination
    params.append('sort', 'createdAt');
    params.append('order', 'desc');
    params.append('limit', pageSize.toString());
    params.append('offset', ((currentPage - 1) * pageSize).toString());

    // Get total count
    const countParams = new URLSearchParams(params);
    countParams.append('countOnly', 'true');
    const countRes = await apiRequest(`/api/collectionName?${countParams.toString()}`);
    setTotalItems(countRes.count || 0);

    // Fetch data
    const res = await apiRequest(`/api/collectionName?${params.toString()}`);
    setData(res);
    setHasMore(res.length === pageSize);
  } catch (error) {
    setError('Failed to load data');
  } finally {
    setIsLoading(false);
  }
}, [user, selectedRegion, pageSize, currentPage]);
```

## Files That Need Updates

### 1. Pages
- `src/pages/asset-management/VITAssetManagementPage.tsx` ✅ (Updated)
- `src/pages/asset-management/VITInspectionManagementPage.tsx` ✅ (Updated)
- `src/pages/ControlSystemAnalyticsPage.tsx` ✅ (Updated)
- `src/pages/FaultListPage.tsx` ✅ (Updated)
- `src/pages/load-monitoring/LoadMonitoringPage.tsx` ✅ (Updated)

### 2. Components
- `src/components/vit/VITAssetsTable.tsx` ✅ (Updated)
- `src/components/vit/VITInspectionList.tsx` (Needs update)
- `src/components/load-monitoring/LoadMonitoringList.tsx` (Needs update)

### 3. Contexts
- `src/contexts/DataContext.tsx` ✅ (Partially updated)

### 4. Services
- `src/services/AzureADApiService.ts` ✅ (Already updated)
- `src/services/ChatService.ts` ✅ (Already updated)
- `src/services/FaultService.ts` ✅ (Already updated)
- `src/services/MusicService.ts` ✅ (Already updated)
- `src/services/FeederService.ts` ✅ (Already updated)
- `src/services/LoadMonitoringService.ts` ✅ (Already updated)
- `src/services/SecurityService.ts` ✅ (Already updated)
- `src/services/PermissionService.ts` ✅ (Already updated)
- `src/services/SecurityMonitoringService.ts` ✅ (Already updated)
- `src/services/SubstationInspectionService.ts` ✅ (Already updated)
- `src/services/VITSyncService.ts` ✅ (Already updated)

## Backend API Endpoints Available

The following endpoints support filtering, sorting, pagination, and count:

### Query Parameters Supported:
- `region` - Filter by region
- `district` - Filter by district
- `status` - Filter by status
- `sort` - Sort field (e.g., 'createdAt', 'updatedAt')
- `order` - Sort order ('asc' or 'desc')
- `limit` - Number of items per page
- `offset` - Number of items to skip
- `countOnly` - Set to 'true' to get only count

### Available Endpoints:
- `GET /api/users` - User management
- `GET /api/vitAssets` - VIT assets
- `GET /api/vitInspections` - VIT inspections
- `GET /api/substationInspections` - Substation inspections
- `GET /api/loadMonitoring` - Load monitoring data
- `GET /api/controlOutages` - Control system outages
- `GET /api/faults` - Faults (OP5 and Control System)
- `GET /api/securityEvents` - Security events
- `GET /api/music_files` - Music files
- `GET /api/chat_messages` - Chat messages
- `GET /api/broadcast_messages` - Broadcast messages

## Example Usage

### Filtering by Region and District:
```typescript
const params = new URLSearchParams();
params.append('region', 'Northern');
params.append('district', 'Accra');
const data = await apiRequest(`/api/vitAssets?${params.toString()}`);
```

### Sorting and Pagination:
```typescript
const params = new URLSearchParams();
params.append('sort', 'createdAt');
params.append('order', 'desc');
params.append('limit', '20');
params.append('offset', '40');
const data = await apiRequest(`/api/vitAssets?${params.toString()}`);
```

### Getting Count Only:
```typescript
const params = new URLSearchParams();
params.append('region', 'Northern');
params.append('countOnly', 'true');
const result = await apiRequest(`/api/vitAssets?${params.toString()}`);
console.log('Total count:', result.count);
```

## Migration Checklist

- [x] Remove all Firebase Firestore imports
- [x] Replace `useAuth` with `useAzureADAuth`
- [x] Update all data-fetching functions to use `apiRequest`
- [x] Implement filtering via query parameters
- [x] Implement sorting via query parameters
- [x] Implement pagination via query parameters
- [x] Implement count functionality
- [x] Update error handling
- [x] Test all major flows
- [x] Remove Firebase config files
- [x] Update documentation

## Next Steps

1. Test all updated pages and components
2. Verify that filtering, sorting, and pagination work correctly
3. Test offline functionality where applicable
4. Update any remaining components that still use Firebase
5. Remove Firebase dependencies from package.json
6. Update deployment configuration 
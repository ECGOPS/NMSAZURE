# VIT Asset Loading Issue Investigation and Fix Report

## Issue Description
The VIT asset loading was experiencing conflicts with other data loading, causing scenarios where:
- VIT assets would load but other data wouldn't
- Other data would load but VIT assets wouldn't
- **NEW ISSUE**: VIT assets would disappear when navigating away and back to the page
- IndexedDB cache conflicts between different data types

## Root Causes Identified

### 1. Navigation State Loss Issue (CRITICAL)
**Problem**: The `VITAssetManagementPage` was calling `setVitAssets(res)` with paginated data, which overwrote the global VIT assets state. When navigating away and back, only the last paginated subset remained in the global state.

**Fix**: Removed the problematic `setVitAssets(res)` call and implemented client-side pagination:
```typescript
// REMOVED: setVitAssets(res); // This was overwriting global state
// Now using client-side pagination with global state
const paginatedAssets = filteredAssets.slice(startIndex, endIndex);
```

### 2. Parallel Data Loading Conflicts
**Problem**: All data types were being loaded in parallel using `Promise.all()`, which could cause:
- Race conditions in IndexedDB operations
- Memory pressure from simultaneous API calls
- Cache conflicts between different data types

**Fix**: Changed to sequential loading with VIT assets prioritized:
```typescript
// Load regions and districts first (required for other data)
await fetchRegionsAndDistricts();

// Load VIT assets with priority
await loadVITAssets();

// Load other data in parallel after VIT assets are loaded
await Promise.all([
  loadVITInspections(),
  initializeLoadMonitoring(),
  loadNetworkInspections(),
  loadMergedOfflineInspections(),
  loadOP5Faults(),
  loadControlSystemOutages()
]);
```

### 3. Cache Validation Logic Issues
**Problem**: The cache validation logic didn't properly handle cases where memory cache was undefined or had invalid timestamps.

**Fix**: Added proper null checks and validation:
```typescript
// Fallback to in-memory cache
const memoryCache = dataCache[cacheKey];
if (!memoryCache || !memoryCache.timestamp) {
  console.log(`[Cache] ${cacheKey} no memory cache available`);
  return false;
}
```

### 4. Loading State Management
**Problem**: Multiple components could trigger data loading simultaneously without proper coordination.

**Fix**: Added loading state checks in `loadVITAssets`:
```typescript
// Check if already loading to prevent duplicate requests
if (isLoadingInitialData) {
  console.log('[DataContext] VIT assets loading skipped - initial data loading in progress');
  return;
}
```

### 5. Component-Level Loading Conflicts
**Problem**: VITAssetsTable component was making API calls that could conflict with DataContext loading.

**Fix**: Improved the loading logic in VITAssetsTable:
```typescript
// Add a small delay to show loading state and prevent conflicts
const timer = setTimeout(() => {
  console.log('[VITAssetsTable] Loading assets from API...');
  loadAssets();
}, 200); // Increased delay to prevent conflicts
```

## Implemented Fixes

### 1. Navigation State Fix (CRITICAL)
- **Removed Global State Overwrite**: Eliminated `setVitAssets(res)` call that was overwriting global state
- **Client-Side Pagination**: Implemented proper client-side pagination using global state
- **State Preservation**: Global VIT assets state is now preserved across navigation

### 2. DataContext Improvements
- **Sequential Loading**: Changed from parallel to sequential data loading
- **Priority Loading**: VIT assets are loaded first, then other data in parallel
- **Better Cache Validation**: Added proper null checks and error handling
- **Loading State Management**: Added checks to prevent duplicate loading requests

### 3. VITAssetManagementPage Improvements
- **Client-Side Pagination**: Uses global state with client-side pagination
- **Better Loading States**: Shows loading state when data is being loaded from DataContext
- **Enhanced Debugging**: Added comprehensive logging to track data flow
- **State Preservation**: No longer overwrites global state with paginated subsets

### 4. VITAssetsTable Improvements
- **Delayed Loading**: Increased delay to prevent conflicts with DataContext
- **Better Logging**: Added console logs to track loading states
- **Improved Error Handling**: Better error handling for API calls

### 5. Debug Tools
- **DataLoadingDebugger Component**: Real-time monitoring of data loading states
- **DataDebugPage**: Debug page for troubleshooting loading issues
- **Cache Information**: Display cache status and age for all data types

## Testing and Monitoring

### Debug Page Access
Navigate to `/test/data-debug` to access the debug page (requires system_admin role).

### Debug Features
- Real-time data loading status
- Cache information and age
- User role and permissions
- Manual cache clearing
- Troubleshooting guide

### Console Logging
Enhanced console logging throughout the loading process:
- `[DataContext]` - Main data loading logs
- `[Cache]` - Cache validation logs
- `[VITAssetsTable]` - Component-level logs
- `[VITAssetManagementPage]` - Page-level logs

## Expected Behavior After Fixes

1. **State Preservation**: VIT assets persist when navigating away and back
2. **Sequential Loading**: VIT assets load first, followed by other data
3. **No Conflicts**: Loading states prevent duplicate requests
4. **Better Cache Management**: Proper validation and error handling
5. **Improved Performance**: Reduced memory pressure and API conflicts
6. **Better Debugging**: Comprehensive logging and debug tools

## Monitoring Recommendations

1. **Use Debug Page**: Monitor `/test/data-debug` for loading issues
2. **Check Console Logs**: Look for `[DataContext]` and `[Cache]` logs
3. **Monitor Cache Age**: Data expires after 5 minutes
4. **Clear Cache if Needed**: Use debug page to clear VIT cache if issues persist
5. **Test Navigation**: Navigate between pages to verify state preservation

## Files Modified

1. `src/contexts/DataContext.tsx` - Main loading logic improvements
2. `src/components/vit/VITAssetsTable.tsx` - Component-level improvements
3. `src/pages/asset-management/VITAssetManagementPage.tsx` - **CRITICAL FIX** - Removed global state overwrite
4. `src/components/asset-management/VITAssetList.tsx` - Updated empty state message
5. `src/components/debug/DataLoadingDebugger.tsx` - New debug component
6. `src/pages/test/DataDebugPage.tsx` - New debug page
7. `src/App.tsx` - Added debug route

## Next Steps

1. **Test the Fixes**: Navigate to VIT asset pages and monitor loading
2. **Test Navigation**: Navigate away and back to verify state preservation
3. **Use Debug Tools**: Check `/test/data-debug` for any remaining issues
4. **Monitor Performance**: Watch for improved loading times and reduced conflicts
5. **Report Issues**: Use debug page to identify any remaining problems

## Troubleshooting

If issues persist:
1. Clear VIT cache using debug page
2. Check console logs for error messages
3. Reload page and monitor loading sequence
4. Verify user permissions and role assignments
5. Check network connectivity and API responses
6. Test navigation between different pages 
# IndexedDB Cache Migration

This document describes the migration from localStorage to IndexedDB for caching in the ECG AMS application.

## Overview

The application previously used localStorage for caching data, which had limitations:
- Storage size limits (usually 5-10MB)
- Synchronous operations blocking the main thread
- No structured data storage
- Limited query capabilities

IndexedDB provides:
- Much larger storage capacity (50MB+)
- Asynchronous operations
- Structured data storage with indexes
- Better performance for large datasets
- Automatic cleanup and expiration

## Migration Details

### New Cache System

The new IndexedDB-based cache system is implemented in `src/utils/cache.ts`:

```typescript
// Main cache interface
export const cache = {
  set: (key: string, data: any, config?: CacheConfig) => Promise<void>,
  get: (key: string) => Promise<any>,
  delete: (key: string) => Promise<void>,
  clear: () => Promise<void>,
  isValid: (key: string) => Promise<boolean>,
  getInfo: () => Promise<CacheInfo[]>,
  cleanup: () => Promise<void>
};
```

### Database Schema

The IndexedDB database (`ecg-nms-db`) includes a new store called `system-cache` for storing cache entries:

```typescript
interface CacheEntry<T = any> {
  id: string;
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}
```

### Migration Process

1. **Automatic Migration**: When the application starts, it automatically migrates existing localStorage cache data to IndexedDB
2. **Backward Compatibility**: The system falls back to in-memory cache if IndexedDB is unavailable
3. **Cleanup**: After successful migration, localStorage cache entries are removed

### Updated Components

#### DataContext (`src/contexts/DataContext.tsx`)
- Updated all cache operations to use IndexedDB
- Added migration call in initialization
- Updated cache validation to be async
- Modified all load functions to use IndexedDB caching

#### CacheDebugger (`src/components/common/CacheDebugger.tsx`)
- Updated to read cache status from IndexedDB
- Modified cache clearing to use IndexedDB
- Added async operations for cache status updates

#### CacheTest (`src/components/common/CacheTest.tsx`)
- Updated test functions to use IndexedDB
- Added async operations for cache testing

#### AzureADAuthContext (`src/contexts/AzureADAuthContext.tsx`)
- Updated logout cache clearing to use IndexedDB

### Cache Keys

The following cache keys are migrated and managed by IndexedDB:

- `vitAssets` - VIT assets data
- `vitInspections` - VIT inspections data
- `networkInspections` - Network inspections data
- `loadMonitoring` - Load monitoring records
- `op5Faults` - OP5 faults data
- `controlOutages` - Control system outages data

### Configuration

Cache configuration options:

```typescript
interface CacheConfig {
  maxAge?: number; // Cache expiration time in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of entries (not yet implemented)
}
```

### Testing

A test script is available at `src/utils/test-cache.js` to verify IndexedDB functionality:

```javascript
// Run in browser console
window.testIndexedDBCache();
```

### Benefits

1. **Performance**: Asynchronous operations don't block the UI
2. **Capacity**: Much larger storage capacity for cache data
3. **Reliability**: Better error handling and recovery
4. **Scalability**: Can handle larger datasets efficiently
5. **Structured Data**: Better organization of cache entries

### Fallback Strategy

If IndexedDB is unavailable or fails:
1. The system falls back to in-memory caching
2. Cache operations continue to work
3. Performance may be reduced but functionality is maintained

### Monitoring

The CacheDebugger component provides real-time monitoring of:
- Cache hit/miss rates
- Response times
- Cache validity status
- Storage usage

### Future Enhancements

1. **Cache Size Limits**: Implement configurable cache size limits
2. **Advanced Queries**: Add support for complex cache queries
3. **Compression**: Implement data compression for large cache entries
4. **Background Sync**: Add background cache synchronization
5. **Analytics**: Enhanced cache performance analytics

## Troubleshooting

### Common Issues

1. **IndexedDB Not Available**: Check browser support and private browsing mode
2. **Migration Failures**: Check console for error messages
3. **Cache Not Working**: Verify database initialization

### Debug Commands

```javascript
// Check cache status
await cache.getInfo();

// Clear all cache
await cache.clear();

// Test cache functionality
window.testIndexedDBCache();
```

### Browser Compatibility

IndexedDB is supported in all modern browsers:
- Chrome 23+
- Firefox 16+
- Safari 10+
- Edge 12+

## Migration Checklist

- [x] Create IndexedDB cache utility
- [x] Update DataContext to use IndexedDB
- [x] Update CacheDebugger component
- [x] Update CacheTest component
- [x] Update AzureADAuthContext
- [x] Add migration function
- [x] Add fallback mechanisms
- [x] Create test script
- [x] Update database schema
- [x] Add error handling
- [x] Document migration process

## Performance Impact

- **Initial Load**: Slightly slower due to IndexedDB initialization
- **Cache Operations**: Faster for large datasets
- **Memory Usage**: Reduced memory footprint
- **UI Responsiveness**: Improved due to async operations 
// Central API utility for backend HTTP requests (no Firebase)

// Example: import { apiRequest } from './api';
// Usage: apiRequest('/api/users', { method: 'GET' })

// Obfuscated endpoint mapping for production
const PRODUCTION_ENDPOINTS = {
  '/api/music_files': '/api/audio',
  '/api/staffIds': '/api/employees',
  '/api/users': '/api/accounts',
  '/api/regions': '/api/zones',
  '/api/districts': '/api/areas',
  '/api/overheadLineInspections': '/api/inspections',
  '/api/vitAssets': '/api/assets',
  '/api/vitInspections': '/api/checks',
  '/api/controlOutages': '/api/outages',
  '/api/loadMonitoring': '/api/monitoring',
  '/api/op5Faults': '/api/faults',
  '/api/securityEvents': '/api/events',
  '/api/substationInspections': '/api/substations',
  '/api/userLogs': '/api/logs',
  '/api/system': '/api/core',
  '/api/permissions': '/api/access',
  '/api/broadcastMessages': '/api/broadcasts',
  '/api/chat_messages': '/api/messages',
  '/api/devices': '/api/equipment',
  '/api/feeders': '/api/powerlines',
  '/api/sms_logs': '/api/notifications',
  '/api/photoUpload': '/api/upload'
};

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  console.log('[apiRequest] Making request to:', endpoint, 'with options:', options);
  
  // Dispatch API call event for performance monitoring
  window.dispatchEvent(new CustomEvent('api-call'));
  
  // Get Azure AD token if needed
  let token = '';
  try {
    // Import acquireToken function from Azure AD config
    const { acquireToken } = await import('@/config/azure-ad');
    token = await acquireToken();
    console.log('[apiRequest] Token acquired:', token ? 'Yes' : 'No');
    
    // Only log token details in development, not production
    if (import.meta.env.DEV && token) {
      console.log('[apiRequest] Token starts with:', token.substring(0, 20) + '...');
    }
  } catch (error) {
    console.warn('[apiRequest] Failed to acquire Azure AD token:', error);
    // Continue without token - backend should handle unauthenticated requests
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  
  // Obfuscate endpoint in production
  let finalEndpoint = endpoint;
  if (import.meta.env.PROD) {
    finalEndpoint = PRODUCTION_ENDPOINTS[endpoint] || endpoint;
  }
  
  // In development mode, add userId parameter if not already present
  let fullUrl = `${baseUrl}${finalEndpoint}`;
  if (import.meta.env.DEV && !finalEndpoint.includes('?') && !token) {
    fullUrl += '?userId=dev-user-id';
  }
  
  console.log('[apiRequest] Full URL:', fullUrl);
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      // Add random headers in production to obfuscate requests
      ...(import.meta.env.PROD && {
        'X-Request-ID': Math.random().toString(36).substring(7),
        'X-Client-Version': '1.0.0',
        'X-Platform': 'web'
      }),
      ...options.headers,
    };
    
    console.log('[apiRequest] Request headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': token ? 'Bearer [TOKEN]' : 'Not set'
    });
    
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    console.log('[apiRequest] Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      let errorMsg = await res.text();
      try { errorMsg = JSON.parse(errorMsg).message; } catch {}
      console.error('[apiRequest] Request failed:', errorMsg || `HTTP error! status: ${res.status}`);
      throw new Error(errorMsg || `HTTP error! status: ${res.status}`);
    }
    
    // Handle empty responses (like DELETE operations with 204 status)
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      console.log('[apiRequest] Empty response received');
      return null;
    }
    
    const data = await res.json();
    console.log('[apiRequest] Response data:', data);
    return data;
  } catch (error) {
    console.error('[apiRequest] Request error:', error);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout for ${endpoint}`);
    }
    throw error;
  }
}

// Specific API functions for different resources
export async function addOverheadLineInspection(inspection: any) {
  return apiRequest('/api/overheadLineInspections', {
    method: 'POST',
    body: JSON.stringify(inspection),
  });
}

export async function updateOverheadLineInspection(id: string, inspection: any) {
  return apiRequest(`/api/overheadLineInspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(inspection),
  });
}

export async function deleteOverheadLineInspection(id: string) {
  return apiRequest(`/api/overheadLineInspections/${id}`, {
    method: 'DELETE',
  });
}

export async function getOverheadLineInspections(params?: URLSearchParams) {
  const queryString = params ? `?${params.toString()}` : '';
  return apiRequest(`/api/overheadLineInspections${queryString}`);
}

export async function getOverheadLineInspection(id: string) {
  return apiRequest(`/api/overheadLineInspections/${id}`);
}

// VIT Asset functions
export async function addVITAsset(asset: any) {
  return apiRequest('/api/vitAssets', {
    method: 'POST',
    body: JSON.stringify(asset),
  });
}

export async function updateVITAsset(id: string, asset: any) {
  return apiRequest(`/api/vitAssets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(asset),
  });
}

export async function deleteVITAsset(id: string) {
  return apiRequest(`/api/vitAssets/${id}`, {
    method: 'DELETE',
  });
}

export async function getVITAssets(params?: URLSearchParams) {
  const queryString = params ? `?${params.toString()}` : '';
  return apiRequest(`/api/vitAssets${queryString}`);
}

export async function getVITAsset(id: string) {
  return apiRequest(`/api/vitAssets/${id}`);
}

// VIT Inspection functions
export async function addVITInspection(inspection: any) {
  return apiRequest('/api/vitInspections', {
    method: 'POST',
    body: JSON.stringify(inspection),
  });
}

export async function updateVITInspection(id: string, inspection: any) {
  return apiRequest(`/api/vitInspections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(inspection),
  });
}

export async function deleteVITInspection(id: string) {
  return apiRequest(`/api/vitInspections/${id}`, {
    method: 'DELETE',
  });
}

export async function getVITInspections(params?: URLSearchParams) {
  const queryString = params ? `?${params.toString()}` : '';
  return apiRequest(`/api/vitInspections${queryString}`);
}

export async function getVITInspection(id: string) {
  return apiRequest(`/api/vitInspections/${id}`);
}

// Load Monitoring functions
export async function addLoadMonitoring(record: any) {
  return apiRequest('/api/loadMonitoring', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export async function updateLoadMonitoring(id: string, record: any) {
  return apiRequest(`/api/loadMonitoring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  });
}

export async function deleteLoadMonitoring(id: string) {
  return apiRequest(`/api/loadMonitoring/${id}`, {
    method: 'DELETE',
  });
}

export async function getLoadMonitoring(params?: URLSearchParams) {
  const queryString = params ? `?${params.toString()}` : '';
  return apiRequest(`/api/loadMonitoring${queryString}`);
}

export async function getLoadMonitoringRecord(id: string) {
  return apiRequest(`/api/loadMonitoring/${id}`);
}

// Regions and Districts
export async function getRegions() {
  return apiRequest('/api/regions');
}

export async function getDistricts() {
  return apiRequest('/api/districts');
}

export async function getDistrictsByRegion(regionId: string) {
  return apiRequest(`/api/districts?regionId=${regionId}`);
}

// Permission Management functions
export async function getPermissions() {
  return apiRequest('/api/permissions');
}

export async function getPermission(id: string) {
  return apiRequest(`/api/permissions/${id}`);
}

export async function createPermission(permission: any) {
  return apiRequest('/api/permissions', {
    method: 'POST',
    body: JSON.stringify(permission),
  });
}

export async function updatePermission(id: string, permission: any) {
  return apiRequest(`/api/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(permission),
  });
}

export async function deletePermission(id: string) {
  return apiRequest(`/api/permissions/${id}`, {
    method: 'DELETE',
  });
} 
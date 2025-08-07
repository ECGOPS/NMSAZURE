import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAzureADAuth } from '@/contexts/AzureADAuthContext';
import { apiRequest } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { PermissionService } from '@/services/PermissionService';
import { SubstationInspectionService } from '@/services/SubstationInspectionService';
import { VITSyncService } from '@/services/VITSyncService';
import { 
  Region, 
  District, 
  OP5Fault, 
  ControlSystemOutage, 
  VITAsset, 
  VITInspectionChecklist, 
  NetworkInspection
} from '@/lib/types';
import { LoadMonitoringData, SubstationInspection } from '@/lib/asset-types';
import { OfflineInspectionService } from '@/services/OfflineInspectionService';
import { FeederService } from '@/services/FeederService';
import { cache, migrateFromLocalStorage } from '@/utils/cache';

export interface DataContextType {
  regions: Region[];
  districts: District[];
  regionsLoading: boolean;
  districtsLoading: boolean;
  regionsError: string | null;
  districtsError: string | null;
  retryRegionsAndDistricts: () => Promise<void>;
  op5Faults: OP5Fault[];
  controlSystemOutages: ControlSystemOutage[];
  addOP5Fault: (fault: Omit<OP5Fault, "id">) => Promise<string>;
  updateOP5Fault: (id: string, data: Partial<OP5Fault>) => Promise<void>;
  deleteOP5Fault: (id: string) => Promise<void>;
  addControlSystemOutage: (outage: Omit<ControlSystemOutage, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">) => Promise<string>;
  updateControlSystemOutage: (id: string, data: Partial<ControlSystemOutage>) => Promise<void>;
  deleteControlSystemOutage: (id: string) => Promise<void>;
  canResolveFault: (fault: OP5Fault | ControlSystemOutage) => boolean;
  getFilteredFaults: (regionId?: string, districtId?: string) => { op5Faults: OP5Fault[]; controlOutages: ControlSystemOutage[] };
  resolveFault: (id: string, isOP5: boolean, restorationDate: string) => Promise<void>;
  deleteFault: (id: string, isOP5: boolean) => Promise<void>;
  canEditFault: (fault: OP5Fault | ControlSystemOutage) => boolean;
  loadMonitoringRecords?: LoadMonitoringData[];
  setLoadMonitoringRecords: React.Dispatch<React.SetStateAction<LoadMonitoringData[] | undefined>>;
  saveLoadMonitoringRecord: (record: Omit<LoadMonitoringData, "id">) => Promise<string>;
  getLoadMonitoringRecord: (id: string) => Promise<LoadMonitoringData | undefined>;
  updateLoadMonitoringRecord: (id: string, data: Partial<LoadMonitoringData>) => Promise<void>;
  deleteLoadMonitoringRecord: (id: string) => Promise<void>;
  initializeLoadMonitoring: () => Promise<void>;
  vitAssets: VITAsset[];
  vitInspections: VITInspectionChecklist[];
  addVITAsset: (asset: Omit<VITAsset, "id">) => Promise<string>;
  updateVITAsset: (id: string, updates: Partial<VITAsset>) => Promise<void>;
  deleteVITAsset: (id: string) => Promise<void>;
  addVITInspection: (inspection: Omit<VITInspectionChecklist, "id">) => Promise<string>;
  updateVITInspection: (id: string, updates: Partial<VITInspectionChecklist>) => Promise<void>;
  deleteVITInspection: (id: string) => Promise<void>;
  savedInspections: SubstationInspection[];
  setSavedInspections: React.Dispatch<React.SetStateAction<SubstationInspection[]>>;
  saveInspection: (inspection: SubstationInspection) => Promise<string>;
  updateSubstationInspection: (id: string, updates: Partial<SubstationInspection>) => Promise<void>;
  deleteInspection: (id: string) => Promise<void>;
  updateDistrict: (id: string, updates: Partial<District>) => Promise<void>;
  canEditAsset: (asset: VITAsset) => boolean;
  canEditInspection: (inspection: VITInspectionChecklist | SubstationInspection) => boolean;
  canDeleteAsset: (asset: VITAsset) => boolean;
  canDeleteInspection: (inspection: VITInspectionChecklist | SubstationInspection) => boolean;
  setVitAssets: React.Dispatch<React.SetStateAction<VITAsset[]>>;
  setVitInspections: React.Dispatch<React.SetStateAction<VITInspectionChecklist[]>>;
  getSavedInspection: (id: string) => SubstationInspection | undefined;
  canAddAsset: (regionName: string, districtName: string) => boolean;
  canAddInspection: (regionId: string, districtId: string) => boolean;
  getOP5FaultById: (id: string) => OP5Fault | undefined;
  networkInspections: NetworkInspection[];
  addNetworkInspection: (inspection: Omit<NetworkInspection, "id">) => Promise<string>;
  updateNetworkInspection: (id: string, updates: Partial<NetworkInspection>) => Promise<void>;
  deleteNetworkInspection: (id: string) => Promise<void>;
  canEditLoadMonitoring: boolean;
  canDeleteLoadMonitoring: boolean;
  refreshInspections: () => Promise<void>;
  refreshNetworkInspections: () => Promise<void>;
  loadMoreNetworkInspections: () => Promise<void>;
  clearVITAssetsCache: () => void;
  clearAllCache: () => Promise<void>;
  isLoadingVITAssets: boolean;
  refreshVITAssets: () => Promise<void>;
  testCache: () => Promise<{
    indexedDB: { data: VITAsset[]; timestamp: number } | null;
    memory: { data: VITAsset[]; timestamp: number };
    cacheInfo: { key: string; valid: boolean; age: number; size: number }[];
  }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  console.log('[DataContext] DataProvider is being rendered');
  const { user, loading } = useAzureADAuth();
  console.log('[DataContext] DataProvider rendered with user:', user, 'loading:', loading);
  
  // Add a global loading state to prevent multiple API calls
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  const [isContextReady, setIsContextReady] = useState(false);
  const [lastDataLoadTime, setLastDataLoadTime] = useState(0);
  const [isLoadingVITAssets, setIsLoadingVITAssets] = useState(false);
  const [dataCache, setDataCache] = useState<{
    vitAssets: { data: VITAsset[]; timestamp: number };
    vitInspections: { data: VITInspectionChecklist[]; timestamp: number };
    networkInspections: { data: NetworkInspection[]; timestamp: number };
    loadMonitoring: { data: LoadMonitoringData[]; timestamp: number };
    op5Faults: { data: OP5Fault[]; timestamp: number };
    controlOutages: { data: ControlSystemOutage[]; timestamp: number };
  }>({
    vitAssets: { data: [], timestamp: 0 },
    vitInspections: { data: [], timestamp: 0 },
    networkInspections: { data: [], timestamp: 0 },
    loadMonitoring: { data: [], timestamp: 0 },
    op5Faults: { data: [], timestamp: 0 },
    controlOutages: { data: [], timestamp: 0 }
  });
  
  // State for regions and districts
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [districtsError, setDistrictsError] = useState<string | null>(null);

  // State for faults and outages
  const [op5Faults, setOp5Faults] = useState<OP5Fault[]>([]);
  const [controlSystemOutages, setControlSystemOutages] = useState<ControlSystemOutage[]>([]);

  // State for VIT assets and inspections
  const [vitAssets, setVitAssets] = useState<VITAsset[]>([]);
  const [vitInspections, setVitInspections] = useState<VITInspectionChecklist[]>([]);

  // State for load monitoring
  const [loadMonitoringRecords, setLoadMonitoringRecords] = useState<LoadMonitoringData[]>([]);

  // State for network inspections
  const [networkInspections, setNetworkInspections] = useState<NetworkInspection[]>([]);

  // State for substation inspections
  const [savedInspections, setSavedInspections] = useState<SubstationInspection[]>([]);

  // Services
  const inspectionService = SubstationInspectionService.getInstance();
  const vitSyncService = VITSyncService.getInstance();

  // Fetch regions and districts
  const fetchRegionsAndDistricts = async () => {
    try {
      console.log('[DataContext] Starting to fetch regions and districts...');
      setRegionsLoading(true);
      setDistrictsLoading(true);
      setRegionsError(null);
      setDistrictsError(null);

      // Fetch regions
      console.log('[DataContext] Fetching regions from /api/regions...');
      const regionsData = await apiRequest('/api/regions');
      console.log('[DataContext] Regions loaded:', regionsData.length, 'regions');
      console.log('[DataContext] Regions data:', regionsData.map(r => ({ id: r.id, name: r.name })));
      setRegions(regionsData);
      setRegionsLoading(false);

      // Fetch districts
      console.log('[DataContext] Fetching districts from /api/districts...');
      const districtsData = await apiRequest('/api/districts');
      console.log('[DataContext] Districts loaded:', districtsData.length, 'districts');
      console.log('[DataContext] Districts data:', districtsData.map(d => ({ id: d.id, name: d.name, regionId: d.regionId })));
      
      // Check for any districts with missing regionId
      const districtsWithoutRegionId = districtsData.filter(d => !d.regionId);
      if (districtsWithoutRegionId.length > 0) {
        console.warn('[DataContext] Found districts without regionId:', districtsWithoutRegionId);
      }
      
      // Check regionId mapping
      const uniqueRegionIds = [...new Set(districtsData.map(d => d.regionId))];
      console.log('[DataContext] Unique regionIds in districts:', uniqueRegionIds);
      
      setDistricts(districtsData);
      setDistrictsLoading(false);
      
      console.log('[DataContext] Regions and districts fetch completed successfully');
    } catch (error) {
      console.error("[DataContext] Error fetching regions and districts:", error);
      setRegionsError("Failed to load regions. Please try again.");
      setDistrictsError("Failed to load districts. Please try again.");
      setRegionsLoading(false);
      setDistrictsLoading(false);
      toast({ title: "Error", description: "Failed to load regions and districts. Please refresh the page.", variant: "destructive" });
    }
  };

  // Load VIT assets with progressive loading
  const loadVITAssets = async () => {
    try {
      // Check if already loading to prevent duplicate requests
      if (isLoadingInitialData || isLoadingVITAssets) {
        console.log('[DataContext] VIT assets loading skipped - initial data loading in progress');
        return;
      }

      setIsLoadingVITAssets(true);
      console.log('[DataContext] 🔍 Starting VIT assets load...');

      // Check cache first with standardized format
      console.log('[DataContext] 🔍 Checking cache validity...');
      const cacheValid = await isCacheValid('vitAssets');
      console.log('[DataContext] Cache valid result:', cacheValid);
      
      if (cacheValid) {
        console.log('[DataContext] ✅ Using cached VIT assets (', dataCache.vitAssets.data.length, 'assets)');
        setVitAssets(dataCache.vitAssets.data);
        // Dispatch cache hit event
        window.dispatchEvent(new CustomEvent('cache-hit'));
        setIsLoadingVITAssets(false);
        return;
      }

      console.log('[DataContext] ❌ Cache miss - Loading VIT assets from API...');
      // Dispatch cache miss event
      window.dispatchEvent(new CustomEvent('cache-miss'));
      
      // Load initial batch of assets for faster loading
      const initialLimit = 50; // Load fewer assets initially for faster response
      const allAssets: VITAsset[] = [];
      
      // Apply role-based filtering consistently
      const baseParams = new URLSearchParams();
      console.log('[DataContext] User role:', user?.role);
      console.log('[DataContext] User region:', user?.region);
      console.log('[DataContext] User district:', user?.district);
      
      // The backend handles role-based filtering based on req.user object
      // We don't need to send district/region as query parameters
      if (user && user.role !== "system_admin" && user.role !== "global_engineer") {
        if (user.role === "district_engineer" || user.role === "technician" || user.role === "district_manager") {
          if (user.district) {
            console.log('[DataContext] User has district role with district:', user.district);
          } else {
            console.log('[DataContext] District role but no district assigned');
          }
        } else if (user.role === "regional_engineer" || user.role === "regional_general_manager" || user.role === "project_engineer") {
          if (user.region) {
            console.log('[DataContext] User has regional role with region:', user.region);
          } else {
            console.log('[DataContext] Regional role but no region assigned');
          }
        }
      } else {
        console.log('[DataContext] Admin/Global engineer - no filtering applied');
      }
      
      baseParams.append('sort', 'createdAt');
      baseParams.append('order', 'desc');
      
      console.log('[DataContext] Loading initial batch of VIT assets for faster response...');
      const startTime = Date.now();
      
      // Load initial batch
      const params = new URLSearchParams(baseParams);
      params.append('limit', initialLimit.toString());
      params.append('offset', '0');
      
      // Add user information to the request for role-based filtering
      if (user?.id) {
        params.append('userId', user.id);
      }
      
      const url = `/api/vitAssets?${params.toString()}`;
      console.log(`[DataContext] Loading initial batch: limit=${initialLimit}, URL: ${url}`);
      console.log(`[DataContext] User info:`, { id: user?.id, role: user?.role, region: user?.region, district: user?.district });
      
      const initialBatch = await apiRequest(url);
      allAssets.push(...initialBatch);
      
      const loadTime = Date.now() - startTime;
      console.log(`[DataContext] Initial VIT assets loaded: ${allAssets.length} assets (${loadTime}ms)`);
      console.log(`[DataContext] Sample assets:`, allAssets.slice(0, 3).map(asset => ({
        id: asset.id,
        serialNumber: asset.serialNumber,
        region: asset.region,
        district: asset.district,
        typeOfUnit: asset.typeOfUnit
      })));
      
      // Set initial assets immediately for better UX
      setVitAssets(allAssets);
      
      // Update cache with initial batch
      const initialCacheUpdate = { data: allAssets, timestamp: Date.now() };
      console.log('[DataContext] 💾 Caching initial VIT assets:', {
        count: allAssets.length,
        timestamp: initialCacheUpdate.timestamp,
        age: '0ms (fresh)'
      });
      
      // Save to IndexedDB cache
      try {
        await cache.set('vitAssets', initialCacheUpdate);
        console.log('[DataContext] ✅ Saved initial VIT assets to IndexedDB');
      } catch (error) {
        console.error('[DataContext] ❌ Failed to save initial VIT assets to IndexedDB:', error);
      }
      
      setDataCache(prev => ({
        ...prev,
        vitAssets: initialCacheUpdate
      }));
      
      // If we got a full batch, there might be more data
      if (initialBatch.length === initialLimit) {
        console.log('[DataContext] Full batch received, loading remaining assets in background...');
        
        // Load remaining assets in background
        setTimeout(async () => {
          try {
            let offset = initialLimit;
            let hasMore = true;
            const backgroundAssets: VITAsset[] = [];
            
            while (hasMore) {
              const backgroundParams = new URLSearchParams(baseParams);
              backgroundParams.append('limit', '100');
              backgroundParams.append('offset', offset.toString());
              
              const backgroundUrl = `/api/vitAssets?${backgroundParams.toString()}`;
              console.log(`[DataContext] Loading background batch: offset=${offset}`);
              
              const batch = await apiRequest(backgroundUrl);
              backgroundAssets.push(...batch);
              
              if (batch.length < 100) {
                hasMore = false;
              } else {
                offset += 100;
              }
            }
            
            // Merge background assets with initial assets
            const mergedAssets = [...allAssets, ...backgroundAssets];
            console.log(`[DataContext] Background loading complete: ${mergedAssets.length} total assets`);
            
            setVitAssets(mergedAssets);
            
            // Update cache with all assets
            const finalCacheUpdate = { data: mergedAssets, timestamp: Date.now() };
            console.log('[DataContext] 💾 Caching all VIT assets:', {
              count: mergedAssets.length,
              timestamp: finalCacheUpdate.timestamp,
              age: '0ms (fresh)'
            });
            
            // Save to IndexedDB cache
            try {
              await cache.set('vitAssets', finalCacheUpdate);
              console.log('[DataContext] ✅ Saved all VIT assets to IndexedDB');
            } catch (error) {
              console.error('[DataContext] ❌ Failed to save all VIT assets to IndexedDB:', error);
            }
            
            setDataCache(prev => ({
              ...prev,
              vitAssets: finalCacheUpdate
            }));
            
          } catch (error) {
            console.error('[DataContext] Background loading failed:', error);
          }
        }, 1000); // Start background loading after 1 second
      }
      
    } catch (error) {
      console.error('Error loading VIT assets:', error);
      toast({ title: "Error", description: "Failed to load VIT assets", variant: "destructive" });
    } finally {
      setIsLoadingVITAssets(false);
    }
  };

  // Load VIT inspections
  const loadVITInspections = async () => {
    try {
      // Check cache first
      if (await isCacheValid('vitInspections')) {
        console.log('[DataContext] Using cached VIT inspections');
        setVitInspections(dataCache.vitInspections.data);
        // Dispatch cache hit event
        window.dispatchEvent(new CustomEvent('cache-hit'));
        return;
      }

      console.log('[DataContext] Loading VIT inspections from API...');
      // Dispatch cache miss event
      window.dispatchEvent(new CustomEvent('cache-miss'));
      const params = new URLSearchParams();
      
      // Apply role-based filtering
      if (user && user.role !== "system_admin" && user.role !== "global_engineer") {
        if (user.role === "district_engineer" || user.role === "technician") {
          params.append('district', user.district || '');
        } else if (user.role === "regional_engineer" || user.role === "project_engineer") {
          params.append('region', user.region || '');
        }
      }
      
      // Add optimized pagination parameters for faster loading
      params.append('limit', '20'); // Reduced from 100 to 20 for faster loading
      params.append('offset', '0');
      params.append('sort', 'createdAt');
      params.append('order', 'desc');
      
      const url = `/api/vitInspections?${params.toString()}`;
      console.log('[DataContext] VIT inspections URL:', url);
      const inspections = await apiRequest(url);
      console.log('[DataContext] VIT inspections loaded:', inspections.length, 'inspections');
      
      // Update cache (both in-memory and localStorage)
      const cacheUpdate = { data: inspections, timestamp: Date.now() };
      console.log('[DataContext] 💾 Caching VIT inspections:', {
        count: inspections.length,
        timestamp: cacheUpdate.timestamp,
        age: '0ms (fresh)'
      });
      
      // Save to IndexedDB cache
      try {
        await cache.set('vitInspections', cacheUpdate);
        console.log('[DataContext] ✅ Saved VIT inspections to IndexedDB');
      } catch (error) {
        console.error('[DataContext] ❌ Failed to save VIT inspections to IndexedDB:', error);
      }
      
      setDataCache(prev => ({
        ...prev,
        vitInspections: cacheUpdate
      }));
      
      setVitInspections(inspections);
    } catch (error) {
      console.error('Error loading VIT inspections:', error);
      toast({ title: "Error", description: "Failed to load VIT inspections", variant: "destructive" });
    }
  };

  // Load network inspections
  const loadNetworkInspections = async (forceRefresh = false) => {
    // Disabled for server-side pagination - let the page handle its own data loading
    console.log('[DataContext] Network inspections loading disabled - using server-side pagination');
    setNetworkInspections([]);
  };

  // Load merged offline inspections
  const loadMergedOfflineInspections = async () => {
    try {
      const params = new URLSearchParams();
      
      // Apply role-based filtering
      if (user && user.role !== "system_admin" && user.role !== "global_engineer") {
        if (user.role === "district_engineer" || user.role === "technician" || user.role === "district_manager") {
          params.append('district', user.district || '');
        } else if (user.role === "regional_engineer" || user.role === "regional_general_manager") {
          params.append('region', user.region || '');
        }
      }
      
      const inspections = await apiRequest(`/api/substationInspections?${params.toString()}`);
      setSavedInspections(inspections);
    } catch (error) {
      console.error('Error loading substation inspections:', error);
    }
  };

  // Initialize load monitoring
  const initializeLoadMonitoring = async () => {
    try {
      // Check cache first
      if (await isCacheValid('loadMonitoring')) {
        console.log('[DataContext] Using cached load monitoring records');
        setLoadMonitoringRecords(dataCache.loadMonitoring.data);
        // Dispatch cache hit event
        window.dispatchEvent(new CustomEvent('cache-hit'));
        return;
      }

      console.log('[DataContext] Loading load monitoring records from API...');
      // Dispatch cache miss event
      window.dispatchEvent(new CustomEvent('cache-miss'));
      const params = new URLSearchParams();
      
      // Apply role-based filtering
      if (user && user.role !== "system_admin" && user.role !== "global_engineer") {
        if (user.role === "district_engineer" || user.role === "technician" || user.role === "district_manager") {
          params.append('district', user.district || '');
        } else if (user.role === "regional_engineer" || user.role === "regional_general_manager") {
          params.append('region', user.region || '');
        }
      }
      
      // Add optimized pagination parameters for faster loading
      params.append('limit', '20'); // Reduced from 100 to 20 for faster loading
      params.append('offset', '0');
      params.append('sort', 'date');
      params.append('order', 'desc');
      
      const url = `/api/loadMonitoring?${params.toString()}`;
      console.log('[DataContext] Load monitoring URL:', url);
      const records = await apiRequest(url);
      console.log('[DataContext] Load monitoring records loaded:', records.length, 'records');
      
      // Update cache (both in-memory and localStorage)
      const cacheUpdate = { data: records, timestamp: Date.now() };
      console.log('[DataContext] 💾 Caching load monitoring records:', {
        count: records.length,
        timestamp: cacheUpdate.timestamp,
        age: '0ms (fresh)'
      });
      
      // Save to IndexedDB cache
      try {
        await cache.set('loadMonitoring', cacheUpdate);
        console.log('[DataContext] ✅ Saved load monitoring records to IndexedDB');
      } catch (error) {
        console.error('[DataContext] ❌ Failed to save load monitoring records to IndexedDB:', error);
      }
      
      setDataCache(prev => ({
        ...prev,
        loadMonitoring: cacheUpdate
      }));
      
      setLoadMonitoringRecords(records);
    } catch (error) {
      console.error('Error loading load monitoring records:', error);
      toast({ title: "Error", description: "Failed to load load monitoring records", variant: "destructive" });
    }
  };

  // Load OP5 faults with optimized pagination
  const loadOP5Faults = async () => {
    try {
      // Check cache first
      if (await isCacheValid('op5Faults')) {
        console.log('[DataContext] Using cached OP5 faults');
        setOp5Faults(dataCache.op5Faults.data);
        // Dispatch cache hit event
        window.dispatchEvent(new CustomEvent('cache-hit'));
        return;
      }

      console.log('[DataContext] Loading OP5 faults from /api/op5Faults...');
      // Dispatch cache miss event
      window.dispatchEvent(new CustomEvent('cache-miss'));
      const params = new URLSearchParams();
      params.append('limit', '20'); // Reduced to 20 for faster loading
      params.append('offset', '0');
      params.append('sort', 'createdAt');
      params.append('order', 'desc');
      
      const url = `/api/op5Faults?${params.toString()}`;
      const faults = await apiRequest(url);
      console.log('[DataContext] OP5 faults loaded:', faults.length, 'faults');
      
      // Update cache (both in-memory and localStorage)
      const cacheUpdate = { data: faults, timestamp: Date.now() };
      console.log('[DataContext] 💾 Caching OP5 faults:', {
        count: faults.length,
        timestamp: cacheUpdate.timestamp,
        age: '0ms (fresh)'
      });
      
      // Save to IndexedDB cache
      try {
        await cache.set('op5Faults', cacheUpdate);
        console.log('[DataContext] ✅ Saved OP5 faults to IndexedDB');
      } catch (error) {
        console.error('[DataContext] ❌ Failed to save OP5 faults to IndexedDB:', error);
      }
      
      setDataCache(prev => ({
        ...prev,
        op5Faults: cacheUpdate
      }));
      
      setOp5Faults(faults);
    } catch (error) {
      console.error('Error loading OP5 faults:', error);
      toast({ title: "Error", description: "Failed to load OP5 faults", variant: "destructive" });
    }
  };

  // Load control system outages with optimized pagination
  const loadControlSystemOutages = async () => {
    try {
      // Check cache first
      if (await isCacheValid('controlOutages')) {
        console.log('[DataContext] Using cached control system outages');
        setControlSystemOutages(dataCache.controlOutages.data);
        // Dispatch cache hit event
        window.dispatchEvent(new CustomEvent('cache-hit'));
        return;
      }

      console.log('[DataContext] Loading control system outages from /api/controlOutages...');
      // Dispatch cache miss event
      window.dispatchEvent(new CustomEvent('cache-miss'));
      const params = new URLSearchParams();
      params.append('limit', '20'); // Reduced to 20 for faster loading
      params.append('offset', '0');
      params.append('sort', 'createdAt');
      params.append('order', 'desc');
      
      const url = `/api/controlOutages?${params.toString()}`;
      const outages = await apiRequest(url);
      console.log('[DataContext] Control system outages loaded:', outages.length, 'outages');
      
      // Update cache (both in-memory and localStorage)
      const cacheUpdate = { data: outages, timestamp: Date.now() };
      console.log('[DataContext] 💾 Caching control system outages:', {
        count: outages.length,
        timestamp: cacheUpdate.timestamp,
        age: '0ms (fresh)'
      });
      
      // Save to IndexedDB cache
      try {
        await cache.set('controlOutages', cacheUpdate);
        console.log('[DataContext] ✅ Saved control system outages to IndexedDB');
      } catch (error) {
        console.error('[DataContext] ❌ Failed to save control system outages to IndexedDB:', error);
      }
      
      setDataCache(prev => ({
        ...prev,
        controlOutages: cacheUpdate
      }));
      
      setControlSystemOutages(outages);
    } catch (error) {
      console.error('Error loading control system outages:', error);
      toast({ title: "Error", description: "Failed to load control system outages", variant: "destructive" });
    }
  };

  // Cache validation function with IndexedDB persistence
  const isCacheValid = async (cacheKey: keyof typeof dataCache, maxAge: number = 5 * 60 * 1000) => {
    try {
      // Try to get from IndexedDB cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData && typeof cachedData === 'object' && 'timestamp' in cachedData && 'data' in cachedData) {
        const typedData = cachedData as { timestamp: number; data: any[] };
        const age = Date.now() - typedData.timestamp;
        const isValid = typedData.timestamp > 0 && age < maxAge && Array.isArray(typedData.data) && typedData.data.length > 0;
        
        console.log(`[Cache] ${cacheKey} IndexedDB check:`, {
          timestamp: typedData.timestamp,
          age: age,
          isValid,
          dataLength: Array.isArray(typedData.data) ? typedData.data.length : 0,
          hasData: Array.isArray(typedData.data) && typedData.data.length > 0
        });
        
        if (isValid) {
          // Update in-memory cache from IndexedDB
          setDataCache(prev => ({
            ...prev,
            [cacheKey]: cachedData as any
          }));
          return true;
        }
      }
    } catch (error) {
      console.error(`[Cache] Error reading ${cacheKey} from IndexedDB:`, error);
    }
    
    // Fallback to in-memory cache
    const memoryCache = dataCache[cacheKey];
    if (!memoryCache || !memoryCache.timestamp || !Array.isArray(memoryCache.data) || memoryCache.data.length === 0) {
      console.log(`[Cache] ${cacheKey} no valid memory cache available`);
      return false;
    }
    
    const age = Date.now() - memoryCache.timestamp;
    const isValid = memoryCache.timestamp > 0 && age < maxAge && memoryCache.data.length > 0;
    
    console.log(`[Cache] ${cacheKey} in-memory check:`, {
      timestamp: memoryCache.timestamp,
      age: age,
      isValid,
      dataLength: memoryCache.data.length,
      hasData: memoryCache.data.length > 0
    });
    
    return isValid;
  };

  // Clear cache for specific data type
  const clearCache = async (cacheKey: keyof typeof dataCache) => {
    // Clear in-memory cache
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: { data: [], timestamp: 0 }
    }));
    
    // Clear IndexedDB cache
    try {
      await cache.delete(cacheKey);
      console.log(`[DataContext] ✅ Cleared ${cacheKey} cache from IndexedDB`);
    } catch (error) {
      console.error(`[DataContext] ❌ Failed to clear ${cacheKey} from IndexedDB:`, error);
    }
  };

  // Function to clear VIT assets cache specifically
  const clearVITAssetsCache = async () => {
    await clearCache('vitAssets');
    console.log('[DataContext] VIT assets cache cleared');
  };

  // Function to force refresh VIT assets
  const refreshVITAssets = async () => {
    console.log('[DataContext] 🔄 Force refreshing VIT assets...');
    setIsLoadingVITAssets(true);
    
    try {
      // Clear cache first
      await clearCache('vitAssets');
      
      // Reload data
      await loadVITAssets();
      
      console.log('[DataContext] ✅ VIT assets refreshed successfully');
    } catch (error) {
      console.error('[DataContext] ❌ Failed to refresh VIT assets:', error);
    } finally {
      setIsLoadingVITAssets(false);
    }
  };

  // Test function to verify cache functionality
  const testCache = async () => {
    console.log('[DataContext] 🧪 Testing cache functionality...');
    
    // Test 1: Check if cache exists
    const cacheInfo = await cache.getInfo();
    console.log('[DataContext] 🧪 Cache info:', cacheInfo);
    
    // Test 2: Check VIT assets cache specifically
    const vitCache = await cache.get('vitAssets') as { data: VITAsset[]; timestamp: number } | null;
    console.log('[DataContext] 🧪 VIT assets cache:', vitCache ? {
      hasData: !!vitCache.data,
      dataLength: Array.isArray(vitCache.data) ? vitCache.data.length : 'not array',
      timestamp: vitCache.timestamp,
      age: Date.now() - vitCache.timestamp
    } : 'null');
    
    // Test 3: Check in-memory cache
    console.log('[DataContext] 🧪 In-memory cache:', {
      hasData: !!dataCache.vitAssets.data,
      dataLength: dataCache.vitAssets.data.length,
      timestamp: dataCache.vitAssets.timestamp,
      age: Date.now() - dataCache.vitAssets.timestamp
    });
    
    return {
      indexedDB: vitCache,
      memory: dataCache.vitAssets,
      cacheInfo
    };
  };

  // Clear all cache
  const clearAllCache = async () => {
    // Clear in-memory cache
    setDataCache({
      vitAssets: { data: [], timestamp: 0 },
      vitInspections: { data: [], timestamp: 0 },
      networkInspections: { data: [], timestamp: 0 },
      loadMonitoring: { data: [], timestamp: 0 },
      op5Faults: { data: [], timestamp: 0 },
      controlOutages: { data: [], timestamp: 0 }
    });
    
    // Clear IndexedDB cache
    try {
      await cache.clear();
      console.log('[DataContext] ✅ Cleared all cache from IndexedDB');
    } catch (error) {
      console.error('[DataContext] ❌ Failed to clear IndexedDB cache:', error);
    }
  };

  // Load initial data with caching and proper dependency management
  useEffect(() => {
    console.log('[DataContext] useEffect triggered with user:', user, 'loading:', loading);
    
    const loadInitialData = async () => {
      // Wait for authentication to complete
      if (loading) {
        console.log('[DataContext] Still loading, waiting for authentication...');
        return;
      }
      
      if (!user) {
        console.log('[DataContext] No user, skipping data load');
        return;
      }

      // Prevent multiple simultaneous API calls
      if (isLoadingInitialData || isInitialDataLoaded) {
        console.log('[DataContext] Data already loading or loaded, skipping...');
        return;
      }

      // Check if we have valid cached data for each type
      const now = Date.now();
      console.log('[DataContext] Checking cache status...');
      
      const vitAssetsCached = await isCacheValid('vitAssets');
      const vitInspectionsCached = await isCacheValid('vitInspections');
      const networkInspectionsCached = await isCacheValid('networkInspections');
      const loadMonitoringCached = await isCacheValid('loadMonitoring');
      const op5FaultsCached = await isCacheValid('op5Faults');
      const controlOutagesCached = await isCacheValid('controlOutages');
      
      const allCached = vitAssetsCached && vitInspectionsCached && networkInspectionsCached && 
                       loadMonitoringCached && op5FaultsCached && controlOutagesCached;
      
      if (allCached) {
        console.log('[DataContext] All data is cached, loading from cache...');
        // Load from cache
        setVitAssets(dataCache.vitAssets.data);
        setVitInspections(dataCache.vitInspections.data);
        setNetworkInspections(dataCache.networkInspections.data);
        setLoadMonitoringRecords(dataCache.loadMonitoring.data);
        setOp5Faults(dataCache.op5Faults.data);
        setControlSystemOutages(dataCache.controlOutages.data);
        
        setIsInitialDataLoaded(true);
        return;
      }

      console.log('[DataContext] 🚀 Starting loadInitialData...');
      console.log('[DataContext] 📊 Cache state:', {
        vitAssets: dataCache.vitAssets.timestamp > 0 ? 'cached' : 'empty',
        vitInspections: dataCache.vitInspections.timestamp > 0 ? 'cached' : 'empty',
        networkInspections: dataCache.networkInspections.timestamp > 0 ? 'cached' : 'empty',
        loadMonitoring: dataCache.loadMonitoring.timestamp > 0 ? 'cached' : 'empty',
        op5Faults: dataCache.op5Faults.timestamp > 0 ? 'cached' : 'empty',
        controlOutages: dataCache.controlOutages.timestamp > 0 ? 'cached' : 'empty'
      });
      
      // Migrate from localStorage to IndexedDB if needed
      try {
        await migrateFromLocalStorage();
      } catch (error) {
        console.error('[DataContext] Migration failed:', error);
      }
      
      setIsLoadingInitialData(true);
      
      try {
        // Load regions and districts first (required for other data)
        console.log('[DataContext] Loading regions and districts...');
        await fetchRegionsAndDistricts();
        
        // Load essential data in parallel with timeouts
        console.log('[DataContext] Loading essential data in parallel...');
        const essentialDataPromises = [
          initializeLoadMonitoring().catch(error => {
            console.error('[DataContext] Load monitoring failed:', error);
            return null;
          }),
          loadNetworkInspections().catch(error => {
            console.error('[DataContext] Network inspections failed:', error);
            return null;
          }),
          loadMergedOfflineInspections().catch(error => {
            console.error('[DataContext] Merged offline inspections failed:', error);
            return null;
          }),
          loadOP5Faults().catch(error => {
            console.error('[DataContext] OP5 faults failed:', error);
            return null;
          }),
          loadControlSystemOutages().catch(error => {
            console.error('[DataContext] Control outages failed:', error);
            return null;
          })
        ];
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Essential data loading timeout')), 30000)
        );
        
        await Promise.race([
          Promise.all(essentialDataPromises),
          timeoutPromise
        ]);
        
        // Load VIT data independently (non-blocking) with shorter timeout
        console.log('[DataContext] Loading VIT data independently...');
        const vitDataPromises = [
          loadVITAssets().catch(error => {
            console.error('[DataContext] VIT assets failed:', error);
            return null;
          }),
          loadVITInspections().catch(error => {
            console.error('[DataContext] VIT inspections failed:', error);
            return null;
          })
        ];
        
        const vitTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('VIT data loading timeout')), 15000)
        );
        
        Promise.race([
          Promise.all(vitDataPromises),
          vitTimeoutPromise
        ]).catch(error => {
          console.error('[DataContext] VIT data loading failed:', error);
          // Don't block the app if VIT data fails to load
        });
        
        console.log('[DataContext] loadInitialData completed successfully');
        setIsInitialDataLoaded(true);
        setLastDataLoadTime(now);
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({ title: "Error", description: "Failed to load initial data", variant: "destructive" });
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    loadInitialData();
  }, [user?.id, loading]); // Only depend on user ID and loading state

  // API-based operations
  const addOP5Fault = async (fault: Omit<OP5Fault, "id">) => {
    try {
      const result = await apiRequest('/api/op5Faults', {
        method: 'POST',
        body: JSON.stringify(fault),
      });
      setOp5Faults(prev => [...prev, result]);
      clearCache('op5Faults'); // Clear cache when data changes
      return result.id;
    } catch (error) {
      console.error('Error adding OP5 fault:', error);
      throw error;
    }
  };

  const updateOP5Fault = async (id: string, data: Partial<OP5Fault>) => {
    try {
      await apiRequest(`/api/op5Faults/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setOp5Faults(prev => prev.map(fault => fault.id === id ? { ...fault, ...data } : fault));
      clearCache('op5Faults'); // Clear cache when data changes
    } catch (error) {
      console.error('Error updating OP5 fault:', error);
      throw error;
    }
  };

  const deleteOP5Fault = async (id: string) => {
    try {
      const result = await apiRequest(`/api/op5Faults/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] OP5 fault deleted successfully');
      }
      setOp5Faults(prev => prev.filter(fault => fault.id !== id));
      clearCache('op5Faults'); // Clear cache when data changes
    } catch (error) {
      console.error('Error deleting OP5 fault:', error);
      throw error;
    }
  };

  const addControlSystemOutage = async (outage: Omit<ControlSystemOutage, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">) => {
    try {
      const result = await apiRequest('/api/controlOutages', {
        method: 'POST',
        body: JSON.stringify(outage),
      });
      setControlSystemOutages(prev => [...prev, result]);
      return result.id;
    } catch (error) {
      console.error('Error adding control system outage:', error);
      throw error;
    }
  };

  const updateControlSystemOutage = async (id: string, data: Partial<ControlSystemOutage>) => {
    try {
      await apiRequest(`/api/controlOutages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setControlSystemOutages(prev => prev.map(outage => outage.id === id ? { ...outage, ...data } : outage));
    } catch (error) {
      console.error('Error updating control system outage:', error);
      throw error;
    }
  };

  const deleteControlSystemOutage = async (id: string) => {
    try {
      const result = await apiRequest(`/api/controlOutages/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] Control system outage deleted successfully');
      }
      setControlSystemOutages(prev => prev.filter(outage => outage.id !== id));
    } catch (error) {
      console.error('Error deleting control system outage:', error);
      throw error;
    }
  };

  const addVITAsset = async (asset: Omit<VITAsset, "id">) => {
    try {
      const result = await apiRequest('/api/vitAssets', {
        method: 'POST',
        body: JSON.stringify(asset),
      });
      
      // Add the new asset to the current state immediately for better UX
      setVitAssets(prev => [result, ...prev]);
      
      // Update cache with the new asset included
      const updatedAssets = [result, ...vitAssets];
      const cacheUpdate = { data: updatedAssets, timestamp: Date.now() };
      
      try {
        await cache.set('vitAssets', cacheUpdate);
        setDataCache(prev => ({ ...prev, vitAssets: cacheUpdate }));
        console.log('[DataContext] Updated VIT assets cache with new asset');
      } catch (error) {
        console.error('[DataContext] Failed to update cache with new asset:', error);
      }
      
      return result.id;
    } catch (error) {
      console.error('Error adding VIT asset:', error);
      throw error;
    }
  };

  const updateVITAsset = async (id: string, updates: Partial<VITAsset>) => {
    try {
      await apiRequest(`/api/vitAssets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      // Update the asset in the current state immediately
      setVitAssets(prev => prev.map(asset => asset.id === id ? { ...asset, ...updates } : asset));
      
      // Update cache with the updated asset
      const updatedAssets = vitAssets.map(asset => asset.id === id ? { ...asset, ...updates } : asset);
      const cacheUpdate = { data: updatedAssets, timestamp: Date.now() };
      
      try {
        await cache.set('vitAssets', cacheUpdate);
        setDataCache(prev => ({ ...prev, vitAssets: cacheUpdate }));
        console.log('[DataContext] Updated VIT assets cache with updated asset');
      } catch (error) {
        console.error('[DataContext] Failed to update cache with updated asset:', error);
      }
    } catch (error) {
      console.error('Error updating VIT asset:', error);
      throw error;
    }
  };

  const deleteVITAsset = async (id: string) => {
    try {
      const result = await apiRequest(`/api/vitAssets/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] VIT asset deleted successfully');
      }
      
      // Remove the asset from the current state immediately
      setVitAssets(prev => prev.filter(asset => asset.id !== id));
      
      // Update cache with the asset removed
      const updatedAssets = vitAssets.filter(asset => asset.id !== id);
      const cacheUpdate = { data: updatedAssets, timestamp: Date.now() };
      
      try {
        await cache.set('vitAssets', cacheUpdate);
        setDataCache(prev => ({ ...prev, vitAssets: cacheUpdate }));
        console.log('[DataContext] Updated VIT assets cache after deleting asset');
      } catch (error) {
        console.error('[DataContext] Failed to update cache after deleting asset:', error);
      }
    } catch (error) {
      console.error('Error deleting VIT asset:', error);
      throw error;
    }
  };

  const addVITInspection = async (inspection: Omit<VITInspectionChecklist, "id">) => {
    try {
      const result = await apiRequest('/api/vitInspections', {
        method: 'POST',
        body: JSON.stringify(inspection),
      });
      setVitInspections(prev => [...prev, result]);
      
      // Clear the VIT inspections cache to force a fresh load
      await clearCache('vitInspections');
      console.log('[DataContext] Cleared VIT inspections cache after adding new inspection');
      
      return result.id;
    } catch (error) {
      console.error('Error adding VIT inspection:', error);
      throw error;
    }
  };

  const updateVITInspection = async (id: string, updates: Partial<VITInspectionChecklist>) => {
    try {
      await apiRequest(`/api/vitInspections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setVitInspections(prev => prev.map(inspection => inspection.id === id ? { ...inspection, ...updates } : inspection));
      
      // Clear the VIT inspections cache to force a fresh load
      await clearCache('vitInspections');
      console.log('[DataContext] Cleared VIT inspections cache after updating inspection');
    } catch (error) {
      console.error('Error updating VIT inspection:', error);
      throw error;
    }
  };

  const deleteVITInspection = async (id: string) => {
    try {
      const result = await apiRequest(`/api/vitInspections/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] VIT inspection deleted successfully');
      }
      setVitInspections(prev => prev.filter(inspection => inspection.id !== id));
      
      // Clear the VIT inspections cache to force a fresh load
      await clearCache('vitInspections');
      console.log('[DataContext] Cleared VIT inspections cache after deleting inspection');
    } catch (error) {
      console.error('Error deleting VIT inspection:', error);
      throw error;
    }
  };

  const saveLoadMonitoringRecord = async (record: Omit<LoadMonitoringData, "id">) => {
    try {
      const result = await apiRequest('/api/loadMonitoring', {
        method: 'POST',
        body: JSON.stringify(record),
      });
      setLoadMonitoringRecords(prev => [...(prev || []), result]);
      return result.id;
    } catch (error) {
      console.error('Error saving load monitoring record:', error);
      throw error;
    }
  };

  const getLoadMonitoringRecord = async (id: string) => {
    try {
      return await apiRequest(`/api/loadMonitoring/${id}`);
    } catch (error) {
      console.error('Error getting load monitoring record:', error);
      return undefined;
    }
  };

  const updateLoadMonitoringRecord = async (id: string, data: Partial<LoadMonitoringData>) => {
    try {
      await apiRequest(`/api/loadMonitoring/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setLoadMonitoringRecords(prev => prev?.map(record => record.id === id ? { ...record, ...data } : record));
    } catch (error) {
      console.error('Error updating load monitoring record:', error);
      throw error;
    }
  };

  const deleteLoadMonitoringRecord = async (id: string) => {
    try {
      const result = await apiRequest(`/api/loadMonitoring/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] Load monitoring record deleted successfully');
      }
      setLoadMonitoringRecords(prev => prev?.filter(record => record.id !== id));
    } catch (error) {
      console.error('Error deleting load monitoring record:', error);
      throw error;
    }
  };

  const addNetworkInspection = async (inspection: Omit<NetworkInspection, "id">) => {
    try {
      const result = await apiRequest('/api/overheadLineInspections', {
        method: 'POST',
        body: JSON.stringify(inspection),
      });
      setNetworkInspections(prev => [...prev, result]);
      
      // Clear the network inspections cache and reload data
      await clearCache('networkInspections');
      console.log('[DataContext] Cleared network inspections cache after adding new inspection');
      
      // Force reload the data to ensure fresh data is loaded
      await loadNetworkInspections();
      
      return result.id;
    } catch (error) {
      console.error('Error adding network inspection:', error);
      throw error;
    }
  };

  const updateNetworkInspection = async (id: string, updates: Partial<NetworkInspection>) => {
    try {
      await apiRequest(`/api/overheadLineInspections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setNetworkInspections(prev => prev.map(inspection => inspection.id === id ? { ...inspection, ...updates } : inspection));
      
      // Clear the network inspections cache and reload data
      await clearCache('networkInspections');
      console.log('[DataContext] Cleared network inspections cache after updating inspection');
      
      // Force reload the data to ensure fresh data is loaded
      await loadNetworkInspections();
    } catch (error) {
      console.error('Error updating network inspection:', error);
      throw error;
    }
  };

  const deleteNetworkInspection = async (id: string) => {
    try {
      const result = await apiRequest(`/api/overheadLineInspections/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] Network inspection deleted successfully');
      }
      setNetworkInspections(prev => prev.filter(inspection => inspection.id !== id));
      
      // Clear the network inspections cache and reload data
      await clearCache('networkInspections');
      console.log('[DataContext] Cleared network inspections cache after deleting inspection');
      
      // Force reload the data to ensure fresh data is loaded
      await loadNetworkInspections();
    } catch (error) {
      console.error('Error deleting network inspection:', error);
      throw error;
    }
  };

  const saveInspection = async (inspection: SubstationInspection): Promise<string> => {
    try {
      const result = await apiRequest('/api/substationInspections', {
        method: 'POST',
        body: JSON.stringify(inspection),
      });
      setSavedInspections(prev => [...prev, result]);
      return result.id;
    } catch (error) {
      console.error('Error saving inspection:', error);
      throw error;
    }
  };

  const updateSubstationInspection = async (id: string, updates: Partial<SubstationInspection>) => {
    try {
      await apiRequest(`/api/substationInspections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSavedInspections(prev => prev.map(inspection => inspection.id === id ? { ...inspection, ...updates } : inspection));
    } catch (error) {
      console.error('Error updating substation inspection:', error);
      throw error;
    }
  };

  const deleteInspection = async (id: string) => {
    try {
      const result = await apiRequest(`/api/substationInspections/${id}`, {
        method: 'DELETE',
      });
      // Handle null response from DELETE operations
      if (result === null) {
        console.log('[DataContext] Substation inspection deleted successfully');
      }
      setSavedInspections(prev => prev.filter(inspection => inspection.id !== id));
    } catch (error) {
      console.error('Error deleting substation inspection:', error);
      throw error;
    }
  };

  const getSavedInspection = (id: string): SubstationInspection | undefined => {
    return savedInspections.find(inspection => inspection.id === id);
  };

  const updateDistrict = async (id: string, updates: Partial<District>) => {
    try {
      await apiRequest(`/api/districts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setDistricts(prev => prev.map(district => district.id === id ? { ...district, ...updates } : district));
    } catch (error) {
      console.error('Error updating district:', error);
      throw error;
    }
  };

  // Permission checks
  const canResolveFault = (fault: OP5Fault | ControlSystemOutage) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'fault_resolution');
  };

  const canEditFault = (fault: OP5Fault | ControlSystemOutage) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'fault_edit');
  };

  const canEditAsset = (asset: VITAsset) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'asset_edit');
  };

  const canEditInspection = (inspection: VITInspectionChecklist | SubstationInspection) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'inspection_edit');
  };

  const canDeleteAsset = (asset: VITAsset) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'asset_delete');
  };

  const canDeleteInspection = (inspection: VITInspectionChecklist | SubstationInspection) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'inspection_delete');
  };

  const canAddAsset = (regionName: string, districtName: string) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'asset_add');
  };

  const canAddInspection = (regionId: string, districtId: string) => {
    if (!user) return false;
    return PermissionService.getInstance().canAccessFeature(user.role, 'inspection_add');
  };

  const getOP5FaultById = (id: string) => {
    return op5Faults.find(fault => fault.id === id);
  };

  const getFilteredFaults = (regionId?: string, districtId?: string) => {
    let filteredOp5Faults = op5Faults;
    let filteredControlOutages = controlSystemOutages;

    if (regionId) {
      filteredOp5Faults = filteredOp5Faults.filter(fault => fault.regionId === regionId);
      filteredControlOutages = filteredControlOutages.filter(outage => outage.regionId === regionId);
    }

    if (districtId) {
      filteredOp5Faults = filteredOp5Faults.filter(fault => fault.districtId === districtId);
      filteredControlOutages = filteredControlOutages.filter(outage => outage.districtId === districtId);
    }

    return { op5Faults: filteredOp5Faults, controlOutages: filteredControlOutages };
  };

  const resolveFault = async (id: string, isOP5: boolean, restorationDate: string) => {
    try {
      if (isOP5) {
        await updateOP5Fault(id, { status: 'resolved', restorationDate });
      } else {
        await updateControlSystemOutage(id, { status: 'resolved', restorationDate });
      }
              toast({ title: "Success", description: "Fault resolved successfully" });
    } catch (error) {
      console.error('Error resolving fault:', error);
              toast({ title: "Error", description: "Failed to resolve fault", variant: "destructive" });
    }
  };

  const deleteFault = async (id: string, isOP5: boolean) => {
    try {
      if (isOP5) {
        await deleteOP5Fault(id);
      } else {
        await deleteControlSystemOutage(id);
      }
              toast({ title: "Success", description: "Fault deleted successfully" });
    } catch (error) {
      console.error('Error deleting fault:', error);
      toast({ title: "Error", description: "Failed to delete fault", variant: "destructive" });
    }
  };

  const refreshInspections = async () => {
    try {
      // Clear network inspections cache to force fresh data
      await clearCache('networkInspections');
      console.log('[DataContext] Cleared network inspections cache during refresh');
      
      // Reload network inspections
      await loadNetworkInspections();
      
      // Also refresh offline inspections
      await loadMergedOfflineInspections();
      
      toast({ title: "Success", description: "Inspections refreshed" });
    } catch (error) {
      console.error('Error refreshing inspections:', error);
      toast({ title: "Error", description: "Failed to refresh inspections", variant: "destructive" });
    }
  };

  const refreshNetworkInspections = async () => {
    try {
      // Clear network inspections cache to force fresh data
      await clearCache('networkInspections');
      console.log('[DataContext] Cleared network inspections cache during refresh');
      
      // Clear the data cache as well
      setDataCache(prev => ({
        ...prev,
        networkInspections: { data: [], timestamp: 0 }
      }));
      
      // Reload network inspections with fresh data
      await loadNetworkInspections(true);
      
      toast({ title: "Success", description: "Network inspections refreshed" });
    } catch (error) {
      console.error('Error refreshing network inspections:', error);
      toast({ title: "Error", description: "Failed to refresh network inspections", variant: "destructive" });
    }
  };

  const loadMoreNetworkInspections = async () => {
    try {
      const currentCount = networkInspections.length;
      const params = new URLSearchParams();
      
      // Apply role-based filtering
      if (user && user.role !== "system_admin" && user.role !== "global_engineer") {
        if (user.role === "district_engineer" || user.role === "technician" || user.role === "district_manager") {
          params.append('district', user.district || '');
        } else if (user.role === "regional_engineer" || user.role === "regional_general_manager") {
          params.append('region', user.region || '');
        }
      }
      
      // Load next batch of data
      params.append('limit', '50');
      params.append('offset', currentCount.toString());
      params.append('sort', 'createdAt');
      params.append('order', 'desc');
      
      const url = `/api/overheadLineInspections?${params.toString()}`;
      console.log('[DataContext] Loading more network inspections:', url);
      const moreInspections = await apiRequest(url);
      
      if (moreInspections.length > 0) {
        setNetworkInspections(prev => [...prev, ...moreInspections]);
        console.log('[DataContext] Loaded', moreInspections.length, 'more inspections. Total:', networkInspections.length + moreInspections.length);
        toast({ title: "Success", description: `Loaded ${moreInspections.length} more inspections` });
      } else {
        toast({ title: "Info", description: "No more inspections to load" });
      }
    } catch (error) {
      console.error('Error loading more network inspections:', error);
      toast({ title: "Error", description: "Failed to load more inspections", variant: "destructive" });
    }
  };

  const canEditLoadMonitoring = user ? PermissionService.getInstance().canAccessFeature(user.role, 'load_monitoring_edit') : false;
  const canDeleteLoadMonitoring = user ? PermissionService.getInstance().canAccessFeature(user.role, 'load_monitoring_delete') : false;

  const value: DataContextType = {
    regions,
    districts,
    regionsLoading,
    districtsLoading,
    regionsError,
    districtsError,
    retryRegionsAndDistricts: fetchRegionsAndDistricts,
    op5Faults,
    controlSystemOutages,
    addOP5Fault,
    updateOP5Fault,
    deleteOP5Fault,
    addControlSystemOutage,
    updateControlSystemOutage,
    deleteControlSystemOutage,
    canResolveFault,
    getFilteredFaults,
    resolveFault,
    deleteFault,
    canEditFault,
    loadMonitoringRecords,
    setLoadMonitoringRecords,
    saveLoadMonitoringRecord,
    getLoadMonitoringRecord,
    updateLoadMonitoringRecord,
    deleteLoadMonitoringRecord,
    initializeLoadMonitoring,
    vitAssets,
    vitInspections,
    addVITAsset,
    updateVITAsset,
    deleteVITAsset,
    addVITInspection,
    updateVITInspection,
    deleteVITInspection,
    savedInspections,
    setSavedInspections,
    saveInspection,
    updateSubstationInspection,
    deleteInspection,
    updateDistrict,
    canEditAsset,
    canEditInspection,
    canDeleteAsset,
    canDeleteInspection,
    setVitAssets,
    setVitInspections,
    getSavedInspection,
    canAddAsset,
    canAddInspection,
          getOP5FaultById,
      networkInspections,
      addNetworkInspection,
    updateNetworkInspection,
    deleteNetworkInspection,
    canEditLoadMonitoring,
    canDeleteLoadMonitoring,
    refreshInspections,
    refreshNetworkInspections,
    loadMoreNetworkInspections,
    clearVITAssetsCache,
    clearAllCache,
    isLoadingVITAssets,
    refreshVITAssets,
    testCache,
  };

  // Set context as ready after initial render
  useEffect(() => {
    setIsContextReady(true);
  }, []);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    console.error('[useData] Context is undefined - DataProvider may not be initialized yet');
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

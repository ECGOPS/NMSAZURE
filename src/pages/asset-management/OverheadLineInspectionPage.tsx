import { useState, useEffect, useMemo, useCallback } from "react";
import { useData } from "@/contexts/DataContext";
import { useAzureADAuth } from "@/contexts/AzureADAuthContext";
import { apiRequest } from "@/lib/api";
import { cache } from "@/utils/cache";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OverheadLineInspectionForm } from "@/components/overhead-line/OverheadLineInspectionForm";
import { OverheadLineInspectionsTable } from "@/components/overhead-line/OverheadLineInspectionsTable";
import { PlusCircle, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { NetworkInspection } from "@/lib/types";
import { OverheadLineInspectionDetails } from "@/components/overhead-line/OverheadLineInspectionDetails";
import { AccessControlWrapper } from "@/components/access-control/AccessControlWrapper";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { InspectionDetailsView } from "@/components/inspection/InspectionDetailsView";
import { useNavigate } from "react-router-dom";
import { OfflineInspectionService } from "@/services/OfflineInspectionService";
import { OverheadLineInspectionDetailsView } from "@/components/overhead-line/OverheadLineInspectionDetailsView";

export default function OverheadLineInspectionPage() {
  const { user } = useAzureADAuth();
  const [activeTab, setActiveTab] = useState("inspections");
  const [isInspectionFormOpen, setIsInspectionFormOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<NetworkInspection | null>(null);
  const [editingInspection, setEditingInspection] = useState<NetworkInspection | null>(null);
  const { networkInspections, updateNetworkInspection, deleteNetworkInspection, addNetworkInspection, districts, regions, refreshNetworkInspections } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFeeder, setSelectedFeeder] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20; // Optimized page size after removing base64 data
  const navigate = useNavigate();
  const offlineStorage = OfflineInspectionService.getInstance();
  const [offlineInspections, setOfflineInspections] = useState<NetworkInspection[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Load offline inspections
  useEffect(() => {
    const handleOfflineInspectionsUpdate = (event: CustomEvent) => {
      setOfflineInspections(event.detail.inspections);
    };

    // Load initial offline inspections
    setOfflineInspections(offlineStorage.getOfflineInspections());

    window.addEventListener('offlineInspectionsUpdated', handleOfflineInspectionsUpdate as EventListener);

    return () => {
      window.removeEventListener('offlineInspectionsUpdated', handleOfflineInspectionsUpdate as EventListener);
    };
  }, [offlineStorage]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      offlineStorage.syncPendingInspections();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineStorage]);

  // Filter districts based on selected region
  const filteredDistricts = useMemo(() => {
    if (!selectedRegion) return districts;
    return districts.filter(d => d.regionId === selectedRegion);
  }, [districts, selectedRegion]);

  // Server-side pagination state - no client-side filtering needed
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [currentPageData, setCurrentPageData] = useState<NetworkInspection[]>([]);
  const [isDataFromCache, setIsDataFromCache] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'retrying' | 'error'>('connected');
  const totalPages = Math.ceil(totalRecords / pageSize);

  // Generate cache key for current page and filters
  const getCacheKey = (page: number) => {
    const filterParams = {
      page,
      date: selectedDate?.toISOString().split('T')[0] || null,
      month: selectedMonth?.toISOString().split('T')[0].substring(0, 7) || null,
      region: selectedRegion,
      district: selectedDistrict,
      feeder: selectedFeeder,
      userRole: user?.role,
      userDistrict: user?.district,
      userRegion: user?.region
    };
    return `overheadLineInspections_page_${JSON.stringify(filterParams)}`;
  };

  // Load data for specific page from server with caching and retry logic
  const loadPageData = useCallback(async (page: number, retryCount = 0) => {
    console.log('[OverheadLineInspectionPage] loadPageData called with page:', page, 'retryCount:', retryCount);
    setIsLoadingPage(true);
    const cacheKey = getCacheKey(page);
    let cached: any = null;
    
    try {
      console.log('[OverheadLineInspectionPage] Starting loadPageData execution...');
      // Check cache first
      cached = await cache.get(cacheKey) as any;
      if (cached && cached.data && cached.timestamp) {
        const cacheAge = Date.now() - cached.timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge < maxAge) {
          console.log(`[OverheadLineInspectionPage] Using cached data for page ${page}, age: ${cacheAge}ms`);
          setCurrentPageData(cached.data.records || cached.data);
          setTotalRecords(cached.data.total || cached.data.length);
          setIsLoadingPage(false);
          setIsDataFromCache(true);
          return;
        }
      }

      const params = new URLSearchParams();
    
      // Apply role-based filtering
      if (user && user.role !== "system_admin" && user.role !== "global_engineer") {
        if (user.role === "district_engineer" || user.role === "technician" || user.role === "district_manager") {
          params.append('district', user.district || '');
        } else if (user.role === "regional_engineer" || user.role === "regional_general_manager") {
          params.append('region', user.region || '');
        }
      }
      
      // Apply filters
      if (selectedDate) {
          params.append('date', selectedDate.toISOString().split('T')[0]);
      }
      if (selectedMonth) {
          params.append('month', selectedMonth.toISOString().split('T')[0].substring(0, 7));
        }
        if (selectedRegion) {
          const regionName = regions.find(r => r.id === selectedRegion)?.name;
          if (regionName) params.append('region', regionName);
        }
        if (selectedDistrict) {
          const districtName = districts.find(d => d.id === selectedDistrict)?.name;
          if (districtName) params.append('district', districtName);
        }
        if (selectedFeeder) {
          params.append('feeder', selectedFeeder);
        }
        
        // Server-side pagination parameters
        const offset = (page - 1) * pageSize;
        params.append('limit', pageSize.toString());
        params.append('offset', offset.toString());
        params.append('sort', 'createdAt');
        params.append('order', 'desc');
        params.append('countOnly', 'false');
        
        const url = `/api/overheadLineInspections?${params.toString()}`;
        console.log('[OverheadLineInspectionPage] Loading page', page, 'with URL:', url);
        
        console.log('[OverheadLineInspectionPage] About to make API request...');
        const response = await apiRequest(url);
        console.log('[OverheadLineInspectionPage] API Response received:', response);
        console.log('[OverheadLineInspectionPage] Response type:', typeof response);
        console.log('[OverheadLineInspectionPage] Response keys:', response ? Object.keys(response) : 'null/undefined');
        
        // Update current page data with improved response structure
        const pageData = response?.data || response || [];
        const total = response?.total || (Array.isArray(response) ? response.length : 0);
        
        console.log('[OverheadLineInspectionPage] Processed pageData:', pageData);
        console.log('[OverheadLineInspectionPage] Processed total:', total);
        
        console.log('[OverheadLineInspectionPage] Setting state with:', {
          pageDataLength: pageData.length,
          total,
          pageDataSample: pageData.slice(0, 2)
        });
        
        // Test state setters
        console.log('[OverheadLineInspectionPage] Before setCurrentPageData');
        setCurrentPageData(pageData);
        console.log('[OverheadLineInspectionPage] After setCurrentPageData');
        
        console.log('[OverheadLineInspectionPage] Before setTotalRecords');
        setTotalRecords(total);
        console.log('[OverheadLineInspectionPage] After setTotalRecords');
        
        setIsDataFromCache(false);
        setConnectionStatus('connected');
        
        console.log('[OverheadLineInspectionPage] State set successfully');
        
        // Cache the page data
        const cacheData = {
          records: pageData,
          total: total,
          timestamp: Date.now()
        };
        
        await cache.set(cacheKey, cacheData, { maxAge: 5 * 60 * 1000 }); // 5 minutes cache
        console.log(`[OverheadLineInspectionPage] Cached page ${page} data`);
        
        console.log('[OverheadLineInspectionPage] Loaded page', page, 'with', pageData.length, 'records. Total:', total);
        console.log('[OverheadLineInspectionPage] Pagination info:', {
          page: response.page,
          pageSize: response.pageSize,
          totalPages: response.totalPages,
          hasNextPage: response.hasNextPage,
          hasPreviousPage: response.hasPreviousPage
        });
      } catch (error) {
        console.error('Error loading page data:', error);
        
        // Retry logic for intermittent 500 errors
        if (retryCount < 3 && (error.message?.includes('500') || error.message?.includes('Internal Server Error'))) {
          const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`[OverheadLineInspectionPage] Retrying page ${page} in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
          
          setConnectionStatus('retrying');
          setTimeout(() => {
            loadPageData(page, retryCount + 1);
          }, retryDelay);
          return;
        }
        
        // If we have cached data, show it as fallback
        if (cached && cached.data) {
          console.log('[OverheadLineInspectionPage] Using cached data as fallback due to server error');
          setCurrentPageData(cached.data.records || cached.data);
          setTotalRecords(cached.data.total || cached.data.length);
          setIsDataFromCache(true);
          setConnectionStatus('error');
          toast.error('Server temporarily unavailable. Showing cached data.');
        } else {
          setConnectionStatus('error');
          toast.error('Failed to load page data. Please try again.');
        }
      } finally {
        setIsLoadingPage(false);
      }
    }, [user, selectedDate, selectedMonth, selectedRegion, selectedDistrict, selectedFeeder, regions, districts]);

    // Clear cache when filters change
    const clearPageCache = async () => {
      try {
        // Clear all overhead line inspection page caches
        const cacheInfo = await cache.getInfo();
        const pageCacheKeys = cacheInfo
          .filter(info => info.key.startsWith('overheadLineInspections_page_'))
          .map(info => info.key);
        
        for (const key of pageCacheKeys) {
          await cache.delete(key);
        }
        console.log('[OverheadLineInspectionPage] Cleared page cache, removed', pageCacheKeys.length, 'entries');
      } catch (error) {
        console.error('[OverheadLineInspectionPage] Error clearing cache:', error);
      }
    };

    // Load initial data and when page/filters change
    useEffect(() => {
      console.log('[OverheadLineInspectionPage] useEffect triggered with:', {
        user: !!user,
        currentPage,
        selectedDate,
        selectedMonth,
        selectedRegion,
        selectedDistrict,
        selectedFeeder
      });
      if (user) {
        console.log('[OverheadLineInspectionPage] Calling loadPageData...');
        loadPageData(currentPage);
      }
    }, [user, currentPage, selectedDate, selectedMonth, selectedRegion, selectedDistrict, selectedFeeder]);

    const paginatedInspections = currentPageData;

    // Monitor state changes
    useEffect(() => {
      console.log('[OverheadLineInspectionPage] State changed:', {
        currentPageDataLength: currentPageData.length,
        totalRecords,
        isLoadingPage
      });
    }, [currentPageData, totalRecords, isLoadingPage]);

    // Reset to first page when filters change
    useEffect(() => {
      setCurrentPage(1);
      clearPageCache(); // Clear cache when filters change
    }, [selectedDate, selectedMonth, selectedRegion, selectedDistrict, selectedFeeder]);

    // Reset all filters
    const handleResetFilters = () => {
      setSelectedDate(null);
      setSelectedMonth(null);
      setSelectedRegion(null);
      setSelectedDistrict(null);
      setSelectedFeeder(null);
      setCurrentPage(1); // Reset to first page
      clearPageCache(); // Clear cache when filters are reset
    };

  const handleAddInspection = () => {
    setEditingInspection(null);
    setIsInspectionFormOpen(true);
  };

  const handleInspectionFormClose = () => {
    setIsInspectionFormOpen(false);
    setEditingInspection(null);
  };

  const handleViewInspection = (inspection: NetworkInspection) => {
    setSelectedInspection(inspection);
    setIsDetailsDialogOpen(true);
  };

  const handleEditInspection = (inspection: NetworkInspection) => {
    setEditingInspection(inspection);
    setIsInspectionFormOpen(true);
  };

  const handleDeleteInspection = async (inspection: NetworkInspection) => {
    try {
      await deleteNetworkInspection(inspection.id);
      toast.success("Inspection deleted successfully");
      
      // Clear page cache after deleting inspection
      await clearPageCache();
      
      // Reload current page to show updated data
      await loadPageData(currentPage);
    } catch (error) {
      toast.error("Failed to delete inspection");
    }
  };

  const handleFormSubmit = async (inspection: NetworkInspection) => {
    try {
      if (editingInspection) {
        await updateNetworkInspection(editingInspection.id, inspection);
        toast.success("Inspection updated successfully");
      } else {
        await addNetworkInspection(inspection);
        toast.success("Inspection created successfully");
      }
      setIsInspectionFormOpen(false);
      setEditingInspection(null);
      
      // Clear page cache after adding/updating inspection
      await clearPageCache();
      
      // Reload current page to show updated data
      await loadPageData(currentPage);
    } catch (error) {
      toast.error(editingInspection ? "Failed to update inspection" : "Failed to create inspection");
    }
  };

  console.log('[OverheadLineInspectionPage] Rendering with:', {
    paginatedInspectionsLength: paginatedInspections.length,
    currentPageDataLength: currentPageData.length,
    isLoadingPage,
    totalRecords
  });

  return (
    <AccessControlWrapper type="inspection">
      <Layout>
        <div className="container py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Network Inspection</h1>
              <p className="text-muted-foreground mt-1">
                Manage and monitor network inspections
              </p>
              {isOffline && (
                <p className="text-sm text-yellow-600 mt-1">
                  You are currently offline. Changes will be saved locally and synced when you're back online.
                  {offlineInspections.length > 0 && (
                    <span> You have {offlineInspections.length} inspection{offlineInspections.length === 1 ? '' : 's'} saved offline.</span>
                  )}
                </p>
              )}
              {isDataFromCache && (
                <p className="text-sm text-blue-600 mt-1">
                  📋 Showing cached data
                </p>
              )}
              {connectionStatus === 'retrying' && (
                <p className="text-sm text-yellow-600 mt-1">
                  🔄 Retrying connection... Please wait
                </p>
              )}
              {connectionStatus === 'error' && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠️ Connection issues detected. Some data may be from cache.
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
            {(user?.role === 'global_engineer' || user?.role === 'district_engineer' || user?.role === 'district_manager' || user?.role === 'regional_engineer' || user?.role === 'project_engineer' || user?.role === 'regional_general_manager' || user?.role === 'technician' || user?.role === 'system_admin') && (
                <Button onClick={handleAddInspection}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Inspection
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={async () => {
                await clearPageCache();
                setConnectionStatus('connected');
                await loadPageData(currentPage);
                toast.success("Data refreshed");
              }}
              disabled={isLoadingPage}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingPage ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {connectionStatus === 'error' && (
              <Button 
                variant="outline" 
                onClick={async () => {
                  setConnectionStatus('connected');
                  await loadPageData(currentPage);
                }}
                disabled={isLoadingPage}
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
            )}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Month</Label>
              <DatePicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                picker="month"
              />
            </div>
            
            {(user?.role === 'global_engineer' || user?.role === 'system_admin') && (
              <div className="space-y-2">
                <Label>Region</Label>
                <div className="w-full">
                  <Select
                    value={selectedRegion}
                    onValueChange={setSelectedRegion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {(user?.role === 'global_engineer' || 
              user?.role === 'system_admin' || 
              user?.role === 'regional_engineer') && (
              <div className="space-y-2">
                <Label>District</Label>
                <div className="w-full">
                  <Select
                    value={selectedDistrict}
                    onValueChange={setSelectedDistrict}
                    disabled={!selectedRegion && user?.role !== 'regional_engineer'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDistricts.map(district => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full sm:w-auto">
              <div className="space-y-2 w-full sm:w-[200px]">
                <Label>Filter by Feeder Name</Label>
                <Select
                  value={selectedFeeder || "all-feeders"}
                  onValueChange={(value) => {
                    if (value === "all-feeders") {
                      setSelectedFeeder(null);
                    } else {
                      setSelectedFeeder(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Feeders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-feeders">All Feeders</SelectItem>
                    {Array.from(new Set(currentPageData
                      .map(inspection => inspection.feederName)
                      .filter(Boolean)))
                      .sort()
                      .map(feeder => (
                        <SelectItem key={feeder} value={feeder}>
                          {feeder}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                disabled={!selectedDate && !selectedMonth && !selectedRegion && !selectedDistrict && !selectedFeeder}
                className="w-full sm:w-auto"
              >
                Reset All Filters
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-1">
              <TabsTrigger value="inspections">Inspection Records</TabsTrigger>
            </TabsList>

            <TabsContent value="inspections" className="space-y-4">
              <OverheadLineInspectionsTable 
                inspections={paginatedInspections}
                allInspections={currentPageData}
                onEdit={handleEditInspection}
                onDelete={handleDeleteInspection}
                onView={handleViewInspection}
                userRole={user?.role}
              />
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex-1 text-sm text-muted-foreground">
                    {isLoadingPage ? (
                      "Loading..."
                    ) : (
                      <>
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} results
                        {isDataFromCache && (
                          <span className="ml-2 text-blue-600">📋 Cached</span>
                        )}
                        {connectionStatus === 'retrying' && (
                          <span className="ml-2 text-yellow-600">🔄 Retrying</span>
                        )}
                        {connectionStatus === 'error' && (
                          <span className="ml-2 text-red-600">⚠️ Connection Error</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoadingPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoadingPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Inspection Form Sheet */}
          <Sheet open={isInspectionFormOpen} onOpenChange={setIsInspectionFormOpen}>
            <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {editingInspection ? "Edit Network Inspection" : "New Network Inspection"}
                </SheetTitle>
                <SheetDescription>
                  {editingInspection ? "Update the inspection details." : "Complete the inspection checklist for the network."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <OverheadLineInspectionForm
                  inspection={editingInspection}
                  onSubmit={handleFormSubmit}
                  onCancel={handleInspectionFormClose}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Inspection Details Dialog */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Network Inspection Details</DialogTitle>
                <DialogDescription>
                  Inspection performed on {selectedInspection 
                    ? (selectedInspection.date 
                       ? selectedInspection.date
                       : selectedInspection.createdAt && !isNaN(new Date(selectedInspection.createdAt).getTime())
                         ? new Date(selectedInspection.createdAt).toLocaleDateString()
                         : "today")
                    : ""}
                </DialogDescription>
              </DialogHeader>
              {selectedInspection && (
                <OverheadLineInspectionDetailsView
                  inspection={selectedInspection}
                  showHeader={false}
                  showBackButton={false}
                  onEdit={() => navigate(`/asset-management/overhead-line/edit/${selectedInspection.id}`)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </AccessControlWrapper>
  );
} 
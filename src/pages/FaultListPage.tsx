import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAzureADAuth } from "@/contexts/AzureADAuthContext";
import { useData } from "@/contexts/DataContext";
import { OP5Fault, ControlSystemOutage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { PermissionService } from "@/services/PermissionService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api";

export default function FaultListPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAzureADAuth();
  const { regions, districts } = useData();
  const [faults, setFaults] = useState<(OP5Fault | ControlSystemOutage)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const permissionService = PermissionService.getInstance();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filter states
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Cache for frequently accessed data
  const [dataCache, setDataCache] = useState<{ [key: string]: (OP5Fault | ControlSystemOutage)[] }>({});
  const [totalCountCache, setTotalCountCache] = useState<{ [key: string]: number }>({});

  // Build cache key based on current filters
  const getCacheKey = useCallback(() => {
    return `${selectedRegion}-${selectedDistrict}-${selectedStatus}-${searchTerm}-${user?.role}-${user?.region}-${user?.district}`;
  }, [selectedRegion, selectedDistrict, selectedStatus, searchTerm, user]);

  // Optimize data loading with pagination and caching
  const loadData = useCallback(async (resetPagination = false) => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (user?.role === 'regional_engineer' || user?.role === 'regional_general_manager') {
        params.append('regionId', user.regionId);
      } else if (user?.role === 'district_engineer' || user?.role === 'district_manager' || user?.role === 'technician') {
        params.append('districtId', user.districtId);
      }
      if (selectedRegion) params.append('regionId', selectedRegion);
      if (selectedDistrict) params.append('districtId', selectedDistrict);
      if (selectedStatus) params.append('status', selectedStatus);
      params.append('sort', 'occurrenceDate');
      params.append('order', 'desc');
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      // Get total count
      const countParams = new URLSearchParams(params);
      countParams.append('countOnly', 'true');
      const countRes = await apiRequest(`/api/faults?${countParams.toString()}`);
      setTotalItems(countRes.count || 0);

      // Fetch data
      const res = await apiRequest(`/api/faults?${params.toString()}`);
      setFaults(res);
      setHasMore(res.length === pageSize);
    } catch (error) {
      setError('Failed to load faults');
    } finally {
      setLoading(false);
    }
  }, [user, selectedRegion, selectedDistrict, selectedStatus, pageSize, currentPage]);

  // Load data on mount and when filters change
  useEffect(() => {
    console.log('[FaultListPage] useEffect triggered with:', {
      isAuthenticated,
      user: user ? { role: user.role, region: user.region, district: user.district } : null,
      regionsCount: regions.length,
      districtsCount: districts.length,
      selectedRegion,
      selectedDistrict,
      selectedStatus,
      searchTerm
    });

    if (!isAuthenticated) {
      console.log('[FaultListPage] User not authenticated, navigating to login');
      navigate("/login");
      return;
    }

    // Check if user has permission to view faults
    if (user && !permissionService.canAccessFeature(user.role, 'fault_reporting')) {
      console.log('[FaultListPage] User lacks permission, navigating to unauthorized');
      navigate("/unauthorized");
      return;
    }

    // Set initial region and district based on user role
    if (user) {
      console.log('[FaultListPage] Setting initial region/district for user:', user.role);
      if ((user.role === 'district_engineer' || user.role === 'district_manager' || user.role === 'technician') && user.region && user.district) {
        const userRegion = regions.find(r => r.name === user.region);
        console.log('[FaultListPage] Found user region:', userRegion);
        if (userRegion) {
          setSelectedRegion(userRegion.id);
          const userDistrict = districts.find(d => d.name === user.district);
          console.log('[FaultListPage] Found user district:', userDistrict);
          if (userDistrict) {
            setSelectedDistrict(userDistrict.id);
          }
        }
      } else if ((user.role === 'regional_engineer' || user.role === 'regional_general_manager') && user.region) {
        const userRegion = regions.find(r => r.name === user.region);
        console.log('[FaultListPage] Found user region for regional role:', userRegion);
        if (userRegion) {
          setSelectedRegion(userRegion.id);
        }
      }
    }

    console.log('[FaultListPage] Calling loadData...');
    loadData(true);
  }, [isAuthenticated, navigate, user, regions, districts, selectedRegion, selectedDistrict, selectedStatus, searchTerm]);

  // Load more data when scrolling
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadData();
    }
  }, [loading, hasMore, loadData]);

  // Optimize filtering with useMemo
  const filteredFaults = useMemo(() => {
    if (!searchTerm) return faults;
    
    return faults.filter(fault => {
      const isOP5 = 'substationName' in fault;
      if (isOP5) {
        const op5Fault = fault as OP5Fault;
        return (
          op5Fault.faultType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          op5Fault.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          op5Fault.substationName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        const controlOutage = fault as ControlSystemOutage;
        return (
          controlOutage.faultType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (controlOutage.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (controlOutage.areaAffected || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    });
  }, [faults, searchTerm]);

  const handleCreateFault = () => {
    if (user && !permissionService.canAccessFeature(user.role, 'fault_reporting')) {
      navigate("/unauthorized");
      return;
    }
    
    navigate("/faults/report");
  };

  // Check if user has permission to manage faults
  const canManageFaults = user?.role ? permissionService.canAccessFeature(user.role, 'fault_reporting') : false;

  if (!isAuthenticated || loading) {
    return null;
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Faults</h1>
              <p className="text-muted-foreground mt-1">
                View and manage all reported faults
              </p>
            </div>
            {canManageFaults && (
              <Button onClick={handleCreateFault}>Report New Fault</Button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select
                value={selectedRegion || ""}
                onValueChange={(region) => {
                  console.log('[FaultListPage] Region changed to:', region);
                  console.log('[FaultListPage] Available districts:', districts.map(d => ({ id: d.id, name: d.name, regionId: d.regionId })));
                  setSelectedRegion(region);
                  setSelectedDistrict(null); // Clear district when region changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    console.log('[FaultListPage] Rendering region dropdown:', {
                      regionsCount: regions.length,
                      regionsData: regions.map(r => ({ id: r.id, name: r.name }))
                    });
                    return null;
                  })()}
                  <SelectItem value="">All Regions</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>District</Label>
              <Select
                value={selectedDistrict || ""}
                onValueChange={(district) => {
                  console.log('[FaultListPage] District changed to:', district);
                  setSelectedDistrict(district);
                }}
                disabled={!selectedRegion}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const filteredDistricts = districts.filter(district => !selectedRegion || district.regionId === selectedRegion);
                    console.log('[FaultListPage] Rendering district dropdown:', {
                      selectedRegion,
                      totalDistricts: districts.length,
                      filteredDistricts: filteredDistricts.length,
                      filteredDistrictsData: filteredDistricts.map(d => ({ id: d.id, name: d.name, regionId: d.regionId }))
                    });
                    return null;
                  })()}
                  <SelectItem value="">All Districts</SelectItem>
                  {districts
                    .filter(district => !selectedRegion || district.regionId === selectedRegion)
                    .map(district => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus || ""}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search faults..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Faults List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredFaults.map((fault) => {
              const isOP5 = 'substationName' in fault;
              const op5Fault = isOP5 ? fault as OP5Fault : null;
              const controlOutage = !isOP5 ? fault as ControlSystemOutage : null;

              return (
                <Card key={fault.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/faults/${fault.id}`)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={fault.status === "pending" ? "destructive" : "default"}>
                            {fault.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(fault.occurrenceDate), "PPp")}
                          </span>
                        </div>
                        <h3 className="font-semibold">
                          {isOP5 ? op5Fault?.description : controlOutage?.reason}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {regions.find(r => r.id === fault.regionId)?.name || "Unknown"} • {districts.find(d => d.id === fault.districtId)?.name || "Unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {fault.createdBy?.split(" ").map(n => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{fault.createdBy || "Unknown User"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label>Page Size:</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {Math.ceil(totalItems / pageSize)}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / pageSize), prev + 1))}
                disabled={currentPage >= Math.ceil(totalItems / pageSize)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
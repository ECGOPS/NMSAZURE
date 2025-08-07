// PermissionService now handles frontend role/feature checks and backend communication
import { UserRole } from "@/lib/types";
import { LoadMonitoringData } from "@/lib/asset-types";
import { getPermissions, updatePermission, createPermission, deletePermission } from "@/lib/api";

const STORAGE_KEY = "feature_permissions";

export class PermissionService {
  private static instance: PermissionService;
  private roleHierarchy: { [key in Exclude<UserRole, null>]: number } = {
    'pending': 0, // Lowest priority - no access
    'technician': 1,
    'district_engineer': 2,
    'district_manager': 3,
    'regional_engineer': 4,
    'project_engineer': 5,
    'regional_general_manager': 6,
    'global_engineer': 7,
    'system_admin': 8,
    'ict': 9,
    'load_monitoring_edit': 10,
    'load_monitoring_delete': 11,
    'admin': 12
  };

  private permissionChangeListeners: (() => void)[] = [];
  private isInitialized = false;

  private defaultFeaturePermissions: { [key: string]: UserRole[] } = {
    // Asset Management Features
    'asset_management': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'asset_management_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'asset_management_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    // User Logs Features
    'user_logs': ['system_admin'],
    'user_logs_update': ['system_admin'],
    'user_logs_delete': ['system_admin'],
    'user_logs_delete_all': ['system_admin'],
    
    // SMS Notification Features
    'sms_notification': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'sms_notification_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'sms_notification_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    'inspection_management': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'inspection_management_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'inspection_management_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    'load_monitoring': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'load_monitoring_update': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'load_monitoring_delete': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    'substation_inspection': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'substation_inspection_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'substation_inspection_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    'vit_inspection': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'vit_inspection_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'vit_inspection_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    'overhead_line_inspection': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'overhead_line_inspection_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'overhead_line_inspection_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    // Fault Management Features
    'fault_reporting': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'fault_reporting_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'fault_reporting_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    'fault_analytics': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'fault_analytics_update': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'fault_analytics_delete': ['global_engineer', 'system_admin'],
    
    'control_system_analytics': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'control_outage_management': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'control_outage_management_update': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'control_outage_management_delete': ['global_engineer', 'system_admin'],
    
    'op5_fault_management': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'op5_fault_management_update': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'op5_fault_management_delete': ['global_engineer', 'system_admin'],
    
    // Analytics Features
    'analytics_dashboard': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'analytics_page': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'reliability_metrics': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'reliability_metrics_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'reliability_metrics_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'performance_reports': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'performance_reports_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'performance_reports_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    
    // Feeder Management Features
    'feeder_management': ['technician', 'district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'feeder_management_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'feeder_management_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'feeder_management_delete_all': ['global_engineer', 'system_admin'],
    
    // User Management Features
    'user_management': ['global_engineer', 'system_admin', 'ict'],
    'user_management_update': ['global_engineer', 'system_admin', 'ict'],
    'user_management_delete': ['system_admin', 'ict'],
    
    'district_population': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'district_population_update': ['district_engineer', 'district_manager', 'regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'district_population_delete': ['regional_engineer', 'project_engineer', 'regional_general_manager', 'global_engineer', 'system_admin'],
    'district_population_reset': ['global_engineer', 'system_admin'],
    
    // System Administration Features
    'system_configuration': ['system_admin'],
    'permission_management': ['system_admin'],
    'security_monitoring': ['system_admin'],
    'security_testing': ['system_admin'],
    'feeder_offline_testing': ['system_admin'],
    'data_debug': ['system_admin', 'global_engineer'],
    
    // Music Management Features
    'music_management': ['system_admin'],
    'music_management_update': ['system_admin'],
    'music_management_delete': ['system_admin'],
    'staff_ids_management': ['system_admin', 'ict'],
  };

  private featurePermissions: { [key: string]: UserRole[] } = {};
  private permissionCache: Map<string, boolean> = new Map();

  private constructor() {
    this.featurePermissions = { ...this.defaultFeaturePermissions };
    this.isInitialized = true;
  }

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  private notifyPermissionChange() {
    this.permissionChangeListeners.forEach(listener => listener());
  }

  public addPermissionChangeListener(listener: () => void) {
    this.permissionChangeListeners.push(listener);
    return () => {
      this.permissionChangeListeners = this.permissionChangeListeners.filter(l => l !== listener);
    };
  }

  public listenToPermissions(callback: () => void) {
    console.log('Setting up permissions listener');
    // This method is no longer needed as there's no Firestore listener.
    // Keeping it for now, but it will not do anything.
    return () => {}; // Return an empty unsubscribe function
  }

  public async initialize(): Promise<void> {
    try {
      console.log('Initializing PermissionService with backend data...');
      const permissions = await getPermissions();
      
      if (permissions && permissions.length > 0) {
        // Use the first permission document as the main permissions
        const mainPermissions = permissions[0];
        this.featurePermissions = { ...this.defaultFeaturePermissions, ...mainPermissions };
        console.log('Loaded permissions from backend:', this.featurePermissions);
      } else {
        // If no permissions exist in backend, create default permissions
        console.log('No permissions found in backend, creating default permissions...');
        await this.createDefaultPermissions();
      }
      
      this.isInitialized = true;
      this.notifyPermissionChange();
    } catch (error) {
      console.error('Error initializing PermissionService:', error);
      // Fallback to default permissions
      this.featurePermissions = { ...this.defaultFeaturePermissions };
      this.isInitialized = true;
    }
  }

  private async createDefaultPermissions(): Promise<void> {
    try {
      const defaultPermissions = {
        id: 'feature_permissions',
        ...this.defaultFeaturePermissions
      };
      
      await createPermission(defaultPermissions);
      this.featurePermissions = { ...this.defaultFeaturePermissions };
      console.log('Created default permissions in backend');
    } catch (error) {
      console.error('Error creating default permissions:', error);
      throw error;
    }
  }

  public getFeaturePermissions(): { [key: string]: UserRole[] } {
    return { ...this.featurePermissions };
  }

  public async updateFeaturePermissions(feature: string, roles: UserRole[]) {
    try {
      console.log(`Updating permissions for feature ${feature}:`, roles);
      
      // Update local state
      this.featurePermissions[feature] = [...roles];
      
      // Update backend
      const permissions = await getPermissions();
      if (permissions && permissions.length > 0) {
        const mainPermissions = permissions[0];
        const updatedPermissions = { ...mainPermissions, [feature]: roles };
        await updatePermission(mainPermissions.id, updatedPermissions);
        console.log('Updated permissions in backend');
      }
      
      // Clear cache and notify listeners
      this.clearPermissionCache();
      this.notifyPermissionChange();
    } catch (error) {
      console.error("Error updating feature permissions:", error);
      throw error;
    }
  }

  public async addFeature(feature: string, roles: UserRole[]) {
    try {
      const updatedPermissions = { ...this.featurePermissions };
      updatedPermissions[feature] = roles;
      
      // Update backend
      const permissions = await getPermissions();
      if (permissions && permissions.length > 0) {
        const mainPermissions = permissions[0];
        const updatedBackendPermissions = { ...mainPermissions, [feature]: roles };
        await updatePermission(mainPermissions.id, updatedBackendPermissions);
      }
      
      this.featurePermissions = updatedPermissions;
      this.clearPermissionCache();
      this.notifyPermissionChange();
    } catch (error) {
      console.error("Error adding feature:", error);
      throw error;
    }
  }

  public async removeFeature(feature: string) {
    try {
      const updatedPermissions = { ...this.featurePermissions };
      delete updatedPermissions[feature];
      
      // Update backend
      const permissions = await getPermissions();
      if (permissions && permissions.length > 0) {
        const mainPermissions = permissions[0];
        const updatedBackendPermissions = { ...mainPermissions };
        delete updatedBackendPermissions[feature];
        await updatePermission(mainPermissions.id, updatedBackendPermissions);
      }
      
      this.featurePermissions = updatedPermissions;
      this.clearPermissionCache();
      this.notifyPermissionChange();
    } catch (error) {
      console.error("Error removing feature:", error);
      throw error;
    }
  }

  public async resetToDefaults() {
    try {
      // Reset to default permissions
      this.featurePermissions = { ...this.defaultFeaturePermissions };
      
      // Update backend
      const permissions = await getPermissions();
      if (permissions && permissions.length > 0) {
        const mainPermissions = permissions[0];
        const updatedPermissions = { ...mainPermissions, ...this.defaultFeaturePermissions };
        await updatePermission(mainPermissions.id, updatedPermissions);
      }
      
      this.clearPermissionCache();
      this.notifyPermissionChange();
    } catch (error) {
      console.error("Error resetting permissions:", error);
      throw error;
    }
  }

  public canAccessFeature(userRole: string, feature: string): boolean {
    const cacheKey = `${userRole}-${feature}`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Get allowed roles for the feature
    const allowedRoles = this.getFeatureRoles(feature);
    console.log(`Checking access for ${feature}:`, { userRole, allowedRoles });

    // Check if user's role is in allowed roles
    const hasAccess = allowedRoles.includes(userRole);
    
    // Cache the result
    this.permissionCache.set(cacheKey, hasAccess);
    
    return hasAccess;
  }

  public hasRequiredRole(userRole: UserRole | null, requiredRole: UserRole): boolean {
    if (!userRole) return false;
    return this.roleHierarchy[userRole] >= this.roleHierarchy[requiredRole];
  }

  public canViewAsset(
    userRole: UserRole | null,
    userRegion: string,
    userDistrict: string,
    assetRegion: string,
    assetDistrict: string
  ): boolean {
    if (!userRole) return false;
    if (userRole === 'system_admin' || userRole === 'global_engineer') return true;
    if (userRole === 'regional_engineer' || userRole === 'project_engineer' || userRole === 'regional_general_manager') return userRegion === assetRegion;
    if (userRole === 'district_engineer' || userRole === 'technician' || userRole === 'district_manager') {
      return userRegion === assetRegion && userDistrict === assetDistrict;
    }
    return false;
  }

  public canEditAsset(
    userRole: UserRole | null,
    userRegion: string,
    userDistrict: string,
    assetRegion: string,
    assetDistrict: string
  ): boolean {
    if (!userRole) return false;
    if (userRole === 'system_admin' || userRole === 'global_engineer') return true;
    if (userRole === 'regional_engineer' || userRole === 'project_engineer') return userRegion === assetRegion;
    if (userRole === 'district_engineer') {
      return userRegion === assetRegion && userDistrict === assetDistrict;
    }
    return false;
  }

  public canDeleteAsset(
    userRole: UserRole | null,
    userRegion: string,
    userDistrict: string,
    assetRegion: string,
    assetDistrict: string
  ): boolean {
    if (!userRole) return false;
    if (userRole === 'system_admin' || userRole === 'global_engineer') return true;
    if (userRole === 'regional_engineer' || userRole === 'project_engineer') return userRegion === assetRegion;
    if (userRole === 'district_engineer') {
      return userRegion === assetRegion && userDistrict === assetDistrict;
    }
    return false;
  }

  public canManageStaffIds(userRole: UserRole | null): boolean {
    return userRole === 'system_admin';
  }

  public canManageDistrictPopulation(userRole: UserRole | null): boolean {
    if (!userRole) return false;
    return userRole === 'district_engineer' || userRole === 'district_manager' || userRole === 'regional_engineer' || userRole === 'project_engineer' || userRole === 'regional_general_manager' || userRole === 'global_engineer' || userRole === 'system_admin';
  }

  public canResetDistrictPopulation(userRole: UserRole | null): boolean {
    if (!userRole) return false;
    return this.canAccessFeature(userRole, 'district_population_reset');
  }

  public canEditInspection(
    userRole: UserRole | null,
    userRegion: string,
    userDistrict: string,
    inspectionRegion: string,
    inspectionDistrict: string
  ): boolean {
    if (!userRole) return false;
    if (userRole === 'system_admin' || userRole === 'global_engineer') return true;
    if (userRole === 'regional_engineer' || userRole === 'project_engineer') return userRegion === inspectionRegion;
    if (userRole === 'district_engineer' || userRole === 'technician') {
      return userRegion === inspectionRegion && userDistrict === inspectionDistrict;
    }
    return false;
  }

  // Add new methods for CRUD operation permissions
  public canUpdateFeature(userRole: string, feature: string): boolean {
    const cacheKey = `${userRole}-${feature}-update`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Get allowed roles for the feature
    const allowedRoles = this.getUpdateRoles(feature);
    console.log(`Checking update access for ${feature}:`, { userRole, allowedRoles });

    // Check if user's role is in allowed roles
    const hasAccess = allowedRoles.includes(userRole);
    
    // Cache the result
    this.permissionCache.set(cacheKey, hasAccess);
    
    return hasAccess;
  }

  public canDeleteFeature(userRole: string, feature: string): boolean {
    const cacheKey = `${userRole}-${feature}-delete`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Get allowed roles for the feature
    const allowedRoles = this.getDeleteRoles(feature);
    console.log(`Checking delete access for ${feature}:`, { userRole, allowedRoles });

    // Check if user's role is in allowed roles
    const hasAccess = allowedRoles.includes(userRole);
    
    // Cache the result
    this.permissionCache.set(cacheKey, hasAccess);
    
    return hasAccess;
  }

  public async updateAllPermissions(permissions: { [key: string]: UserRole[] }) {
    try {
      console.log('Updating all permissions:', permissions);
      
      // Update local state
      this.featurePermissions = { ...this.featurePermissions, ...permissions };
      
      // Update backend
      const backendPermissions = await getPermissions();
      if (backendPermissions && backendPermissions.length > 0) {
        const mainPermissions = backendPermissions[0];
        const updatedPermissions = { ...mainPermissions, ...permissions };
        await updatePermission(mainPermissions.id, updatedPermissions);
        console.log('Updated all permissions in backend');
      }
      
      // Clear cache and notify listeners
      this.clearPermissionCache();
      this.notifyPermissionChange();
    } catch (error) {
      console.error("Error updating all permissions:", error);
      throw error;
    }
  }

  public canViewInspection(
    userRole: UserRole | null,
    userRegion: string,
    userDistrict: string,
    inspectionRegion: string,
    inspectionDistrict: string
  ): boolean {
    if (!userRole) return false;
    if (userRole === 'system_admin' || userRole === 'global_engineer') return true;
    if (userRole === 'regional_engineer' || userRole === 'project_engineer') return userRegion === inspectionRegion;
    if (userRole === 'district_engineer' || userRole === 'technician') {
      return userRegion === inspectionRegion && userDistrict === inspectionDistrict;
    }
    return false;
  }

  public canDeleteInspection(
    userRole: UserRole | null,
    userRegion: string,
    userDistrict: string,
    inspectionRegion: string,
    inspectionDistrict: string
  ): boolean {
    if (!userRole) return false;
    if (userRole === 'system_admin' || userRole === 'global_engineer') return true;
    if (userRole === 'regional_engineer' || userRole === 'project_engineer') return userRegion === inspectionRegion;
    if (userRole === 'district_engineer') {
      return userRegion === inspectionRegion && userDistrict === inspectionDistrict;
    }
    return false;
  }

  // Add method to clear cache when needed (e.g., on role change)
  public clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  private getFeatureRoles(feature: string): string[] {
    if (!this.isInitialized) {
      console.warn('PermissionService not initialized, using default permissions');
      return this.defaultFeaturePermissions[feature] || [];
    }
    return this.featurePermissions[feature] || [];
  }

  private getUpdateRoles(feature: string): string[] {
    if (!this.isInitialized) {
      console.warn('PermissionService not initialized, using default permissions');
      return this.defaultFeaturePermissions[`${feature}_update`] || [];
    }
    return this.featurePermissions[`${feature}_update`] || [];
  }

  private getDeleteRoles(feature: string): string[] {
    if (!this.isInitialized) {
      console.warn('PermissionService not initialized, using default permissions');
      return this.defaultFeaturePermissions[`${feature}_delete`] || [];
    }
    return this.featurePermissions[`${feature}_delete`] || [];
  }
} 
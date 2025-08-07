import { apiRequest } from '@/lib/api';
import { OfflineStorageService } from './OfflineStorageService';

interface FeederInfo {
  id: string;
  name: string;
  bspPss: string;
  region: string;
  district: string;
  regionId: string;
  districtId: string;
  voltageLevel: string;
  feederType: string;
}

export class FeederService {
  private static instance: FeederService;
  private offlineService: OfflineStorageService;

  private constructor() {
    this.offlineService = OfflineStorageService.getInstance();
  }

  public static getInstance(): FeederService {
    if (!FeederService.instance) {
      FeederService.instance = new FeederService();
    }
    return FeederService.instance;
  }

  public async getFeedersByRegion(regionId: string): Promise<FeederInfo[]> {
    console.log('[FeederService] getFeedersByRegion called with regionId:', regionId);
    console.log('[FeederService] navigator.onLine:', navigator.onLine);
    
    if (navigator.onLine) {
      try {
        console.log('[FeederService] Making API request to:', `/api/feeders?regionId=${regionId}`);
        const feeders = await apiRequest(`/api/feeders?regionId=${regionId}`);
        console.log('[FeederService] API response:', feeders);
        return feeders;
      } catch (error) {
        console.error('[FeederService] Error fetching feeders from backend:', error);
        return [];
      }
    }
    // Return empty array for offline mode since we don't have feeder-specific offline storage
    console.log('[FeederService] Offline mode - returning empty array');
    return [];
  }

  public async getAllFeeders(): Promise<FeederInfo[]> {
    console.log('[FeederService] getAllFeeders called');
    console.log('[FeederService] navigator.onLine:', navigator.onLine);
    
    if (navigator.onLine) {
      try {
        console.log('[FeederService] Making API request to: /api/feeders');
        const feeders = await apiRequest('/api/feeders');
        console.log('[FeederService] getAllFeeders API response:', feeders);
        // Store feeders in offline storage for future use
        for (const feeder of feeders) {
          await this.offlineService.saveOfflineRecord('/api/feeders', 'POST', feeder);
        }
        return feeders;
      } catch (error) {
        console.error('[FeederService] Error fetching feeders from backend:', error);
        // Return empty array for now since we don't have feeder-specific offline storage
        return [];
      }
    }
    // Return empty array for offline mode since we don't have feeder-specific offline storage
    console.log('[FeederService] Offline mode - returning empty array');
    return [];
  }

  public async addFeeder(feeder: Omit<FeederInfo, 'id'>): Promise<string> {
    if (navigator.onLine) {
      const result = await apiRequest('/api/feeders', {
        method: 'POST',
        body: JSON.stringify(feeder),
      });
      return result.id;
    } else {
      // For offline mode, return a temporary ID
      const offlineId = `offline_${Date.now()}`;
      return offlineId;
    }
  }

  public async updateFeeder(id: string, updates: Partial<FeederInfo>): Promise<void> {
    if (navigator.onLine) {
      await apiRequest(`/api/feeders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } else {
      // Offline mode - no action taken since feeder offline storage is not implemented
      console.log('Offline mode: feeder update not implemented');
    }
  }

  public async deleteFeeder(id: string): Promise<void> {
    if (navigator.onLine) {
      await apiRequest(`/api/feeders/${id}`, {
        method: 'DELETE',
      });
    } else {
      // Offline mode - no action taken since feeder offline storage is not implemented
      console.log('Offline mode: feeder deletion not implemented');
    }
  }

  public async getFeederById(id: string): Promise<FeederInfo | null> {
    if (navigator.onLine) {
      try {
        const feeder = await apiRequest(`/api/feeders/${id}`);
        return feeder;
      } catch (error) {
        console.error('Error fetching feeder from backend:', error);
      }
    }
    return null;
  }

  public async preloadFeeders(): Promise<void> {
    if (navigator.onLine) {
      const feeders = await apiRequest('/api/feeders');
      console.log(`Preloaded ${feeders.length} feeders for online use`);
    }
  }
} 
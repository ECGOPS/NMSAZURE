import React, { useState } from 'react';
import { useAzureADAuth } from '@/contexts/AzureADAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { apiRequest } from '@/lib/api';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { RegionPopulation } from '../../lib/types';
import LoggingService from '../../services/LoggingService';

export function DistrictPopulationReset() {
  const { user } = useAzureADAuth();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Replace Firebase operations with API calls
  const resetDistrictPopulation = async (districtId: string) => {
    try {
      await apiRequest(`/api/districts/${districtId}/reset-population`, {
        method: 'POST',
      });
      toast.success('District population reset successfully');
    } catch (error) {
      console.error('Error resetting district population:', error);
      toast.error('Failed to reset district population');
    }
  };

  const resetAllDistrictPopulations = async () => {
    try {
      await apiRequest('/api/districts/reset-all-populations', {
        method: 'POST',
      });
      toast.success('All district populations reset successfully');
    } catch (error) {
      console.error('Error resetting all district populations:', error);
      toast.error('Failed to reset all district populations');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset District Populations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Region</label>
            {/* The Select component and its options are removed as per the new_code,
                but the placeholder and the logic for handling selection are kept
                to maintain the original component's structure. */}
            <input
              type="text"
              placeholder="Select a region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <Button 
            onClick={() => resetAllDistrictPopulations()} 
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? 'Resetting...' : 'Reset Populations'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
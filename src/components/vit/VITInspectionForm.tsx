import React, { useState, useEffect, useRef } from "react";
import { useData } from "@/contexts/DataContext";
import { useAzureADAuth } from "@/contexts/AzureADAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, MapPin, Camera, Upload, X } from "lucide-react";
import { VITInspectionChecklist, VITAsset, YesNoOption, GoodBadOption } from "@/lib/types";
import { showNotification, showServiceWorkerNotification } from '@/utils/notifications';
import { apiRequest } from '@/lib/api';
import { OfflineStorageService } from "@/services/OfflineStorageService";
import { VITSyncService } from "@/services/VITSyncService";
import LoggingService from "@/services/LoggingService";

interface VITInspectionFormProps {
  inspection?: VITInspectionChecklist;
  onClose: () => void;
  onSuccess?: (inspection: VITInspectionChecklist) => void;
}

export function VITInspectionForm({ inspection, onClose, onSuccess }: VITInspectionFormProps) {
  const { vitAssets } = useData();
  const { user } = useAzureADAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const webcamRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    inspection?.vitAssetId || ""
  );
  const [selectedAsset, setSelectedAsset] = useState<VITAsset | null>(null);
  const [inspectionDate, setInspectionDate] = useState<string>(
    inspection?.inspectionDate || new Date().toISOString().split('T')[0]
  );
  const [inspectedBy, setInspectedBy] = useState<string>(
    inspection?.inspectedBy || user?.name || ""
  );
  const [remarks, setRemarks] = useState<string>(inspection?.remarks || "");
  const [offlineAssets, setOfflineAssets] = useState<VITAsset[]>([]);

  // Inspection checklist states
  const [rodentTermiteEncroachment, setRodentTermiteEncroachment] = useState<YesNoOption>(inspection?.rodentTermiteEncroachment || "No");
  const [cleanDustFree, setCleanDustFree] = useState<YesNoOption>(inspection?.cleanDustFree || "No");
  const [protectionButtonEnabled, setProtectionButtonEnabled] = useState<YesNoOption>(inspection?.protectionButtonEnabled || "No");
  const [recloserButtonEnabled, setRecloserButtonEnabled] = useState<YesNoOption>(inspection?.recloserButtonEnabled || "No");
  const [groundEarthButtonEnabled, setGroundEarthButtonEnabled] = useState<YesNoOption>(inspection?.groundEarthButtonEnabled || "No");
  const [acPowerOn, setAcPowerOn] = useState<YesNoOption>(inspection?.acPowerOn || "No");
  const [batteryPowerLow, setBatteryPowerLow] = useState<YesNoOption>(inspection?.batteryPowerLow || "No");
  const [handleLockOn, setHandleLockOn] = useState<YesNoOption>(inspection?.handleLockOn || "No");
  const [remoteButtonEnabled, setRemoteButtonEnabled] = useState<YesNoOption>(inspection?.remoteButtonEnabled || "No");
  const [gasLevelLow, setGasLevelLow] = useState<YesNoOption>(inspection?.gasLevelLow || "No");
  const [earthingArrangementAdequate, setEarthingArrangementAdequate] = useState<YesNoOption>(inspection?.earthingArrangementAdequate || "No");
  const [noFusesBlown, setNoFusesBlown] = useState<YesNoOption>(inspection?.noFusesBlown || "No");
  const [noDamageToBushings, setNoDamageToBushings] = useState<YesNoOption>(inspection?.noDamageToBushings || "No");
  const [noDamageToHVConnections, setNoDamageToHVConnections] = useState<YesNoOption>(inspection?.noDamageToHVConnections || "No");
  const [insulatorsClean, setInsulatorsClean] = useState<YesNoOption>(inspection?.insulatorsClean || "No");
  const [paintworkAdequate, setPaintworkAdequate] = useState<YesNoOption>(inspection?.paintworkAdequate || "No");
  const [ptFuseLinkIntact, setPtFuseLinkIntact] = useState<YesNoOption>(inspection?.ptFuseLinkIntact || "No");
  const [noCorrosion, setNoCorrosion] = useState<YesNoOption>(inspection?.noCorrosion || "No");
  const [silicaGelCondition, setSilicaGelCondition] = useState<GoodBadOption>(inspection?.silicaGelCondition || "Good");
  const [correctLabelling, setCorrectLabelling] = useState<YesNoOption>(inspection?.correctLabelling || "No");

  const offlineStorage = OfflineStorageService.getInstance();
  const vitSyncService = VITSyncService.getInstance();

  // Load offline assets
  useEffect(() => {
    const loadOfflineAssets = async () => {
      try {
        const pendingAssets = await vitSyncService.getPendingVITAssets();
        setOfflineAssets(pendingAssets);
      } catch (error) {
        console.error('Error loading offline assets:', error);
      }
    };

    loadOfflineAssets();
  }, []);

  // Update selected asset when asset ID changes
  useEffect(() => {
    console.log('[VITInspectionForm] Asset selection debug:', {
      selectedAssetId,
      vitAssetsCount: vitAssets.length,
      offlineAssetsCount: offlineAssets.length,
      vitAssets: vitAssets.map(a => ({ id: a.id, serialNumber: a.serialNumber })),
      offlineAssets: offlineAssets.map(a => ({ id: a.id, serialNumber: a.serialNumber }))
    });

    if (selectedAssetId) {
      // First check online assets
      const onlineAsset = vitAssets.find(a => a.id === selectedAssetId);
      if (onlineAsset) {
        console.log('[VITInspectionForm] Found online asset:', onlineAsset);
        setSelectedAsset(onlineAsset);
        return;
      }

      // Then check offline assets
      const offlineAsset = offlineAssets.find(a => a.id === selectedAssetId);
      if (offlineAsset) {
        console.log('[VITInspectionForm] Found offline asset:', offlineAsset);
        setSelectedAsset(offlineAsset);
        return;
      }

      // If not found in either, clear selection
      console.log('[VITInspectionForm] Asset not found in either array');
      setSelectedAsset(null);
    } else {
      setSelectedAsset(null);
    }
  }, [selectedAssetId, vitAssets, offlineAssets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const inspectionData = {
        vitAssetId: selectedAssetId,
        region: selectedAsset?.region || '',
        district: selectedAsset?.district || '',
        inspectionDate: inspectionDate,
        inspectedBy: user?.name || 'unknown',
        rodentTermiteEncroachment,
        cleanDustFree,
        protectionButtonEnabled,
        recloserButtonEnabled,
        groundEarthButtonEnabled,
        acPowerOn,
        batteryPowerLow,
        handleLockOn,
        remoteButtonEnabled,
        gasLevelLow,
        earthingArrangementAdequate,
        noFusesBlown,
        noDamageToBushings,
        noDamageToHVConnections,
        insulatorsClean,
        paintworkAdequate,
        ptFuseLinkIntact,
        noCorrosion,
        silicaGelCondition,
        correctLabelling,
        remarks,
        createdBy: user?.id || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (inspection?.id) {
        // Update existing inspection
        await apiRequest(`/api/vitInspections/${inspection.id}`, {
          method: 'PUT',
          body: JSON.stringify(inspectionData),
        });
        toast({
          title: "Success",
          description: "Inspection updated successfully",
        });
      } else {
        // Create new inspection
        await apiRequest('/api/vitInspections', {
          method: 'POST',
          body: JSON.stringify(inspectionData),
        });
        toast({
          title: "Success",
          description: "Inspection created successfully",
        });
      }

      if (onClose) {
        onClose();
      }
      if (onSuccess) {
        onSuccess(inspectionData as VITInspectionChecklist);
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: "Error",
        description: "Failed to save inspection",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... rest of the component logic remains the same ...

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {inspection ? 'Edit VIT Inspection' : 'New VIT Inspection'}
          </h2>
          <Button variant="ghost" onClick={() => onClose && onClose()}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset">VIT Asset</Label>
              <Select value={selectedAssetId} onValueChange={(value) => {
                console.log('[VITInspectionForm] Asset selected:', value);
                setSelectedAssetId(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a VIT asset" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    console.log('[VITInspectionForm] Rendering dropdown with:', {
                      vitAssetsCount: vitAssets.length,
                      offlineAssetsCount: offlineAssets.length,
                      totalAssets: vitAssets.length + offlineAssets.length
                    });
                    return null;
                  })()}
                  {/* Online assets */}
                  {vitAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.serialNumber} - {asset.location}
                    </SelectItem>
                  ))}
                  {/* Offline assets */}
                  {offlineAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.serialNumber} - {asset.location} (Offline)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Inspection Checklist */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">VIT Inspection Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Environmental Conditions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Environmental Conditions</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rodentTermiteEncroachment"
                      checked={rodentTermiteEncroachment === "Yes"}
                      onCheckedChange={(checked) => setRodentTermiteEncroachment(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="rodentTermiteEncroachment">Rodent/Termite Encroachment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cleanDustFree"
                      checked={cleanDustFree === "Yes"}
                      onCheckedChange={(checked) => setCleanDustFree(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="cleanDustFree">Clean & Dust Free</Label>
                  </div>
                </div>

                {/* Protection & Control */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Protection & Control</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="protectionButtonEnabled"
                      checked={protectionButtonEnabled === "Yes"}
                      onCheckedChange={(checked) => setProtectionButtonEnabled(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="protectionButtonEnabled">Protection Button Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recloserButtonEnabled"
                      checked={recloserButtonEnabled === "Yes"}
                      onCheckedChange={(checked) => setRecloserButtonEnabled(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="recloserButtonEnabled">Recloser Button Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="groundEarthButtonEnabled"
                      checked={groundEarthButtonEnabled === "Yes"}
                      onCheckedChange={(checked) => setGroundEarthButtonEnabled(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="groundEarthButtonEnabled">Ground/Earth Button Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remoteButtonEnabled"
                      checked={remoteButtonEnabled === "Yes"}
                      onCheckedChange={(checked) => setRemoteButtonEnabled(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="remoteButtonEnabled">Remote Button Enabled</Label>
                  </div>
                </div>

                {/* Power Systems */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Power Systems</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="acPowerOn"
                      checked={acPowerOn === "Yes"}
                      onCheckedChange={(checked) => setAcPowerOn(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="acPowerOn">AC Power On</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="batteryPowerLow"
                      checked={batteryPowerLow === "Yes"}
                      onCheckedChange={(checked) => setBatteryPowerLow(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="batteryPowerLow">Battery Power Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gasLevelLow"
                      checked={gasLevelLow === "Yes"}
                      onCheckedChange={(checked) => setGasLevelLow(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="gasLevelLow">Gas Level Low</Label>
                  </div>
                </div>

                {/* Safety & Security */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Safety & Security</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="handleLockOn"
                      checked={handleLockOn === "Yes"}
                      onCheckedChange={(checked) => setHandleLockOn(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="handleLockOn">Handle Lock On</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="earthingArrangementAdequate"
                      checked={earthingArrangementAdequate === "Yes"}
                      onCheckedChange={(checked) => setEarthingArrangementAdequate(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="earthingArrangementAdequate">Earthing Arrangement Adequate</Label>
                  </div>
                </div>

                {/* Equipment Condition */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Equipment Condition</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noFusesBlown"
                      checked={noFusesBlown === "Yes"}
                      onCheckedChange={(checked) => setNoFusesBlown(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="noFusesBlown">No Fuses Blown</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noDamageToBushings"
                      checked={noDamageToBushings === "Yes"}
                      onCheckedChange={(checked) => setNoDamageToBushings(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="noDamageToBushings">No Damage to Bushings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noDamageToHVConnections"
                      checked={noDamageToHVConnections === "Yes"}
                      onCheckedChange={(checked) => setNoDamageToHVConnections(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="noDamageToHVConnections">No Damage to HV Connections</Label>
                  </div>
                </div>

                {/* Visual Inspection */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Visual Inspection</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insulatorsClean"
                      checked={insulatorsClean === "Yes"}
                      onCheckedChange={(checked) => setInsulatorsClean(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="insulatorsClean">Insulators Clean</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="paintworkAdequate"
                      checked={paintworkAdequate === "Yes"}
                      onCheckedChange={(checked) => setPaintworkAdequate(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="paintworkAdequate">Paintwork Adequate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ptFuseLinkIntact"
                      checked={ptFuseLinkIntact === "Yes"}
                      onCheckedChange={(checked) => setPtFuseLinkIntact(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="ptFuseLinkIntact">PT Fuse Link Intact</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noCorrosion"
                      checked={noCorrosion === "Yes"}
                      onCheckedChange={(checked) => setNoCorrosion(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="noCorrosion">No Corrosion</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="correctLabelling"
                      checked={correctLabelling === "Yes"}
                      onCheckedChange={(checked) => setCorrectLabelling(checked ? "Yes" : "No")}
                    />
                    <Label htmlFor="correctLabelling">Correct Labelling</Label>
                  </div>
                </div>

                {/* Special Conditions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600">Special Conditions</h4>
                  <div className="space-y-2">
                    <Label htmlFor="silicaGelCondition">Silica Gel Condition</Label>
                    <Select value={silicaGelCondition} onValueChange={(value: string) => setSilicaGelCondition(value as GoodBadOption)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Bad">Bad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional remarks..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {inspection ? 'Update Inspection' : 'Create Inspection'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

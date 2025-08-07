import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileEdit, Trash2, Eye, Download, FileDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { NetworkInspection } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { exportOverheadLineInspectionsToExcel } from '@/utils/excelExport';
import { calculateFeederLengthForFeeder } from '@/utils/calculations';
import { PhotoService } from "@/services/PhotoService";

interface OverheadLineInspectionsTableProps {
  inspections: NetworkInspection[];
  allInspections?: NetworkInspection[];
  onEdit: (inspection: NetworkInspection) => void;
  onDelete: (inspection: NetworkInspection) => void;
  onView: (inspection: NetworkInspection) => void;
  userRole?: string;
}

export function OverheadLineInspectionsTable({
  inspections,
  allInspections,
  onEdit,
  onDelete,
  onView,
  userRole
}: OverheadLineInspectionsTableProps) {
  const [sortedInspections, setSortedInspections] = useState([...inspections]);
  // Disable client-side pagination since we're using server-side pagination
  // const [currentPage, setCurrentPage] = useState(1);
  // const itemsPerPage = 10;

  // Update sorted inspections whenever the inspections prop changes
  useEffect(() => {
    console.log('[OverheadLineInspectionsTable] Received inspections:', inspections.length);
    
    // Sort by date and time (if available), or createdAt, descending
    const sorted = [...inspections].sort((a, b) => {
      // Create date objects for comparison
      let dateA: Date;
      let dateB: Date;
      
      // For inspection A
      if (a.date && a.time) {
        // Use inspection date and time
        dateA = new Date(`${a.date}T${a.time}`);
      } else if (a.date) {
        // Use inspection date with default time
        dateA = new Date(`${a.date}T00:00`);
      } else {
        // Fallback to createdAt
        dateA = new Date(a.createdAt);
      }
      
      // For inspection B
      if (b.date && b.time) {
        // Use inspection date and time
        dateB = new Date(`${b.date}T${b.time}`);
      } else if (b.date) {
        // Use inspection date with default time
        dateB = new Date(`${b.date}T00:00`);
      } else {
        // Fallback to createdAt
        dateB = new Date(b.createdAt);
      }
      
      // Sort descending (latest first)
      return dateB.getTime() - dateA.getTime();
    });
    
    setSortedInspections(sorted);
    // Client-side pagination disabled - using server-side pagination
    
    // Log sorting for debugging
    console.log('[OverheadLineInspectionsTable] Sorted inspections:', {
      total: sorted.length,
      latest: sorted[0] ? {
        id: sorted[0].id,
        date: sorted[0].date,
        time: sorted[0].time,
        createdAt: sorted[0].createdAt,
        displayDate: getDisplayDate(sorted[0])
      } : null,
      oldest: sorted[sorted.length - 1] ? {
        id: sorted[sorted.length - 1].id,
        date: sorted[sorted.length - 1].date,
        time: sorted[sorted.length - 1].time,
        createdAt: sorted[sorted.length - 1].createdAt,
        displayDate: getDisplayDate(sorted[sorted.length - 1])
      } : null
    });
    
    // Log first few items to see the actual order
    console.log('[OverheadLineInspectionsTable] First 3 items:', sorted.slice(0, 3).map(item => ({
      id: item.id,
      date: item.date,
      time: item.time,
      createdAt: item.createdAt,
      displayDate: getDisplayDate(item)
    })));
  }, [inspections]);

  // Helper function to get display date
  const getDisplayDate = (inspection: NetworkInspection): string => {
    if (inspection.date && inspection.time) {
      return `${inspection.date} ${inspection.time}`;
    } else if (inspection.date) {
      return inspection.date;
    } else {
      return format(new Date(inspection.createdAt), "dd/MM/yyyy HH:mm");
    }
  };

  // Use all sorted inspections since server-side pagination handles pagination
  const currentInspections = sortedInspections;

  const exportToPDF = async (inspection: NetworkInspection) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Network Inspection Report', 14, 20);
    
    // Add inspection ID and date
    doc.setFontSize(12);
    doc.text(`Inspection ID: ${inspection.id}`, 14, 30);
    doc.text(`Date: ${inspection.date || format(new Date(inspection.createdAt), "dd/MM/yyyy")}`, 14, 37);
    
    // Basic Information
    doc.text('Basic Information', 14, 47);
    const basicInfo = [
      ['Region:', inspection.region],
      ['District:', inspection.district],
      ['Feeder Name:', inspection.feederName],
      ['Voltage Level:', inspection.voltageLevel],
      ['Reference Pole:', inspection.referencePole],
      ['Status:', inspection.status],
      ['Inspector:', inspection.inspector?.name || 'Unknown'],
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [['Field', 'Value']],
      body: basicInfo,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Pole Information
    doc.text('Pole Information', 14, doc.lastAutoTable.finalY + 15);
    const poleInfo = [
      ['Pole ID:', inspection.poleId],
      ['Pole Height:', inspection.poleHeight],
      ['Pole Type:', inspection.poleType],
      ['Ground Condition:', inspection.groundCondition],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: poleInfo,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Pole Condition
    doc.text('Pole Condition', 14, doc.lastAutoTable.finalY + 15);
    const poleCondition = [
      ['Tilted:', inspection.poleCondition?.tilted ? 'Yes' : 'No'],
      ['Rotten:', inspection.poleCondition?.rotten ? 'Yes' : 'No'],
      ['Burnt:', inspection.poleCondition?.burnt ? 'Yes' : 'No'],
      ['Substandard:', inspection.poleCondition?.substandard ? 'Yes' : 'No'],
      ['Conflict with LV:', inspection.poleCondition?.conflictWithLV ? 'Yes' : 'No'],
      ['Notes:', inspection.poleCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: poleCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Stay Condition
    doc.text('Stay Condition', 14, doc.lastAutoTable.finalY + 15);
    const stayCondition = [
      ['Required but not available:', inspection.stayCondition?.requiredButNotAvailable ? 'Yes' : 'No'],
      ['Cut:', inspection.stayCondition?.cut ? 'Yes' : 'No'],
      ['Misaligned:', inspection.stayCondition?.misaligned ? 'Yes' : 'No'],
      ['Defective Stay:', inspection.stayCondition?.defectiveStay ? 'Yes' : 'No'],
      ['Notes:', inspection.stayCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: stayCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Cross Arm Condition
    doc.text('Cross Arm Condition', 14, doc.lastAutoTable.finalY + 15);
    const crossArmCondition = [
      ['Misaligned:', inspection.crossArmCondition?.misaligned ? 'Yes' : 'No'],
      ['Bend:', inspection.crossArmCondition?.bend ? 'Yes' : 'No'],
      ['Corroded:', inspection.crossArmCondition?.corroded ? 'Yes' : 'No'],
      ['Substandard:', inspection.crossArmCondition?.substandard ? 'Yes' : 'No'],
      ['Others:', inspection.crossArmCondition?.others ? 'Yes' : 'No'],
      ['Notes:', inspection.crossArmCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: crossArmCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Insulator Condition
    doc.text('Insulator Condition', 14, doc.lastAutoTable.finalY + 15);
    const insulatorCondition = [
      ['Broken/Cracked:', inspection.insulatorCondition?.brokenOrCracked ? 'Yes' : 'No'],
      ['Burnt/Flash over:', inspection.insulatorCondition?.burntOrFlashOver ? 'Yes' : 'No'],
      ['Shattered:', inspection.insulatorCondition?.shattered ? 'Yes' : 'No'],
      ['Defective Binding:', inspection.insulatorCondition?.defectiveBinding ? 'Yes' : 'No'],
      ['Notes:', inspection.insulatorCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: insulatorCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Conductor Condition
    doc.text('Conductor Condition', 14, doc.lastAutoTable.finalY + 15);
    const conductorCondition = [
      ['Loose Connectors:', inspection.conductorCondition?.looseConnectors ? 'Yes' : 'No'],
      ['Weak Jumpers:', inspection.conductorCondition?.weakJumpers ? 'Yes' : 'No'],
      ['Burnt Lugs:', inspection.conductorCondition?.burntLugs ? 'Yes' : 'No'],
      ['Sagged Line:', inspection.conductorCondition?.saggedLine ? 'Yes' : 'No'],
      ['Undersized:', inspection.conductorCondition?.undersized ? 'Yes' : 'No'],
      ['Notes:', inspection.conductorCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: conductorCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Lightning Arrester Condition
    doc.text('Lightning Arrester Condition', 14, doc.lastAutoTable.finalY + 15);
    const lightningArresterCondition = [
      ['Broken/Cracked:', inspection.lightningArresterCondition?.brokenOrCracked ? 'Yes' : 'No'],
      ['Flash over:', inspection.lightningArresterCondition?.flashOver ? 'Yes' : 'No'],
      ['No Earthing:', inspection.lightningArresterCondition?.noEarthing ? 'Yes' : 'No'],
      ['By-passed:', inspection.lightningArresterCondition?.bypassed ? 'Yes' : 'No'],
      ['No Arrester:', inspection.lightningArresterCondition?.noArrester ? 'Yes' : 'No'],
      ['Notes:', inspection.lightningArresterCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: lightningArresterCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Drop Out Fuse Condition
    doc.text('Drop Out Fuse Condition', 14, doc.lastAutoTable.finalY + 15);
    const dropOutFuseCondition = [
      ['Broken/Cracked:', inspection.dropOutFuseCondition?.brokenOrCracked ? 'Yes' : 'No'],
      ['Flash over:', inspection.dropOutFuseCondition?.flashOver ? 'Yes' : 'No'],
      ['Insufficient Clearance:', inspection.dropOutFuseCondition?.insufficientClearance ? 'Yes' : 'No'],
      ['Loose or No Earthing:', inspection.dropOutFuseCondition?.looseOrNoEarthing ? 'Yes' : 'No'],
      ['Corroded:', inspection.dropOutFuseCondition?.corroded ? 'Yes' : 'No'],
      ['Linked HV Fuses:', inspection.dropOutFuseCondition?.linkedHVFuses ? 'Yes' : 'No'],
      ['Others:', inspection.dropOutFuseCondition?.others ? 'Yes' : 'No'],
      ['Notes:', inspection.dropOutFuseCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: dropOutFuseCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Transformer Condition
    doc.text('Transformer Condition', 14, doc.lastAutoTable.finalY + 15);
    const transformerCondition = [
      ['Leaking Oil:', inspection.transformerCondition?.leakingOil ? 'Yes' : 'No'],
      ['Missing Earth leads:', inspection.transformerCondition?.missingEarthLeads ? 'Yes' : 'No'],
      ['Linked HV Fuses:', inspection.transformerCondition?.linkedHVFuses ? 'Yes' : 'No'],
      ['Rusted Tank:', inspection.transformerCondition?.rustedTank ? 'Yes' : 'No'],
      ['Cracked Bushing:', inspection.transformerCondition?.crackedBushing ? 'Yes' : 'No'],
      ['Others:', inspection.transformerCondition?.others ? 'Yes' : 'No'],
      ['Notes:', inspection.transformerCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: transformerCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Recloser Condition
    doc.text('Recloser Condition', 14, doc.lastAutoTable.finalY + 15);
    const recloserCondition = [
      ['Low Gas Level:', inspection.recloserCondition?.lowGasLevel ? 'Yes' : 'No'],
      ['Low Battery Level:', inspection.recloserCondition?.lowBatteryLevel ? 'Yes' : 'No'],
      ['Burnt Voltage Transformers:', inspection.recloserCondition?.burntVoltageTransformers ? 'Yes' : 'No'],
      ['Protection Disabled:', inspection.recloserCondition?.protectionDisabled ? 'Yes' : 'No'],
      ['By-passed:', inspection.recloserCondition?.bypassed ? 'Yes' : 'No'],
      ['Others:', inspection.recloserCondition?.others ? 'Yes' : 'No'],
      ['Notes:', inspection.recloserCondition?.notes || 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: recloserCondition,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Additional Information
    doc.text('Additional Information', 14, doc.lastAutoTable.finalY + 15);
    const additionalInfo = [
      ['Location:', `${inspection.latitude}, ${inspection.longitude}`],
      ['Additional Notes:', inspection.additionalNotes || 'None'],
      ['Images:', inspection.images?.length ? `${inspection.images.length} image(s) attached` : 'None'],
    ];
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: additionalInfo,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Add before images
    if (inspection.images && inspection.images.length > 0) {
      doc.text('Inspection Photos (Before Correction):', 14, doc.lastAutoTable.finalY + 15);
      let y = doc.lastAutoTable.finalY + 25;
              for (const imageUrl of inspection.images.slice(0, 5)) {
          try {
            const img = new window.Image();
            img.src = PhotoService.getInstance().convertToProxyUrl(imageUrl);
            await new Promise(resolve => { img.onload = resolve; });
          const aspect = img.width / img.height;
          const maxWidth = 180;
          const maxHeight = 80;
          let width = maxWidth;
          let height = width / aspect;
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspect;
          }
          if (y + height > 280) {
          doc.addPage();
            y = 20;
        }
          doc.addImage(img, 'JPEG', 14, y, width, height);
          y += height + 10;
        } catch (error) {
          console.error('Error adding image to PDF:', error);
        }
      }
    }
    // Add after correction images
    if (inspection.afterImages && inspection.afterImages.length > 0) {
      doc.text('After Inspection Correction Photos:', 14, doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 120 : 120);
      let y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 130 : 130;
              for (const imageUrl of inspection.afterImages.slice(0, 5)) {
          try {
            const img = new window.Image();
            img.src = PhotoService.getInstance().convertToProxyUrl(imageUrl);
            await new Promise(resolve => { img.onload = resolve; });
          const aspect = img.width / img.height;
          const maxWidth = 180;
          const maxHeight = 80;
          let width = maxWidth;
          let height = width / aspect;
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspect;
          }
          if (y + height > 280) {
            doc.addPage();
            y = 20;
          }
          doc.addImage(img, 'JPEG', 14, y, width, height);
          y += height + 10;
        } catch (error) {
          console.error('Error adding after correction image to PDF:', error);
        }
      }
    }

    // Save the PDF
    doc.save(`network-inspection-${inspection.id}.pdf`);
  };

  const exportToCSV = (inspection: NetworkInspection) => {
    const headers = [
      'Region', 'District', 'Feeder Name', 'Voltage Level', 'Reference Pole',
      'Status', 'Date', 'Pole ID', 'Pole Height', 'Pole Type', 'Ground Condition',
      'GPS Location',
      // Pole Condition
      'Pole Tilted', 'Pole Rotten', 'Pole Burnt', 'Pole Substandard', 'Pole Conflict with LV', 'Pole Condition Notes',
      // Stay Condition
      'Stay Required but Not Available', 'Stay Cut', 'Stay Misaligned', 'Stay Defective', 'Stay Condition Notes',
      // Cross Arm Condition
      'Cross Arm Misaligned', 'Cross Arm Bend', 'Cross Arm Corroded', 'Cross Arm Substandard', 'Cross Arm Others', 'Cross Arm Notes',
      // Insulator Condition
      'Insulator Broken/Cracked', 'Insulator Burnt/Flash Over', 'Insulator Shattered', 'Insulator Defective Binding', 'Insulator Notes',
      // Conductor Condition
      'Conductor Loose Connectors', 'Conductor Weak Jumpers', 'Conductor Burnt Lugs', 'Conductor Sagged Line', 'Conductor Undersized', 'Conductor Notes',
      // Lightning Arrester Condition
      'Arrester Broken/Cracked', 'Arrester Flash Over', 'Arrester No Earthing', 'Arrester Bypassed', 'Arrester No Arrester', 'Arrester Notes',
      'Inspector Name'
    ];
    
    const csvRows = inspections.map(inspection => [
      inspection.region || 'Unknown',
      inspection.district || 'Unknown',
      inspection.feederName,
      inspection.voltageLevel,
      inspection.referencePole,
      inspection.status,
      inspection.date || format(new Date(), 'dd/MM/yyyy'),
      inspection.poleId,
      inspection.poleHeight,
      inspection.poleType,
      inspection.groundCondition,
      `${inspection.latitude}, ${inspection.longitude}`,
      // Pole Condition
      inspection.poleCondition?.tilted ? 'Yes' : 'No',
      inspection.poleCondition?.rotten ? 'Yes' : 'No',
      inspection.poleCondition?.burnt ? 'Yes' : 'No',
      inspection.poleCondition?.substandard ? 'Yes' : 'No',
      inspection.poleCondition?.conflictWithLV ? 'Yes' : 'No',
      inspection.poleCondition?.notes || 'N/A',
      // Stay Condition
      inspection.stayCondition?.requiredButNotAvailable ? 'Yes' : 'No',
      inspection.stayCondition?.cut ? 'Yes' : 'No',
      inspection.stayCondition?.misaligned ? 'Yes' : 'No',
      inspection.stayCondition?.defectiveStay ? 'Yes' : 'No',
      inspection.stayCondition?.notes || 'N/A',
      // Cross Arm Condition
      inspection.crossArmCondition?.misaligned ? 'Yes' : 'No',
      inspection.crossArmCondition?.bend ? 'Yes' : 'No',
      inspection.crossArmCondition?.corroded ? 'Yes' : 'No',
      inspection.crossArmCondition?.substandard ? 'Yes' : 'No',
      inspection.crossArmCondition?.others ? 'Yes' : 'No',
      inspection.crossArmCondition?.notes || 'N/A',
      // Insulator Condition
      inspection.insulatorCondition?.brokenOrCracked ? 'Yes' : 'No',
      inspection.insulatorCondition?.burntOrFlashOver ? 'Yes' : 'No',
      inspection.insulatorCondition?.shattered ? 'Yes' : 'No',
      inspection.insulatorCondition?.defectiveBinding ? 'Yes' : 'No',
      inspection.insulatorCondition?.notes || 'N/A',
      // Conductor Condition
      inspection.conductorCondition?.looseConnectors ? 'Yes' : 'No',
      inspection.conductorCondition?.weakJumpers ? 'Yes' : 'No',
      inspection.conductorCondition?.burntLugs ? 'Yes' : 'No',
      inspection.conductorCondition?.saggedLine ? 'Yes' : 'No',
      inspection.conductorCondition?.undersized ? 'Yes' : 'No',
      inspection.conductorCondition?.notes || 'N/A',
      // Lightning Arrester Condition
      inspection.lightningArresterCondition?.brokenOrCracked ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.flashOver ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.noEarthing ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.bypassed ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.noArrester ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.notes || 'N/A',
      inspection.inspector?.name || 'Unknown'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `network-inspection-${inspection.id}.csv`;
    link.click();
  };

  const exportAllToCSV = () => {
    const dataToExport = allInspections || inspections;
    const headers = [
      'Region', 'District', 'Feeder Name', 'Voltage Level', 'Reference Pole',
      'Status', 'Date', 'Pole ID', 'Pole Height', 'Pole Type', 'Ground Condition',
      'GPS Location',
      // Pole Condition
      'Pole Tilted', 'Pole Rotten', 'Pole Burnt', 'Pole Substandard', 'Pole Conflict with LV', 'Pole Condition Notes',
      // Stay Condition
      'Stay Required but Not Available', 'Stay Cut', 'Stay Misaligned', 'Stay Defective', 'Stay Condition Notes',
      // Cross Arm Condition
      'Cross Arm Misaligned', 'Cross Arm Bend', 'Cross Arm Corroded', 'Cross Arm Substandard', 'Cross Arm Others', 'Cross Arm Notes',
      // Insulator Condition
      'Insulator Broken/Cracked', 'Insulator Burnt/Flash Over', 'Insulator Shattered', 'Insulator Defective Binding', 'Insulator Notes',
      // Conductor Condition
      'Conductor Loose Connectors', 'Conductor Weak Jumpers', 'Conductor Burnt Lugs', 'Conductor Sagged Line', 'Conductor Undersized', 'Conductor Notes',
      // Lightning Arrester Condition
      'Arrester Broken/Cracked', 'Arrester Flash Over', 'Arrester No Earthing', 'Arrester Bypassed', 'Arrester No Arrester', 'Arrester Notes',
      'Inspector Name'
    ];
    
    const csvRows = dataToExport.map(inspection => [
      inspection.region || 'Unknown',
      inspection.district || 'Unknown',
      inspection.feederName,
      inspection.voltageLevel,
      inspection.referencePole,
      inspection.status,
      inspection.date || format(new Date(), 'dd/MM/yyyy'),
      inspection.poleId,
      inspection.poleHeight,
      inspection.poleType,
      inspection.groundCondition,
      `${inspection.latitude}, ${inspection.longitude}`,
      // Pole Condition
      inspection.poleCondition?.tilted ? 'Yes' : 'No',
      inspection.poleCondition?.rotten ? 'Yes' : 'No',
      inspection.poleCondition?.burnt ? 'Yes' : 'No',
      inspection.poleCondition?.substandard ? 'Yes' : 'No',
      inspection.poleCondition?.conflictWithLV ? 'Yes' : 'No',
      inspection.poleCondition?.notes || 'N/A',
      // Stay Condition
      inspection.stayCondition?.requiredButNotAvailable ? 'Yes' : 'No',
      inspection.stayCondition?.cut ? 'Yes' : 'No',
      inspection.stayCondition?.misaligned ? 'Yes' : 'No',
      inspection.stayCondition?.defectiveStay ? 'Yes' : 'No',
      inspection.stayCondition?.notes || 'N/A',
      // Cross Arm Condition
      inspection.crossArmCondition?.misaligned ? 'Yes' : 'No',
      inspection.crossArmCondition?.bend ? 'Yes' : 'No',
      inspection.crossArmCondition?.corroded ? 'Yes' : 'No',
      inspection.crossArmCondition?.substandard ? 'Yes' : 'No',
      inspection.crossArmCondition?.others ? 'Yes' : 'No',
      inspection.crossArmCondition?.notes || 'N/A',
      // Insulator Condition
      inspection.insulatorCondition?.brokenOrCracked ? 'Yes' : 'No',
      inspection.insulatorCondition?.burntOrFlashOver ? 'Yes' : 'No',
      inspection.insulatorCondition?.shattered ? 'Yes' : 'No',
      inspection.insulatorCondition?.defectiveBinding ? 'Yes' : 'No',
      inspection.insulatorCondition?.notes || 'N/A',
      // Conductor Condition
      inspection.conductorCondition?.looseConnectors ? 'Yes' : 'No',
      inspection.conductorCondition?.weakJumpers ? 'Yes' : 'No',
      inspection.conductorCondition?.burntLugs ? 'Yes' : 'No',
      inspection.conductorCondition?.saggedLine ? 'Yes' : 'No',
      inspection.conductorCondition?.undersized ? 'Yes' : 'No',
      inspection.conductorCondition?.notes || 'N/A',
      // Lightning Arrester Condition
      inspection.lightningArresterCondition?.brokenOrCracked ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.flashOver ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.noEarthing ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.bypassed ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.noArrester ? 'Yes' : 'No',
      inspection.lightningArresterCondition?.notes || 'N/A',
      inspection.inspector?.name || 'Unknown'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const stringCell = String(cell);
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'all-network-inspections.csv';
    link.click();
  };

  const exportAllToExcel = async () => {
    try {
      console.log('Starting Excel export...');
      const dataToExport = allInspections || inspections;
      console.log('Data to export:', dataToExport.length, 'inspections');
      
      if (dataToExport.length === 0) {
        toast.error('No inspections to export');
        return;
      }
      
      toast.loading('Generating Excel file...');
      await exportOverheadLineInspectionsToExcel(dataToExport);
      toast.dismiss();
      toast.success('Excel file generated successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.dismiss();
      toast.error('Failed to generate Excel file. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={exportAllToCSV} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Export All to CSV
        </Button>
        <Button onClick={exportAllToExcel} variant="outline" className="ml-2">
          <FileDown className="mr-2 h-4 w-4" />
          Export All to Excel
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="flex items-center gap-1">
                Date & Time
                <span className="text-xs text-muted-foreground">(Latest First)</span>
              </TableHead>
              <TableHead>Region</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Feeder Name</TableHead>
              <TableHead>Estimated Feeder Length (km)</TableHead>
              <TableHead>Voltage Level</TableHead>
              <TableHead>Reference Pole</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentInspections.map((inspection, idx) => {
              // Calculate feeder length for this feeder using allInspections
              let feederLength = 0;
              if (allInspections) {
                feederLength = calculateFeederLengthForFeeder(allInspections, inspection.feederName) / 1000; // meters to km
              }
              return (
                <TableRow
                  key={inspection.id}
                  onClick={e => {
                    if ((e.target as HTMLElement).closest('td')?.classList.contains('actions-cell')) return;
                    onView(inspection);
                  }}
                  className="cursor-pointer hover:bg-muted transition-colors"
                >
                  <TableCell>
                    {getDisplayDate(inspection)}
                    {inspection.id.startsWith('inspection_') && (
                      <span className="ml-2 text-xs text-yellow-600">(Offline)</span>
                    )}
                  </TableCell>
                  <TableCell>{inspection.region || "Unknown"}</TableCell>
                  <TableCell>{inspection.district || "Unknown"}</TableCell>
                  <TableCell>{inspection.feederName}</TableCell>
                  <TableCell>
                    {feederLength > 0 ? (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {feederLength.toFixed(2)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{inspection.voltageLevel}</TableCell>
                  <TableCell>{inspection.referencePole}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        inspection.status === "completed"
                          ? "bg-green-500"
                          : inspection.status === "in-progress"
                          ? "bg-yellow-500"
                          : "bg-gray-500"
                      }
                    >
                      {inspection.status ? inspection.status.charAt(0).toUpperCase() + inspection.status.slice(1) : "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right actions-cell">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onView(inspection);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {(userRole === 'global_engineer' || userRole === 'district_engineer' || userRole === 'regional_engineer' || userRole === 'project_engineer' || userRole === 'technician' || userRole === 'system_admin') && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onEdit(inspection);
                          }}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          if (!inspection?.id) {
                            toast.error("Invalid inspection ID");
                            return;
                          }
                          onDelete(inspection);
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          exportToPDF(inspection);
                        }}>
                          <Download className="mr-2 h-4 w-4" />
                          Export to PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          exportToCSV(inspection);
                        }}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Export to CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {inspections.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No inspections found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Client-side pagination removed - using server-side pagination */}
      

    </div>
  );
} 
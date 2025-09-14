import { supabase } from '../config/supabase';
import { MedicalScan } from '../types/database';
import GeminiService from './gemini';

export class MedicalScanService {
  async uploadScan(
    patientId: string,
    file: File,
    scanType: string,
    soapNoteId?: string
  ): Promise<MedicalScan> {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `medical-scans/${patientId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-scans')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create scan record
      const scanData = {
        patient_id: patientId,
        soap_note_id: soapNoteId || null,
        scan_type: scanType as any,
        file_path: uploadData.path,
        file_name: file.name,
        urgency_level: 'low' as const
      };

      const { data: scanRecord, error: dbError } = await supabase
        .from('medical_scans')
        .insert(scanData)
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger AI analysis
      this.analyzeScannInBackground(scanRecord.id, file, scanType);

      return scanRecord;
    } catch (error) {
      console.error('Failed to upload scan:', error);
      throw error;
    }
  }

  private async analyzeScannInBackground(scanId: string, file: File, scanType: string) {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Get patient context for the scan
      const scan = await this.getScan(scanId);
      const patientContext = await this.getPatientContext(scan.patient_id);

      // Analyze with Gemini
      const analysis = await GeminiService.analyzeMedicalScan(
        base64,
        scanType,
        patientContext
      );

      // Update scan with AI analysis
      await this.updateScan(scanId, {
        ai_analysis: analysis.analysis,
        ai_findings: analysis.findings,
        urgency_level: analysis.urgencyLevel
      });

    } catch (error) {
      console.error('Failed to analyze scan:', error);
      // Update scan with error status
      await this.updateScan(scanId, {
        ai_analysis: 'AI analysis failed. Please review manually.'
      });
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  }

  private async getPatientContext(patientId: string): Promise<string> {
    const { data: patient } = await supabase
      .from('patients')
      .select('first_name, last_name, date_of_birth, gender, medical_history, current_medications, allergies')
      .eq('id', patientId)
      .single();

    if (!patient) return '';

    const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
    
    return `Patient: ${patient.first_name} ${patient.last_name}, Age: ${age}, Gender: ${patient.gender}
    Medical History: ${patient.medical_history?.join(', ') || 'None'}
    Current Medications: ${patient.current_medications?.join(', ') || 'None'}
    Allergies: ${patient.allergies?.join(', ') || 'None'}`;
  }

  async getScan(id: string): Promise<MedicalScan> {
    const { data, error } = await supabase
      .from('medical_scans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateScan(id: string, updates: Partial<MedicalScan>): Promise<MedicalScan> {
    const { data, error } = await supabase
      .from('medical_scans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPatientScans(patientId: string): Promise<MedicalScan[]> {
    const { data, error } = await supabase
      .from('medical_scans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAllScans(): Promise<MedicalScan[]> {
    const { data, error } = await supabase
      .from('medical_scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPendingScans(): Promise<MedicalScan[]> {
    const { data, error } = await supabase
      .from('medical_scans')
      .select('*')
      .or('urgency_level.eq.high,urgency_level.eq.critical')
      .is('radiologist_notes', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteScan(id: string): Promise<void> {
    // Get scan to find file path
    const scan = await this.getScan(id);
    
    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('medical-scans')
      .remove([scan.file_path]);

    if (storageError) console.error('Failed to delete file from storage:', storageError);

    // Delete database record
    const { error } = await supabase
      .from('medical_scans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getScanImageUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('medical-scans')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    return data?.signedUrl || '';
  }

  async reanalyzeScan(id: string): Promise<MedicalScan> {
    try {
      const scan = await this.getScan(id);
      
      // Get the image URL
      const imageUrl = await this.getScanImageUrl(scan.file_path);
      
      // Fetch the image and convert to base64
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], scan.file_name);
      const base64 = await this.fileToBase64(file);
      
      // Get patient context
      const patientContext = await this.getPatientContext(scan.patient_id);

      // Analyze with Gemini
      const analysis = await GeminiService.analyzeMedicalScan(
        base64,
        scan.scan_type,
        patientContext
      );

      // Update scan with new analysis
      return await this.updateScan(id, {
        ai_analysis: analysis.analysis,
        ai_findings: analysis.findings,
        urgency_level: analysis.urgencyLevel
      });

    } catch (error) {
      console.error('Failed to reanalyze scan:', error);
      throw error;
    }
  }
}

const medicalScanServiceInstance = new MedicalScanService();
export default medicalScanServiceInstance;
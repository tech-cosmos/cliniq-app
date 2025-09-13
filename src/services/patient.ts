import { supabase } from '../config/supabase';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import GeminiService from './gemini';

export class PatientService {
  async createPatient(patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPatient(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async searchPatients(searchTerm: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,medical_record_number.ilike.%${searchTerm}%`)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getAllPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getPatientSOAPNotes(patientId: string): Promise<SOAPNote[]> {
    const { data, error } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPatientMedicalScans(patientId: string): Promise<MedicalScan[]> {
    const { data, error } = await supabase
      .from('medical_scans')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async generatePatientSummary(patientId: string): Promise<string> {
    try {
      const [soapNotes, medicalScans] = await Promise.all([
        this.getPatientSOAPNotes(patientId),
        this.getPatientMedicalScans(patientId)
      ]);

      const summary = await GeminiService.generatePatientSummary(soapNotes, medicalScans);
      
      // Update patient with AI summary
      await this.updatePatient(patientId, { ai_summary: summary });
      
      return summary;
    } catch (error) {
      console.error('Failed to generate patient summary:', error);
      throw error;
    }
  }

  async getPatientHistory(patientId: string): Promise<{
    patient: Patient;
    soapNotes: SOAPNote[];
    medicalScans: MedicalScan[];
  }> {
    const [patient, soapNotes, medicalScans] = await Promise.all([
      this.getPatient(patientId),
      this.getPatientSOAPNotes(patientId),
      this.getPatientMedicalScans(patientId)
    ]);

    if (!patient) throw new Error('Patient not found');

    return { patient, soapNotes, medicalScans };
  }
}

const patientServiceInstance = new PatientService();
export default patientServiceInstance;
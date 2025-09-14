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

  async getCriticalCases(): Promise<Patient[]> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          soap_notes(id, created_at, status, chief_complaint, assessment, plan),
          medical_scans(id, urgency_level, ai_findings, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter and rank patients by criticality
      const criticalPatients = (data || []).filter(patient => {
        let criticalScore = 0;

        // Check for multiple allergies (high risk)
        if (patient.allergies && patient.allergies.length >= 3) {
          criticalScore += 3;
        }
        
        // Check for specific critical allergies
        const criticalAllergies = ['penicillin', 'shellfish', 'peanuts', 'latex', 'contrast dye', 'aspirin', 'morphine'];
        if (patient.allergies?.some((allergy: string) => 
          criticalAllergies.some(critical => 
            allergy.toLowerCase().includes(critical.toLowerCase())
          )
        )) {
          criticalScore += 2;
        }

        // Check for recent critical/high urgency scans
        const recentCriticalScans = patient.medical_scans?.filter((scan: any) => 
          (scan.urgency_level === 'critical' || scan.urgency_level === 'high') &&
          new Date(scan.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        );
        if (recentCriticalScans && recentCriticalScans.length > 0) {
          criticalScore += recentCriticalScans.length;
        }

        // Check for concerning keywords in recent SOAP notes
        const recentNotes = patient.soap_notes?.filter((note: any) =>
          new Date(note.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        );
        
        const criticalKeywords = ['urgent', 'critical', 'emergency', 'acute', 'severe', 'unstable', 'deteriorating', 'crisis', 'immediate', 'stat'];
        const hasCriticalAssessment = recentNotes?.some((note: any) => 
          (note.assessment && criticalKeywords.some((keyword: string) => 
            note.assessment.toLowerCase().includes(keyword)
          )) ||
          (note.plan && criticalKeywords.some((keyword: string) => 
            note.plan.toLowerCase().includes(keyword)
          )) ||
          (note.chief_complaint && criticalKeywords.some((keyword: string) => 
            note.chief_complaint.toLowerCase().includes(keyword)
          ))
        );
        if (hasCriticalAssessment) {
          criticalScore += 2;
        }

        // Check for recent multiple visits (could indicate unstable condition)
        if (recentNotes && recentNotes.length >= 3) {
          criticalScore += 1;
        }

        return criticalScore >= 2; // Threshold for being considered critical
      });

      // Sort by criticality score (most critical first)
      return criticalPatients.sort((a: any, b: any) => {
        const scoreA = this.calculateCriticalityScore(a);
        const scoreB = this.calculateCriticalityScore(b);
        return scoreB - scoreA;
      });
    } catch (error) {
      console.error('Failed to get critical cases:', error);
      return [];
    }
  }

  calculateCriticalityScore(patient: Patient & { soap_notes?: any[]; medical_scans?: any[] }): number {
    let score = 0;
    
    if (patient.allergies && patient.allergies.length >= 3) score += 3;
    
    const criticalAllergies = ['penicillin', 'shellfish', 'peanuts', 'latex', 'contrast dye', 'aspirin', 'morphine'];
    if (patient.allergies?.some((allergy: string) => 
      criticalAllergies.some(critical => allergy.toLowerCase().includes(critical.toLowerCase()))
    )) score += 2;

    const recentCriticalScans = patient.medical_scans?.filter((scan: any) => 
      (scan.urgency_level === 'critical' || scan.urgency_level === 'high') &&
      new Date(scan.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    if (recentCriticalScans?.length) score += recentCriticalScans.length;

    const recentNotes = patient.soap_notes?.filter((note: any) =>
      new Date(note.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const criticalKeywords = ['urgent', 'critical', 'emergency', 'acute', 'severe', 'unstable', 'deteriorating', 'crisis'];
    const hasCriticalContent = recentNotes?.some((note: any) => 
      criticalKeywords.some((keyword: string) => 
        note.assessment?.toLowerCase().includes(keyword) ||
        note.plan?.toLowerCase().includes(keyword) ||
        note.chief_complaint?.toLowerCase().includes(keyword)
      )
    );
    if (hasCriticalContent) score += 2;

    if (recentNotes && recentNotes.length >= 3) score += 1;

    return score;
  }
}

const patientServiceInstance = new PatientService();
export default patientServiceInstance;
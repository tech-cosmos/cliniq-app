export interface Patient {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  address: string;
  medical_record_number: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string[];
  current_medications?: string[];
  medical_history?: string[];
  ai_summary?: string;
}

export interface SOAPNote {
  id: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  doctor_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  voice_transcript?: string;
  ai_generated_content?: boolean;
  ai_diagnostic_suggestions?: string[];
  follow_up_date?: string;
  status: 'draft' | 'completed' | 'reviewed';
}

export interface MedicalScan {
  id: string;
  created_at: string;
  patient_id: string;
  soap_note_id?: string;
  scan_type: 'xray' | 'mri' | 'ct' | 'ultrasound' | 'other';
  file_path: string;
  file_name: string;
  ai_analysis?: string;
  ai_findings?: string[];
  radiologist_notes?: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface Doctor {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  license_number: string;
  specialization: string;
  department?: string;
}

export interface VoiceSession {
  id: string;
  created_at: string;
  soap_note_id: string;
  transcript: string;
  audio_duration: number;
  status: 'recording' | 'processing' | 'completed' | 'error';
}
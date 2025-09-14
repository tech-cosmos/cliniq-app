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
  
  // Visit Information
  type_of_visit?: string;
  date_of_service?: string;
  chief_complaint?: string;
  
  // Clinical Notes
  nurses_note?: string;
  hpi?: string; // History of Present Illness
  
  // Medical Information
  medical_history?: string[];
  family_history?: string[];
  past_surgical_history?: string;
  social_history?: string;
  current_medications?: string[];
  
  // Physical Examination
  vitals?: {
    bp?: string;
    pulse?: string;
    temperature?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    respiration?: string;
    oxygen_saturation?: string;
  };
  
  allergies?: string[];
  ros?: string; // Review of Systems
  physical_examination?: string;
  
  // Diagnosis
  diagnosis_for_visit?: string[];
  active_diagnosis_list?: string[];
  
  // Traditional SOAP
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  
  // Services and Follow-up
  services?: string[];
  immunizations?: string[];
  next_visit?: string;
  
  // Meta
  voice_transcript?: string;
  ai_generated_content?: boolean;
  ai_diagnostic_suggestions?: string[];
  follow_up_date?: string;
  status: 'draft' | 'completed' | 'reviewed';
  updated_by?: string;
}

export interface SOAPNoteWithPatient extends SOAPNote {
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    medical_record_number: string;
    date_of_birth: string;
    gender: string;
  };
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

export interface Biometrics {
  id: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  timepoint: 'baseline' | '3m' | '6m' | '12m';

  // Cardiopulmonary metrics
  six_minute_walk_distance?: number; // 6MWD in meters
  fev1_percent?: number; // FEV1 as percentage

  // Neurologic/Functional metrics
  gait_speed?: number; // m/s
  grip_strength?: number; // kg

  // Metabolic/Inflammatory metrics
  ldl_c?: number; // LDL-C in mg/dL
  alt?: number; // ALT in U/L

  // Patient-Reported metrics
  quality_of_life?: number; // 0-100 scale
  fatigue_score?: number; // 0-10 scale
}

export interface StoredDNAAnalysis {
  id: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  
  // File information
  filename: string;
  file_size?: number;
  
  // Analysis parameters
  databases_analyzed: string[];
  
  // Analysis results
  total_variants_analyzed: number;
  databases_searched: string[];
  
  // Risk assessment
  risk_assessment: 'Low' | 'Medium' | 'High';
  
  // Counts
  total_diseases_found: number;
  total_allergies_found: number;
  total_drug_interactions_found: number;
  
  // Detailed results
  diseases_variants: DNAVariant[];
  allergies_variants: DNAVariant[];
  drug_interactions_variants: DNAVariant[];
  
  // Analysis metadata
  analysis_duration_seconds?: number;
  api_response?: any;
  
  // Timestamps
  analysis_completed_at: string;
}

export interface DNAVariant {
  chromosome: string;
  position: number;
  reference_allele: string;
  alternate_allele: string;
  info: string;
  database_type: 'diseases' | 'allergies' | 'drug_interactions';
}
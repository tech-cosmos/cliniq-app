-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE doctors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  department VARCHAR(100)
);

CREATE TABLE patients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  medical_record_number VARCHAR(50) UNIQUE NOT NULL,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  allergies TEXT[],
  current_medications TEXT[],
  medical_history TEXT[],
  ai_summary TEXT
);

CREATE TABLE soap_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  voice_transcript TEXT,
  ai_generated_content BOOLEAN DEFAULT FALSE,
  ai_diagnostic_suggestions TEXT[],
  follow_up_date DATE,
  status VARCHAR(20) CHECK (status IN ('draft', 'completed', 'reviewed')) DEFAULT 'draft'
);

CREATE TABLE medical_scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  soap_note_id UUID REFERENCES soap_notes(id) ON DELETE SET NULL,
  scan_type VARCHAR(20) CHECK (scan_type IN ('xray', 'mri', 'ct', 'ultrasound', 'other')) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  ai_analysis TEXT,
  ai_findings TEXT[],
  radiologist_notes TEXT,
  urgency_level VARCHAR(10) CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low'
);

CREATE TABLE voice_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  soap_note_id UUID REFERENCES soap_notes(id) ON DELETE CASCADE,
  transcript TEXT,
  audio_duration INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('recording', 'processing', 'completed', 'error')) DEFAULT 'recording'
);

-- Create indexes for better performance
CREATE INDEX idx_patients_medical_record ON patients(medical_record_number);
CREATE INDEX idx_soap_notes_patient ON soap_notes(patient_id);
CREATE INDEX idx_soap_notes_doctor ON soap_notes(doctor_id);
CREATE INDEX idx_soap_notes_created_at ON soap_notes(created_at);
CREATE INDEX idx_medical_scans_patient ON medical_scans(patient_id);
CREATE INDEX idx_medical_scans_soap_note ON medical_scans(soap_note_id);
CREATE INDEX idx_voice_sessions_soap_note ON voice_sessions(soap_note_id);

-- Enable Row Level Security
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (basic setup - adjust based on your authentication needs)
CREATE POLICY "Doctors can view all patients" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can insert patients" ON patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Doctors can update patients" ON patients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Doctors can view all soap notes" ON soap_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can insert soap notes" ON soap_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Doctors can update soap notes" ON soap_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Doctors can view all medical scans" ON medical_scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can insert medical scans" ON medical_scans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Doctors can update medical scans" ON medical_scans FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Doctors can view all voice sessions" ON voice_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors can insert voice sessions" ON voice_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Doctors can update voice sessions" ON voice_sessions FOR UPDATE TO authenticated USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soap_notes_updated_at BEFORE UPDATE ON soap_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
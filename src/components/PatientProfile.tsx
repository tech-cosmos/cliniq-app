import React, { useState, useEffect } from 'react';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import PatientService from '../services/patient';
import { User, Calendar, Phone, Mail, MapPin, AlertTriangle, Pill, FileText, Image, Brain } from 'lucide-react';
import { format } from 'date-fns';

interface PatientProfileProps {
  patientId: string;
  onClose: () => void;
  onNewSOAPNote?: (patient: Patient) => void;
  onUploadScan?: (patient: Patient) => void;
  onDiagnosticAssistant?: (patient: Patient) => void;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({ 
  patientId, 
  onClose, 
  onNewSOAPNote, 
  onUploadScan, 
  onDiagnosticAssistant 
}) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [medicalScans, setMedicalScans] = useState<MedicalScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'scans'>('overview');

  useEffect(() => {
    loadPatientData();
  }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getPatientHistory(patientId);
      setPatient(data.patient);
      setSoapNotes(data.soapNotes);
      setMedicalScans(data.medicalScans);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!patient) return;
    try {
      const summary = await PatientService.generatePatientSummary(patient.id);
      setPatient({ ...patient, ai_summary: summary });
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <p>Patient not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-500 p-3 rounded-full">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {patient.first_name} {patient.last_name}
                  </h2>
                  <p className="text-blue-100">MRN: {patient.medical_record_number}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* Action Buttons */}
                {onNewSOAPNote && (
                  <button
                    onClick={() => onNewSOAPNote(patient)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors"
                    title="New SOAP Note"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">New SOAP</span>
                  </button>
                )}
                {onUploadScan && (
                  <button
                    onClick={() => onUploadScan(patient)}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                    title="Upload Scan"
                  >
                    <Image className="h-4 w-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                )}
                {onDiagnosticAssistant && (
                  <button
                    onClick={() => onDiagnosticAssistant(patient)}
                    className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
                    title="AI Assistant"
                  >
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">AI</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 text-xl font-bold ml-4"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'notes', label: `SOAP Notes (${soapNotes.length})`, icon: FileText },
                { id: 'scans', label: `Medical Scans (${medicalScans.length})`, icon: Image },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-4">Basic Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Age: {age} ({format(new Date(patient.date_of_birth), 'MMM dd, yyyy')})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="capitalize">{patient.gender}</span>
                      </div>
                      {patient.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{patient.email}</span>
                        </div>
                      )}
                      {patient.address && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{patient.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-4">Emergency Contact</h3>
                    {patient.emergency_contact_name || patient.emergency_contact_phone ? (
                      <div className="space-y-2">
                        {patient.emergency_contact_name && (
                          <p><strong>Name:</strong> {patient.emergency_contact_name}</p>
                        )}
                        {patient.emergency_contact_phone && (
                          <p><strong>Phone:</strong> {patient.emergency_contact_phone}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">No emergency contact information</p>
                    )}
                  </div>
                </div>

                {/* Medical Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h3 className="font-semibold text-red-800">Allergies</h3>
                      </div>
                      <ul className="space-y-1">
                        {patient.allergies.map((allergy, index) => (
                          <li key={index} className="text-red-700">{allergy}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {patient.current_medications && patient.current_medications.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Pill className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-800">Current Medications</h3>
                      </div>
                      <ul className="space-y-1">
                        {patient.current_medications.map((medication, index) => (
                          <li key={index} className="text-blue-700">{medication}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {patient.medical_history && patient.medical_history.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="h-5 w-5 text-yellow-600" />
                        <h3 className="font-semibold text-yellow-800">Medical History</h3>
                      </div>
                      <ul className="space-y-1">
                        {patient.medical_history.map((condition, index) => (
                          <li key={index} className="text-yellow-700">{condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">AI Summary</h3>
                    </div>
                    <button
                      onClick={generateSummary}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Generate Summary
                    </button>
                  </div>
                  {patient.ai_summary ? (
                    <p className="text-purple-700 whitespace-pre-wrap">{patient.ai_summary}</p>
                  ) : (
                    <p className="text-purple-600 italic">No AI summary available. Click "Generate Summary" to create one.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                {soapNotes.length > 0 ? (
                  soapNotes.map((note) => (
                    <div key={note.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">
                          {format(new Date(note.created_at), 'MMM dd, yyyy - HH:mm')}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          note.status === 'completed' ? 'bg-green-100 text-green-800' :
                          note.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {note.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-sm text-gray-600 mb-1">Subjective</h5>
                          <p className="text-sm">{note.subjective || 'Not recorded'}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-gray-600 mb-1">Objective</h5>
                          <p className="text-sm">{note.objective || 'Not recorded'}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-gray-600 mb-1">Assessment</h5>
                          <p className="text-sm">{note.assessment || 'Not recorded'}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-gray-600 mb-1">Plan</h5>
                          <p className="text-sm">{note.plan || 'Not recorded'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No SOAP notes found for this patient.</p>
                )}
              </div>
            )}

            {activeTab === 'scans' && (
              <div className="space-y-4">
                {medicalScans.length > 0 ? (
                  medicalScans.map((scan) => (
                    <div key={scan.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold capitalize">{scan.scan_type} Scan</h4>
                          <p className="text-sm text-gray-500">{scan.file_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            scan.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                            scan.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                            scan.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {scan.urgency_level} priority
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(scan.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      {scan.ai_analysis && (
                        <div className="bg-gray-50 p-3 rounded mt-3">
                          <h5 className="font-medium text-sm text-gray-600 mb-2">AI Analysis</h5>
                          <p className="text-sm">{scan.ai_analysis}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No medical scans found for this patient.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
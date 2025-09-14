import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import { ComprehensiveSOAPNoteEditor } from './ComprehensiveSOAPNoteEditor';
import { ScanUploader } from './ScanUploader';
import { DiagnosticAssistant } from './DiagnosticAssistant';
import { BiometricsSection } from './BiometricsSection';
import { BasicPatientEditor } from './BasicPatientEditor';
import { DNAAnalysis } from './DNAAnalysis';
import PatientService from '../services/patient';
import {
  User, Calendar, Phone, Mail, MapPin, AlertTriangle, Pill, FileText,
  Image, Brain, RefreshCw, ArrowLeft, Menu, X, Plus, TrendingUp, Edit3, Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientViewProps {
  doctorId: string;
}

type DrawerSection = 'overview' | 'notes' | 'scans' | 'dna' | 'biometrics';

export const PatientView: React.FC<PatientViewProps> = ({ doctorId }) => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [medicalScans, setMedicalScans] = useState<MedicalScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [activeSection, setActiveSection] = useState<DrawerSection>('overview');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Modals
  const [showSOAPEditor, setShowSOAPEditor] = useState(false);
  const [showScanUploader, setShowScanUploader] = useState(false);
  const [showDiagnosticAssistant, setShowDiagnosticAssistant] = useState(false);
  const [showBasicPatientEditor, setShowBasicPatientEditor] = useState(false);
  const [currentSOAP, setCurrentSOAP] = useState<SOAPNote | null>(null);
  const [scanJustUploaded, setScanJustUploaded] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  useEffect(() => {
    if (scanJustUploaded) {
      setActiveSection('scans');
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    }
  }, [scanJustUploaded]);

  const loadPatientData = async (isRefresh = false) => {
    if (!patientId) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await PatientService.getPatientHistory(patientId);
      setPatient(data.patient);
      setSoapNotes(data.soapNotes);
      setMedicalScans(data.medicalScans);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadPatientData(true);
  };

  const startPollingForAnalysis = () => {
    if (pollingInterval) return;
    
    const interval = setInterval(() => {
      loadPatientData(true);
    }, 5000);
    
    setPollingInterval(interval);
  };

  const stopPollingForAnalysis = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const hasScansBeingAnalyzed = medicalScans.some(scan => !scan.ai_analysis);

  useEffect(() => {
    if (hasScansBeingAnalyzed && activeSection === 'scans') {
      startPollingForAnalysis();
    } else {
      stopPollingForAnalysis();
    }

    return () => {
      stopPollingForAnalysis();
    };
  }, [hasScansBeingAnalyzed, activeSection]);

  const generateSummary = async () => {
    if (!patient) return;
    try {
      setGeneratingSummary(true);
      const summary = await PatientService.generatePatientSummary(patient.id);
      setPatient({ ...patient, ai_summary: summary });
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleNewSOAPNote = () => {
    if (patient) {
      setCurrentSOAP(null);
      setShowSOAPEditor(true);
    }
  };

  const handleUploadScan = () => {
    if (patient) {
      setShowScanUploader(true);
    }
  };

  const handleDiagnosticAssistant = () => {
    if (patient) {
      setShowDiagnosticAssistant(true);
    }
  };

  const handleSOAPSave = (soapNote: SOAPNote) => {
    setShowSOAPEditor(false);
    setCurrentSOAP(null);
    loadPatientData(true);
  };

  const handleScanUploaded = (scan: MedicalScan) => {
    setShowScanUploader(false);
    setScanJustUploaded(true);
    loadPatientData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-600 mb-4">Patient not found</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  const drawerSections = [
    { id: 'overview', label: 'Overview', icon: User, count: null },
    { id: 'notes', label: 'SOAP Notes', icon: FileText, count: soapNotes.length },
    { id: 'scans', label: 'Medical Scans', icon: Image, count: medicalScans.length },
    { id: 'dna', label: 'DNA Analysis', icon: Activity, count: null },
    { id: 'biometrics', label: 'Biometrics', icon: TrendingUp, count: null },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-blue-50 to-purple-50 shadow-lg border-b border-gray-200/50 sticky top-0 z-40 backdrop-blur-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Dashboard</span>
              </button>
              <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="sm:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-2xl shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {patient.first_name} {patient.last_name}
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">MRN: {patient.medical_record_number}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Prominent AI Assistant Button */}
              <button
                onClick={handleDiagnosticAssistant}
                className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 via-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                title="AI Clinical Assistant"
              >
                <div className="relative">
                  <Brain className="h-5 w-5 group-hover:animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <span className="font-semibold">AI Assistant</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              {/* Secondary Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBasicPatientEditor(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                  title="Edit Patient Info"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Edit</span>
                </button>
                <button
                  onClick={handleNewSOAPNote}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
                  title="New SOAP Note"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">SOAP</span>
                </button>
                <button
                  onClick={handleUploadScan}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200"
                  title="Upload Medical Scan"
                >
                  <Image className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Upload</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-5rem)]">
        {/* Drawer */}
        <div className={`${drawerOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white/80 backdrop-blur-sm border-r border-gray-200/50 shadow-xl`}>
          <div className="p-6">
            <div className="space-y-3">
              {drawerSections.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id as DrawerSection)}
                  className={`group w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-200 ${
                    activeSection === id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-[1.02]'
                      : 'text-gray-700 hover:bg-gray-100/80 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <Icon className={`h-5 w-5 transition-transform ${activeSection === id ? 'scale-110' : 'group-hover:scale-105'}`} />
                    <span className="font-semibold">{label}</span>
                  </div>
                  {count !== null && (
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                      activeSection === id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
          <div className="p-8">
            {activeSection === 'overview' && (
              <div className="space-y-8">
                {/* Patient Summary Card */}
                <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                          <User className="h-10 w-10 text-white" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                          {patient.first_name} {patient.last_name}
                        </h2>
                        <p className="text-gray-600 font-medium">Patient ID: {patient.medical_record_number}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                            Active Patient
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{age}</p>
                          <p className="text-sm text-gray-600 font-medium">Years Old</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-xl">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 capitalize">{patient.gender}</p>
                          <p className="text-sm text-gray-600 font-medium">Gender</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-100 p-2 rounded-xl">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{soapNotes.length}</p>
                          <p className="text-sm text-gray-600 font-medium">SOAP Notes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="bg-orange-100 p-2 rounded-xl">
                          <Image className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{medicalScans.length}</p>
                          <p className="text-sm text-gray-600 font-medium">Scans</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 shadow-xl">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-2xl">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Contact Information</h3>
                    </div>
                    <div className="space-y-5">
                      <div className="flex items-start space-x-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Date of Birth</p>
                          <p className="text-gray-700">{format(new Date(patient.date_of_birth), 'MMMM dd, yyyy')}</p>
                        </div>
                      </div>
                      {patient.phone && (
                        <div className="flex items-start space-x-4 p-4 bg-green-50/50 rounded-2xl border border-green-100">
                          <Phone className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Phone Number</p>
                            <p className="text-gray-700">{patient.phone}</p>
                          </div>
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-start space-x-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                          <Mail className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Email Address</p>
                            <p className="text-gray-700 break-all">{patient.email}</p>
                          </div>
                        </div>
                      )}
                      {patient.address && (
                        <div className="flex items-start space-x-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                          <MapPin className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Address</p>
                            <p className="text-gray-700">{patient.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-gray-200/50 shadow-xl">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="bg-gradient-to-r from-red-500 to-pink-600 p-3 rounded-2xl">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Emergency Contact</h3>
                    </div>
                    {patient.emergency_contact_name || patient.emergency_contact_phone ? (
                      <div className="space-y-5">
                        {patient.emergency_contact_name && (
                          <div className="flex items-start space-x-4 p-4 bg-red-50/50 rounded-2xl border border-red-100">
                            <User className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">Contact Name</p>
                              <p className="text-gray-700">{patient.emergency_contact_name}</p>
                            </div>
                          </div>
                        )}
                        {patient.emergency_contact_phone && (
                          <div className="flex items-start space-x-4 p-4 bg-red-50/50 rounded-2xl border border-red-100">
                            <Phone className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">Emergency Phone</p>
                              <p className="text-gray-700">{patient.emergency_contact_phone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No emergency contact information available</p>
                        <button
                          onClick={() => setShowBasicPatientEditor(true)}
                          className="mt-4 text-red-600 hover:text-red-700 font-medium"
                        >
                          Add Emergency Contact
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medical Information */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl p-8 border border-red-200/50 shadow-xl">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                          <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-red-900">Allergies</h3>
                      </div>
                      <div className="space-y-3">
                        {patient.allergies.map((allergy, index) => (
                          <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-red-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-red-800 font-medium">{allergy}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {patient.current_medications && patient.current_medications.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border border-blue-200/50 shadow-xl">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-2xl shadow-lg">
                          <Pill className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-blue-900">Current Medications</h3>
                      </div>
                      <div className="space-y-3">
                        {patient.current_medications.map((medication, index) => (
                          <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-blue-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-blue-800 font-medium">{medication}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {patient.medical_history && patient.medical_history.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-200/50 shadow-xl">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-2xl shadow-lg">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-amber-900">Medical History</h3>
                      </div>
                      <div className="space-y-3">
                        {patient.medical_history.map((condition, index) => (
                          <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-amber-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                              <span className="text-amber-800 font-medium">{condition}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Summary */}
                <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-3xl p-8 border border-purple-200/50 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-3xl shadow-lg">
                          <Brain className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 w-6 h-6 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold text-gray-900">AI Clinical Summary</h3>
                        <p className="text-gray-600 font-medium">Comprehensive patient analysis powered by AI</p>
                      </div>
                    </div>
                    <button
                      onClick={generateSummary}
                      disabled={generatingSummary}
                      className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {generatingSummary ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span className="font-semibold">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-5 w-5 group-hover:animate-pulse" />
                          <span className="font-semibold">Generate Summary</span>
                        </>
                      )}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                  </div>
                  
                  {generatingSummary ? (
                    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 border border-purple-100">
                      <div className="flex flex-col items-center space-y-6 text-center">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 animate-pulse"></div>
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-purple-800 mb-2">Generating AI Summary</h4>
                          <p className="text-purple-700 text-lg">Analyzing patient data, SOAP notes, and medical scans...</p>
                          <div className="flex items-center justify-center space-x-2 mt-4">
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : patient.ai_summary ? (
                    <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-purple-100">
                      <div className="text-purple-700 prose prose-lg max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-purple-900 mb-4 border-b border-purple-200 pb-2" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-purple-800 mb-3 mt-6" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-purple-800 mb-2 mt-4" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-purple-900 bg-purple-100/50 px-1 rounded" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-gray-800" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-none mb-4 space-y-2" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                            li: ({ node, ...props }) => (
                              <li className="flex items-start space-x-3" {...props}>
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-gray-800">{(props as any).children}</span>
                              </li>
                            ),
                          }}
                        >
                          {patient.ai_summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 border border-purple-100 text-center">
                      <Brain className="h-16 w-16 text-purple-300 mx-auto mb-6" />
                      <h4 className="text-2xl font-bold text-purple-800 mb-4">AI Summary Not Available</h4>
                      <p className="text-purple-600 text-lg mb-6">Generate a comprehensive AI-powered clinical summary to get insights about this patient's medical profile, treatment patterns, and health trends.</p>
                      <button
                        onClick={generateSummary}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                      >
                        <Brain className="h-5 w-5" />
                        <span>Generate AI Summary</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'notes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">SOAP Notes</h2>
                  <button
                    onClick={handleNewSOAPNote}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New SOAP Note</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {soapNotes.length > 0 ? (
                    soapNotes.map((note) => (
                      <div key={note.id} className="bg-white border rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-lg">
                            {format(new Date(note.created_at), 'MMM dd, yyyy - HH:mm')}
                          </h4>
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            note.status === 'completed' ? 'bg-green-100 text-green-800' :
                            note.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {note.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-medium text-gray-600 mb-2">Subjective</h5>
                            <p className="text-gray-800">{note.subjective || 'Not recorded'}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-600 mb-2">Objective</h5>
                            <p className="text-gray-800">{note.objective || 'Not recorded'}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-600 mb-2">Assessment</h5>
                            <p className="text-gray-800">{note.assessment || 'Not recorded'}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-600 mb-2">Plan</h5>
                            <p className="text-gray-800">{note.plan || 'Not recorded'}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border rounded-lg p-12 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-4">No SOAP notes found for this patient.</p>
                      <button
                        onClick={handleNewSOAPNote}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create First SOAP Note</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'scans' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Medical Scans</h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg disabled:opacity-50 ${
                        pollingInterval 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing || pollingInterval ? 'animate-spin' : ''}`} />
                      <span>
                        {refreshing ? 'Refreshing...' : pollingInterval ? 'Auto-refresh ON' : 'Refresh'}
                      </span>
                    </button>
                    <button
                      onClick={handleUploadScan}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Upload Scan</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {medicalScans.length > 0 ? (
                    medicalScans.map((scan) => (
                      <div key={scan.id} className="bg-white border rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-lg capitalize">{scan.scan_type} Scan</h4>
                            <p className="text-gray-500">{scan.file_name}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 text-sm rounded-full ${
                              scan.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                              scan.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              scan.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {scan.urgency_level} priority
                            </span>
                            <p className="text-sm text-gray-500 mt-1">
                              {format(new Date(scan.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        {scan.ai_analysis ? (
                          <div className="bg-gray-50 p-4 rounded-lg mt-4">
                            <h5 className="font-medium text-gray-700 mb-3">AI Analysis</h5>
                            <p className="text-gray-800 mb-3">{scan.ai_analysis}</p>
                            {scan.ai_findings && scan.ai_findings.length > 0 && (
                              <div>
                                <h6 className="font-medium text-gray-600 mb-2">Key Findings:</h6>
                                <ul className="text-gray-700 list-disc list-inside space-y-1">
                                  {scan.ai_findings.map((finding, index) => (
                                    <li key={index}>{finding}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-purple-50 p-4 rounded-lg mt-4 border border-purple-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                                <h5 className="font-medium text-purple-700">AI Analysis in Progress</h5>
                              </div>
                              {pollingInterval && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-sm text-green-600">Auto-refreshing</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-purple-600 mt-2">
                              This scan is being analyzed by our AI system. Results will appear automatically when ready.
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border rounded-lg p-12 text-center">
                      <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-4">No medical scans found for this patient.</p>
                      <button
                        onClick={handleUploadScan}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Upload First Scan</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'dna' && (
              <DNAAnalysis patientId={patient.id} />
            )}

            {activeSection === 'biometrics' && (
              <BiometricsSection patientId={patient.id} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSOAPEditor && patient && (
        <ComprehensiveSOAPNoteEditor
          patient={patient}
          soapNote={currentSOAP}
          doctorId={doctorId}
          onSave={handleSOAPSave}
          onClose={() => {
            setShowSOAPEditor(false);
            setCurrentSOAP(null);
          }}
          onPatientUpdated={(updatedPatient) => {
            setPatient(updatedPatient);
            // Refresh patient data to show updated info
            loadPatientData(true);
          }}
        />
      )}

      {showScanUploader && patient && (
        <ScanUploader
          patientId={patient.id}
          onScanUploaded={handleScanUploaded}
          onClose={() => {
            setShowScanUploader(false);
          }}
        />
      )}

      {showDiagnosticAssistant && patient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">
                AI Assistant - {patient.first_name} {patient.last_name}
              </h2>
              <button
                onClick={() => setShowDiagnosticAssistant(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <DiagnosticAssistant
                patient={patient}
                currentSOAP={currentSOAP || undefined}
                onSuggestionSelect={(suggestion) => {
                  console.log('Selected suggestion:', suggestion);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Basic Patient Editor Modal */}
      {showBasicPatientEditor && patient && (
        <BasicPatientEditor
          patient={patient}
          onClose={() => setShowBasicPatientEditor(false)}
          onPatientUpdated={(updatedPatient) => {
            setPatient(updatedPatient);
            setShowBasicPatientEditor(false);
            // Refresh patient data to show updated info
            loadPatientData(true);
          }}
        />
      )}
    </div>
  );
};
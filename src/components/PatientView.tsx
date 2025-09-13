import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import { ComprehensiveSOAPNoteEditor } from './ComprehensiveSOAPNoteEditor';
import { ScanUploader } from './ScanUploader';
import { DiagnosticAssistant } from './DiagnosticAssistant';
import { BiometricsSection } from './BiometricsSection';
import PatientService from '../services/patient';
import {
  User, Calendar, Phone, Mail, MapPin, AlertTriangle, Pill, FileText,
  Image, Brain, RefreshCw, ArrowLeft, Menu, X, Plus, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientViewProps {
  doctorId: string;
}

type DrawerSection = 'overview' | 'notes' | 'scans' | 'biometrics';

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
    { id: 'biometrics', label: 'Biometrics', icon: TrendingUp, count: null },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className="sm:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-full">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </h1>
                  <p className="text-sm text-gray-500">MRN: {patient.medical_record_number}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleNewSOAPNote}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="New SOAP Note"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">New SOAP</span>
              </button>
              <button
                onClick={handleUploadScan}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                title="Upload Scan"
              >
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button
                onClick={handleDiagnosticAssistant}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                title="AI Assistant"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Drawer */}
        <div className={`${drawerOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white border-r shadow-sm`}>
          <div className="p-4">
            <div className="space-y-2">
              {drawerSections.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id as DrawerSection)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    activeSection === id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{label}</span>
                  </div>
                  {count !== null && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeSection === id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
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

                  <div className="bg-white p-6 rounded-lg shadow-sm">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
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
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
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
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
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
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">AI Summary</h3>
                    </div>
                    <button
                      onClick={generateSummary}
                      disabled={generatingSummary}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {generatingSummary ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          <span>Generate Summary</span>
                        </>
                      )}
                    </button>
                  </div>
                  {generatingSummary ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <div className="text-center">
                          <p className="text-purple-700 font-medium">Generating AI Summary...</p>
                          <p className="text-purple-600 text-sm mt-1">Analyzing patient data, SOAP notes, and medical scans</p>
                        </div>
                      </div>
                    </div>
                  ) : patient.ai_summary ? (
                    <div className="text-purple-700 prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-purple-800 mb-2" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-md font-semibold text-purple-800 mb-2 mt-4" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-purple-800 mb-1 mt-3" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-purple-900" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="text-purple-700" {...props} />,
                        }}
                      >
                        {patient.ai_summary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-purple-600 italic">No AI summary available. Click "Generate Summary" to create one.</p>
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
    </div>
  );
};
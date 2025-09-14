import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, SOAPNote, SOAPNoteWithPatient, MedicalScan } from '../types/database';
import { PatientCard } from './PatientCard';
import { ComprehensiveSOAPNoteEditor } from './ComprehensiveSOAPNoteEditor';
import { ScanUploader } from './ScanUploader';
import { DiagnosticAssistant } from './DiagnosticAssistant';
import { NewPatientModal } from './NewPatientModal';
import { BasicPatientEditor } from './BasicPatientEditor';
import PatientService from '../services/patient';
import SOAPService from '../services/soap';
import MedicalScanService from '../services/medicalScan';
import { 
  Search, 
  Plus, 
  FileText, 
  Image, 
  Brain, 
  Users,
  AlertTriangle,
  Filter,
  X,
  Calendar,
  Clock,
  Eye,
  User
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardProps {
  doctorId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ doctorId }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showSOAPEditor, setShowSOAPEditor] = useState(false);
  const [showScanUploader, setShowScanUploader] = useState(false);
  const [showDiagnosticAssistant, setShowDiagnosticAssistant] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showBasicPatientEditor, setShowBasicPatientEditor] = useState(false);
  const [currentSOAP, setCurrentSOAP] = useState<SOAPNote | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'critical'>('all');
  const [todaysNotes, setTodaysNotes] = useState<SOAPNoteWithPatient[]>([]);
  const [pendingScans, setPendingScans] = useState<MedicalScan[]>([]);
  const [showTodaysNotes, setShowTodaysNotes] = useState(false);
  const [showPendingScans, setShowPendingScans] = useState(false);
  const [showPatientSelection, setShowPatientSelection] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showCriticalCases, setShowCriticalCases] = useState(false);
  const [criticalCases, setCriticalCases] = useState<Patient[]>([]);

  // Dashboard stats
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayNotes: 0,
    pendingScans: 0,
    criticalCases: 0
  });

  useEffect(() => {
    loadPatients();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPatients = async () => {
    try {
      setLoading(true);
      const patientsData = await PatientService.getAllPatients();
      setPatients(patientsData);
      calculateStats(patientsData);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (patientsData: Patient[]) => {
    try {
      // Fetch today's notes
      const todayNotesData = await SOAPService.getTodaysSOAPNotes();
      setTodaysNotes(todayNotesData);

      // Fetch pending scans (high/critical urgency with no radiologist notes)
      const pendingScansData = await MedicalScanService.getPendingScans();
      setPendingScans(pendingScansData);

      // Fetch critical cases using the comprehensive algorithm
      const criticalCasesData = await PatientService.getCriticalCases();
      setCriticalCases(criticalCasesData);

      setStats({
        totalPatients: patientsData.length,
        todayNotes: todayNotesData.length,
        pendingScans: pendingScansData.length,
        criticalCases: criticalCasesData.length
      });
    } catch (error) {
      console.error('Failed to calculate stats:', error);
      // Fallback stats
      setStats({
        totalPatients: patientsData.length,
        todayNotes: 0,
        pendingScans: 0,
        criticalCases: 0
      });
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.medical_record_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'recent':
        // Filter patients with recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(patient => 
          new Date(patient.updated_at) > thirtyDaysAgo
        );
        break;
      case 'critical':
        // Filter patients with critical allergies or conditions
        filtered = filtered.filter(patient => 
          patient.allergies && patient.allergies.length > 0
        );
        break;
    }

    setFilteredPatients(filtered);
  };

  const handlePatientClick = (patient: Patient) => {
    navigate(`/patient/${patient.id}`);
  };

  const handleNewSOAPNote = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentSOAP(null);
    setShowSOAPEditor(true);
  };

  // const handleEditSOAPNote = (patient: Patient, soapNote: SOAPNote) => {
  //   setSelectedPatient(patient);
  //   setCurrentSOAP(soapNote);
  //   setShowSOAPEditor(true);
  // };

  const handleUploadScan = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowScanUploader(true);
  };

  const handleDiagnosticAssistant = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDiagnosticAssistant(true);
  };

  const handleSOAPSave = (soapNote: SOAPNote) => {
    setShowSOAPEditor(false);
    setCurrentSOAP(null);
    // Refresh patient data if needed
  };

  const handleScanUploaded = (scan: MedicalScan) => {
    setShowScanUploader(false);
    // Trigger refresh of patient list to update scan counts
    loadPatients();
  };

  const handleNewPatientCreated = (patient: Patient) => {
    setShowNewPatientModal(false);
    // Refresh the patient list to include the new patient
    loadPatients();
    // Navigate to the new patient's profile
    navigate(`/patient/${patient.id}`);
  };

  const handlePatientSelectedForNote = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentSOAP(null);
    setShowPatientSelection(false);
    setShowSOAPEditor(true);
  };

  const filteredPatientsForSelection = patients.filter(patient =>
    patient.first_name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    patient.last_name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    patient.medical_record_number.toLowerCase().includes(patientSearchTerm.toLowerCase())
  );

  const StatCard: React.FC<{ 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string; 
    gradient: string; 
    onClick?: () => void;
    clickable?: boolean;
  }> = ({ title, value, icon, color, gradient, onClick, clickable = false }) => (
    <div 
      className={`bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105 ${
        clickable ? 'cursor-pointer' : ''
      }`}
      onClick={clickable && onClick ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-2xl shadow-md ${gradient}`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
      <div className={`mt-4 h-1 rounded-full ${color}`}></div>
      {clickable && value > 0 && (
        <div className="mt-2 text-xs text-gray-500 font-medium">Click to view details</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <img 
                  src="/AI_Logo.png" 
                  alt="Progonomix AI Logo" 
                  className="h-12 w-12 object-contain"
                />
                <div className="text-left">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Progonomix
                  </h1>
                  <span className="text-sm text-gray-500 font-medium">AI-Powered Medical Companion</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-4 py-2">
                <span className="text-sm font-medium text-gray-700">Dr. Smith</span>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                  DS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={<Users className="h-7 w-7" />}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="Today's Notes"
            value={stats.todayNotes}
            icon={<FileText className="h-7 w-7" />}
            color="bg-gradient-to-r from-green-500 to-green-600"
            gradient="bg-gradient-to-br from-green-500 to-green-600"
            clickable={true}
            onClick={() => setShowTodaysNotes(true)}
          />
          <StatCard
            title="Pending Scans"
            value={stats.pendingScans}
            icon={<Image className="h-7 w-7" />}
            color="bg-gradient-to-r from-amber-500 to-orange-500"
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
            clickable={true}
            onClick={() => setShowPendingScans(true)}
          />
          <StatCard
            title="Critical Cases"
            value={stats.criticalCases}
            icon={<AlertTriangle className="h-7 w-7" />}
            color="bg-gradient-to-r from-red-500 to-red-600"
            gradient="bg-gradient-to-br from-red-500 to-red-600"
            clickable={true}
            onClick={() => setShowCriticalCases(true)}
          />
        </div>

        {/* Search and Filter */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search patients by name, MRN, or medical condition..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-2xl px-4 py-3">
                <Filter className="h-5 w-5 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium cursor-pointer"
                >
                  <option value="all">All Patients</option>
                  <option value="recent">Recent Activity</option>
                  <option value="critical">Critical Cases</option>
                </select>
              </div>
              
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="h-5 w-5" />
                <span>New Patient</span>
              </button>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
          <div className="px-6 py-5 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Patients
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  {filteredPatients.length}
                </span>
              </h2>
              {filteredPatients.length > 0 && (
                <div className="text-sm text-gray-500 font-medium">
                  {filterType === 'all' ? 'All patients' : 
                   filterType === 'recent' ? 'Recent activity' : 'Critical cases'}
                </div>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Patients</h3>
              <p className="text-gray-600">Fetching patient records from the database...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center">
              {searchTerm ? (
                <div>
                  <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600 mb-6">
                    No patients found matching "<span className="font-semibold text-gray-900">{searchTerm}</span>"
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Patients Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Get started by adding your first patient to the system.
                  </p>
                  <button
                    onClick={() => setShowNewPatientModal(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add First Patient
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onClick={handlePatientClick}
                    onEditClick={(patient) => {
                      setSelectedPatient(patient);
                      setShowBasicPatientEditor(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSOAPEditor && selectedPatient && (
        <ComprehensiveSOAPNoteEditor
          patient={selectedPatient}
          soapNote={currentSOAP}
          doctorId={doctorId}
          onSave={handleSOAPSave}
          onClose={() => {
            setShowSOAPEditor(false);
            setSelectedPatient(null);
            setCurrentSOAP(null);
          }}
          onPatientUpdated={(updatedPatient) => {
            setSelectedPatient(updatedPatient);
            // Refresh patients list to show updated info
            loadPatients();
          }}
        />
      )}

      {showScanUploader && selectedPatient && (
        <ScanUploader
          patientId={selectedPatient.id}
          onScanUploaded={handleScanUploaded}
          onClose={() => {
            setShowScanUploader(false);
            setSelectedPatient(null);
          }}
        />
      )}

      {showDiagnosticAssistant && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">
                AI Assistant - {selectedPatient.first_name} {selectedPatient.last_name}
              </h2>
              <button
                onClick={() => {
                  setShowDiagnosticAssistant(false);
                  setSelectedPatient(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="h-6 w-6 transform rotate-45" />
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <DiagnosticAssistant
                patient={selectedPatient}
                currentSOAP={currentSOAP || undefined}
                onSuggestionSelect={(suggestion) => {
                  console.log('Selected suggestion:', suggestion);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <NewPatientModal
          onClose={() => setShowNewPatientModal(false)}
          onPatientCreated={handleNewPatientCreated}
        />
      )}

      {showBasicPatientEditor && selectedPatient && (
        <BasicPatientEditor
          patient={selectedPatient}
          onClose={() => {
            setShowBasicPatientEditor(false);
            setSelectedPatient(null);
          }}
          onPatientUpdated={(updatedPatient) => {
            setSelectedPatient(updatedPatient);
            // Refresh patients list to show updated info
            loadPatients();
          }}
        />
      )}

      {/* Today's Notes Modal */}
      {showTodaysNotes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-1">Today's SOAP Notes</h2>
                        <p className="text-green-100">{todaysNotes.length} notes created today</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {todaysNotes.length > 0 && (
                        <button
                          onClick={() => {
                            setShowTodaysNotes(false);
                            setShowPatientSelection(true);
                            setPatientSearchTerm('');
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 font-medium transition-all duration-200"
                        >
                          <Plus className="h-4 w-4" />
                          <span>New Note</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowTodaysNotes(false)}
                        className="group p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                      >
                        <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-green-50/20 to-emerald-50/20">
                {todaysNotes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileText className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Notes Today</h3>
                    <p className="text-gray-600 mb-6">No SOAP notes have been created today yet.</p>
                    <button
                      onClick={() => {
                        setShowTodaysNotes(false);
                        setShowPatientSelection(true);
                        setPatientSearchTerm('');
                      }}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create First Note
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysNotes.map((note) => (
                      <div key={note.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                              {note.patients.first_name[0]}{note.patients.last_name[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">
                                {note.patients.first_name} {note.patients.last_name}
                              </h4>
                              <p className="text-sm text-gray-600 flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(note.created_at), 'h:mm a')}</span>
                                <span>•</span>
                                <span>MRN: {note.patients.medical_record_number}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              note.status === 'completed' ? 'bg-green-100 text-green-800' :
                              note.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                            </span>
                            <button
                              onClick={() => {
                                // Navigate to patient view with this SOAP note
                                navigate(`/patient/${note.patient_id}`);
                              }}
                              className="p-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {note.chief_complaint && (
                          <div className="bg-green-50 rounded-lg p-3 mb-3">
                            <h6 className="text-xs font-bold text-green-800 mb-1">CHIEF COMPLAINT</h6>
                            <p className="text-green-900 text-sm">{note.chief_complaint}</p>
                          </div>
                        )}
                        {note.assessment && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h6 className="text-xs font-bold text-gray-800 mb-1">ASSESSMENT</h6>
                            <p className="text-gray-700 text-sm line-clamp-2">{note.assessment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Scans Modal */}
      {showPendingScans && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                        <Image className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-1">Pending Medical Scans</h2>
                        <p className="text-amber-100">{pendingScans.length} scans require attention</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPendingScans(false)}
                      className="group p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                    >
                      <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/20">
                {pendingScans.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Image className="h-10 w-10 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Scans</h3>
                    <p className="text-gray-600">All scans have been reviewed or are low priority.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingScans.map((scan) => (
                      <div key={scan.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              scan.urgency_level === 'critical' ? 'bg-red-100' :
                              scan.urgency_level === 'high' ? 'bg-orange-100' : 'bg-yellow-100'
                            }`}>
                              <Image className={`h-5 w-5 ${
                                scan.urgency_level === 'critical' ? 'text-red-600' :
                                scan.urgency_level === 'high' ? 'text-orange-600' : 'text-yellow-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{scan.scan_type.toUpperCase()} Scan</h4>
                              <p className="text-sm text-gray-600 flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>{format(new Date(scan.created_at), 'MMM dd, h:mm a')}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              scan.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                              scan.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {scan.urgency_level.charAt(0).toUpperCase() + scan.urgency_level.slice(1)} Priority
                            </span>
                            <button
                              onClick={() => {
                                // Navigate to patient view with this scan
                                navigate(`/patient/${scan.patient_id}`);
                              }}
                              className="p-2 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-gray-800 mb-1">FILE</h6>
                          <p className="text-gray-700 text-sm">{scan.file_name}</p>
                          <p className="text-xs text-gray-500 mt-1">Patient ID: {scan.patient_id}</p>
                        </div>
                        {scan.ai_findings && scan.ai_findings.length > 0 && (
                          <div className="mt-3 bg-blue-50 rounded-lg p-3">
                            <h6 className="text-xs font-bold text-blue-800 mb-2">AI FINDINGS</h6>
                            <div className="space-y-1">
                              {scan.ai_findings.slice(0, 2).map((finding, index) => (
                                <p key={index} className="text-blue-700 text-sm">• {finding}</p>
                              ))}
                              {scan.ai_findings.length > 2 && (
                                <p className="text-blue-600 text-xs">...and {scan.ai_findings.length - 2} more</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Selection Modal for Notes */}
      {showPatientSelection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-4xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-1">Select Patient</h2>
                        <p className="text-blue-100">Choose a patient to create a new SOAP note</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPatientSelection(false);
                        setPatientSearchTerm('');
                      }}
                      className="group p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                    >
                      <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 border-b border-gray-200/50">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search patients by name or medical record number..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium shadow-lg"
                  />
                  {patientSearchTerm && (
                    <button
                      onClick={() => setPatientSearchTerm('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
                {filteredPatientsForSelection.length === 0 ? (
                  <div className="text-center py-12">
                    {patientSearchTerm ? (
                      <div>
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Search className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Patients Found</h3>
                        <p className="text-gray-600 mb-6">
                          No patients found matching "<span className="font-semibold">{patientSearchTerm}</span>"
                        </p>
                        <button
                          onClick={() => setPatientSearchTerm('')}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Users className="h-10 w-10 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Patients</h3>
                        <p className="text-gray-600 mb-6">
                          Add patients to the system first before creating SOAP notes.
                        </p>
                        <button
                          onClick={() => {
                            setShowPatientSelection(false);
                            setShowNewPatientModal(true);
                          }}
                          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add New Patient
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredPatientsForSelection.map((patient) => (
                      <div
                        key={patient.id}
                        onClick={() => handlePatientSelectedForNote(patient)}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-102 group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                            <span className="text-lg font-bold">
                              {patient.first_name[0]}{patient.last_name[0]}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {patient.first_name} {patient.last_name}
                            </h4>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600 flex items-center space-x-2">
                                <span className="font-medium">MRN:</span>
                                <span>{patient.medical_record_number}</span>
                              </p>
                              <p className="text-sm text-gray-600 flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years old</span>
                                <span>•</span>
                                <span className="capitalize">{patient.gender}</span>
                              </p>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Plus className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        {patient.allergies && patient.allergies.length > 0 && (
                          <div className="mt-4 flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-xs text-amber-700 font-medium">
                              {patient.allergies.length} allerg{patient.allergies.length === 1 ? 'y' : 'ies'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Cases Modal */}
      {showCriticalCases && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-rose-400/20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                        <AlertTriangle className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-1">Critical Cases</h2>
                        <p className="text-red-100">{criticalCases.length} patients require immediate attention</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCriticalCases(false)}
                      className="group p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                    >
                      <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-red-50/20 to-rose-50/20">
                {criticalCases.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Critical Cases</h3>
                    <p className="text-gray-600">All patients are currently stable with no critical indicators.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {criticalCases.map((patient) => {
                      const criticalityScore = PatientService.calculateCriticalityScore(patient);
                      const riskLevel = criticalityScore >= 5 ? 'High' : criticalityScore >= 3 ? 'Medium' : 'Low';
                      const riskColor = criticalityScore >= 5 ? 'red' : criticalityScore >= 3 ? 'orange' : 'yellow';
                      
                      return (
                        <div key={patient.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                  <span className="text-lg font-bold">
                                    {patient.first_name[0]}{patient.last_name[0]}
                                  </span>
                                </div>
                                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  riskColor === 'red' ? 'bg-red-500 text-white' :
                                  riskColor === 'orange' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'
                                } shadow-lg`}>
                                  !
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-bold text-gray-900">
                                    {patient.first_name} {patient.last_name}
                                  </h4>
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                    riskColor === 'red' ? 'bg-red-100 text-red-800' :
                                    riskColor === 'orange' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {riskLevel} Risk
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600 flex items-center space-x-2">
                                    <span className="font-medium">MRN:</span>
                                    <span>{patient.medical_record_number}</span>
                                  </p>
                                  <p className="text-sm text-gray-600 flex items-center space-x-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years old</span>
                                    <span>•</span>
                                    <span className="capitalize">{patient.gender}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className={`text-2xl font-bold ${
                                riskColor === 'red' ? 'text-red-600' :
                                riskColor === 'orange' ? 'text-orange-600' : 'text-yellow-600'
                              }`}>
                                {criticalityScore}
                              </div>
                              <button
                                onClick={() => {
                                  navigate(`/patient/${patient.id}`);
                                }}
                                className="p-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Critical Allergies */}
                            {patient.allergies && patient.allergies.length > 0 && (
                              <div className="bg-red-50 rounded-lg p-4">
                                <h6 className="text-xs font-bold text-red-800 mb-2 flex items-center space-x-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>ALLERGIES ({patient.allergies.length})</span>
                                </h6>
                                <div className="space-y-1">
                                  {patient.allergies.slice(0, 3).map((allergy, index) => (
                                    <div key={index} className="text-red-700 text-sm flex items-center space-x-2">
                                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                      <span>{allergy}</span>
                                    </div>
                                  ))}
                                  {patient.allergies.length > 3 && (
                                    <p className="text-red-600 text-xs">...and {patient.allergies.length - 3} more</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Medical History */}
                            {patient.medical_history && patient.medical_history.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h6 className="text-xs font-bold text-gray-800 mb-2 flex items-center space-x-2">
                                  <FileText className="h-4 w-4" />
                                  <span>MEDICAL HISTORY</span>
                                </h6>
                                <div className="space-y-1">
                                  {patient.medical_history.slice(0, 2).map((condition, index) => (
                                    <div key={index} className="text-gray-700 text-sm flex items-center space-x-2">
                                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                      <span>{condition}</span>
                                    </div>
                                  ))}
                                  {patient.medical_history.length > 2 && (
                                    <p className="text-gray-600 text-xs">...and {patient.medical_history.length - 2} more</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Current Medications */}
                            {patient.current_medications && patient.current_medications.length > 0 && (
                              <div className="bg-blue-50 rounded-lg p-4">
                                <h6 className="text-xs font-bold text-blue-800 mb-2 flex items-center space-x-2">
                                  <Brain className="h-4 w-4" />
                                  <span>MEDICATIONS ({patient.current_medications.length})</span>
                                </h6>
                                <div className="space-y-1">
                                  {patient.current_medications.slice(0, 2).map((medication, index) => (
                                    <div key={index} className="text-blue-700 text-sm flex items-center space-x-2">
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                      <span>{medication}</span>
                                    </div>
                                  ))}
                                  {patient.current_medications.length > 2 && (
                                    <p className="text-blue-600 text-xs">...and {patient.current_medications.length - 2} more</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* AI Summary Preview */}
                            {patient.ai_summary && (
                              <div className="bg-purple-50 rounded-lg p-4 lg:col-span-2">
                                <h6 className="text-xs font-bold text-purple-800 mb-2 flex items-center space-x-2">
                                  <Brain className="h-4 w-4" />
                                  <span>AI SUMMARY</span>
                                </h6>
                                <p className="text-purple-700 text-sm line-clamp-3">{patient.ai_summary}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500">
                                Last updated: {format(new Date(patient.updated_at), 'MMM dd, yyyy h:mm a')}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setShowCriticalCases(false);
                                    handleNewSOAPNote(patient);
                                  }}
                                  className="inline-flex items-center px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  New Note
                                </button>
                                <button
                                  onClick={() => {
                                    setShowCriticalCases(false);
                                    handleUploadScan(patient);
                                  }}
                                  className="inline-flex items-center px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                >
                                  <Image className="h-3 w-3 mr-1" />
                                  Upload Scan
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import { PatientCard } from './PatientCard';
import { SOAPNoteEditor } from './SOAPNoteEditor';
import { ScanUploader } from './ScanUploader';
import { DiagnosticAssistant } from './DiagnosticAssistant';
import { NewPatientModal } from './NewPatientModal';
import PatientService from '../services/patient';
import { 
  Search, 
  Plus, 
  FileText, 
  Image, 
  Brain, 
  Users,
  AlertTriangle,
  Filter,
  X
} from 'lucide-react';

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
  const [currentSOAP, setCurrentSOAP] = useState<SOAPNote | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'critical'>('all');

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
    // Calculate critical cases based on patients with allergies (as an indicator of critical attention needed)
    const criticalCases = patientsData.filter(patient => 
      patient.allergies && patient.allergies.length > 0
    ).length;

    setStats({
      totalPatients: patientsData.length,
      todayNotes: 0, // Would fetch from SOAP notes API
      pendingScans: 0, // Would fetch from scans API
      criticalCases: criticalCases
    });
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

  const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; gradient: string }> = ({ title, value, icon, color, gradient }) => (
    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-300 hover:scale-105">
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
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl shadow-md">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Cliniq
                  </h1>
                  <span className="text-sm text-gray-500 font-medium">AI-Powered Medical Assistant</span>
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
          />
          <StatCard
            title="Pending Scans"
            value={stats.pendingScans}
            icon={<Image className="h-7 w-7" />}
            color="bg-gradient-to-r from-amber-500 to-orange-500"
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <StatCard
            title="Critical Cases"
            value={stats.criticalCases}
            icon={<AlertTriangle className="h-7 w-7" />}
            color="bg-gradient-to-r from-red-500 to-red-600"
            gradient="bg-gradient-to-br from-red-500 to-red-600"
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
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSOAPEditor && selectedPatient && (
        <SOAPNoteEditor
          patient={selectedPatient}
          soapNote={currentSOAP}
          doctorId={doctorId}
          onSave={handleSOAPSave}
          onClose={() => {
            setShowSOAPEditor(false);
            setSelectedPatient(null);
            setCurrentSOAP(null);
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
    </div>
  );
};
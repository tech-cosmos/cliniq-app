import React, { useState, useEffect } from 'react';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import { PatientCard } from './PatientCard';
import { PatientProfile } from './PatientProfile';
import { SOAPNoteEditor } from './SOAPNoteEditor';
import { ScanUploader } from './ScanUploader';
import { DiagnosticAssistant } from './DiagnosticAssistant';
import PatientService from '../services/patient';
import { 
  Search, 
  Plus, 
  FileText, 
  Image, 
  Brain, 
  Users,
  AlertTriangle,
  Filter
} from 'lucide-react';

interface DashboardProps {
  doctorId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ doctorId }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const [showSOAPEditor, setShowSOAPEditor] = useState(false);
  const [showScanUploader, setShowScanUploader] = useState(false);
  const [showDiagnosticAssistant, setShowDiagnosticAssistant] = useState(false);
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
    // This would typically involve additional API calls to get comprehensive stats
    setStats({
      totalPatients: patientsData.length,
      todayNotes: 0, // Would fetch from SOAP notes API
      pendingScans: 0, // Would fetch from scans API
      criticalCases: 0 // Would fetch based on urgency levels
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
    setSelectedPatient(patient);
    setShowPatientProfile(true);
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
    // Refresh patient data if needed
  };

  const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Cliniq</h1>
              <span className="text-sm text-gray-500">AI-Powered Medical Assistant</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Dr. Smith</span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                DS
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={<Users className="h-8 w-8" />}
            color="border-blue-500"
          />
          <StatCard
            title="Today's Notes"
            value={stats.todayNotes}
            icon={<FileText className="h-8 w-8" />}
            color="border-green-500"
          />
          <StatCard
            title="Pending Scans"
            value={stats.pendingScans}
            icon={<Image className="h-8 w-8" />}
            color="border-yellow-500"
          />
          <StatCard
            title="Critical Cases"
            value={stats.criticalCases}
            icon={<AlertTriangle className="h-8 w-8" />}
            color="border-red-500"
          />
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search patients by name or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Patients</option>
                  <option value="recent">Recent Activity</option>
                  <option value="critical">Critical Cases</option>
                </select>
              </div>
              
              <button
                onClick={() => {/* Handle new patient */}}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>New Patient</span>
              </button>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Patients ({filteredPatients.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'No patients found matching your search.' : 'No patients found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="relative">
                  <PatientCard
                    patient={patient}
                    onClick={handlePatientClick}
                  />
                  
                  {/* Quick Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewSOAPNote(patient);
                        }}
                        className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                        title="New SOAP Note"
                      >
                        <FileText className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUploadScan(patient);
                        }}
                        className="p-1 bg-green-600 text-white rounded-full hover:bg-green-700"
                        title="Upload Scan"
                      >
                        <Image className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiagnosticAssistant(patient);
                        }}
                        className="p-1 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                        title="AI Assistant"
                      >
                        <Brain className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showPatientProfile && selectedPatient && (
        <PatientProfile
          patientId={selectedPatient.id}
          onClose={() => {
            setShowPatientProfile(false);
            setSelectedPatient(null);
          }}
          onNewSOAPNote={handleNewSOAPNote}
          onUploadScan={handleUploadScan}
          onDiagnosticAssistant={handleDiagnosticAssistant}
        />
      )}

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
    </div>
  );
};
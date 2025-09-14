import React, { useState, useEffect, useRef } from 'react';
import { SOAPNote, Patient } from '../types/database';
import { VoiceRecorder } from './VoiceRecorder';
import { PatientEditModal } from './PatientEditModal';
import SOAPService from '../services/soap';
import GeminiService from '../services/gemini';
import { Save, Brain, Mic, FileText, User, Calendar, Plus, X, Edit, Square } from 'lucide-react';
import { format } from 'date-fns';

interface ComprehensiveSOAPNoteEditorProps {
  patient: Patient;
  soapNote?: SOAPNote | null;
  onSave: (soapNote: SOAPNote) => void;
  onClose: () => void;
  doctorId: string;
  onPatientUpdated?: (updatedPatient: Patient) => void;
}

export const ComprehensiveSOAPNoteEditor: React.FC<ComprehensiveSOAPNoteEditorProps> = ({
  patient,
  soapNote,
  onSave,
  onClose,
  doctorId,
  onPatientUpdated
}) => {
  const [currentPatient, setCurrentPatient] = useState<Patient>(patient);
  const [formData, setFormData] = useState<Partial<SOAPNote>>({
    // Visit Information
    type_of_visit: '',
    date_of_service: format(new Date(), 'yyyy-MM-dd'),
    chief_complaint: '',
    
    // Clinical Notes
    nurses_note: '',
    hpi: '',
    
    // Medical Information (prefill from patient data)
    medical_history: currentPatient.medical_history || [],
    family_history: [],
    past_surgical_history: '',
    social_history: '',
    current_medications: currentPatient.current_medications || [],
    
    // Physical Examination
    vitals: {
      bp: '',
      pulse: '',
      temperature: '',
      weight: '',
      height: '',
      bmi: '',
      respiration: '',
      oxygen_saturation: ''
    },
    allergies: currentPatient.allergies || [],
    ros: '',
    physical_examination: '',
    
    // Diagnosis
    diagnosis_for_visit: [],
    active_diagnosis_list: [],
    
    // Traditional SOAP
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    
    // Services and Follow-up
    services: [],
    immunizations: [],
    next_visit: '',
    
    // Meta
    voice_transcript: '',
    follow_up_date: '',
    status: 'draft',
    updated_by: 'Dr. Smith' // This would come from authenticated user
  });

  const [loading, setLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [currentSoapNoteId, setCurrentSoapNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('voice-ai');
  const [showPatientEditModal, setShowPatientEditModal] = useState(false);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  // Form field management for arrays
  const [newMedication, setNewMedication] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newService, setNewService] = useState('');

  useEffect(() => {
    if (soapNote) {
      setFormData({
        ...soapNote,
        vitals: soapNote.vitals || {
          bp: '', pulse: '', temperature: '', weight: '',
          height: '', bmi: '', respiration: '', oxygen_saturation: ''
        }
      });
      setCurrentSoapNoteId(soapNote.id);
      setAiSuggestions(soapNote.ai_diagnostic_suggestions || []);
    }
  }, [soapNote]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVitalsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      vitals: { ...prev.vitals, [field]: value }
    }));
  };

  const addArrayItem = (arrayField: string, newItem: string, setterFunction: (value: string) => void) => {
    if (newItem.trim()) {
      const currentArray = (formData[arrayField as keyof typeof formData] as string[]) || [];
      handleInputChange(arrayField, [...currentArray, newItem.trim()]);
      setterFunction('');
    }
  };

  const removeArrayItem = (arrayField: string, index: number) => {
    const currentArray = (formData[arrayField as keyof typeof formData] as string[]) || [];
    handleInputChange(arrayField, currentArray.filter((_, i) => i !== index));
  };

  const createNewSOAPNote = async (): Promise<string> => {
    const newNote = await SOAPService.createSOAPNote({
      patient_id: patient.id,
      doctor_id: doctorId,
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      status: 'draft'
    });
    setCurrentSoapNoteId(newNote.id);
    return newNote.id;
  };

  const handleVoiceTranscriptUpdate = (transcript: string) => {
    setFormData(prev => ({ ...prev, voice_transcript: transcript }));
  };

  const startRecording = async () => {
    try {
      let noteId = currentSoapNoteId;
      if (!noteId) {
        noteId = await createNewSOAPNote();
      }
      
      setIsRecording(true);
      setShowVoiceRecorder(true);
      
      const stopFunction = await SOAPService.processVoiceToSOAP(
        noteId,
        (newTranscript: string) => {
          handleVoiceTranscriptUpdate(newTranscript);
        },
        (error: any) => {
          console.error('Voice recording error:', error);
          setIsRecording(false);
          setShowVoiceRecorder(false);
        }
      );

      stopRecordingRef.current = stopFunction;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setShowVoiceRecorder(false);
    }
  };

  const stopRecording = async () => {
    console.log('stopRecording called, stopRecordingRef.current:', !!stopRecordingRef.current);
    if (stopRecordingRef.current) {
      try {
        console.log('Calling stop function...');
        await stopRecordingRef.current();
        console.log('Stop function completed');
        setIsRecording(false);
        setShowVoiceRecorder(false);
        stopRecordingRef.current = null;
        handleRecordingComplete();
      } catch (error) {
        console.error('Failed to stop recording:', error);
        setIsRecording(false);
        setShowVoiceRecorder(false);
        stopRecordingRef.current = null;
      }
    } else {
      console.log('No stop function available');
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const generateComprehensiveSOAPFromVoice = async () => {
    if (!currentSoapNoteId || !formData.voice_transcript) return;

    try {
      setLoading(true);
      const patientHistory = [
        ...(currentPatient.medical_history || []),
        ...(currentPatient.current_medications || []).map(med => `Current medication: ${med}`),
        ...(currentPatient.allergies || []).map(allergy => `Allergy: ${allergy}`)
      ].join('; ');

      // Enhanced SOAP generation that fills comprehensive fields
      const updatedNote = await SOAPService.generateSOAPFromTranscript(
        currentSoapNoteId,
        patientHistory
      );

      // Update all form data with generated content
      setFormData(prev => ({
        ...prev,
        subjective: updatedNote.subjective || prev.subjective,
        objective: updatedNote.objective || prev.objective,
        assessment: updatedNote.assessment || prev.assessment,
        plan: updatedNote.plan || prev.plan,
        voice_transcript: updatedNote.voice_transcript || prev.voice_transcript,
        chief_complaint: updatedNote.chief_complaint || prev.chief_complaint,
        hpi: updatedNote.hpi || prev.hpi,
        physical_examination: updatedNote.physical_examination || prev.physical_examination,
        follow_up_date: updatedNote.follow_up_date || prev.follow_up_date,
        status: updatedNote.status || prev.status
      }));

      setAiSuggestions(updatedNote.ai_diagnostic_suggestions || []);
    } catch (error) {
      console.error('Failed to generate comprehensive SOAP from voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiagnosticSuggestions = async () => {
    try {
      setLoading(true);
      const symptoms = (formData.subjective || '') + ' ' + (formData.objective || '') + ' ' + (formData.chief_complaint || '');
      const suggestions = await GeminiService.provideDiagnosticSuggestions(symptoms, {
        medical_history: currentPatient.medical_history,
        current_medications: currentPatient.current_medications,
        allergies: currentPatient.allergies,
        age: new Date().getFullYear() - new Date(currentPatient.date_of_birth).getFullYear(),
        gender: currentPatient.gender
      });
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to get diagnostic suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordingComplete = async () => {
    if (!currentSoapNoteId && formData.voice_transcript) {
      const noteId = await createNewSOAPNote();
      await SOAPService.updateSOAPNote(noteId, {
        voice_transcript: formData.voice_transcript
      });
    }
  };

  const handlePatientUpdated = (updatedPatient: Patient) => {
    setCurrentPatient(updatedPatient);
    // Update form data with new patient information
    setFormData(prev => ({
      ...prev,
      medical_history: updatedPatient.medical_history || [],
      current_medications: updatedPatient.current_medications || [],
      allergies: updatedPatient.allergies || []
    }));
    // Notify parent component
    if (onPatientUpdated) {
      onPatientUpdated(updatedPatient);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      let noteId = currentSoapNoteId;
      if (!noteId) {
        noteId = await createNewSOAPNote();
      }

      // Now we can save all the comprehensive SOAP fields
      const saveData: Partial<SOAPNote> = {
        // Visit Information
        type_of_visit: formData.type_of_visit,
        date_of_service: formData.date_of_service,
        chief_complaint: formData.chief_complaint,
        
        // Clinical Notes
        nurses_note: formData.nurses_note,
        hpi: formData.hpi,
        
        // Medical Information
        medical_history: formData.medical_history,
        family_history: formData.family_history,
        past_surgical_history: formData.past_surgical_history,
        social_history: formData.social_history,
        current_medications: formData.current_medications,
        
        // Physical Examination
        vitals: formData.vitals,
        allergies: formData.allergies,
        ros: formData.ros,
        physical_examination: formData.physical_examination,
        
        // Diagnosis
        diagnosis_for_visit: formData.diagnosis_for_visit,
        active_diagnosis_list: formData.active_diagnosis_list,
        
        // Traditional SOAP
        subjective: formData.subjective || '',
        objective: formData.objective || '',
        assessment: formData.assessment || '',
        plan: formData.plan || '',
        
        // Services and Follow-up
        services: formData.services,
        immunizations: formData.immunizations,
        next_visit: formData.next_visit,
        
        // Meta
        voice_transcript: formData.voice_transcript,
        status: formData.status,
        updated_by: formData.updated_by
      };
      
      if (formData.follow_up_date && formData.follow_up_date.trim()) {
        saveData.follow_up_date = formData.follow_up_date;
      }

      const updatedNote = await SOAPService.updateSOAPNote(noteId, saveData);
      onSave(updatedNote);
    } catch (error) {
      console.error('Failed to save SOAP note:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'voice-ai', label: 'Voice & AI', icon: Mic, primary: true },
    { id: 'soap', label: 'SOAP', icon: FileText, primary: true },
    { id: 'visit-info', label: 'Visit Info', icon: Calendar },
    { id: 'clinical-notes', label: 'Clinical Notes', icon: FileText },
    { id: 'medical-info', label: 'Medical Info', icon: User },
    { id: 'physical-exam', label: 'Physical Exam', icon: FileText },
    { id: 'diagnosis', label: 'Diagnosis', icon: Brain },
    { id: 'services', label: 'Services', icon: Plus }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'voice-ai':
        return (
          <div className="space-y-6">
            {/* Primary Voice Recording Section */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-blue-900 mb-2">Voice Documentation</h2>
                <p className="text-blue-700">Primary workflow: Record your patient encounter and let AI generate the SOAP note</p>
              </div>
              
              <div className="flex justify-center mb-6">
                <button
                  onClick={toggleRecording}
                  className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  <span>{isRecording ? 'Stop Recording' : 'Start Voice Recording'}</span>
                </button>
              </div>

              {isRecording && (
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-center space-x-3 mb-4 p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-700 font-medium">Recording in progress...</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-600 mb-2">Live Transcript</h4>
                    {formData.voice_transcript ? (
                      <div className="bg-white p-3 rounded border min-h-[100px] whitespace-pre-wrap">
                        {formData.voice_transcript}
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded border min-h-[100px] flex items-center justify-center text-gray-500">
                        Listening... Start speaking to see transcript here.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    <p><strong>Tips:</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Speak clearly and at a normal pace</li>
                      <li>Use medical terminology as needed - the AI understands medical context</li>
                      <li>Structure your dictation in SOAP format: Subjective, Objective, Assessment, Plan</li>
                      <li>The transcript will automatically populate your SOAP note fields</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Transcript and AI Generation */}
            {formData.voice_transcript && (
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Voice Transcript</h3>
                  <button
                    onClick={generateComprehensiveSOAPFromVoice}
                    disabled={loading || !currentSoapNoteId}
                    className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold shadow-md"
                  >
                    <Brain className="h-5 w-5" />
                    <span>{loading ? 'Generating...' : 'Generate SOAP with AI'}</span>
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto border">
                  <p className="text-gray-800 leading-relaxed">{formData.voice_transcript}</p>
                </div>
              </div>
            )}

            {/* AI Diagnostic Suggestions */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-900 flex items-center space-x-2">
                  <Brain className="h-6 w-6" />
                  <span>AI Diagnostic Suggestions</span>
                </h3>
                <button
                  onClick={getDiagnosticSuggestions}
                  disabled={loading || (!formData.subjective && !formData.objective && !formData.chief_complaint)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Analyzing...' : 'Get AI Suggestions'}
                </button>
              </div>
              {aiSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                      <p className="text-purple-800">• {suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                  <p className="text-purple-600 italic">
                    Record voice or add symptoms to get AI diagnostic suggestions
                  </p>
                </div>
              )}
            </div>

            {/* Quick Navigation */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('soap')}
                  className="flex items-center justify-center space-x-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <FileText className="h-5 w-5" />
                  <span>Review SOAP Note</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  <Save className="h-5 w-5" />
                  <span>{loading ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'visit-info':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type of Visit</label>
                <input
                  type="text"
                  value={formData.type_of_visit || ''}
                  onChange={(e) => handleInputChange('type_of_visit', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Annual Gyn, Follow-up, Consultation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Service</label>
                <input
                  type="date"
                  value={formData.date_of_service || ''}
                  onChange={(e) => handleInputChange('date_of_service', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
              <textarea
                value={formData.chief_complaint || ''}
                onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Primary reason for the visit..."
              />
            </div>
          </div>
        );

      case 'clinical-notes':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nurse's Note</label>
              <textarea
                value={formData.nurses_note || ''}
                onChange={(e) => handleInputChange('nurses_note', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nursing observations and preliminary notes..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">History of Present Illness (HPI)</label>
              <textarea
                value={formData.hpi || ''}
                onChange={(e) => handleInputChange('hpi', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed history of the current illness or condition..."
              />
            </div>
          </div>
        );

      case 'medical-info':
        return (
          <div className="space-y-6">
            {/* Medical History */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
              <div className="space-y-2">
                {(formData.medical_history || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="flex-1 p-2 bg-gray-50 rounded">{item}</span>
                    <button
                      onClick={() => removeArrayItem('medical_history', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="Add medical history item..."
                  />
                  <button
                    onClick={() => addArrayItem('medical_history', newMedication, setNewMedication)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
              <div className="space-y-2">
                {(formData.current_medications || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="flex-1 p-2 bg-gray-50 rounded">{item}</span>
                    <button
                      onClick={() => removeArrayItem('current_medications', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="Add medication..."
                  />
                  <button
                    onClick={() => addArrayItem('current_medications', newMedication, setNewMedication)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Social History</label>
              <textarea
                value={formData.social_history || ''}
                onChange={(e) => handleInputChange('social_history', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Smoking, alcohol, occupation, living situation, etc..."
              />
            </div>
          </div>
        );

      case 'physical-exam':
        return (
          <div className="space-y-6">
            {/* Vitals */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BP</label>
                  <input
                    type="text"
                    value={formData.vitals?.bp || ''}
                    onChange={(e) => handleVitalsChange('bp', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pulse</label>
                  <input
                    type="text"
                    value={formData.vitals?.pulse || ''}
                    onChange={(e) => handleVitalsChange('pulse', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="72 bpm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                  <input
                    type="text"
                    value={formData.vitals?.temperature || ''}
                    onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="98.6°F"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="text"
                    value={formData.vitals?.weight || ''}
                    onChange={(e) => handleVitalsChange('weight', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="150 lbs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Review of Systems (ROS)</label>
              <textarea
                value={formData.ros || ''}
                onChange={(e) => handleInputChange('ros', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Constitutional, HEENT, Cardiovascular, Pulmonary, etc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
              <textarea
                value={formData.physical_examination || ''}
                onChange={(e) => handleInputChange('physical_examination', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="General appearance, HEENT, cardiovascular, pulmonary, abdominal, extremities, neurological..."
              />
            </div>
          </div>
        );

      case 'soap':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subjective</label>
              <textarea
                value={formData.subjective || ''}
                onChange={(e) => handleInputChange('subjective', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Patient's reported symptoms, concerns, and history..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Objective</label>
              <textarea
                value={formData.objective || ''}
                onChange={(e) => handleInputChange('objective', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Physical examination findings, vital signs, test results..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessment</label>
              <textarea
                value={formData.assessment || ''}
                onChange={(e) => handleInputChange('assessment', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Clinical assessment, differential diagnosis..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <textarea
                value={formData.plan || ''}
                onChange={(e) => handleInputChange('plan', e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Treatment plan, medications, follow-up instructions..."
              />
            </div>
          </div>
        );

      case 'diagnosis':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis for this Visit</label>
              <div className="space-y-2">
                {(formData.diagnosis_for_visit || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="flex-1 p-2 bg-gray-50 rounded">{item}</span>
                    <button
                      onClick={() => removeArrayItem('diagnosis_for_visit', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="Add diagnosis with ICD code..."
                  />
                  <button
                    onClick={() => addArrayItem('diagnosis_for_visit', newDiagnosis, setNewDiagnosis)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Services Provided</label>
              <div className="space-y-2">
                {(formData.services || []).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="flex-1 p-2 bg-gray-50 rounded">{item}</span>
                    <button
                      onClick={() => removeArrayItem('services', index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="Add service or procedure..."
                  />
                  <button
                    onClick={() => addArrayItem('services', newService, setNewService)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Next Visit</label>
              <textarea
                value={formData.next_visit || ''}
                onChange={(e) => handleInputChange('next_visit', e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Follow-up instructions and next appointment details..."
              />
            </div>
          </div>
        );

      default:
        return <div>Select a tab to continue</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-7xl h-full max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50">
        <div className="flex flex-col h-full">
          {/* Modern Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-8 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-4 h-4 border-2 border-white/30 rotate-45"></div>
              <div className="absolute top-12 left-16 w-2 h-2 bg-white/20 rounded-full"></div>
              <div className="absolute top-8 right-20 w-3 h-3 border border-white/30 rounded"></div>
              <div className="absolute bottom-8 right-8 w-4 h-4 border-2 border-white/30 rotate-45"></div>
              <div className="absolute bottom-4 left-12 w-2 h-2 bg-white/20 rounded-full"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="bg-white/20 backdrop-blur-sm p-4 rounded-3xl shadow-xl">
                      <FileText className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-bold mb-2 tracking-tight">
                      Clinical Documentation
                    </h2>
                    <div className="flex items-center space-x-6">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">
                              {currentPatient.first_name} {currentPatient.last_name}
                            </h3>
                            <div className="flex items-center space-x-4 text-blue-100">
                              <span className="font-medium">MRN: #{currentPatient.medical_record_number}</span>
                              <span>•</span>
                              <span>{new Date().getFullYear() - new Date(currentPatient.date_of_birth).getFullYear()} years</span>
                              <span>•</span>
                              <span className="capitalize">{currentPatient.gender}</span>
                              <span>•</span>
                              <span>DOB: {format(new Date(currentPatient.date_of_birth), 'MM/dd/yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowPatientEditModal(true)}
                        className="group flex items-center space-x-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-2xl hover:bg-white/30 border border-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
                        title="Edit Patient Medical Info"
                      >
                        <Edit className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                        <span className="font-medium">Edit Patient</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span className="font-semibold">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 group-hover:animate-pulse" />
                        <span className="font-semibold">Save SOAP Note</span>
                      </>
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="group p-3 text-white/80 hover:text-white hover:bg-white/20 rounded-2xl transition-all duration-200"
                    title="Close"
                  >
                    <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Tab Navigation */}
          <div className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-purple-50/30 border-b border-gray-200/50">
            <div className="p-6">
              {/* Primary Workflow Section */}
              <div className="mb-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">AI-Powered Workflow</h3>
                  </div>
                  <div className="h-px bg-gradient-to-r from-blue-200 to-purple-200 flex-1"></div>
                </div>
                <div className="flex space-x-3">
                  {tabs.filter(tab => tab.primary).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`group relative flex items-center space-x-3 px-6 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                        activeTab === id
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:text-blue-600 border border-gray-200/50 hover:border-blue-300'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${activeTab === id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                      <span>{label}</span>
                      {activeTab === id && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Additional Fields Section */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-2 rounded-xl shadow-lg">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-md font-semibold text-gray-700">Clinical Documentation</h4>
                  </div>
                  <div className="h-px bg-gradient-to-r from-gray-200 to-gray-300 flex-1"></div>
                </div>
                <nav className="flex space-x-2 overflow-x-auto scrollbar-hide">
                  {tabs.filter(tab => !tab.primary).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`group flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 shadow-sm hover:shadow-md ${
                        activeTab === id
                          ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white transform scale-105'
                          : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200/50 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${activeTab === id ? '' : 'group-hover:scale-110 transition-transform'}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 p-8">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Patient Edit Modal */}
      {showPatientEditModal && (
        <PatientEditModal
          patient={currentPatient}
          onClose={() => setShowPatientEditModal(false)}
          onPatientUpdated={handlePatientUpdated}
        />
      )}
    </div>
  );
};
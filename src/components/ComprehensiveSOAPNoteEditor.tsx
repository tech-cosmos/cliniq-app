import React, { useState, useEffect } from 'react';
import { SOAPNote, Patient } from '../types/database';
import { VoiceRecorder } from './VoiceRecorder';
import SOAPService from '../services/soap';
import GeminiService from '../services/gemini';
import { Save, Brain, Mic, FileText, User, Calendar, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface ComprehensiveSOAPNoteEditorProps {
  patient: Patient;
  soapNote?: SOAPNote | null;
  onSave: (soapNote: SOAPNote) => void;
  onClose: () => void;
  doctorId: string;
}

export const ComprehensiveSOAPNoteEditor: React.FC<ComprehensiveSOAPNoteEditorProps> = ({
  patient,
  soapNote,
  onSave,
  onClose,
  doctorId
}) => {
  const [formData, setFormData] = useState<Partial<SOAPNote>>({
    // Visit Information
    type_of_visit: '',
    date_of_service: format(new Date(), 'yyyy-MM-dd'),
    chief_complaint: '',
    
    // Clinical Notes
    nurses_note: '',
    hpi: '',
    
    // Medical Information (prefill from patient data)
    medical_history: patient.medical_history || [],
    family_history: [],
    past_surgical_history: '',
    social_history: '',
    current_medications: patient.current_medications || [],
    
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
    allergies: patient.allergies || [],
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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [currentSoapNoteId, setCurrentSoapNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('voice-ai');

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

  const generateComprehensiveSOAPFromVoice = async () => {
    if (!currentSoapNoteId || !formData.voice_transcript) return;

    try {
      setLoading(true);
      const patientHistory = [
        ...(patient.medical_history || []),
        ...(patient.current_medications || []).map(med => `Current medication: ${med}`),
        ...(patient.allergies || []).map(allergy => `Allergy: ${allergy}`)
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
        medical_history: patient.medical_history,
        current_medications: patient.current_medications,
        allergies: patient.allergies,
        age: new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear(),
        gender: patient.gender
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
                  onClick={async () => {
                    if (!showVoiceRecorder && !currentSoapNoteId) {
                      await createNewSOAPNote();
                    }
                    setShowVoiceRecorder(!showVoiceRecorder);
                  }}
                  className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg ${
                    showVoiceRecorder 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Mic className="h-6 w-6" />
                  <span>{showVoiceRecorder ? 'Stop Recording' : 'Start Voice Recording'}</span>
                </button>
              </div>

              {showVoiceRecorder && currentSoapNoteId && (
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <VoiceRecorder
                    soapNoteId={currentSoapNoteId}
                    onTranscriptUpdate={handleVoiceTranscriptUpdate}
                    onRecordingComplete={handleRecordingComplete}
                  />
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-7xl h-full max-h-[95vh] rounded-lg shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">
                    SOAP Note (Internal Medicine Physician)
                  </h2>
                  <p className="text-blue-100">
                    {patient.first_name} {patient.last_name} (#{patient.medical_record_number})
                    <br />
                    {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}yrs {patient.gender}, 
                    DOB: {format(new Date(patient.date_of_birth), 'MM-dd-yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 text-xl font-bold p-2"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b bg-gray-50">
            <div className="p-2">
              <div className="flex items-center space-x-4 mb-2">
                <span className="text-sm font-semibold text-gray-700">Primary Workflow:</span>
                <div className="flex space-x-1">
                  {tabs.filter(tab => tab.primary).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap border-2 ${
                        activeTab === id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-blue-600 border-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-600">Additional Fields:</span>
                <nav className="flex space-x-1 overflow-x-auto">
                  {tabs.filter(tab => !tab.primary).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap ${
                        activeTab === id
                          ? 'bg-gray-600 text-white'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
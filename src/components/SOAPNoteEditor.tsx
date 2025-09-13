import React, { useState, useEffect } from 'react';
import { SOAPNote, Patient } from '../types/database';
import { VoiceRecorder } from './VoiceRecorder';
import SOAPService from '../services/soap';
import GeminiService from '../services/gemini';
import { Save, Brain, Mic, FileText, User } from 'lucide-react';

interface SOAPNoteEditorProps {
  patient: Patient;
  soapNote?: SOAPNote | null;
  onSave: (soapNote: SOAPNote) => void;
  onClose: () => void;
  doctorId: string;
}

export const SOAPNoteEditor: React.FC<SOAPNoteEditorProps> = ({
  patient,
  soapNote,
  onSave,
  onClose,
  doctorId
}) => {
  const [formData, setFormData] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    voice_transcript: string;
    follow_up_date: string;
    status: 'draft' | 'completed' | 'reviewed';
  }>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    voice_transcript: '',
    follow_up_date: '',
    status: 'draft'
  });
  const [loading, setLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [currentSoapNoteId, setCurrentSoapNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (soapNote) {
      setFormData({
        subjective: soapNote.subjective || '',
        objective: soapNote.objective || '',
        assessment: soapNote.assessment || '',
        plan: soapNote.plan || '',
        voice_transcript: soapNote.voice_transcript || '',
        follow_up_date: soapNote.follow_up_date || '',
        status: soapNote.status || 'draft'
      });
      setCurrentSoapNoteId(soapNote.id);
      setAiSuggestions(soapNote.ai_diagnostic_suggestions || []);
    }
  }, [soapNote]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSave = async () => {
    try {
      setLoading(true);
      
      let noteId = currentSoapNoteId;
      if (!noteId) {
        noteId = await createNewSOAPNote();
      }

      const updatedNote = await SOAPService.updateSOAPNote(noteId, formData);
      onSave(updatedNote);
    } catch (error) {
      console.error('Failed to save SOAP note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscriptUpdate = (transcript: string) => {
    setFormData(prev => ({ ...prev, voice_transcript: transcript }));
  };

  const generateSOAPFromVoice = async () => {
    if (!currentSoapNoteId || !formData.voice_transcript) return;

    try {
      setLoading(true);
      const patientHistory = [
        ...(patient.medical_history || []),
        ...(patient.current_medications || []).map(med => `Current medication: ${med}`),
        ...(patient.allergies || []).map(allergy => `Allergy: ${allergy}`)
      ].join('; ');

      const updatedNote = await SOAPService.generateSOAPFromTranscript(
        currentSoapNoteId,
        patientHistory
      );

      setFormData({
        subjective: updatedNote.subjective || '',
        objective: updatedNote.objective || '',
        assessment: updatedNote.assessment || '',
        plan: updatedNote.plan || '',
        voice_transcript: updatedNote.voice_transcript || '',
        follow_up_date: updatedNote.follow_up_date || '',
        status: updatedNote.status || 'draft'
      });

      setAiSuggestions(updatedNote.ai_diagnostic_suggestions || []);
    } catch (error) {
      console.error('Failed to generate SOAP from voice:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiagnosticSuggestions = async () => {
    try {
      setLoading(true);
      const symptoms = formData.subjective + ' ' + formData.objective;
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">
                    {soapNote ? 'Edit SOAP Note' : 'New SOAP Note'}
                  </h2>
                  <p className="text-blue-100">
                    Patient: {patient.first_name} {patient.last_name} (MRN: {patient.medical_record_number})
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    showVoiceRecorder 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-blue-500 hover:bg-blue-400'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  <span>{showVoiceRecorder ? 'Hide' : 'Voice'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main SOAP Form */}
              <div className="lg:col-span-2 space-y-6">
                {showVoiceRecorder && (
                  <VoiceRecorder
                    soapNoteId={currentSoapNoteId || ''}
                    onTranscriptUpdate={handleVoiceTranscriptUpdate}
                    onRecordingComplete={handleRecordingComplete}
                  />
                )}

                {/* Voice Transcript Section */}
                {formData.voice_transcript && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Voice Transcript</h3>
                      <button
                        onClick={generateSOAPFromVoice}
                        disabled={loading || !currentSoapNoteId}
                        className="flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Brain className="h-4 w-4" />
                        <span>Generate SOAP</span>
                      </button>
                    </div>
                    <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                      {formData.voice_transcript}
                    </div>
                  </div>
                )}

                {/* SOAP Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subjective
                    </label>
                    <textarea
                      value={formData.subjective}
                      onChange={(e) => handleInputChange('subjective', e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Patient's reported symptoms, concerns, and history of present illness..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objective
                    </label>
                    <textarea
                      value={formData.objective}
                      onChange={(e) => handleInputChange('objective', e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Physical examination findings, vital signs, test results..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment
                    </label>
                    <textarea
                      value={formData.assessment}
                      onChange={(e) => handleInputChange('assessment', e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Clinical assessment, differential diagnosis, working diagnosis..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan
                    </label>
                    <textarea
                      value={formData.plan}
                      onChange={(e) => handleInputChange('plan', e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Treatment plan, medications, follow-up instructions..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={formData.follow_up_date}
                        onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="completed">Completed</option>
                        <option value="reviewed">Reviewed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Patient Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Patient Info</span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Age:</strong> {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}</p>
                    <p><strong>Gender:</strong> {patient.gender}</p>
                    {patient.allergies && patient.allergies.length > 0 && (
                      <div>
                        <strong className="text-red-600">Allergies:</strong>
                        <ul className="list-disc list-inside text-red-600">
                          {patient.allergies.map((allergy, index) => (
                            <li key={index}>{allergy}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {patient.current_medications && patient.current_medications.length > 0 && (
                      <div>
                        <strong>Current Medications:</strong>
                        <ul className="list-disc list-inside">
                          {patient.current_medications.map((med, index) => (
                            <li key={index}>{med}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Diagnostic Suggestions */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center space-x-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span>AI Suggestions</span>
                    </h3>
                    <button
                      onClick={getDiagnosticSuggestions}
                      disabled={loading || (!formData.subjective && !formData.objective)}
                      className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      Get Suggestions
                    </button>
                  </div>
                  {aiSuggestions.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {aiSuggestions.map((suggestion, index) => (
                        <li key={index} className="text-purple-700">• {suggestion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-purple-600 italic">
                      Add symptoms to get AI diagnostic suggestions
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save SOAP Note'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
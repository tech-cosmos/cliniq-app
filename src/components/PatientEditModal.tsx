import React, { useState } from 'react';
import { Patient } from '../types/database';
import PatientService from '../services/patient';
import { User, Plus, X, Save } from 'lucide-react';

interface PatientEditModalProps {
  patient: Patient;
  onClose: () => void;
  onPatientUpdated: (updatedPatient: Patient) => void;
}

export const PatientEditModal: React.FC<PatientEditModalProps> = ({
  patient,
  onClose,
  onPatientUpdated
}) => {
  const [formData, setFormData] = useState<Partial<Patient>>({
    allergies: patient.allergies || [],
    current_medications: patient.current_medications || [],
    medical_history: patient.medical_history || []
  });
  
  const [loading, setLoading] = useState(false);
  
  // Form inputs for new items
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newMedicalHistory, setNewMedicalHistory] = useState('');

  const addArrayItem = (arrayField: keyof typeof formData, newItem: string, setterFunction: (value: string) => void) => {
    if (newItem.trim()) {
      const currentArray = (formData[arrayField] as string[]) || [];
      setFormData(prev => ({
        ...prev,
        [arrayField]: [...currentArray, newItem.trim()]
      }));
      setterFunction('');
    }
  };

  const removeArrayItem = (arrayField: keyof typeof formData, index: number) => {
    const currentArray = (formData[arrayField] as string[]) || [];
    setFormData(prev => ({
      ...prev,
      [arrayField]: currentArray.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updatedPatient = await PatientService.updatePatient(patient.id, formData);
      onPatientUpdated(updatedPatient);
      onClose();
    } catch (error) {
      console.error('Failed to update patient:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">Edit Patient Medical Information</h2>
                  <p className="text-blue-100">
                    {patient.first_name} {patient.last_name} (MRN: {patient.medical_record_number})
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
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Allergies */}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center space-x-2">
                <span>🚨</span>
                <span>Allergies</span>
              </h3>
              
              <div className="space-y-3">
                {(formData.allergies || []).map((allergy, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                    <span className="font-medium text-red-800">{allergy}</span>
                    <button
                      onClick={() => removeArrayItem('allergies', index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    className="flex-1 p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Add new allergy (e.g., Penicillin, Shellfish)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('allergies', newAllergy, setNewAllergy);
                      }
                    }}
                  />
                  <button
                    onClick={() => addArrayItem('allergies', newAllergy, setNewAllergy)}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Current Medications */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center space-x-2">
                <span>💊</span>
                <span>Current Medications</span>
              </h3>
              
              <div className="space-y-3">
                {(formData.current_medications || []).map((medication, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                    <span className="font-medium text-blue-800">{medication}</span>
                    <button
                      onClick={() => removeArrayItem('current_medications', index)}
                      className="text-blue-600 hover:text-blue-800 p-1"
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
                    className="flex-1 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add medication with dosage (e.g., Lisinopril 10mg daily)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('current_medications', newMedication, setNewMedication);
                      }
                    }}
                  />
                  <button
                    onClick={() => addArrayItem('current_medications', newMedication, setNewMedication)}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center space-x-2">
                <span>📋</span>
                <span>Medical History</span>
              </h3>
              
              <div className="space-y-3">
                {(formData.medical_history || []).map((condition, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-200">
                    <span className="font-medium text-yellow-800">{condition}</span>
                    <button
                      onClick={() => removeArrayItem('medical_history', index)}
                      className="text-yellow-600 hover:text-yellow-800 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMedicalHistory}
                    onChange={(e) => setNewMedicalHistory(e.target.value)}
                    className="flex-1 p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Add medical condition (e.g., Hypertension, Diabetes Type 2)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addArrayItem('medical_history', newMedicalHistory, setNewMedicalHistory);
                      }
                    }}
                  />
                  <button
                    onClick={() => addArrayItem('medical_history', newMedicalHistory, setNewMedicalHistory)}
                    className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Changes will be saved to the patient's permanent medical record.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
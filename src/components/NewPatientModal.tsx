import React, { useState } from 'react';
import { User, X, Save, Calendar, Phone, Mail, MapPin, AlertTriangle, Pill, FileText } from 'lucide-react';
import { Patient } from '../types/database';
import PatientService from '../services/patient';

interface NewPatientModalProps {
  onClose: () => void;
  onPatientCreated: (patient: Patient) => void;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({ onClose, onPatientCreated }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    phone: '',
    email: '',
    address: '',
    medical_record_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    allergies: [] as string[],
    current_medications: [] as string[],
    medical_history: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temporary input fields for arrays
  const [allergyInput, setAllergyInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (arrayName: 'allergies' | 'current_medications' | 'medical_history', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [arrayName]: [...prev[arrayName], value.trim()]
      }));
    }
  };

  const removeFromArray = (arrayName: 'allergies' | 'current_medications' | 'medical_history', index: number) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const generateMRN = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `MRN${timestamp}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      setError('Please fill in all required fields (First Name, Last Name, Date of Birth)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate MRN if not provided
      const mrn = formData.medical_record_number || generateMRN();

      // Build patient data, only including fields with values
      const patientData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        medical_record_number: mrn,
        allergies: formData.allergies,
        current_medications: formData.current_medications,
        medical_history: formData.medical_history,
      };

      // Only add optional fields if they have values
      if (formData.phone && formData.phone.trim()) {
        patientData.phone = formData.phone.trim();
      }
      if (formData.email && formData.email.trim()) {
        patientData.email = formData.email.trim();
      }
      if (formData.address && formData.address.trim()) {
        patientData.address = formData.address.trim();
      }
      if (formData.emergency_contact_name && formData.emergency_contact_name.trim()) {
        patientData.emergency_contact_name = formData.emergency_contact_name.trim();
      }
      if (formData.emergency_contact_phone && formData.emergency_contact_phone.trim()) {
        patientData.emergency_contact_phone = formData.emergency_contact_phone.trim();
      }

      const newPatient = await PatientService.createPatient(patientData);
      onPatientCreated(newPatient);
      onClose();
    } catch (error: any) {
      console.error('Failed to create patient:', error);
      setError(error.message || 'Failed to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 p-3 rounded-full">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Add New Patient</h2>
                  <p className="text-blue-100">Enter patient information below</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Basic Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Contact Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1-555-0123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="patient@email.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="123 Main Street, City, State, ZIP"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Record Number</label>
                    <input
                      type="text"
                      value={formData.medical_record_number}
                      onChange={(e) => handleInputChange('medical_record_number', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Emergency Contact</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1-555-0123"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Medical Information</span>
                </h3>
                
                {/* Allergies */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={allergyInput}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addToArray('allergies', allergyInput);
                          setAllergyInput('');
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter allergy and press Enter"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addToArray('allergies', allergyInput);
                        setAllergyInput('');
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.allergies.map((allergy, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {allergy}
                        <button
                          type="button"
                          onClick={() => removeFromArray('allergies', index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Medications */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={medicationInput}
                      onChange={(e) => setMedicationInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addToArray('current_medications', medicationInput);
                          setMedicationInput('');
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter medication and press Enter"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addToArray('current_medications', medicationInput);
                        setMedicationInput('');
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.current_medications.map((medication, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        <Pill className="h-3 w-3 mr-1" />
                        {medication}
                        <button
                          type="button"
                          onClick={() => removeFromArray('current_medications', index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Medical History */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={historyInput}
                      onChange={(e) => setHistoryInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addToArray('medical_history', historyInput);
                          setHistoryInput('');
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter medical condition and press Enter"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addToArray('medical_history', historyInput);
                        setHistoryInput('');
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.medical_history.map((condition, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                        <FileText className="h-3 w-3 mr-1" />
                        {condition}
                        <button
                          type="button"
                          onClick={() => removeFromArray('medical_history', index)}
                          className="ml-2 text-yellow-600 hover:text-yellow-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t bg-white p-6">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Create Patient</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
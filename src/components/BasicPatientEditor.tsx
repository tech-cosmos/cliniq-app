import React, { useState } from 'react';
import { Patient } from '../types/database';
import PatientService from '../services/patient';
import { User, Save, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface BasicPatientEditorProps {
  patient: Patient;
  onClose: () => void;
  onPatientUpdated: (updatedPatient: Patient) => void;
}

export const BasicPatientEditor: React.FC<BasicPatientEditorProps> = ({
  patient,
  onClose,
  onPatientUpdated
}) => {
  const [formData, setFormData] = useState<Partial<Patient>>({
    first_name: patient.first_name || '',
    last_name: patient.last_name || '',
    date_of_birth: patient.date_of_birth || '',
    gender: patient.gender || 'other',
    phone: patient.phone || '',
    email: patient.email || '',
    address: patient.address || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const calculateAge = () => {
    if (formData.date_of_birth) {
      return new Date().getFullYear() - new Date(formData.date_of_birth).getFullYear();
    }
    return 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-full">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Edit Patient Information</h2>
                  <p className="text-blue-100">
                    MRN: {patient.medical_record_number} • Age: {calculateAge()} years
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-semibold shadow-lg"
                >
                  <Save className="h-5 w-5" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-200 text-2xl font-bold p-2"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Basic Information */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center space-x-2">
                  <User className="h-6 w-6" />
                  <span>Basic Information</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name || ''}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full p-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Enter first name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name || ''}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full p-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Enter last name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full p-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">Gender</label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full p-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-green-900 mb-6 flex items-center space-x-2">
                  <Phone className="h-6 w-6" />
                  <span>Contact Information</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-green-800 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full p-4 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      placeholder="(xxx) xxx-xxxx"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-green-800 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-4 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      placeholder="patient@example.com"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-green-800 mb-2">Address</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full p-4 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg h-24 resize-none"
                      placeholder="Street address, city, state, zip code"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-orange-900 mb-6 flex items-center space-x-2">
                  <AlertCircle className="h-6 w-6" />
                  <span>Emergency Contact</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-orange-800 mb-2">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      className="w-full p-4 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                      placeholder="Full name of emergency contact"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-orange-800 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      className="w-full p-4 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                      placeholder="(xxx) xxx-xxxx"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-6 border-t">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <p className="text-gray-600">
                <span className="font-semibold">Last updated:</span> {format(new Date(patient.updated_at), 'MMM dd, yyyy at HH:mm')}
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold shadow-lg"
                >
                  <Save className="h-5 w-5" />
                  <span>{loading ? 'Saving Changes...' : 'Save All Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
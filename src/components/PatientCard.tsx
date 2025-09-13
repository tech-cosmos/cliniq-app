import React from 'react';
import { Patient } from '../types/database';
import { User, Calendar, Phone, Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  onClick: (patient: Patient) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick(patient)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-500">MRN: {patient.medical_record_number}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Age: {age}</span>
        </div>
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 capitalize">{patient.gender}</span>
        </div>
        {patient.phone && (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{patient.phone}</span>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{patient.email}</span>
          </div>
        )}
      </div>

      {patient.allergies && patient.allergies.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
            Allergies: {patient.allergies.join(', ')}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Updated: {format(new Date(patient.updated_at), 'MMM dd, yyyy')}
        </span>
        <FileText className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};
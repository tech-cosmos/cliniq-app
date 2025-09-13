import React from 'react';
import { Patient } from '../types/database';
import { User, Calendar, Phone, Mail, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  onClick: (patient: Patient) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

  return (
    <div 
      className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white"
      onClick={() => onClick(patient)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-md">
              <User className="h-6 w-6 text-white" />
            </div>
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-500 font-medium">MRN: {patient.medical_record_number}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Active
          </span>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide text-left">Age</p>
            <span className="text-gray-900 font-semibold text-left block">{age} years</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
            <User className="h-4 w-4 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide text-left">Gender</p>
            <span className="text-gray-900 font-semibold capitalize text-left block">{patient.gender}</span>
          </div>
        </div>
        {patient.phone && (
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
              <Phone className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide text-left">Phone</p>
              <span className="text-gray-900 font-semibold text-left block">{patient.phone}</span>
            </div>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center space-x-3">
            <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
              <Mail className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide text-left">Email</p>
              <span className="text-gray-900 font-semibold text-xs truncate block text-left" title={patient.email}>
                {patient.email}
              </span>
            </div>
          </div>
        )}
      </div>

      {patient.allergies && patient.allergies.length > 0 && (
        <div className="mb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-semibold text-red-800 uppercase tracking-wide">Allergies</span>
            </div>
            <p className="text-sm font-medium text-red-700">{patient.allergies.join(', ')}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 p-1.5 rounded-lg">
            <FileText className="h-3 w-3 text-gray-600" />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Updated {format(new Date(patient.updated_at), 'MMM dd, yyyy')}
          </span>
        </div>
        <div className="text-xs text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
          View Details
        </div>
      </div>
    </div>
  );
};
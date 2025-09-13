import React, { useState } from 'react';
import { Patient, SOAPNote, MedicalScan } from '../types/database';
import GeminiService from '../services/gemini';
import { Brain, Lightbulb, AlertTriangle, BookOpen, Search, Stethoscope } from 'lucide-react';

interface DiagnosticAssistantProps {
  patient: Patient;
  currentSOAP?: SOAPNote;
  recentScans?: MedicalScan[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export const DiagnosticAssistant: React.FC<DiagnosticAssistantProps> = ({
  patient,
  currentSOAP,
  recentScans,
  onSuggestionSelect
}) => {
  const [activeTab, setActiveTab] = useState<'symptoms' | 'differential' | 'scan-correlation' | 'drug-interactions'>('symptoms');
  const [loading, setLoading] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [diagnosticSuggestions, setDiagnosticSuggestions] = useState<string[]>([]);
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState<any[]>([]);
  const [scanCorrelations, setScanCorrelations] = useState<string>('');
  const [drugInteractions, setDrugInteractions] = useState<any[]>([]);

  const analyzeSymptoms = async () => {
    if (!symptomInput.trim()) return;
    
    try {
      setLoading(true);
      const suggestions = await GeminiService.provideDiagnosticSuggestions(
        symptomInput,
        {
          age: new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear(),
          gender: patient.gender,
          medical_history: patient.medical_history,
          current_medications: patient.current_medications,
          allergies: patient.allergies
        }
      );
      setDiagnosticSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to analyze symptoms:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDifferentialDiagnoses = async () => {
    if (!currentSOAP) return;

    try {
      setLoading(true);
      const symptoms = `${currentSOAP.subjective || ''} ${currentSOAP.objective || ''}`.trim();
      
      const prompt = `
        Generate a differential diagnosis list for the following case:
        
        Patient: ${patient.first_name} ${patient.last_name}
        Age: ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}
        Gender: ${patient.gender}
        Medical History: ${patient.medical_history?.join(', ') || 'None'}
        Current Medications: ${patient.current_medications?.join(', ') || 'None'}
        Allergies: ${patient.allergies?.join(', ') || 'None'}
        
        Symptoms and Findings: ${symptoms}
        
        Provide a JSON array of differential diagnoses with likelihood and reasoning:
        [
          {
            "diagnosis": "diagnosis name",
            "likelihood": "high|medium|low",
            "reasoning": "brief explanation",
            "nextSteps": ["test 1", "test 2"]
          }
        ]
      `;

      const result = await GeminiService.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setDifferentialDiagnoses(JSON.parse(jsonMatch[0]));
      }
    } catch (error) {
      console.error('Failed to generate differential diagnoses:', error);
    } finally {
      setLoading(false);
    }
  };

  const correlateScanFindings = async () => {
    if (!recentScans || recentScans.length === 0) return;

    try {
      setLoading(true);
      const scanData = recentScans.map(scan => ({
        type: scan.scan_type,
        findings: scan.ai_findings,
        analysis: scan.ai_analysis
      }));

      const clinicalData = {
        symptoms: currentSOAP?.subjective || '',
        examination: currentSOAP?.objective || '',
        assessment: currentSOAP?.assessment || ''
      };

      const prompt = `
        Correlate the following medical scan findings with the clinical presentation:
        
        Clinical Data: ${JSON.stringify(clinicalData, null, 2)}
        Scan Findings: ${JSON.stringify(scanData, null, 2)}
        
        Provide a clinical correlation analysis explaining how the scan findings relate to the symptoms and examination findings.
      `;

      const result = await GeminiService.model.generateContent(prompt);
      const response = await result.response;
      setScanCorrelations(response.text());
    } catch (error) {
      console.error('Failed to correlate scan findings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDrugInteractions = async () => {
    if (!patient.current_medications || patient.current_medications.length === 0) return;

    try {
      setLoading(true);
      
      const prompt = `
        Check for potential drug interactions and considerations for the following medications:
        
        Current Medications: ${patient.current_medications.join(', ')}
        Patient Age: ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}
        Allergies: ${patient.allergies?.join(', ') || 'None'}
        Medical History: ${patient.medical_history?.join(', ') || 'None'}
        
        Provide a JSON array of potential interactions and considerations:
        [
          {
            "interaction": "drug A + drug B",
            "severity": "minor|moderate|major",
            "description": "explanation",
            "recommendation": "clinical recommendation"
          }
        ]
      `;

      const result = await GeminiService.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setDrugInteractions(JSON.parse(jsonMatch[0]));
      }
    } catch (error) {
      console.error('Failed to check drug interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'major': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-purple-600 text-white p-4">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6" />
          <h2 className="text-xl font-bold">AI Diagnostic Assistant</h2>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 px-4">
          {[
            { id: 'symptoms', label: 'Symptom Analysis', icon: Search },
            { id: 'differential', label: 'Differential Dx', icon: Stethoscope },
            { id: 'scan-correlation', label: 'Scan Correlation', icon: BookOpen },
            { id: 'drug-interactions', label: 'Drug Interactions', icon: AlertTriangle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'symptoms' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe Symptoms
              </label>
              <textarea
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter patient symptoms and clinical findings..."
              />
              <button
                onClick={analyzeSymptoms}
                disabled={loading || !symptomInput.trim()}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Symptoms'}
              </button>
            </div>

            {diagnosticSuggestions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Diagnostic Suggestions</h3>
                <div className="space-y-2">
                  {diagnosticSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100"
                      onClick={() => onSuggestionSelect?.(suggestion)}
                    >
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-800">{suggestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'differential' && (
          <div className="space-y-4">
            <button
              onClick={generateDifferentialDiagnoses}
              disabled={loading || !currentSOAP}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Differential Diagnoses'}
            </button>

            {differentialDiagnoses.length > 0 && (
              <div className="space-y-3">
                {differentialDiagnoses.map((dx, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{dx.diagnosis}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLikelihoodColor(dx.likelihood)}`}>
                        {dx.likelihood} likelihood
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{dx.reasoning}</p>
                    {dx.nextSteps && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Next Steps:</h5>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {dx.nextSteps.map((step: string, stepIndex: number) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scan-correlation' && (
          <div className="space-y-4">
            <button
              onClick={correlateScanFindings}
              disabled={loading || !recentScans || recentScans.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Correlate Scan Findings'}
            </button>

            {recentScans && recentScans.length === 0 && (
              <p className="text-gray-500 italic">No recent scans available for correlation.</p>
            )}

            {scanCorrelations && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-2 text-blue-800">Clinical Correlation</h3>
                <p className="text-blue-700 whitespace-pre-wrap">{scanCorrelations}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'drug-interactions' && (
          <div className="space-y-4">
            <button
              onClick={checkDrugInteractions}
              disabled={loading || !patient.current_medications || patient.current_medications.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Drug Interactions'}
            </button>

            {(!patient.current_medications || patient.current_medications.length === 0) && (
              <p className="text-gray-500 italic">No current medications listed for this patient.</p>
            )}

            {drugInteractions.length > 0 && (
              <div className="space-y-3">
                {drugInteractions.map((interaction, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{interaction.interaction}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(interaction.severity)}`}>
                        {interaction.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{interaction.description}</p>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      <h5 className="font-medium text-sm text-yellow-800 mb-1">Recommendation:</h5>
                      <p className="text-sm text-yellow-700">{interaction.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
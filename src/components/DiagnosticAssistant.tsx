import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
    <div className="h-full flex flex-col">
      {/* Modern Tab Navigation */}
      <div className="bg-gradient-to-r from-gray-50 via-purple-50/30 to-blue-50/30 border-b border-gray-200/50">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-xl shadow-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">AI-Powered Clinical Analysis</h3>
            </div>
            <div className="h-px bg-gradient-to-r from-purple-200 to-blue-200 flex-1"></div>
          </div>
          
          <nav className="flex space-x-3 overflow-x-auto scrollbar-hide pb-4">
            {[
              { id: 'symptoms', label: 'Symptom Analysis', icon: Search },
              { id: 'differential', label: 'Differential Dx', icon: Stethoscope },
              { id: 'scan-correlation', label: 'Scan Correlation', icon: BookOpen },
              { id: 'drug-interactions', label: 'Drug Interactions', icon: AlertTriangle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`group flex items-center space-x-3 px-6 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:text-purple-600 border border-gray-200/50 hover:border-purple-300'
                }`}
              >
                <Icon className={`h-5 w-5 ${activeTab === id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                <span>{label}</span>
                {activeTab === id && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 animate-pulse"></div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'symptoms' && (
          <div className="space-y-8">
            {/* Symptom Input Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-xl shadow-lg">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Symptom Analysis</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Describe Patient Symptoms & Clinical Findings
                  </label>
                  <textarea
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter detailed symptoms, patient complaints, and clinical observations..."
                  />
                </div>
                
                <button
                  onClick={analyzeSymptoms}
                  disabled={loading || !symptomInput.trim()}
                  className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span className="font-semibold">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 group-hover:animate-pulse" />
                      <span className="font-semibold">Analyze Symptoms</span>
                    </>
                  )}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
            </div>

            {/* Diagnostic Suggestions */}
            {diagnosticSuggestions.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow-lg border border-purple-200/50">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-2 rounded-xl shadow-lg">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">AI Diagnostic Suggestions</h3>
                </div>
                
                <div className="grid gap-4">
                  {diagnosticSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="group p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-200/50 cursor-pointer hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:scale-102"
                      onClick={() => onSuggestionSelect?.(suggestion)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-800 font-medium leading-relaxed">{suggestion}</p>
                        </div>
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'differential' && (
          <div className="space-y-8">
            {/* Generate Button */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-xl shadow-lg">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Differential Diagnosis</h3>
              </div>
              
              <button
                onClick={generateDifferentialDiagnoses}
                disabled={loading || !currentSOAP}
                className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="font-semibold">Generating...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 group-hover:animate-pulse" />
                    <span className="font-semibold">Generate Differential Diagnoses</span>
                  </>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              
              {!currentSOAP && (
                <p className="text-gray-500 text-sm mt-3 italic">
                  Please create or select a SOAP note to generate differential diagnoses.
                </p>
              )}
            </div>

            {/* Differential Diagnoses Results */}
            {differentialDiagnoses.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-lg border border-blue-200/50">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Differential Diagnoses</h3>
                </div>
                
                <div className="grid gap-6">
                  {differentialDiagnoses.map((dx, index) => (
                    <div key={index} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md border border-blue-200/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{index + 1}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{dx.diagnosis}</h4>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getLikelihoodColor(dx.likelihood)}`}>
                          {dx.likelihood} likelihood
                        </span>
                      </div>
                      
                      <div className="space-y-4 ml-11">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-800 mb-2">Clinical Reasoning</h5>
                          <p className="text-gray-700 leading-relaxed">{dx.reasoning}</p>
                        </div>
                        
                        {dx.nextSteps && dx.nextSteps.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200/50">
                            <h5 className="font-semibold text-blue-800 mb-3">Recommended Next Steps</h5>
                            <div className="grid gap-2">
                              {dx.nextSteps.map((step: string, stepIndex: number) => (
                                <div key={stepIndex} className="flex items-center space-x-3">
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">{stepIndex + 1}</span>
                                  </div>
                                  <span className="text-blue-700 font-medium">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scan-correlation' && (
          <div className="space-y-8">
            {/* Scan Correlation Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-xl shadow-lg">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Scan-Clinical Correlation</h3>
              </div>
              
              <button
                onClick={correlateScanFindings}
                disabled={loading || !recentScans || recentScans.length === 0}
                className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="font-semibold">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 group-hover:animate-pulse" />
                    <span className="font-semibold">Correlate Scan Findings</span>
                  </>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              {recentScans && recentScans.length === 0 && (
                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-amber-800 font-medium">No recent medical scans available for correlation analysis.</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-2 ml-8">Upload medical scans to enable AI-powered clinical correlation.</p>
                </div>
              )}

              {recentScans && recentScans.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <p className="text-green-800 font-medium">{recentScans.length} recent scan(s) available for analysis</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scan Correlation Results */}
            {scanCorrelations && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 shadow-lg border border-blue-200/50">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-2 rounded-xl shadow-lg">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Clinical Correlation Analysis</h3>
                </div>
                
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md border border-blue-200/50">
                  <div className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800">
                    <ReactMarkdown>{scanCorrelations}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'drug-interactions' && (
          <div className="space-y-8">
            {/* Drug Interactions Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-xl shadow-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Drug Interaction Analysis</h3>
              </div>
              
              <button
                onClick={checkDrugInteractions}
                disabled={loading || !patient.current_medications || patient.current_medications.length === 0}
                className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="font-semibold">Checking...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 group-hover:animate-pulse" />
                    <span className="font-semibold">Check Drug Interactions</span>
                  </>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              {(!patient.current_medications || patient.current_medications.length === 0) && (
                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-amber-800 font-medium">No current medications listed for this patient.</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-2 ml-8">Add medications to patient profile to enable drug interaction checking.</p>
                </div>
              )}

              {patient.current_medications && patient.current_medications.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <p className="text-blue-800 font-medium">Current Medications ({patient.current_medications.length})</p>
                  </div>
                  <div className="ml-8 grid gap-2">
                    {patient.current_medications.map((med, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <span className="text-blue-700 font-medium">{med}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drug Interactions Results */}
            {drugInteractions.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 shadow-lg border border-red-200/50">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-gradient-to-r from-red-500 to-orange-600 p-2 rounded-xl shadow-lg">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Drug Interaction Analysis</h3>
                </div>
                
                <div className="grid gap-6">
                  {drugInteractions.map((interaction, index) => (
                    <div key={index} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-md border border-red-200/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                              <AlertTriangle className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{interaction.interaction}</h4>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getSeverityColor(interaction.severity)}`}>
                          {interaction.severity}
                        </span>
                      </div>
                      
                      <div className="space-y-4 ml-11">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-800 mb-2">Interaction Details</h5>
                          <p className="text-gray-700 leading-relaxed">{interaction.description}</p>
                        </div>
                        
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200/50">
                          <h5 className="font-semibold text-amber-800 mb-3 flex items-center space-x-2">
                            <Lightbulb className="h-4 w-4" />
                            <span>Clinical Recommendation</span>
                          </h5>
                          <p className="text-amber-700 font-medium leading-relaxed">{interaction.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
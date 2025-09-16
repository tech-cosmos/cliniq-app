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
  const [activeTab, setActiveTab] = useState<'symptoms' | 'scan-correlation' | 'drug-interactions'>('symptoms');
  const [loading, setLoading] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [diagnosticSuggestions, setDiagnosticSuggestions] = useState<string[]>([]);
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


  const correlateScanFindings = async () => {
    if (!recentScans || recentScans.length === 0) return;

    try {
      setLoading(true);
      
      // Enhanced scan data with timestamps and more context
      const scanData = recentScans.map((scan, index) => ({
        scanNumber: index + 1,
        scanId: scan.id,
        type: scan.scan_type.toUpperCase(),
        fileName: scan.file_name,
        timestamp: scan.created_at,
        urgencyLevel: scan.urgency_level,
        findings: scan.ai_findings || [],
        analysis: scan.ai_analysis || 'No AI analysis available',
        radiologistNotes: scan.radiologist_notes || 'No radiologist review yet'
      })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const clinicalData = {
        symptoms: currentSOAP?.subjective || '',
        examination: currentSOAP?.objective || '',
        assessment: currentSOAP?.assessment || '',
        plan: currentSOAP?.plan || ''
      };

      const patientContext = {
        age: new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear(),
        gender: patient.gender,
        medicalHistory: patient.medical_history || [],
        currentMedications: patient.current_medications || [],
        allergies: patient.allergies || []
      };

      const prompt = `
        You are an expert radiologist providing COMPREHENSIVE SCAN CORRELATION ANALYSIS.
        
        PATIENT CONTEXT:
        ${JSON.stringify(patientContext, null, 2)}
        
        CLINICAL PRESENTATION:
        ${JSON.stringify(clinicalData, null, 2)}
        
        IMAGING STUDIES (${scanData.length} scans available):
        ${JSON.stringify(scanData, null, 2)}
        
        ANALYSIS PROTOCOL:
        
        1. INDIVIDUAL SCAN INTERPRETATION:
        - Systematically review each scan's findings
        - Assess the clinical significance of each finding
        - Identify the urgency level and rationale
        
        2. COMPARATIVE ANALYSIS (if multiple scans):
        - Compare findings between scans chronologically
        - Identify progression, improvement, or stability
        - Note new findings or resolution of previous abnormalities
        - Assess healing progress or disease progression
        - Compare similar anatomical regions across different scan types
        
        3. CLINICAL CORRELATION:
        - Correlate imaging findings with reported symptoms
        - Explain how scan results support or contradict clinical assessment
        - Identify findings that may explain patient's complaints
        - Highlight any discrepancies requiring further investigation
        
        4. PROGRESSION ASSESSMENT:
        - **IMPROVEMENT**: Evidence of healing, reduced inflammation, fracture union
        - **STABLE**: No significant change in findings
        - **PROGRESSION**: Worsening pathology, new lesions, complications
        - **MIXED**: Some areas improving while others progressing
        
        5. RECOMMENDATIONS:
        - Follow-up imaging requirements
        - Additional studies needed
        - Clinical actions based on findings
        - Referral recommendations
        
        SPECIFIC FOCUS FOR MULTIPLE SCANS:
        - Bone healing assessment (for fractures)
        - Soft tissue changes over time
        - Response to treatment interventions
        - Development of complications
        - Functional improvement correlation
        
        Format your response with clear sections and clinical reasoning. Provide specific examples from the scan findings to support your conclusions.
        
        IMPORTANT: Focus on practical clinical insights that help guide patient management decisions.
      `;

      const result = await GeminiService.model.generateContent(prompt);
      const response = await result.response;
      setScanCorrelations(response.text());
    } catch (error) {
      console.error('Failed to correlate scan findings:', error);
      setScanCorrelations('Unable to perform scan correlation analysis. Please try again or contact support if the issue persists.');
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
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <p className="text-green-800 font-medium">{recentScans.length} scan(s) available for comparative analysis</p>
                    </div>
                    
                    {/* Scan Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {recentScans.slice(0, 4).map((scan, index) => (
                        <div key={scan.id} className="bg-white p-3 rounded-lg border border-green-200/50 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                {scan.scan_type.toUpperCase()}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                scan.urgency_level === 'critical' ? 'bg-red-100 text-red-800' :
                                scan.urgency_level === 'high' ? 'bg-orange-100 text-orange-800' :
                                scan.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {scan.urgency_level}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(scan.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 truncate">{scan.file_name}</p>
                          {scan.ai_findings && scan.ai_findings.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600">
                                {scan.ai_findings.length} finding(s) identified
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {recentScans.length > 4 && (
                      <p className="text-sm text-green-700 mt-3 text-center">
                        ...and {recentScans.length - 4} more scan(s)
                      </p>
                    )}
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800 text-sm font-medium">💡 AI Correlation Analysis:</p>
                      <p className="text-blue-700 text-sm mt-1">
                        The AI will compare findings between your scans, assess progression/improvement, 
                        and correlate imaging results with clinical symptoms to guide treatment decisions.
                      </p>
                    </div>
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
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader, AlertTriangle, CheckCircle, Activity, History, Trash2, Calendar, Plus, Brain, Dna } from 'lucide-react';
import { format } from 'date-fns';
import dnaAnalysisService, { DNAAnalysisResults, DNAVariant } from '../services/dna';
import dnaStorageService from '../services/dnaStorage';
import { StoredDNAAnalysis } from '../types/database';

interface DNAAnalysisProps {
  patientId: string;
}

export const DNAAnalysis: React.FC<DNAAnalysisProps> = ({ patientId }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<DNAAnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>(['diseases', 'allergies', 'drug_interactions']);
  const [storedAnalyses, setStoredAnalyses] = useState<StoredDNAAnalysis[]>([]);
  const [selectedStoredAnalysis, setSelectedStoredAnalysis] = useState<StoredDNAAnalysis | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAnalyses();
  }, [patientId]);

  const loadStoredAnalyses = async () => {
    try {
      setLoading(true);
      const analyses = await dnaStorageService.getPatientDNAAnalyses(patientId);
      setStoredAnalyses(analyses);
      
      // If there's a recent analysis, show it by default
      if (analyses.length > 0 && !selectedStoredAnalysis) {
        setSelectedStoredAnalysis(analyses[0]);
      }
    } catch (err) {
      console.error('Failed to load stored analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults(null);
    setSelectedStoredAnalysis(null);

    try {
      const results = await dnaAnalysisService.analyzeVCFFile({
        patientId,
        file,
        databases: selectedDatabases
      });
      
      setAnalysisResults(results);
      // Refresh stored analyses after successful upload
      loadStoredAnalyses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [patientId, selectedDatabases]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.vcf']
    },
    multiple: false,
    disabled: isAnalyzing
  });

  const renderVariants = (variants: DNAVariant[], title: string, icon: string) => {
    const getVariantTypeColor = (title: string) => {
      if (title.toLowerCase().includes('disease')) {
        return 'from-red-50 via-white to-pink-50';
      } else if (title.toLowerCase().includes('allerg')) {
        return 'from-orange-50 via-white to-amber-50';
      } else if (title.toLowerCase().includes('drug')) {
        return 'from-blue-50 via-white to-cyan-50';
      }
      return 'from-gray-50 via-white to-gray-50';
    };

    const getVariantIconColor = (title: string) => {
      if (title.toLowerCase().includes('disease')) {
        return 'from-red-500 to-pink-600';
      } else if (title.toLowerCase().includes('allerg')) {
        return 'from-orange-500 to-amber-600';
      } else if (title.toLowerCase().includes('drug')) {
        return 'from-blue-500 to-cyan-600';
      }
      return 'from-gray-500 to-gray-600';
    };

    return (
      <div className={`bg-gradient-to-br ${getVariantTypeColor(title)} rounded-3xl p-8 border border-gray-200/50 shadow-xl`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`bg-gradient-to-r ${getVariantIconColor(title)} p-3 rounded-2xl shadow-lg`}>
              <span className="text-2xl text-white">{icon}</span>
            </div>
            <div>
              <h4 className="text-2xl font-bold text-gray-900">{title}</h4>
              <p className="text-gray-600 font-medium mt-1">Genetic variant analysis results</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 text-sm font-semibold rounded-2xl shadow-sm ${
              variants.length > 0
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              {variants.length} {variants.length === 1 ? 'variant' : 'variants'} found
            </span>
          </div>
        </div>

        {variants.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {variants.map((variant, index) => (
              <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-800 text-white font-mono text-sm px-3 py-1.5 rounded-lg shadow-sm">
                    {dnaAnalysisService.formatVariantLocation(variant)}
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <p className="text-gray-800 leading-relaxed font-medium">{variant.info}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No variants found in this category</p>
            <p className="text-gray-500 text-sm mt-2">This is generally a positive result</p>
          </div>
        )}
      </div>
    );
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    if (window.confirm('Are you sure you want to delete this DNA analysis? This action cannot be undone.')) {
      try {
        await dnaStorageService.deleteDNAAnalysis(analysisId);
        setStoredAnalyses(prev => prev.filter(a => a.id !== analysisId));
        if (selectedStoredAnalysis?.id === analysisId) {
          setSelectedStoredAnalysis(null);
        }
      } catch (err) {
        console.error('Failed to delete analysis:', err);
      }
    }
  };

  const renderStoredAnalysisResults = (analysis: StoredDNAAnalysis) => {
    const convertedResults: DNAAnalysisResults = {
      filename: analysis.filename,
      total_variants_analyzed: analysis.total_variants_analyzed,
      databases_searched: analysis.databases_searched,
      results: {
        diseases: analysis.diseases_variants,
        allergies: analysis.allergies_variants,
        drug_interactions: analysis.drug_interactions_variants,
        summary: {
          total_diseases_found: analysis.total_diseases_found,
          total_allergies_found: analysis.total_allergies_found,
          total_drug_interactions_found: analysis.total_drug_interactions_found,
          risk_assessment: analysis.risk_assessment
        }
      }
    };
    return renderAnalysisResults(convertedResults, true, analysis);
  };

  const renderAnalysisResults = (results: DNAAnalysisResults, isStored = false, storedAnalysis?: StoredDNAAnalysis) => (
    <div className="space-y-8">
      {/* Analysis Header Card */}
      <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-3xl shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-cyan-500 w-6 h-6 rounded-full flex items-center justify-center">
                <Dna className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
                {isStored ? 'Stored DNA Analysis' : 'Analysis Complete'}
              </h3>
              <p className="text-gray-600 font-medium mt-1">Comprehensive genetic variant analysis results</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isStored && storedAnalysis && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">Analysis Date</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(storedAnalysis.created_at), 'MMM dd, yyyy - HH:mm')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAnalysis(storedAnalysis.id)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete Analysis"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
            {!isStored && (
              <button
                onClick={() => {
                  setAnalysisResults(null);
                  setError(null);
                  setSelectedStoredAnalysis(storedAnalyses[0] || null);
                }}
                className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-semibold">New Analysis</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-2xl">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {results.total_variants_analyzed.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 font-medium">Variants Analyzed</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-2xl">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {results.databases_searched.length}
                </p>
                <p className="text-sm text-gray-600 font-medium">Databases Searched</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl ${
                results.results.summary.risk_assessment === 'Low' ? 'bg-green-100' :
                results.results.summary.risk_assessment === 'Medium' ? 'bg-yellow-100' :
                results.results.summary.risk_assessment === 'High' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <span className="text-2xl">
                  {dnaAnalysisService.getRiskLevelIcon(results.results.summary.risk_assessment)}
                </span>
              </div>
              <div>
                <p className={`text-2xl font-bold ${dnaAnalysisService.getRiskLevelColor(results.results.summary.risk_assessment)}`}>
                  {results.results.summary.risk_assessment}
                </p>
                <p className="text-sm text-gray-600 font-medium">Risk Assessment</p>
              </div>
            </div>
          </div>
        </div>

        {/* File Info */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 p-2 rounded-xl">
              <Upload className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Source File</p>
              <p className="text-gray-900 font-medium">{results.filename}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Variants Analysis */}
      <div className="space-y-8">
        {renderVariants(
          results.results.diseases,
          dnaAnalysisService.getDatabaseDisplayName('diseases'),
          dnaAnalysisService.getDatabaseIcon('diseases')
        )}

        {renderVariants(
          results.results.allergies,
          dnaAnalysisService.getDatabaseDisplayName('allergies'),
          dnaAnalysisService.getDatabaseIcon('allergies')
        )}

        {renderVariants(
          results.results.drug_interactions,
          dnaAnalysisService.getDatabaseDisplayName('drug_interactions'),
          dnaAnalysisService.getDatabaseIcon('drug_interactions')
        )}
      </div>

      {/* Analysis Summary */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900">Analysis Summary</h4>
            <p className="text-gray-600 font-medium">Key findings from genetic analysis</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="font-semibold text-gray-900">Disease Variants Found</span>
            </div>
            <p className="text-3xl font-bold text-red-600 mt-2">{results.results.summary.total_diseases_found}</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="font-semibold text-gray-900">Allergy Variants Found</span>
            </div>
            <p className="text-3xl font-bold text-orange-600 mt-2">{results.results.summary.total_allergies_found}</p>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-gray-900">Drug Interaction Variants</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 mt-2">{results.results.summary.total_drug_interactions_found}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-3xl p-16 border border-gray-200/50 shadow-xl text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-6"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 animate-pulse"></div>
        </div>
        <div>
          <h4 className="text-2xl font-bold text-purple-800 mb-2">Loading DNA Analysis</h4>
          <p className="text-purple-700 text-lg">Fetching genetic analysis history...</p>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-3xl shadow-lg">
                <Dna className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 w-6 h-6 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{storedAnalyses.length}</span>
              </div>
            </div>
            <div className='pl-2'>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">DNA Analysis</h2>
              <p className="text-gray-600 font-medium">
                {storedAnalyses.length > 0
                  ? `${storedAnalyses.length} genetic ${storedAnalyses.length === 1 ? 'analysis' : 'analyses'} on file`
                  : 'Comprehensive genetic variant analysis'
                }
              </p>
            </div>
          </div>
          {storedAnalyses.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <History className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
              <span className="font-semibold">
                {showHistory ? 'Hide History' : `View History (${storedAnalyses.length})`}
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          )}
        </div>
      </div>
        
      {/* Upload Section */}
      {!analysisResults && !isAnalyzing && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 text-left">Upload VCF File</h3>
              <p className="text-gray-600 font-medium">Select analysis databases and upload your genetic data</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Database Selection */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Analysis Databases</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'diseases', label: 'Genetic Diseases', icon: '🧬', desc: 'Screen for disease-associated variants' },
                  { id: 'allergies', label: 'Allergies & Intolerances', icon: '⚠️', desc: 'Identify allergy predispositions' },
                  { id: 'drug_interactions', label: 'Drug Interactions', icon: '💊', desc: 'Analyze pharmacogenomics' }
                ].map((db) => (
                  <label key={db.id} className="cursor-pointer group">
                    <div className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                      selectedDatabases.includes(db.id)
                        ? 'border-purple-400 bg-purple-50/70 shadow-md'
                        : 'border-gray-200 bg-white/50 hover:border-purple-300 hover:bg-purple-25/50'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedDatabases.includes(db.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDatabases([...selectedDatabases, db.id]);
                            } else {
                              setSelectedDatabases(selectedDatabases.filter(d => d !== db.id));
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                        />
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{db.icon}</span>
                            <span className="font-semibold text-gray-900">{db.label}</span>
                          </div>
                          <p className="text-sm text-gray-600">{db.desc}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* File Upload Zone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group
                ${isDragActive
                  ? 'border-purple-400 bg-purple-50/70 scale-[1.02] shadow-lg'
                  : 'border-gray-300 bg-white/30 hover:border-purple-400 hover:bg-purple-50/30 hover:scale-[1.01] hover:shadow-md'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="relative">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                  isDragActive ? 'bg-purple-100 scale-110' : 'bg-gray-100 group-hover:bg-purple-50 group-hover:scale-105'
                }`}>
                  <Upload className={`h-10 w-10 transition-colors duration-300 ${
                    isDragActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-purple-500'
                  }`} />
                </div>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                {isDragActive ? 'Drop your VCF file here!' : 'Upload VCF File'}
              </h4>
              <p className="text-gray-600 mb-6 text-lg">
                {isDragActive
                  ? 'Release to start genetic analysis...'
                  : 'Drag and drop your VCF file here, or click to browse'
                }
              </p>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 inline-block">
                <p className="text-sm text-gray-600 font-medium">
                  <strong>Supported formats:</strong> .vcf files
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Analysis may take up to 20 minutes for large files
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing State */}
      {isAnalyzing && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-3xl p-16 border border-gray-200/50 shadow-xl text-center">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 animate-pulse"></div>
          </div>
          <div>
            <h4 className="text-3xl font-bold text-purple-800 mb-4">Analyzing DNA</h4>
            <p className="text-purple-700 text-lg mb-6">
              Our advanced AI is analyzing your genetic variants across multiple databases.
            </p>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-purple-200/50 inline-block">
              <p className="text-purple-600 font-medium">
                This may take several minutes. Please don't close this tab.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 mt-6">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-gradient-to-br from-red-50 via-white to-pink-50 rounded-3xl p-8 border border-red-200/50 shadow-xl">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-3 rounded-2xl shadow-lg flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-red-800 mb-2">Analysis Failed</h4>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-red-100">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setAnalysisResults(null);
                }}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      {showHistory && (
        <div className="bg-gradient-to-br from-gray-50 via-white to-blue-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-gradient-to-r from-gray-600 to-blue-600 p-3 rounded-2xl shadow-lg">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-gray-900">Analysis History</h4>
              <p className="text-gray-600 font-medium">Previous DNA analysis results</p>
            </div>
          </div>
          <div className="space-y-4">
            {storedAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className={`group cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedStoredAnalysis?.id === analysis.id
                    ? 'bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border-2 border-purple-400 rounded-3xl shadow-lg scale-[1.02]'
                    : 'bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:border-purple-300 hover:bg-purple-50/30'
                } p-6`}
                onClick={() => setSelectedStoredAnalysis(analysis)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl shadow-sm">
                      <Dna className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h5 className="text-lg font-bold text-gray-900 mb-2">{analysis.filename}</h5>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">
                            {format(new Date(analysis.created_at), 'MMM dd, yyyy - HH:mm')}
                          </span>
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-xl text-sm font-semibold">
                          {analysis.total_variants_analyzed.toLocaleString()} variants
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-sm font-semibold ${
                          analysis.risk_assessment === 'Low' ? 'bg-green-100 text-green-800' :
                          analysis.risk_assessment === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          analysis.risk_assessment === 'High' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {analysis.risk_assessment} Risk
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAnalysis(analysis.id);
                    }}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group-hover:opacity-100 opacity-60"
                    title="Delete Analysis"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show current analysis results or selected stored analysis */}
      {analysisResults && renderAnalysisResults(analysisResults)}
      {!analysisResults && selectedStoredAnalysis && renderStoredAnalysisResults(selectedStoredAnalysis)}
      
      {/* Empty state when no analyses exist */}
      {!analysisResults && !selectedStoredAnalysis && storedAnalyses.length === 0 && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-3xl p-16 border border-gray-200/50 shadow-xl text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl mx-auto flex items-center justify-center">
              <Dna className="h-12 w-12 text-purple-500" />
            </div>
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-indigo-600 w-8 h-8 rounded-full flex items-center justify-center mx-auto">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h4 className="text-3xl font-bold text-gray-900 mb-4">No DNA Analysis Yet</h4>
          <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
            Upload your VCF file to begin comprehensive genetic variant analysis across multiple databases including disease predisposition, allergies, and drug interactions.
          </p>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-200/50 inline-block">
            <div className="flex items-center space-x-4 text-sm text-purple-700">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🧬</span>
                <span>Genetic Diseases</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚠️</span>
                <span>Allergies</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">💊</span>
                <span>Drug Interactions</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader, AlertTriangle, CheckCircle, Activity, History, Trash2, Calendar } from 'lucide-react';
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

  const renderVariants = (variants: DNAVariant[], title: string, icon: string) => (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {variants.length} found
        </span>
      </div>
      
      {variants.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {variants.map((variant, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                  {dnaAnalysisService.formatVariantLocation(variant)}
                </span>
              </div>
              <p className="text-sm text-gray-700">{variant.info}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No variants found in this category</p>
      )}
    </div>
  );

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
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span>{isStored ? 'Stored Analysis Results' : 'Analysis Complete'}</span>
          </h3>
          <div className="flex items-center space-x-3">
            {isStored && storedAnalysis && (
              <>
                <span className="text-sm text-gray-500">
                  {format(new Date(storedAnalysis.created_at), 'MMM dd, yyyy - HH:mm')}
                </span>
                <button
                  onClick={() => handleDeleteAnalysis(storedAnalysis.id)}
                  className="text-red-600 hover:text-red-700 p-1 rounded"
                  title="Delete Analysis"
                >
                  <Trash2 className="h-4 w-4" />
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
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Run New Analysis
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {results.total_variants_analyzed.toLocaleString()}
            </div>
            <div className="text-sm text-blue-700 font-medium">Variants Analyzed</div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {results.databases_searched.length}
            </div>
            <div className="text-sm text-green-700 font-medium">Databases Searched</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold flex items-center justify-center space-x-2 ${dnaAnalysisService.getRiskLevelColor(results.results.summary.risk_assessment)}`}>
              <span>{dnaAnalysisService.getRiskLevelIcon(results.results.summary.risk_assessment)}</span>
              <span>{results.results.summary.risk_assessment}</span>
            </div>
            <div className="text-sm text-gray-700 font-medium">Risk Assessment</div>
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <span className="font-medium">File:</span> {results.filename}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
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

      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Diseases Found:</span>
            <span className="ml-2 text-gray-900">{results.results.summary.total_diseases_found}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Allergies Found:</span>
            <span className="ml-2 text-gray-900">{results.results.summary.total_allergies_found}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Drug Interactions:</span>
            <span className="ml-2 text-gray-900">{results.results.summary.total_drug_interactions_found}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading DNA analysis history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
            <Activity className="h-6 w-6 text-purple-600" />
            <span>DNA Analysis</span>
          </h3>
          {storedAnalyses.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <History className="h-4 w-4" />
              <span>{showHistory ? 'Hide History' : `View History (${storedAnalyses.length})`}</span>
            </button>
          )}
        </div>
        
        {!analysisResults && !isAnalyzing && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select databases to analyze:
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'diseases', label: 'Genetic Diseases', icon: '🧬' },
                  { id: 'allergies', label: 'Allergies & Intolerances', icon: '⚠️' },
                  { id: 'drug_interactions', label: 'Drug Interactions', icon: '💊' }
                ].map((db) => (
                  <label key={db.id} className="flex items-center space-x-2 cursor-pointer">
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
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {db.icon} {db.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActive 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-25'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Upload VCF File
              </h4>
              <p className="text-gray-600 mb-4">
                {isDragActive
                  ? 'Drop your VCF file here...'
                  : 'Drag and drop your VCF file here, or click to browse'
                }
              </p>
              <p className="text-sm text-gray-500">
                Supports .vcf files • Analysis may take up to 20 minutes for large files
              </p>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <Loader className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Analyzing DNA...</h4>
            <p className="text-gray-600">
              This may take several minutes. Please don't close this tab.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Analysis Failed</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Analysis History</h4>
            <div className="space-y-3">
              {storedAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedStoredAnalysis?.id === analysis.id
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedStoredAnalysis(analysis)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{analysis.filename}</h5>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(analysis.created_at), 'MMM dd, yyyy')}</span>
                        </span>
                        <span>{analysis.total_variants_analyzed.toLocaleString()} variants</span>
                        <span className={`px-2 py-1 rounded text-xs ${dnaAnalysisService.getRiskLevelColor(analysis.risk_assessment)}`}>
                          {analysis.risk_assessment} Risk
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnalysis(analysis.id);
                      }}
                      className="text-red-600 hover:text-red-700 p-1 rounded"
                      title="Delete Analysis"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show current analysis results or selected stored analysis */}
      {analysisResults && renderAnalysisResults(analysisResults)}
      {!analysisResults && selectedStoredAnalysis && renderStoredAnalysisResults(selectedStoredAnalysis)}
      
      {/* Empty state when no analyses exist */}
      {!analysisResults && !selectedStoredAnalysis && storedAnalyses.length === 0 && (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No DNA Analysis Results</h4>
          <p className="text-gray-600">Upload your first VCF file to begin genetic analysis</p>
        </div>
      )}
    </div>
  );
};
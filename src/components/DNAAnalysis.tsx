import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import dnaAnalysisService, { DNAAnalysisResults, DNAVariant } from '../services/dna';

interface DNAAnalysisProps {
  patientId: string;
}

export const DNAAnalysis: React.FC<DNAAnalysisProps> = ({ patientId }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<DNAAnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>(['diseases', 'allergies', 'drug_interactions']);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults(null);

    try {
      const results = await dnaAnalysisService.analyzeVCFFile({
        patientId,
        file,
        databases: selectedDatabases
      });
      
      setAnalysisResults(results);
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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-3">
          <Activity className="h-6 w-6 text-purple-600" />
          <span>DNA Analysis</span>
        </h3>
        
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
      </div>

      {analysisResults && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span>Analysis Complete</span>
              </h3>
              <button
                onClick={() => {
                  setAnalysisResults(null);
                  setError(null);
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Run New Analysis
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResults.total_variants_analyzed.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700 font-medium">Variants Analyzed</div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analysisResults.databases_searched.length}
                </div>
                <div className="text-sm text-green-700 font-medium">Databases Searched</div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold flex items-center justify-center space-x-2 ${dnaAnalysisService.getRiskLevelColor(analysisResults.results.summary.risk_assessment)}`}>
                  <span>{dnaAnalysisService.getRiskLevelIcon(analysisResults.results.summary.risk_assessment)}</span>
                  <span>{analysisResults.results.summary.risk_assessment}</span>
                </div>
                <div className="text-sm text-gray-700 font-medium">Risk Assessment</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <span className="font-medium">File:</span> {analysisResults.filename}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {renderVariants(
              analysisResults.results.diseases,
              dnaAnalysisService.getDatabaseDisplayName('diseases'),
              dnaAnalysisService.getDatabaseIcon('diseases')
            )}
            
            {renderVariants(
              analysisResults.results.allergies,
              dnaAnalysisService.getDatabaseDisplayName('allergies'),
              dnaAnalysisService.getDatabaseIcon('allergies')
            )}
            
            {renderVariants(
              analysisResults.results.drug_interactions,
              dnaAnalysisService.getDatabaseDisplayName('drug_interactions'),
              dnaAnalysisService.getDatabaseIcon('drug_interactions')
            )}
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Diseases Found:</span>
                <span className="ml-2 text-gray-900">{analysisResults.results.summary.total_diseases_found}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Allergies Found:</span>
                <span className="ml-2 text-gray-900">{analysisResults.results.summary.total_allergies_found}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Drug Interactions:</span>
                <span className="ml-2 text-gray-900">{analysisResults.results.summary.total_drug_interactions_found}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
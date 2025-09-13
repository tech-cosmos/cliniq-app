import React, { useState, useEffect } from 'react';
import { MedicalScan } from '../types/database';
import MedicalScanService from '../services/medicalScan';
import { 
  Image, 
  Brain, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

interface ScanViewerProps {
  scan: MedicalScan;
  onClose: () => void;
  onUpdate?: (updatedScan: MedicalScan) => void;
}

export const ScanViewer: React.FC<ScanViewerProps> = ({ scan, onClose, onUpdate }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImage();
  }, [scan]);

  const loadImage = async () => {
    try {
      setLoading(true);
      const url = await MedicalScanService.getScanImageUrl(scan.file_path);
      setImageUrl(url);
    } catch (error) {
      console.error('Failed to load image:', error);
      setError('Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      const updatedScan = await MedicalScanService.reanalyzeScan(scan.id);
      onUpdate?.(updatedScan);
    } catch (error) {
      console.error('Failed to reanalyze scan:', error);
      setError('Failed to reanalyze scan');
    } finally {
      setReanalyzing(false);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-lg shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gray-800 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold capitalize">
                    {scan.scan_type} Scan
                  </h2>
                  <p className="text-gray-300">{scan.file_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(scan.urgency_level)}`}>
                  {scan.urgency_level} priority
                </span>
                <button
                  onClick={onClose}
                  className="text-gray-300 hover:text-white text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Image Viewer */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center">
              {loading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading image...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-600">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                  <p>{error}</p>
                </div>
              ) : (
                <div className="max-w-full max-h-full overflow-auto p-4">
                  <img
                    src={imageUrl}
                    alt={scan.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Analysis Panel */}
            <div className="w-96 bg-white border-l overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Scan Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Scan Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{format(new Date(scan.created_at), 'MMM dd, yyyy - HH:mm')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="capitalize">{scan.scan_type}</span>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <span>AI Analysis</span>
                    </h3>
                    <button
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className="flex items-center space-x-1 px-2 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${reanalyzing ? 'animate-spin' : ''}`} />
                      <span>Reanalyze</span>
                    </button>
                  </div>

                  {scan.ai_analysis ? (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Analysis</h4>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{scan.ai_analysis}</p>
                      </div>

                      {scan.ai_findings && scan.ai_findings.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-medium text-sm text-blue-700 mb-2">Key Findings</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {scan.ai_findings.map((finding, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-blue-600">•</span>
                                <span>{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {reanalyzing ? 'Analyzing scan...' : 'AI analysis pending'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Radiologist Notes */}
                {scan.radiologist_notes && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Radiologist Notes</h3>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800 whitespace-pre-wrap">
                        {scan.radiologist_notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => window.open(imageUrl, '_blank')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Full Size</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = imageUrl;
                      link.download = scan.file_name;
                      link.click();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>

                {/* Clinical Recommendations */}
                {scan.urgency_level === 'high' || scan.urgency_level === 'critical' && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <h4 className="font-medium text-red-800">Urgent Attention Required</h4>
                    </div>
                    <p className="text-sm text-red-700">
                      This scan has been flagged as {scan.urgency_level} priority. 
                      Please review immediately and consider appropriate clinical action.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
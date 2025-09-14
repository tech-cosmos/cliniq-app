import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Users, FileText, ExternalLink } from 'lucide-react';

interface AnalysisResult {
  metric: string;
  label: string;
  unit: string;
  baseline?: number;
  latest?: number;
  percentChange?: number;
  absoluteChange?: number;
  thresholdBreach?: {
    type: 'high_risk' | 'moderate_risk' | 'frailty' | 'normal';
    message: string;
    clinical_significance: string;
  };
  trajectoryAlert?: {
    type: 'concerning_decline' | 'concerning_increase' | 'stable' | 'improving';
    message: string;
    clinical_significance: string;
  };
}

interface BiometricsReport {
  patientId: string;
  generatedDate: string;
  summary: {
    totalMetrics: number;
    metricsWithData: number;
    thresholdBreaches: number;
    trajectoryAlerts: number;
  };
  analyses: AnalysisResult[];
  crossDomainCorrelations: string[];
  referralRecommendations: string[];
  references: string[];
}

interface PhysicianReportProps {
  report: BiometricsReport;
  onClose: () => void;
}

export const PhysicianReport: React.FC<PhysicianReportProps> = ({ report, onClose }) => {
  const formatValue = (value: number | undefined, unit: string): string => {
    if (value === undefined) return 'N/A';
    return `${value.toFixed(1)}${unit}`;
  };

  const formatChange = (change: number | undefined, isPercentage = false): string => {
    if (change === undefined) return 'N/A';
    const sign = change > 0 ? '+' : '';
    const suffix = isPercentage ? '%' : '';
    return `${sign}${change.toFixed(1)}${suffix}`;
  };

  const getSeverityColor = (type: string): string => {
    switch (type) {
      case 'high_risk':
      case 'frailty':
      case 'concerning_decline':
      case 'concerning_increase':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'moderate_risk':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'concerning_decline':
        return <TrendingDown className="h-4 w-4" />;
      case 'concerning_increase':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Physician Biometrics Report</h2>
              <p className="text-sm text-gray-500 mt-1">
                Generated on {new Date(report.generatedDate).toLocaleDateString()} • Patient ID: {report.patientId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Executive Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Executive Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-800">{report.summary.metricsWithData}</div>
                <div className="text-sm text-blue-600">Metrics Analyzed</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-800">{report.summary.thresholdBreaches}</div>
                <div className="text-sm text-red-600">Threshold Breaches</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-800">{report.summary.trajectoryAlerts}</div>
                <div className="text-sm text-orange-600">Trajectory Alerts</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-800">{report.referralRecommendations.length}</div>
                <div className="text-sm text-purple-600">Referrals Suggested</div>
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Metric Analysis</h3>
            <div className="space-y-4">
              {report.analyses.map((analysis, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{analysis.label}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        Baseline: {formatValue(analysis.baseline, analysis.unit)} →
                        Latest: {formatValue(analysis.latest, analysis.unit)}
                        {analysis.absoluteChange !== undefined && (
                          <span className="ml-2">
                            (Δ {formatChange(analysis.absoluteChange)} {analysis.unit},
                            {formatChange(analysis.percentChange, true)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {analysis.thresholdBreach && (
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(analysis.thresholdBreach.type)}`}>
                          {getSeverityIcon(analysis.thresholdBreach.type)}
                          <span>{analysis.thresholdBreach.message}</span>
                        </span>
                      )}
                      {analysis.trajectoryAlert && (
                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(analysis.trajectoryAlert.type)}`}>
                          {getSeverityIcon(analysis.trajectoryAlert.type)}
                          <span>{analysis.trajectoryAlert.message}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {(analysis.thresholdBreach || analysis.trajectoryAlert) && (
                    <div className="bg-gray-50 p-3 rounded-md mt-3">
                      <p className="text-sm text-gray-700">
                        <strong>Clinical Significance:</strong>{' '}
                        {analysis.thresholdBreach?.clinical_significance || analysis.trajectoryAlert?.clinical_significance}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cross-Domain Correlations */}
          {report.crossDomainCorrelations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Cross-Domain Correlations
              </h3>
              <div className="space-y-3">
                {report.crossDomainCorrelations.map((correlation, index) => (
                  <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800">{correlation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral Recommendations */}
          {report.referralRecommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Referral Recommendations</h3>
              <div className="space-y-2">
                {report.referralRecommendations.map((referral, index) => (
                  <div key={index} className="flex items-start space-x-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{referral}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Clinical Evidence References</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="space-y-2">
                {report.references.map((reference, index) => (
                  <p key={index} className="text-xs text-gray-600">
                    {index + 1}. {reference}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
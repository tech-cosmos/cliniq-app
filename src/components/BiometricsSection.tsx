import React, { useState, useEffect } from 'react';
import { Biometrics } from '../types/database';
import { BiometricsChart } from './BiometricsChart';
import { PhysicianReport } from './PhysicianReport';
import BiometricsService from '../services/biometrics';
import BiometricsAnalysisService from '../services/biometricsAnalysis';
import { TrendingUp, Activity, Brain, Heart, Download, FileText, Loader, BarChart3, Plus, AlertTriangle, CheckCircle } from 'lucide-react';

interface BiometricsSectionProps {
  patientId: string;
}

export const BiometricsSection: React.FC<BiometricsSectionProps> = ({ patientId }) => {
  const [biometrics, setBiometrics] = useState<Biometrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadBiometrics();
  }, [patientId]);

  const loadBiometrics = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading biometrics for patient:', patientId);
      const data = await BiometricsService.getBiometricsByPatientId(patientId);
      console.log('Biometrics data loaded:', data);
      setBiometrics(data);
    } catch (err) {
      console.error('Failed to load biometrics:', err);
      setError(`Failed to load biometrics data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const categories = BiometricsService.getMetricCategories();

  const exportToCSV = () => {
    if (biometrics.length === 0) return;

    const timepointLabels = BiometricsService.getTimepointLabels();

    // Create CSV headers
    const headers = ['Timepoint'];
    Object.entries(categories).forEach(([categoryKey, category]) => {
      Object.entries(category.metrics).forEach(([metricKey, metric]) => {
        headers.push(`${metric.label} ${metric.unit}`);
      });
    });

    // Create CSV rows
    const rows = [headers];
    ['baseline', '3m', '6m', '12m'].forEach(timepoint => {
      const timepointData = biometrics.find(b => b.timepoint === timepoint);
      const row = [timepointLabels[timepoint as keyof typeof timepointLabels]];

      Object.entries(categories).forEach(([categoryKey, category]) => {
        Object.entries(category.metrics).forEach(([metricKey, metric]) => {
          if (timepointData) {
            const value = BiometricsService.formatMetricValue(metricKey, timepointData[metricKey as keyof Biometrics] as number);
            row.push(value);
          } else {
            row.push('N/A');
          }
        });
      });
      rows.push(row);
    });

    // Convert to CSV string
    const csvContent = rows.map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `biometrics-data-${patientId}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const generateResearchReport = async () => {
    if (biometrics.length === 0) return;

    try {
      setGeneratingReport(true);
      setError(null);

      console.log('Generating physician report for patient:', patientId);
      const generatedReport = await BiometricsAnalysisService.generatePhysicianReport(patientId, biometrics);
      console.log('Report generated:', generatedReport);

      setReport(generatedReport);
      setShowReport(true);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(`Failed to generate research report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getCategoryIcon = (categoryKey: string) => {
    switch (categoryKey) {
      case 'cardiopulmonary':
        return Heart;
      case 'neurologic':
        return Brain;
      case 'metabolic':
        return Activity;
      case 'patientReported':
        return TrendingUp;
      default:
        return Activity;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-3xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight text-left">Biometrics</h2>
              <p className="text-gray-600 font-medium">Loading comprehensive health metrics...</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl p-16 border border-gray-200/50 shadow-xl text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 animate-pulse"></div>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-blue-800 mb-2">Loading Biometrics Data</h4>
            <p className="text-blue-700 text-lg">Fetching health metrics and trends...</p>
            <div className="flex items-center justify-center space-x-2 mt-4">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-3xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight text-left">Biometrics</h2>
              <p className="text-gray-600 font-medium">Comprehensive health metrics tracking</p>
            </div>
          </div>
        </div>

        {/* Error State */}
        <div className="bg-gradient-to-br from-red-50 via-white to-pink-50 rounded-3xl p-8 border border-red-200/50 shadow-xl">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-3 rounded-2xl shadow-lg flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-red-800 mb-2">Loading Error</h4>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-red-100">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button
                onClick={loadBiometrics}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (biometrics.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-3xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-amber-500 w-6 h-6 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">0</span>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight text-left">Biometrics</h2>
              <p className="text-gray-600 font-medium">Comprehensive health metrics tracking</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl p-16 border border-gray-200/50 shadow-xl text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-3xl mx-auto flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-blue-500" />
            </div>
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-cyan-600 w-8 h-8 rounded-full flex items-center justify-center mx-auto">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <h4 className="text-3xl font-bold text-gray-900 mb-4">No Biometrics Data</h4>
          <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
            No biometric measurements have been recorded for this patient yet. Health metrics will appear here once data is collected.
          </p>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-blue-200/50 inline-block">
            <div className="flex items-center space-x-6 text-sm text-blue-700">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Cardiopulmonary</span>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span>Neurologic</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span>Metabolic</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 rounded-3xl p-8 border border-gray-200/50 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-3xl shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 w-6 h-6 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{new Set(biometrics.map(b => b.timepoint)).size}</span>
              </div>
            </div>
            <div className='pl-2'>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight text-left">Biometrics</h2>
              <p className="text-gray-600 font-medium">
                {biometrics.length} data points across {new Set(biometrics.map(b => b.timepoint)).size} timepoints
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generateResearchReport}
              disabled={generatingReport || biometrics.length === 0}
              className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              title="Generate AI-powered physician report"
            >
              {generatingReport ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span className="font-semibold">Generating...</span>
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="font-semibold">Report</span>
                </>
              )}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <button
              onClick={exportToCSV}
              className="group relative flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              title="Export data to CSV"
            >
              <Download className="h-5 w-5 group-hover:-translate-y-1 transition-transform duration-300" />
              <span className="font-semibold">Export CSV</span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Biometric Categories */}
      {Object.entries(categories).map(([categoryKey, category]) => {
        const Icon = getCategoryIcon(categoryKey);

        const getCategoryColors = (categoryKey: string) => {
          switch (categoryKey) {
            case 'cardiopulmonary':
              return {
                bg: 'from-red-50 via-white to-pink-50',
                iconBg: 'from-red-500 to-pink-600',
                accent: 'from-red-500 to-pink-500'
              };
            case 'neurologic':
              return {
                bg: 'from-purple-50 via-white to-indigo-50',
                iconBg: 'from-purple-500 to-indigo-600',
                accent: 'from-purple-500 to-indigo-500'
              };
            case 'metabolic':
              return {
                bg: 'from-green-50 via-white to-emerald-50',
                iconBg: 'from-green-500 to-emerald-600',
                accent: 'from-green-500 to-emerald-500'
              };
            case 'patientReported':
              return {
                bg: 'from-orange-50 via-white to-amber-50',
                iconBg: 'from-orange-500 to-amber-600',
                accent: 'from-orange-500 to-amber-500'
              };
            default:
              return {
                bg: 'from-gray-50 via-white to-gray-50',
                iconBg: 'from-gray-500 to-gray-600',
                accent: 'from-gray-500 to-gray-500'
              };
          }
        };

        const colors = getCategoryColors(categoryKey);

        return (
          <div key={categoryKey} className={`bg-gradient-to-br ${colors.bg} rounded-3xl p-8 border border-gray-200/50 shadow-xl`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className={`bg-gradient-to-r ${colors.iconBg} p-3 rounded-2xl shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{category.title}</h3>
                  <p className="text-gray-600 font-medium mt-1">
                    {Object.keys(category.metrics).length} metrics tracked over time
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 bg-gradient-to-r ${colors.accent} text-white rounded-2xl shadow-sm`}>
                <span className="text-sm font-semibold">
                  {Object.keys(category.metrics).length} metrics
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {Object.entries(category.metrics).map(([metricKey, metric]) => (
                <div key={metricKey} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <BiometricsChart
                    data={biometrics}
                    metricKey={metricKey}
                    metricLabel={metric.label}
                    metricUnit={metric.unit}
                    color={metric.color}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Research Report Modal */}
      {showReport && report && (
        <PhysicianReport
          report={report}
          onClose={() => {
            setShowReport(false);
            setReport(null);
          }}
        />
      )}
    </div>
  );
};
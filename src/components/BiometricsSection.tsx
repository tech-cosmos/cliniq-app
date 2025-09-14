import React, { useState, useEffect } from 'react';
import { Biometrics } from '../types/database';
import { BiometricsChart } from './BiometricsChart';
import { PhysicianReport } from './PhysicianReport';
import BiometricsService from '../services/biometrics';
import BiometricsAnalysisService from '../services/biometricsAnalysis';
import { TrendingUp, Activity, Brain, Heart, Download, FileText, Loader } from 'lucide-react';

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Biometrics</h2>
        </div>
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading biometrics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Biometrics</h2>
        </div>
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (biometrics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Biometrics</h2>
        </div>
        <div className="bg-white border rounded-lg p-12 text-center">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No biometrics data found for this patient.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Biometrics</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {biometrics.length} data points across {new Set(biometrics.map(b => b.timepoint)).size} timepoints
          </div>
          <button
            onClick={generateResearchReport}
            disabled={generatingReport || biometrics.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate AI-powered physician report"
          >
            {generatingReport ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span>{generatingReport ? 'Generating...' : 'Research Report'}</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Export data to CSV"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {Object.entries(categories).map(([categoryKey, category]) => {
        const Icon = getCategoryIcon(categoryKey);

        return (
          <div key={categoryKey} className="bg-gray-50 p-6 rounded-lg border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Icon className="h-6 w-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{category.title}</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(category.metrics).map(([metricKey, metric]) => (
                <BiometricsChart
                  key={metricKey}
                  data={biometrics}
                  metricKey={metricKey}
                  metricLabel={metric.label}
                  metricUnit={metric.unit}
                  color={metric.color}
                />
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
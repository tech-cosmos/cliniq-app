import React, { useState, useEffect } from 'react';
import { Biometrics } from '../types/database';
import { BiometricsChart } from './BiometricsChart';
import BiometricsService from '../services/biometrics';
import { TrendingUp, Activity, Brain, Heart } from 'lucide-react';

interface BiometricsSectionProps {
  patientId: string;
}

export const BiometricsSection: React.FC<BiometricsSectionProps> = ({ patientId }) => {
  const [biometrics, setBiometrics] = useState<Biometrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="text-sm text-gray-500">
          {biometrics.length} data points across {new Set(biometrics.map(b => b.timepoint)).size} timepoints
          {/* Debug info */}
          <div className="text-xs text-blue-600 mt-1">
            Patient ID: {patientId}
          </div>
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

      {/* Summary table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Data Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timepoint
                </th>
                {Object.entries(categories).map(([categoryKey, category]) =>
                  Object.entries(category.metrics).map(([metricKey, metric]) => (
                    <th key={metricKey} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {metric.label} {metric.unit}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {['baseline', '3m', '6m', '12m'].map(timepoint => {
                const timepointData = biometrics.find(b => b.timepoint === timepoint);
                const timepointLabels = BiometricsService.getTimepointLabels();

                return (
                  <tr key={timepoint} className={timepointData ? '' : 'opacity-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {timepointLabels[timepoint as keyof typeof timepointLabels]}
                    </td>
                    {Object.entries(categories).map(([categoryKey, category]) =>
                      Object.entries(category.metrics).map(([metricKey, metric]) => (
                        <td key={metricKey} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {timepointData
                            ? BiometricsService.formatMetricValue(metricKey, timepointData[metricKey as keyof Biometrics] as number)
                            : 'N/A'
                          }
                        </td>
                      ))
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
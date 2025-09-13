import React from 'react';
import { Biometrics } from '../types/database';

interface BiometricsChartProps {
  data: Biometrics[];
  metricKey: string;
  metricLabel: string;
  metricUnit: string;
  color: string;
}

export const BiometricsChart: React.FC<BiometricsChartProps> = ({
  data,
  metricKey,
  metricLabel,
  metricUnit,
  color
}) => {
  console.log(`Rendering chart for ${metricKey}:`, data.length, 'data points');
  const timepointOrder = ['baseline', '3m', '6m', '12m'];
  const timepointLabels = {
    'baseline': 'Baseline',
    '3m': '3M',
    '6m': '6M',
    '12m': '12M'
  };

  // Sort data by timepoint order and filter out null values
  const sortedData = data
    .filter(d => {
      const value = d[metricKey as keyof Biometrics];
      return value !== null && value !== undefined && value !== '';
    })
    .sort((a, b) => timepointOrder.indexOf(a.timepoint) - timepointOrder.indexOf(b.timepoint));

  if (sortedData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-2">{metricLabel} {metricUnit}</h4>
        <div className="h-32 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const values = sortedData.map(d => {
    const rawValue = d[metricKey as keyof Biometrics];
    const numValue = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
    return isNaN(numValue) ? 0 : numValue;
  });

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const chartWidth = 280;
  const chartHeight = 120;
  const padding = 20;
  const innerWidth = chartWidth - (padding * 2);
  const innerHeight = chartHeight - (padding * 2);

  // Calculate points for the line chart
  const points = sortedData.map((d, index) => {
    const rawValue = d[metricKey as keyof Biometrics];
    const value = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
    const numValue = isNaN(value) ? 0 : value;
    const x = padding + (index * innerWidth / Math.max(sortedData.length - 1, 1));
    const y = padding + innerHeight - ((numValue - minValue) / valueRange * innerHeight);
    return { x, y, value: numValue, timepoint: d.timepoint };
  });

  // Create path string for the line
  const pathString = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h4 className="font-medium text-gray-900 mb-4">{metricLabel} {metricUnit}</h4>

      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id={`grid-${metricKey}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>

          {/* Y-axis labels */}
          <g className="text-xs text-gray-500">
            <text x={padding - 5} y={padding + 4} textAnchor="end">
              {maxValue.toFixed(1)}
            </text>
            <text x={padding - 5} y={chartHeight - padding + 4} textAnchor="end">
              {minValue.toFixed(1)}
            </text>
          </g>

          {/* Line chart */}
          <path
            d={pathString}
            fill="none"
            stroke={color}
            strokeWidth="2"
            className="drop-shadow-sm"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                className="drop-shadow-sm"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="2"
                fill="white"
              />
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-5">
          {points.map((point, index) => (
            <div key={index} className="text-xs text-gray-500 text-center">
              <div>{timepointLabels[point.timepoint as keyof typeof timepointLabels]}</div>
              <div className="font-medium text-gray-700">{point.value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
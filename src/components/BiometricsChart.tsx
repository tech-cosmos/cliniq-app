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

  const chartWidth = 450;
  const chartHeight = 220;
  const padding = 50;
  const innerWidth = chartWidth - (padding * 2);
  const innerHeight = chartHeight - (padding * 2);

  // Calculate points for the line chart - Timeline on X-axis, Values on Y-axis
  const points = sortedData.map((d, index) => {
    const rawValue = d[metricKey as keyof Biometrics];
    const value = typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue);
    const numValue = isNaN(value) ? 0 : value;
    // X = timepoint position (horizontal), Y = value position (vertical, inverted)
    const x = padding + (index * innerWidth / Math.max(sortedData.length - 1, 1));
    const y = padding + innerHeight - ((numValue - minValue) / valueRange * innerHeight);
    return { x, y, value: numValue, timepoint: d.timepoint };
  });

  // Create path string for the line
  const pathString = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <h4 className="font-semibold text-gray-800 mb-6 text-lg">{metricLabel} {metricUnit}</h4>

      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="overflow-visible">
          {/* Enhanced definitions */}
          <defs>
            <linearGradient id={`gradient-${metricKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
            <filter id={`glow-${metricKey}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Y-axis labels (values with units) */}
          <g className="text-sm text-gray-500 font-medium">
            {/* Show 5 Y-axis labels for better granularity */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const value = minValue + (ratio * valueRange);
              const y = padding + innerHeight - (ratio * innerHeight);
              return (
                <text key={index} x={padding - 12} y={y + 4} textAnchor="end" className="fill-gray-500">
                  {metricKey === 'gait_speed' ? value.toFixed(2) : value.toFixed(1)}{metricUnit}
                </text>
              );
            })}
          </g>

          {/* X-axis labels (timepoints) */}
          <g className="text-base text-gray-700 font-semibold">
            {sortedData.map((d, index) => {
              const x = padding + (index * innerWidth / Math.max(sortedData.length - 1, 1));
              return (
                <text key={index} x={x} y={chartHeight - padding + 25} textAnchor="middle" className="fill-gray-700">
                  {timepointLabels[d.timepoint as keyof typeof timepointLabels]}
                </text>
              );
            })}
          </g>

          {/* Enhanced line chart */}
          <path
            d={pathString}
            fill="none"
            stroke={color}
            strokeWidth="4"
            className="drop-shadow-lg"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${metricKey})`}
          />

          {/* Data points */}
          {points.map((point, index) => {
            const tooltipValue = metricKey === 'gait_speed' ? point.value.toFixed(2) : point.value.toFixed(1);
            const tooltipText = `${tooltipValue}${metricUnit}`;
            const tooltipWidth = tooltipText.length * 9 + 16; // Dynamic width based on text length
            const tooltipX = Math.max(tooltipWidth/2 + 8, Math.min(point.x, chartWidth - tooltipWidth/2 - 8)); // Keep tooltip within bounds

            return (
              <g key={index} className="group">
                {/* Hover area for better interaction */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="20"
                  fill="transparent"
                  className="cursor-pointer"
                />
                {/* Main data point - no hover effects */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={color}
                  className="drop-shadow-lg"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="white"
                />
                {/* Enhanced value tooltip */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect
                    x={tooltipX - tooltipWidth/2}
                    y={point.y - 45}
                    width={tooltipWidth}
                    height="28"
                    rx="8"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))' }}
                  />
                  {/* Tooltip arrow */}
                  <polygon
                    points={`${tooltipX - 6},${point.y - 17} ${tooltipX + 6},${point.y - 17} ${tooltipX},${point.y - 10}`}
                    fill="#1e293b"
                  />
                  <text
                    x={tooltipX}
                    y={point.y - 25}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fill: '#f1f5f9',
                      fontSize: '13px',
                      fontWeight: '600',
                      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    {tooltipText}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Axis lines */}
          <g stroke="#d1d5db" strokeWidth="2">
            {/* Y-axis line */}
            <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} />
            {/* X-axis line */}
            <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} />
          </g>
        </svg>

      </div>
    </div>
  );
};
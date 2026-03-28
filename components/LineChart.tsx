import React from "react";

interface LineChartProps {
  data: { date: string; revenue: number }[];
  height?: number;
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  color = "#ec4899",
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const width = 100;
  const padding = 10;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
      const y =
        height - (d.revenue / maxRevenue) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => (
          <line
            key={i}
            x1={padding}
            y1={height - percent * (height - 2 * padding) - padding}
            x2={width - padding}
            y2={height - percent * (height - 2 * padding) - padding}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.2"
          />
        ))}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Area under line */}
        <polygon
          points={`${padding},${height - padding} ${points} ${
            width - padding
          },${height - padding}`}
          fill={`url(#gradient-${color.replace("#", "")})`}
          opacity="0.3"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient
            id={`gradient-${color.replace("#", "")}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
          const y =
            height -
            (d.revenue / maxRevenue) * (height - 2 * padding) -
            padding;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1"
              fill={color}
              className="hover:r-2 transition-all"
            >
              <title>
                {d.date}: €{d.revenue.toFixed(2)}
              </title>
            </circle>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data[0]?.date}</span>
        <span>€{maxRevenue.toFixed(0)}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
};

export default LineChart;

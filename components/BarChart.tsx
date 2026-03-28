import React from "react";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 200 }) => {
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

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-300 truncate flex-1 mr-4">
              {item.label}
            </span>
            <span className="font-black text-pink-400">{item.value}</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                background:
                  item.color ||
                  `linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default BarChart;

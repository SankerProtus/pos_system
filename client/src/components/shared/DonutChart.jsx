import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export const DonutChart = ({ segments = [] }) => {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  // Create segments with percentage data
  const segmentsWithPercentage = segments.map((seg) => ({
    ...seg,
    percentage: total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0,
  }));

  // Custom tooltip that shows percentage
  const CustomTooltipWithPercentage = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-[#141d2e] border border-[#263548] rounded-lg px-3 py-2 shadow-xl">
          <p className="text-slate-300 text-sm font-medium">
            {payload[0].name}
          </p>
          <p className="text-indigo-400 text-sm font-mono font-semibold">
            {value} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={segmentsWithPercentage}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
          >
            {segmentsWithPercentage.map((segment, index) => (
              <Cell key={`cell-${index}`} fill={segment.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltipWithPercentage />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segmentsWithPercentage.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: segment.color }}
            ></div>
            <span className="text-sm text-slate-300 flex-1">
              {segment.name}
            </span>
            <span className="text-sm text-slate-400 font-mono">
              {segment.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

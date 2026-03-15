import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// A helper component that displays information when you hover over the chart segments. It shows the name and value of the segment in a styled tooltip.
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141d2e] border border-[#263548] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-slate-300 text-sm font-medium">
          {payload[0].name}
        </p>
        <p className="text-indigo-400 text-sm font-mono font-semibold">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const DonutChart = ({ segments = [] }) => {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
          >
            {segments.map((segment, index) => (
              <Cell key={`cell-${index}`} fill={segment.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: segment.color }}
            ></div>
            <span className="text-sm text-slate-300 flex-1">{segment.name}</span>
            <span className="text-sm text-slate-400 font-mono">
              {((segment.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
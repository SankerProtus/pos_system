import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141d2e] border border-[#263548] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-slate-300 text-sm font-medium">
          {payload[0].payload.label}
        </p>
        <p className="text-indigo-400 text-sm font-mono font-semibold">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

// The BarChart component is a reusable chart component that displays a bar chart using the Recharts library.
export const BarChart = ({ data = [], color = "#6366f1", height = 200 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
        <XAxis
          dataKey="label"
          stroke="#64748b"
          tick={{ fill: "#64748b", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          stroke="#64748b"
          tick={{ fill: "#64748b", fontSize: 12 }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e2d45" }} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

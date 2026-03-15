import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Topbar } from "../components/layout/Topbar";
import { KpiCard } from "../components/shared/KpiCard";
import { BarChart } from "../components/shared/BarChart";
import { DonutChart } from "../components/shared/DonutChart";
import { DataTable } from "../components/shared/DataTable";
import { Badge } from "../components/common/Badge";
import { Loader } from "../components/common/Loader";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { apiClient } from "../api/axios";
import { API_ENDPOINTS } from "../constants/index.js";
import toast from "react-hot-toast";

export const DashboardPage = () => {
  const today = formatDate.iso(new Date());

  const {
    data: dailyData,
    isLoading: isDailyLoading,
    error: dailyError,
  } = useQuery({
    queryKey: ["dashboard-daily", today],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.GET_DAILY.replace(":date", today));
      return response.data;
    },
    retry: 1,
    retryDelay: 1000,
  });

  const {
    data: weeklyData,
    isLoading: isWeeklyLoading,
    error: weeklyError,
  } = useQuery({
    queryKey: ["dashboard-weekly"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.GET_WEEKLY);
      return response.data;
    },
    retry: 1,
    retryDelay: 1000,
  });

  const { data: salesData, isLoading: isSalesLoading } = useQuery({
    queryKey: ["dashboard-sales"],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.GET_SALES);
      return response.data;
    },
    retry: 1,
    retryDelay: 1000,
  });

  // Handle errors
  useEffect(() => {
    if (dailyError) {
      toast.error("Failed to load daily summary");
    }
    if (weeklyError) {
      toast.error("Failed to load weekly data");
    }
  }, [dailyError, weeklyError]);

  const isLoading = isDailyLoading || isWeeklyLoading || isSalesLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6 flex items-center justify-center">
          <Loader size="lg" />
        </main>
      </div>
    );
  }

  // Show error state if critical data failed to load
  if (dailyError || weeklyError) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          title="Dashboard"
          subtitle="Overview of your store performance"
        />
        <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-2">
              ⚠️ Hmm... Something went wrong.
            </div>
            <p className="text-slate-400 mb-4">
              Failed to load dashboard data. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Safely extract chart data with fallbacks
  const weeklyChartData = Array.isArray(weeklyData?.days)
    ? weeklyData.days.map((day) => ({
        label: day?.label || "N/A",
        value: day?.revenue || 0,
      }))
    : [];

  const paymentSegments = Array.isArray(dailyData?.paymentMethodBreakdown)
    ? dailyData.paymentMethodBreakdown.map((method) => ({
        name: method?.method || "Unknown",
        value: method?.amount || 0,
        color:
          method?.method === "CASH"
            ? "#10b981"
            : method?.method === "MOBILE_MONEY"
              ? "#f59e0b"
              : "#6366f1",
      }))
    : [];

  const salesColumns = [
    {
      key: "receiptNumber",
      header: "TXN ID",
      render: (row) => (
        <span className="font-mono text-indigo-400">
          {row?.receiptNumber || "N/A"}
        </span>
      ),
    },
    {
      key: "cashier",
      header: "Cashier",
      render: (row) => row?.cashier?.name || "N/A",
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (row) => (
        <span className="font-mono text-amber-400">
          {formatCurrency(row?.totalAmount || 0)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row) => (
        <Badge variant="indigo">{row?.paymentMethod || "N/A"}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge variant="green">{row?.status || "N/A"}</Badge>,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar title="Dashboard" subtitle="Overview of your store performance" />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        <div className="flex flex-col gap-5">
          {/* ROW 1 - KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Today's Revenue"
              value={formatCurrency(dailyData?.totalRevenue || 0)}
              subtitle="Total sales today"
              colorVariant="amber"
            />
            <KpiCard
              label="Transactions"
              value={dailyData?.totalTransactions || 0}
              subtitle="Completed sales"
              colorVariant="indigo"
            />
            <KpiCard
              label="Products Sold"
              value={dailyData?.totalItemsSold || 0}
              subtitle="Items sold today"
              colorVariant="green"
            />
            <KpiCard
              label="Low Stock Alerts"
              value={dailyData?.lowStockCount || 0}
              subtitle="Items below threshold"
              colorVariant="red"
            />
          </div>

          {/* ROW 2 - Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Weekly Sales
              </h3>
              <BarChart data={weeklyChartData} color="#6366f1" height={250} />
            </div>
            <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Payment Methods
              </h3>
              <DonutChart segments={paymentSegments} />
            </div>
          </div>

          {/* ROW 3 - Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-100">
                  Recent Transactions
                </h3>
                <Badge variant="green">LIVE</Badge>
              </div>
              <DataTable
                columns={salesColumns}
                data={Array.isArray(salesData?.data) ? salesData.data : []}
                isLoading={isSalesLoading}
                emptyMessage="No sales today"
              />
            </div>
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Top Products Today
              </h3>
              <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5 space-y-3">
                {dailyData?.topProducts && dailyData.topProducts.length > 0 ? (
                  dailyData.topProducts.slice(0, 5).map((product, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">
                          {product?.name || "Unknown Product"}
                        </span>
                        <span className="text-amber-400 font-mono">
                          {formatCurrency(product?.revenue || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-[#0f172a] rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${product?.revenueShare || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm text-center py-4">
                    No product data
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

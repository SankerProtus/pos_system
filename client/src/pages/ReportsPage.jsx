import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { KpiCard } from "../components/shared/KpiCard";
import { BarChart } from "../components/shared/BarChart";
import { DonutChart } from "../components/shared/DonutChart";
import { DataTable } from "../components/shared/DataTable";
import { Badge } from "../components/common/Badge";
import { apiClient } from "../api/axios";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { Download } from "lucide-react";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [date, setDate] = useState(formatDate.iso(new Date()));
  const [weekStart, setWeekStart] = useState(formatDate.iso(new Date()));
  const [dateFrom, setDateFrom] = useState(formatDate.iso(new Date()));
  const [dateTo, setDateTo] = useState(formatDate.iso(new Date()));
  const [productPage, setProductPage] = useState(1);
  const [cashierPage, setCashierPage] = useState(1);
  const pageSize = 10;

  const { data: dailyReport } = useQuery({
    queryKey: ["daily-report", date],
    queryFn: async () => {
      const response = await apiClient.get(`/reports/daily?date=${date}`);
      return response.data;
    },
    enabled: activeTab === "daily",
  });

  const { data: weeklyReport } = useQuery({
    queryKey: ["weekly-report", weekStart],
    queryFn: async () => {
      const response = await apiClient.get(
        `/reports/weekly?weekStart=${weekStart}`,
      );
      return response.data;
    },
    enabled: activeTab === "weekly",
  });

  const { data: productPerformance } = useQuery({
    queryKey: ["product-performance", dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.get(
        `/reports/products?from=${dateFrom}&to=${dateTo}`,
      );
      return response.data;
    },
    enabled: activeTab === "products",
  });

  const { data: cashierReport } = useQuery({
    queryKey: ["cashier-report", date],
    queryFn: async () => {
      const response = await apiClient.get(`/reports/cashiers?date=${date}`);
      return response.data;
    },
    enabled: activeTab === "cashiers",
  });

  const tabs = [
    { id: "daily", label: "Daily Summary" },
    { id: "weekly", label: "Weekly Trend" },
  ];

  const hourlyChartData =
    dailyReport?.hourlySales?.map((item) => ({
      label: `${item.hour}:00`,
      value: item.revenue,
    })) || [];

  const paymentSegments =
    dailyReport?.paymentMethodBreakdown?.map((method) => ({
      name: method.method,
      value: method.count ?? method.amount,
      color:
        method.method === "CASH"
          ? "#10b981"
          : method.method === "CARD"
            ? "#3b82f6"
            : method.method === "MOBILE_MONEY"
              ? "#f59e0b"
              : method.method === "BANK_TRANSFER"
                ? "#8b5cf6"
                : "#6366f1",
    })) || [];

  const weeklyChartData =
    weeklyReport?.days?.map((day) => ({
      label: day.label,
      value: day.revenue,
    })) || [];

  const productRows = productPerformance || [];
  const cashierRows = cashierReport || [];
  const productTotalPages = Math.max(
    1,
    Math.ceil(productRows.length / pageSize),
  );
  const cashierTotalPages = Math.max(
    1,
    Math.ceil(cashierRows.length / pageSize),
  );

  useEffect(() => {
    setProductPage(1);
  }, [dateFrom, dateTo, activeTab]);

  useEffect(() => {
    setCashierPage(1);
  }, [date, activeTab]);

  useEffect(() => {
    setProductPage((prev) => Math.min(prev, productTotalPages));
  }, [productTotalPages]);

  useEffect(() => {
    setCashierPage((prev) => Math.min(prev, cashierTotalPages));
  }, [cashierTotalPages]);

  const paginatedProductRows = useMemo(() => {
    const start = (productPage - 1) * pageSize;
    return productRows.slice(start, start + pageSize);
  }, [productRows, productPage]);

  const paginatedCashierRows = useMemo(() => {
    const start = (cashierPage - 1) * pageSize;
    return cashierRows.slice(start, start + pageSize);
  }, [cashierRows, cashierPage]);

  const csvEscape = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const downloadCsv = (headers, rows, filenamePrefix) => {
    const csv = [headers, ...rows]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${filenamePrefix}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    if (activeTab === "daily") {
      const report = dailyReport;
      if (!report) {
        toast.error("No daily report data to export");
        return;
      }

      const rows = [
        ["Report Date", date],
        ["Total Revenue", Number(report.totalRevenue || 0).toFixed(2)],
        ["Transactions", report.totalTransactions || 0],
        ["Items Sold", report.totalItemsSold || 0],
        ["Gross Profit", Number(report.grossProfit || 0).toFixed(2)],
      ];

      if (Array.isArray(report.hourlySales) && report.hourlySales.length) {
        rows.push([]);
        rows.push(["Hourly Sales"]);
        rows.push(["Hour", "Revenue", "Transactions"]);
        report.hourlySales.forEach((item) => {
          rows.push([
            `${item.hour}:00`,
            Number(item.revenue || 0).toFixed(2),
            item.transactions || 0,
          ]);
        });
      }

      if (
        Array.isArray(report.paymentMethodBreakdown) &&
        report.paymentMethodBreakdown.length
      ) {
        rows.push([]);
        rows.push(["Payment Method Breakdown"]);
        rows.push(["Method", "Amount", "Count"]);
        report.paymentMethodBreakdown.forEach((item) => {
          rows.push([
            item.method || "UNKNOWN",
            Number(item.amount || 0).toFixed(2),
            item.count || 0,
          ]);
        });
      }

      downloadCsv(["Metric", "Value", "Extra"], rows, "daily-report");
      return;
    }

    if (activeTab === "weekly") {
      const report = weeklyReport;
      if (!report) {
        toast.error("No weekly report data to export");
        return;
      }

      const rows = [
        ["Week Start", weekStart],
        ["Total Revenue", Number(report.totalRevenue || 0).toFixed(2)],
        [
          "Previous Week Revenue",
          Number(report.previousWeekRevenue || 0).toFixed(2),
        ],
        ["Transactions", report.totalTransactions || 0],
      ];

      if (Array.isArray(report.days) && report.days.length) {
        rows.push([]);
        rows.push(["Daily Trend"]);
        rows.push(["Day", "Revenue", "Transactions"]);
        report.days.forEach((day) => {
          rows.push([
            day.label || "",
            Number(day.revenue || 0).toFixed(2),
            day.transactions || 0,
          ]);
        });
      }

      downloadCsv(["Metric", "Value", "Extra"], rows, "weekly-report");
      return;
    }

    if (activeTab === "products") {
      const rows = productPerformance || [];
      if (!rows.length) {
        toast.error("No product performance data to export");
        return;
      }

      downloadCsv(
        ["Product", "Units Sold", "Revenue", "Avg Price", "Revenue Share %"],
        rows.map((row) => [
          row.name || "",
          row.unitsSold || 0,
          Number(row.revenue || 0).toFixed(2),
          Number(row.avgPrice || 0).toFixed(2),
          Number(row.revenueShare || 0).toFixed(2),
        ]),
        "product-performance-report",
      );
      return;
    }

    if (activeTab === "cashiers") {
      const rows = cashierReport || [];
      if (!rows.length) {
        toast.error("No cashier report data to export");
        return;
      }

      downloadCsv(
        ["Cashier", "Role", "Transactions", "Revenue", "Avg Sale", "Peak Hour"],
        rows.map((row) => [
          row.cashier?.name || "",
          row.cashier?.role || "",
          row.totalSales || 0,
          Number(row.totalRevenue || 0).toFixed(2),
          Number(row.avgSaleValue || 0).toFixed(2),
          row.topHour || "",
        ]),
        "cashier-report",
      );
      return;
    }

    toast.error("No export handler for this report tab");
  };

  const productColumns = [
    {
      key: "rank",
      header: "Rank",
      render: (row, idx) => <span className="font-mono">#{idx + 1}</span>,
    },
    { key: "name", header: "Product" },
    {
      key: "unitsSold",
      header: "Units Sold",
      render: (row) => <span className="font-mono">{row.unitsSold}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (row) => (
        <span className="font-mono text-amber-400">
          {formatCurrency(row.revenue)}
        </span>
      ),
    },
    {
      key: "avgPrice",
      header: "Avg Price",
      render: (row) => (
        <span className="font-mono">{formatCurrency(row.avgPrice)}</span>
      ),
    },
    {
      key: "revenueShare",
      header: "% of Sales",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#0f172a] rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full"
              style={{ width: `${row.revenueShare}%` }}
            ></div>
          </div>
          <span className="text-xs font-mono w-12 text-right">
            {row.revenueShare !== undefined && row.revenueShare !== null
              ? row.revenueShare.toFixed(1)
              : "0.0"}
            %
          </span>
        </div>
      ),
    },
  ];

  const cashierColumns = [
    {
      key: "name",
      header: "Cashier",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-100 mb-1">{row.cashier.name}</p>
          <Badge variant="indigo">{row.cashier.role}</Badge>
        </div>
      ),
    },
    {
      key: "transactions",
      header: "Transactions",
      render: (row) => <span className="font-mono">{row.totalSales}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (row) => (
        <span className="font-mono text-amber-400">
          {formatCurrency(row.totalRevenue)}
        </span>
      ),
    },
    {
      key: "avgSaleValue",
      header: "Avg Sale",
      render: (row) => (
        <span className="font-mono">{formatCurrency(row.avgSaleValue)}</span>
      ),
    },
    {
      key: "topHour",
      header: "Peak Hour",
      render: (row) => <span className="font-mono">{row.topHour}</span>,
    },
    {
      key: "performance",
      header: "Performance",
      render: (row) => {
        const count = Array.isArray(cashierReport) ? cashierReport.length : 0;
        const avgRevenue = count
          ? cashierReport.reduce(
              (sum, c) => sum + Number(c.totalRevenue || 0),
              0,
            ) / count
          : 0;
        const performance =
          Number(row.totalRevenue || 0) >= avgRevenue ? "above" : "below";
        return (
          <span style={{ minWidth: 105, display: "inline-block" }}>
            <Badge variant={performance === "above" ? "green" : "amber"}>
              {performance === "above" ? "↑ Above Avg" : "↓ Below Avg"}
            </Badge>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="Reports & Analytics"
        subtitle="View detailed insights and analytics"
        actions={
          <Button
            variant="ghost"
            icon={<Download size={18} />}
            onClick={handleExportReport}
          >
            Export Report
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* Tab Bar */}
        <div className="flex gap-2 mb-5 border-b border-[#1e2d45]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 font-medium transition border-b-2 -mb-px",
                activeTab === tab.id
                  ? "text-indigo-400 border-indigo-400"
                  : "text-slate-400 border-transparent hover:text-slate-300",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Daily Summary Tab */}
        {activeTab === "daily" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">
                Date:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-4 py-2 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Revenue"
                value={formatCurrency(dailyReport?.totalRevenue || 0)}
                subtitle="Total sales"
                colorVariant="amber"
              />
              <KpiCard
                label="Transactions"
                value={dailyReport?.totalTransactions || 0}
                subtitle="Completed"
                colorVariant="indigo"
              />
              <KpiCard
                label="Items Sold"
                value={dailyReport?.totalItemsSold || 0}
                subtitle="Total units"
                colorVariant="green"
              />
              <KpiCard
                label="Gross Profit"
                value={formatCurrency(dailyReport?.grossProfit || 0)}
                subtitle="After cost"
                colorVariant="green"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">
                  Hourly Sales (8:00 - 21:00)
                </h3>
                <BarChart data={hourlyChartData} color="#6366f1" height={250} />
              </div>
              <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">
                  Payment Methods
                </h3>
                <DonutChart segments={paymentSegments} />
              </div>
            </div>
          </div>
        )}

        {/* Weekly Trend Tab */}
        {activeTab === "weekly" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">
                Week Start:
              </label>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="px-4 py-2 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KpiCard
                label="This Week"
                value={formatCurrency(weeklyReport?.totalRevenue || 0)}
                subtitle={`${weeklyReport?.totalTransactions || 0} transactions`}
                colorVariant="amber"
              />
              <KpiCard
                label="Last Week"
                value={formatCurrency(weeklyReport?.previousWeekRevenue || 0)}
                // Calculate percentage change and handle division by zero
                subtitle={
                  weeklyReport?.totalRevenue &&
                  weeklyReport?.previousWeekRevenue
                    ? `${(
                        ((weeklyReport.totalRevenue -
                          weeklyReport.previousWeekRevenue) /
                          weeklyReport.previousWeekRevenue) *
                        100
                      ).toFixed(1)}% change`
                    : "N/A"
                }
                colorVariant="indigo"
              />
            </div>

            <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-5">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Weekly Sales (Mon - Sun)
              </h3>
              <BarChart data={weeklyChartData} color="#10b981" height={300} />
            </div>
          </div>
        )}

        {/* Product Performance Tab */}
        {activeTab === "products" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">
                From:
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <label className="text-sm font-medium text-slate-300">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <DataTable
              columns={productColumns}
              data={paginatedProductRows}
              emptyMessage="No product data for selected period"
              pagination={
                productRows.length > pageSize
                  ? {
                      currentPage: productPage,
                      totalItems: productRows.length,
                      itemsPerPage: pageSize,
                      onPageChange: setProductPage,
                      itemLabel: "products",
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Cashier Report Tab */}
        {activeTab === "cashiers" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">
                Date:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-4 py-2 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <DataTable
              columns={cashierColumns}
              data={paginatedCashierRows}
              emptyMessage="No cashier data for selected date"
              pagination={
                cashierRows.length > pageSize
                  ? {
                      currentPage: cashierPage,
                      totalItems: cashierRows.length,
                      itemsPerPage: pageSize,
                      onPageChange: setCashierPage,
                      itemLabel: "cashiers",
                    }
                  : undefined
              }
            />
          </div>
        )}
      </main>
    </div>
  );
};

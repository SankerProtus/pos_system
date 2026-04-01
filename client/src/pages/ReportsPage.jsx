import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/common/Button';
import { KpiCard } from '../components/shared/KpiCard';
import { BarChart } from '../components/shared/BarChart';
import { DonutChart } from '../components/shared/DonutChart';
import { DataTable } from '../components/shared/DataTable';
import { Badge } from '../components/common/Badge';
import { apiClient } from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from "../utils/formatDate";
import { Download } from 'lucide-react';
import { cn } from '../utils/cn';

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(formatDate.iso(new Date()));
  const [weekStart, setWeekStart] = useState(formatDate.iso(new Date()));
  const [dateFrom, setDateFrom] = useState(formatDate.iso(new Date()));
  const [dateTo, setDateTo] = useState(formatDate.iso(new Date()));

  const { data: dailyReport } = useQuery({
    queryKey: ['daily-report', date],
    queryFn: async () => {
      const response = await apiClient.get(`/reports/daily?date=${date}`);
      return response.data;
    },
    enabled: activeTab === 'daily',
  });

  const { data: weeklyReport } = useQuery({
    queryKey: ['weekly-report', weekStart],
    queryFn: async () => {
      const response = await apiClient.get(`/reports/weekly?weekStart=${weekStart}`);
      return response.data;
    },
    enabled: activeTab === 'weekly',
  });
  console.log("Weekly Report", weeklyReport);

  const { data: productPerformance } = useQuery({
    queryKey: ['product-performance', dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.get(
        `/reports/products?from=${dateFrom}&to=${dateTo}`
      );
      return response.data;
    },
    enabled: activeTab === 'products',
  });

  const { data: cashierReport } = useQuery({
    queryKey: ['cashier-report', date],
    queryFn: async () => {
      const response = await apiClient.get(`/reports/cashiers?date=${date}`);
      return response.data;
    },
    enabled: activeTab === 'cashiers',
  });

  const tabs = [
    { id: 'daily', label: 'Daily Summary' },
    { id: 'weekly', label: 'Weekly Trend' },
    { id: 'products', label: 'Product Performance' },
    { id: 'cashiers', label: 'Cashier Report' },
  ];

  const hourlyChartData =
    dailyReport?.hourlySales?.map((item) => ({
      label: `${item.hour}:00`,
      value: item.revenue,
    })) || [];

  const paymentSegments =
    dailyReport?.paymentMethodBreakdown?.map((method) => ({
      name: method.method,
      value: method.amount,
      color:
        method.method === 'CASH'
          ? '#10b981'
          : method.method === 'MOBILE_MONEY'
          ? '#f59e0b'
          : '#6366f1',
    })) || [];

  const weeklyChartData =
    weeklyReport?.days?.map((day) => ({
      label: day.label,
      value: day.revenue,
    })) || [];

  const productColumns = [
    {
      key: 'rank',
      header: 'Rank',
      render: (row, idx) => <span className="font-mono">#{idx + 1}</span>,
    },
    { key: 'name', header: 'Product' },
    {
      key: 'unitsSold',
      header: 'Units Sold',
      render: (row) => <span className="font-mono">{row.unitsSold}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (row) => (
        <span className="font-mono text-amber-400">{formatCurrency(row.revenue)}</span>
      ),
    },
    {
      key: 'avgPrice',
      header: 'Avg Price',
      render: (row) => (
        <span className="font-mono">{formatCurrency(row.avgPrice)}</span>
      ),
    },
    {
      key: 'revenueShare',
      header: '% of Sales',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#0f172a] rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full"
              style={{ width: `${row.revenueShare}%` }}
            ></div>
          </div>
          <span className="text-xs font-mono w-12 text-right">
            {(row.revenueShare !== undefined && row.revenueShare !== null)
              ? row.revenueShare.toFixed(1)
              : "0.0"}%
          </span>
        </div>
      ),
    },
  ];

  const cashierColumns = [
    {
      key: 'name',
      header: 'Cashier',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-100">{row.cashier.name}</p>
          <Badge variant="indigo">{row.cashier.role}</Badge>
        </div>
      ),
    },
    {
      key: 'transactions',
      header: 'Transactions',
      render: (row) => <span className="font-mono">{row.totalSales}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (row) => (
        <span className="font-mono text-amber-400">{formatCurrency(row.totalRevenue)}</span>
      ),
    },
    {
      key: 'avgSaleValue',
      header: 'Avg Sale',
      render: (row) => (
        <span className="font-mono">{formatCurrency(row.avgSaleValue)}</span>
      ),
    },
    {
      key: 'topHour',
      header: 'Peak Hour',
      render: (row) => <span className="font-mono">{row.topHour}</span>,
    },
    {
      key: 'performance',
      header: 'Performance',
      render: (row) => {
        const count = Array.isArray(cashierReport) ? cashierReport.length : 0;
        const avgRevenue = count
          ? cashierReport.reduce((sum, c) => sum + Number(c.totalRevenue || 0), 0) / count
          : 0;
        const performance = Number(row.totalRevenue || 0) >= avgRevenue ? 'above' : 'below';
        return (
          <Badge variant={performance === 'above' ? 'green' : 'amber'}>
            {performance === 'above' ? '↑ Above Avg' : '↓ Below Avg'}
          </Badge>
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
          <Button variant="ghost" icon={<Download size={18} />}>
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
                'px-4 py-2.5 font-medium transition border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-indigo-400 border-indigo-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Daily Summary Tab */}
        {activeTab === 'daily' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">Date:</label>
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
        {activeTab === 'weekly' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">Week Start:</label>
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
                  weeklyReport?.totalRevenue && weeklyReport?.previousWeekRevenue
                    ? `${(
                        ((weeklyReport.totalRevenue - weeklyReport.previousWeekRevenue) /
                          weeklyReport.previousWeekRevenue) *
                        100
                      ).toFixed(1)}% change`
                    : 'N/A'
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
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">From:</label>
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
              data={productPerformance || []}
              emptyMessage="No product data for selected period"
            />
          </div>
        )}

        {/* Cashier Report Tab */}
        {activeTab === 'cashiers' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300">Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-4 py-2 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <DataTable
              columns={cashierColumns}
              data={cashierReport || []}
              emptyMessage="No cashier data for selected date"
            />
          </div>
        )}
      </main>
    </div>
  );
};
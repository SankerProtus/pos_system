import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { DataTable } from "../components/shared/DataTable";
import { Select } from "../components/common/Select";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Badge } from "../components/common/Badge";
import { Receipt } from "../components/shared/Receipt";
import { apiClient } from "../api/axios";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { Download, FileText, Ban } from "lucide-react";
import toast from "react-hot-toast";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export const SalesPage = () => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [voidingSaleId, setVoidingSaleId] = useState(null);
  const receiptRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales", { from: dateFrom, to: dateTo, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);
      if (statusFilter) params.append("status", statusFilter);
      const response = await apiClient.get(`/sales?${params}`);
      return response.data;
    },
  });

  const voidSaleMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await apiClient.post(`/sales/${id}/void`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["dashboard-daily"]);
      queryClient.invalidateQueries(["dashboard-weekly"]);
      queryClient.invalidateQueries(["dashboard-sales"]);
      toast.success("Sale voided successfully");
      setIsVoidDialogOpen(false);
      setVoidingSaleId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to void sale");
    },
  });

  const handleOpenDetail = (sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  const handleOpenVoid = (saleId) => {
    setVoidingSaleId(saleId);
    setIsVoidDialogOpen(true);
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const runningTotal =
    sales?.data
      ?.filter((sale) => sale.status === "COMPLETED")
      .reduce(
        (sum, sale) =>
          sum + Number(String(sale.totalAmount).replace(/[^0-9.-]+/g, "")),
        0,
      ) || 0;

  const getSalesRows = () => (Array.isArray(sales) ? sales : sales?.data || []);

  const csvEscape = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const handleExportCsv = () => {
    const rows = getSalesRows();
    if (!rows.length) {
      toast.error("No sales to export");
      return;
    }

    const headers = [
      "Receipt Number",
      "Date",
      "Cashier",
      "Customer",
      "Items",
      "Total Amount",
      "Payment Method",
      "Status",
    ];

    const lines = rows.map((row) => [
      row.receipt?.receiptNumber || "N/A",
      row.createdAt ? formatDate.standard(row.createdAt) : "",
      row.user?.name || "N/A",
      row.customer?.name || "Walk-in",
      row.saleItems?.length || 0,
      Number(row.totalAmount || 0).toFixed(2),
      row.payment?.method ? row.payment.method.replace("_", " ") : "N/A",
      row.status || "",
    ]);

    const csv = [headers, ...lines]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `sales_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "COMPLETED", label: "Completed" },
    { value: "VOIDED", label: "Voided" },
    { value: "REFUNDED", label: "Refunded" },
  ];

  const getStatusBadge = (status) => {
    const variants = {
      COMPLETED: "green",
      VOIDED: "red",
      REFUNDED: "amber",
      PENDING: "blue",
    };
    return <Badge variant={variants[status] || "muted"}>{status}</Badge>;
  };

  const getPaymentBadge = (method) => {
    return (
      <Badge variant="indigo">
        {method ? method.replace("_", " ") : "N/A"}
      </Badge>
    );
  };

  const columns = [
    {
      key: "receiptNumber",
      header: "TXN ID",
      render: (row) => (
        <span className="font-mono text-indigo-400">
          {row.receipt?.receiptNumber || "N/A"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Time",
      render: (row) => (
        <span className="text-sm">{formatDate.standard(row.createdAt)}</span>
      ),
    },
    {
      key: "cashier",
      header: "Cashier",
      render: (row) => row.user?.name || "N/A",
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.customer?.name || "Walk-in",
    },
    {
      key: "items",
      header: "Items",
      render: (row) => (
        <span className="font-mono">{row.saleItems?.length || 0}</span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (row) =>
        row.status !== "VOIDED" ? (
          <span className="font-mono text-amber-400">
            {formatCurrency(row.totalAmount || 0)}
          </span>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row) => getPaymentBadge(row.payment?.method || "N/A"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<FileText size={14} />}
            onClick={() => handleOpenDetail(row)}
          >
            Receipt
          </Button>
          {row.status === "COMPLETED" && (
            <Button
              variant="danger"
              size="sm"
              icon={<Ban size={14} />}
              onClick={() => handleOpenVoid(row.id)}
            >
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="Sales History"
        subtitle="View and manage all sales transactions"
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* Filter Bar */}
        <div className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-50">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 min-w-50">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 min-w-50">
              <Select
                label="Status"
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <Button
              variant="ghost"
              icon={<Download size={18} />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
            <div className="ml-auto">
              <Badge variant="amber" className="text-lg px-4 py-2">
                Total: {formatCurrency(runningTotal || 0)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={Array.isArray(sales) ? sales : sales?.data || []}
          isLoading={isLoading}
          emptyMessage="No sales found"
        />
      </main>

      {/* Sale Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSale(null);
        }}
        title="Sale Receipt"
        width={600}
      >
        <div className="p-6">
          {selectedSale && (
            <>
              <Receipt
                ref={receiptRef}
                sale={selectedSale}
                storeName={selectedSale?.receipt?.storeName || ""}
                storeTIN={selectedSale?.receipt?.storeTaxId || ""}
                storeAddress={selectedSale?.receipt?.storeAddress || ""}
              />
              <div className="flex justify-around align-middle mt-6 gap-2 mx-auto">
                <Button variant="ghost" onClick={handlePrint}>
                  Print Receipt
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Void Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isVoidDialogOpen}
        onClose={() => setIsVoidDialogOpen(false)}
        onConfirm={() =>
          voidSaleMutation.mutate({
            id: voidingSaleId,
            reason: "Voided by user",
          })
        }
        message="Are you sure you want to void this sale? This will reverse the inventory changes and mark the sale as voided."
        confirmLabel="Void Sale"
        confirmVariant="danger"
        title="Void Sale"
      />
    </div>
  );
};

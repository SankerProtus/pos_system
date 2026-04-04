import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { DataTable } from "../components/shared/DataTable";
import { SearchInput } from "../components/shared/SearchInput";
import { KpiCard } from "../components/shared/KpiCard";
import { Modal } from "../components/common/Modal";
import { Select } from "../components/common/Select";
import { FormInput } from "../components/common/FormInput";
import { Badge } from "../components/common/Badge";
import { apiClient } from "../api/axios";
import { formatDate } from "../utils/formatDate";
import { Package, Download } from "lucide-react";
import toast from "react-hot-toast";

export const InventoryPage = () => {
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentReason, setAdjustmentReason] = useState("PURCHASE");
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveProductId, setReceiveProductId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const {
    register: registerReceive,
    handleSubmit: handleSubmitReceive,
    reset: resetReceive,
    formState: { errors: receiveErrors },
  } = useForm({
    defaultValues: {
      quantityChange: "",
      reference: "",
      notes: "",
    },
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const response = await apiClient.get("/inventory");
      return response.data;
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/inventory/adjust", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["inventory"]);
      toast.success("Stock adjusted successfully");
      setIsAdjustModalOpen(false);
      setIsReceiveModalOpen(false);
      setSelectedProduct(null);
      setReceiveProductId("");
      reset();
      resetReceive();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to adjust stock");
    },
  });

  const handleOpenAdjust = (product, reason = "PURCHASE") => {
    setSelectedProduct(product);
    setAdjustmentReason(reason);
    reset({ quantityChange: 0 });
    setIsAdjustModalOpen(true);
  };

  const onSubmit = (data) => {
    const quantity = parseInt(data.quantityChange, 10);
    if (!Number.isFinite(quantity)) {
      toast.error("Enter a valid quantity change");
      return;
    }

    adjustStockMutation.mutate({
      productId: selectedProduct.productId,
      quantityChange: quantity,
      reason: adjustmentReason,
      notes: data.notes,
      reference: data.reference,
    });
  };

  const receiveProductOptions = [
    { value: "", label: "Select Product" },
    ...(inventory?.data?.map((item) => ({
      value: item.productId,
      label: `${item.product?.productName || "Unknown"} (${item.product?.sku || "N/A"})`,
    })) || []),
  ];

  const onSubmitReceive = (data) => {
    const quantity = Math.abs(parseInt(data.quantityChange, 10));

    if (!receiveProductId) {
      toast.error("Please select a product");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }

    adjustStockMutation.mutate({
      productId: receiveProductId,
      quantityChange: quantity,
      reason: "PURCHASE",
      notes: data.notes,
      reference: data.reference,
    });
  };

  const csvEscape = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    return /[",\n]/.test(str) ? `"${str}"` : str;
  };

  const handleExportInventoryCsv = () => {
    const rows = inventory?.data || [];
    if (!rows.length) {
      toast.error("No inventory data to export");
      return;
    }

    const headers = [
      "Product",
      "SKU",
      "Category",
      "Quantity",
      "Low Stock Level",
      "Reorder Point",
      "Supplier",
      "Last Restocked",
      "Status",
    ];

    const statusLabel = (item) => {
      const qty = item.quantity;
      const threshold = item.lowStockLevel;
      if (qty === 0) return "Out of Stock";
      if (qty <= threshold) return "Low Stock";
      if (qty <= threshold * 1.5) return "Medium";
      return "In Stock";
    };

    const lines = rows.map((item) => [
      item.product?.productName || "",
      item.product?.sku || "",
      item.product?.category?.name || "",
      item.quantity,
      item.lowStockLevel,
      item.reorderPoint,
      item.product?.supplierProducts?.[0]?.supplier?.name || "N/A",
      item.lastRestockedAt
        ? formatDate.standard(item.lastRestockedAt)
        : "Never",
      statusLabel(item),
    ]);

    const csv = [headers, ...lines]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `inventory-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStockStatus = (item) => {
    const qty = item.quantity;
    const threshold = item.lowStockLevel;

    if (qty === 0) return { variant: "red", label: "Out of Stock" };
    if (qty <= threshold) return { variant: "red", label: "Low Stock" };
    if (qty <= threshold * 1.5) return { variant: "amber", label: "Medium" };
    return { variant: "green", label: "In Stock" };
  };

  const getProgressColor = (item) => {
    const qty = item.quantity;
    const threshold = item.lowStockLevel;

    if (qty <= threshold) return "bg-red-500";
    if (qty <= threshold * 1.5) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const totalSKUs = inventory?.data?.length || 0;
  const lowStockCount =
    inventory?.data?.filter((item) => item.quantity <= item.lowStockLevel)
      .length || 0;
  const outOfStockCount =
    inventory?.data?.filter((item) => item.quantity === 0).length || 0;
  const totalUnits =
    inventory?.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const inventoryRows = inventory?.data || [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredInventory = !normalizedSearch
    ? inventoryRows
    : inventoryRows.filter((item) => {
        const searchableFields = [
          item.product?.productName,
          item.product?.sku,
          item.product?.category?.name,
          item.product?.supplierProducts?.[0]?.supplier?.name,
        ];

        return searchableFields.some((field) =>
          (field || "").toLowerCase().includes(normalizedSearch),
        );
      });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInventory.length / pageSize),
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInventory.slice(start, start + pageSize);
  }, [filteredInventory, currentPage]);

  const columns = [
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-100">
            {row.product.productName}
          </p>
          <p className="text-xs text-slate-500">
            {row.product.category?.name || "—"}
          </p>
          <p className="text-xs text-slate-500 font-mono">{row.product.sku}</p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      render: (row) => (
        <div>
          <p className="font-mono font-semibold text-slate-100 mb-1">
            {row.quantity}
          </p>
          <div className="w-full bg-[#0f172a] rounded-full h-2">
            <div
              className={`h-1.5 rounded-full ${getProgressColor(row)}`}
              style={{
                width: `${Math.min(
                  100,
                  (row.quantity / row.reorderPoint) * 100,
                )}%`,
              }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      key: "lowStockLevel",
      header: "Low Level",
      render: (row) => <span className="font-mono">{row.lowStockLevel}</span>,
    },
    {
      key: "reorderQuantity",
      header: "Reorder Qty",
      render: (row) => <span className="font-mono">{row.reorderPoint}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const status = getStockStatus(row);
        return (
          <span style={{ minWidth: 105, display: "inline-block" }}>
            <Badge variant={status.variant}>{status.label}</Badge>
          </span>
        );
      },
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (row) =>
        row.product.supplierProducts?.[0]?.supplier?.name || "N/A",
    },
    {
      key: "lastRestockedAt",
      header: "Last Restocked",
      render: (row) =>
        row.lastRestockedAt
          ? formatDate.standard(row.lastRestockedAt)
          : "Never",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenAdjust(row, "CORRECTION")}
          >
            Adjust
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAdjust(row, "PURCHASE")}
          >
            Restock
          </Button>
        </div>
      ),
    },
  ];

  const reasonOptions = [
    { value: "PURCHASE", label: "Purchase" },
    { value: "DAMAGE", label: "Damage" },
    { value: "THEFT", label: "Theft" },
    { value: "CORRECTION", label: "Correction" },
    { value: "RETURN", label: "Return" },
    { value: "OPENING_STOCK", label: "Opening Stock" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="Inventory Management"
        subtitle="Track and manage stock levels"
        actions={
          <>
            <Button
              variant="ghost"
              icon={<Package size={18} />}
              onClick={() => {
                setIsReceiveModalOpen(true);
                setReceiveProductId("");
                resetReceive();
              }}
            >
              Receive Stock
            </Button>
            <Button
              variant="ghost"
              icon={<Download size={18} />}
              onClick={handleExportInventoryCsv}
            >
              Export
            </Button>
          </>
        }
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard
            label="Total SKUs"
            value={totalSKUs}
            subtitle="Products in inventory"
            colorVariant="indigo"
          />
          <KpiCard
            label="Low Stock Count"
            value={lowStockCount}
            subtitle="Below threshold"
            colorVariant="amber"
          />
          <KpiCard
            label="Out of Stock"
            value={outOfStockCount}
            subtitle="Need reorder"
            colorVariant="red"
          />
          <KpiCard
            label="Total Units"
            value={totalUnits.toLocaleString()}
            subtitle="Items in stock"
            colorVariant="green"
          />
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm("")}
              placeholder="Search by product, SKU, category, or supplier"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedInventory}
          isLoading={isLoading}
          emptyMessage={
            normalizedSearch
              ? "No inventory items match your search"
              : "No inventory items found"
          }
          pagination={
            filteredInventory.length > pageSize
              ? {
                  currentPage,
                  totalItems: filteredInventory.length,
                  itemsPerPage: pageSize,
                  onPageChange: (page) => {
                    const safePage = Math.min(Math.max(page, 1), totalPages);
                    setCurrentPage(safePage);
                  },
                  itemLabel: "items",
                }
              : undefined
          }
        />
      </main>

      {/* Receive Stock Modal */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setReceiveProductId("");
          resetReceive();
        }}
        title="Receive Stock"
        width={500}
      >
        <form
          onSubmit={handleSubmitReceive(onSubmitReceive)}
          className="p-6 space-y-4"
        >
          <Select
            label="Product"
            options={receiveProductOptions}
            value={receiveProductId}
            onChange={setReceiveProductId}
          />

          <FormInput
            {...registerReceive("quantityChange", {
              required: "Quantity is required",
            })}
            label="Quantity Received"
            type="number"
            placeholder="Enter quantity"
            error={receiveErrors.quantityChange?.message}
          />

          <FormInput
            {...registerReceive("reference")}
            label="Reference"
            placeholder="PO / Invoice number"
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Notes
            </label>
            <textarea
              {...registerReceive("notes")}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => setIsReceiveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={adjustStockMutation.isLoading}
            >
              Receive Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedProduct(null);
          reset();
        }}
        title="Adjust Stock"
        width={500}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {selectedProduct && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-indigo-400 mb-1">Current Quantity</p>
              <p className="text-3xl font-bold font-mono text-indigo-400">
                {selectedProduct.quantity}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedProduct.product.productName}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Select
              label="Reason"
              options={reasonOptions}
              value={adjustmentReason}
              onChange={setAdjustmentReason}
            />

            <FormInput
              {...register("quantityChange", {
                required: "Quantity change is required",
              })}
              label="Quantity Change"
              type="number"
              placeholder="Enter positive or negative number"
              error={errors.quantityChange?.message}
            />

            <FormInput
              {...register("reference")}
              label="Reference"
              placeholder="Purchase order / invoice number"
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Notes
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsAdjustModalOpen(false);
                setSelectedProduct(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={adjustStockMutation.isLoading}
            >
              Adjust Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { DataTable } from "../components/shared/DataTable";
import { SearchInput } from "../components/shared/SearchInput";
import { KpiCard } from "../components/shared/KpiCard";
import { Modal } from "../components/common/Modal";
import { FormInput } from "../components/common/FormInput";
import { Badge } from "../components/common/Badge";
import { apiClient } from "../api/axios";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import {
  formatTransactionId,
  resolveTransactionId,
} from "../utils/formatTransactionId";
import { UserPlus, History } from "lucide-react";
import toast from "react-hot-toast";

export const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;
  const historyPageSize = 5;

  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", { search: debouncedSearchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      const response = await apiClient.get(`/customers?${params}`);
      return response.data;
    },
  });

  const { data: customerSales } = useQuery({
    queryKey: ["customer-sales", selectedCustomerId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/customers/${selectedCustomerId}/sales`,
      );
      return response.data;
    },
    enabled: !!selectedCustomerId,
  });

  const customerRows = customers?.data || [];
  const totalPages = Math.max(1, Math.ceil(customerRows.length / pageSize));
  const customerSalesRows = customerSales || [];
  const historyTotalPages = Math.max(
    1,
    Math.ceil(customerSalesRows.length / historyPageSize),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedCustomerId]);

  useEffect(() => {
    setHistoryPage((prev) => Math.min(prev, historyTotalPages));
  }, [historyTotalPages]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return customerRows.slice(start, start + pageSize);
  }, [customerRows, currentPage]);

  const paginatedCustomerSales = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return customerSalesRows.slice(start, start + historyPageSize);
  }, [customerSalesRows, historyPage]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/customers", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success("Customer created successfully");
      setIsFormModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create customer");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/customers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]);
      toast.success("Customer updated successfully");
      setIsFormModalOpen(false);
      setEditingCustomer(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update customer");
    },
  });

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    reset({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    reset(customer);
    setIsFormModalOpen(true);
  };

  const handleOpenHistory = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsHistoryModalOpen(true);
  };

  const onSubmit = (data) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const totalCustomers = customerRows.length;
  const totalLoyaltyPoints =
    customerRows.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0) || 0;
  const avgSpend =
    totalCustomers > 0
      ? customerRows.reduce((sum, c) => sum + (c.totalSpent || 0), 0) /
        totalCustomers
      : 0;

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-100">{row.name}</p>
            <p className="text-xs text-slate-500">{row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => row.email || "N/A",
    },
    {
      key: "loyaltyPoints",
      header: "Loyalty Pts",
      render: (row) => <Badge variant="amber">{row.loyaltyPoints || 0}</Badge>,
    },
    {
      key: "totalSpent",
      header: "Total Spent",
      render: (row) => (
        <span className="font-mono text-emerald-400">
          {formatCurrency(row.totalSpent || 0)}
        </span>
      ),
    },
    {
      key: "visitCount",
      header: "Visits",
      render: (row) => <span className="font-mono">{row.visitCount || 0}</span>,
    },
    {
      key: "createdAt",
      header: "Member Since",
      render: (row) => formatDate.standard(row.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<History size={14} />}
            onClick={() => handleOpenHistory(row.id)}
          >
            History
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenEdit(row)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  const salesColumns = [
    {
      key: "createdAt",
      header: "Date",
      render: (row) => formatDate.standard(row.createdAt),
    },
    {
      key: "receiptNumber",
      header: "TXN ID",
      render: (row) => (
        <span className="font-mono text-indigo-400">
          {formatTransactionId(resolveTransactionId(row))}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (row) => row.items?.length || 0,
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (row) => (
        <span className="font-mono text-amber-400">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (row) => <Badge variant="indigo">{row.paymentMethod}</Badge>,
    },
  ];

  const selectedCustomer = customers?.data?.find(
    (c) => c.id === selectedCustomerId,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="Customer Management"
        subtitle="Manage your customer database"
        actions={
          <Button
            variant="primary"
            icon={<UserPlus size={18} />}
            onClick={handleOpenCreate}
          >
            New Customer
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <KpiCard
            label="Total Customers"
            value={totalCustomers}
            subtitle="Registered members"
            colorVariant="indigo"
          />
          <KpiCard
            label="Loyalty Points Issued"
            value={totalLoyaltyPoints.toLocaleString()}
            subtitle="Total points"
            colorVariant="amber"
          />
          <KpiCard
            label="Avg Spend/Customer"
            value={formatCurrency(avgSpend)}
            subtitle="Average lifetime value"
            colorVariant="green"
          />
        </div>

        {/* Search */}
        <div className="mb-5">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm("")}
            placeholder="Search customers..."
          />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedCustomers}
          isLoading={isLoading}
          emptyMessage="No customers found"
          pagination={
            customerRows.length > pageSize
              ? {
                  currentPage,
                  totalItems: customerRows.length,
                  itemsPerPage: pageSize,
                  onPageChange: setCurrentPage,
                  itemLabel: "customers",
                }
              : undefined
          }
        />
      </main>

      {/* Customer Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
          reset();
        }}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        width={500}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4 mb-6">
            <FormInput
              {...register("name", { required: "Name is required" })}
              label="Full Name"
              placeholder="Enter full name"
              error={errors.name?.message}
            />
            <FormInput
              {...register("phone", {
                required: "Phone is required",
                pattern: {
                  value: /^\+?233[0-9]{9}$/,
                  message: "Phone must be in format +233XXXXXXXXX",
                },
              })}
              label="Phone"
              placeholder="+233XXXXXXXXX"
              error={errors.phone?.message}
            />
            <FormInput
              {...register("email", {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              label="Email (Optional)"
              type="email"
              placeholder="customer@email.com"
              error={errors.email?.message}
            />
            <FormInput
              {...register("dateOfBirth")}
              label="Date of Birth (Optional)"
              type="date"
            />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Address (Optional)
              </label>
              <textarea
                {...register("address")}
                rows={3}
                className="w-full px-4 py-2.5 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Enter customer address"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingCustomer(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={createMutation.isLoading || updateMutation.isLoading}
            >
              {editingCustomer ? "Update Customer" : "Create Customer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedCustomerId(null);
        }}
        title="Customer Purchase History"
        width={800}
      >
        <div className="p-6">
          {selectedCustomer && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#141d2e] border border-[#1e2d45] rounded-lg p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Total Spent
                  </p>
                  <p className="text-xl font-bold font-mono text-amber-400">
                    {formatCurrency(selectedCustomer.totalSpent || 0)}
                  </p>
                </div>
                <div className="bg-[#141d2e] border border-[#1e2d45] rounded-lg p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Loyalty Points
                  </p>
                  <p className="text-xl font-bold font-mono text-indigo-400">
                    {selectedCustomer.loyaltyPoints || 0}
                  </p>
                </div>
                <div className="bg-[#141d2e] border border-[#1e2d45] rounded-lg p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase mb-1">
                    Visits
                  </p>
                  <p className="text-xl font-bold font-mono text-emerald-400">
                    {console.log(
                      "Selected customer visits",
                      selectedCustomer.visitCount,
                    )}
                    {selectedCustomer.visitCount || 0}
                  </p>
                </div>
              </div>

              <DataTable
                columns={salesColumns}
                data={paginatedCustomerSales}
                emptyMessage="No purchase history"
                pagination={
                  customerSalesRows.length > historyPageSize
                    ? {
                        currentPage: historyPage,
                        totalItems: customerSalesRows.length,
                        itemsPerPage: historyPageSize,
                        onPageChange: setHistoryPage,
                        itemLabel: "sales",
                      }
                    : undefined
                }
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

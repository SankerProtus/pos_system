import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { DataTable } from "../components/shared/DataTable";
import { KpiCard } from "../components/shared/KpiCard";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { FormInput } from "../components/common/FormInput";
import { Select } from "../components/common/Select";
import { Badge } from "../components/common/Badge";
import { apiClient } from "../api/axios";
import { formatDate } from "../utils/formatDate";
import { UserPlus, Edit, Power } from "lucide-react";
import toast from "react-hot-toast";

export const UsersPage = () => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState(null);

  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get("/users");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/users", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User created successfully");
      setIsFormModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.patch(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User updated successfully");
      setIsFormModalOpen(false);
      setEditingUser(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.patch(`/users/${id}/toggle-active`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User status updated");
      setIsToggleDialogOpen(false);
      setTogglingUserId(null);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to update user status",
      );
    },
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    reset({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    reset({
      name: user.name,
      email: user.email,
      role: user.role,
      pin: user.pin,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenToggle = (userId) => {
    setTogglingUserId(userId);
    setIsToggleDialogOpen(true);
  };

  const onSubmit = (data) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const adminCount = users?.filter((u) => u.role === "ADMIN").length || 0;
  const managerCount = users?.filter((u) => u.role === "MANAGER").length || 0;
  const cashierCount = users?.filter((u) => u.role === "CASHIER").length || 0;

  const getRoleBadge = (role) => {
    const variants = {
      ADMIN: "amber",
      MANAGER: "indigo",
      CASHIER: "green",
    };
    return <Badge variant={variants[role]}>{role}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return (
      <Badge variant={isActive ? "green" : "red"}>
        {isActive ? "Active" : "Disabled"}
      </Badge>
    );
  };

  const columns = [
    {
      key: "user",
      header: "User",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-100">{row.name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => getRoleBadge(row.role),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => getStatusBadge(row.isActive),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (row) =>
        row.lastLoginAt ? (
          <span className="font-mono text-sm">
            {formatDate.standard(row.lastLoginAt)}
          </span>
        ) : (
          <span className="text-slate-500">Never</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Edit size={14} />}
            iconPosition="left"
            onClick={() => handleOpenEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant={row.isActive ? "danger" : "success"}
            size="sm"
            icon={<Power size={14} />}
            iconPosition="left"
            onClick={() => handleOpenToggle(row.id)}
          >
            {row.isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      ),
    },
  ];

  const roleOptions = [
    { value: "CASHIER", label: "Cashier" },
    { value: "MANAGER", label: "Manager" },
    { value: "ADMIN", label: "Admin" },
  ];

  const togglingUser = users?.find((u) => u.id === togglingUserId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="User Management"
        subtitle="Manage system users and permissions"
        actions={
          <Button
            variant="primary"
            icon={<UserPlus size={18} />}
            iconPosition="left"
            onClick={handleOpenCreate}
          >
            Add User
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* Role Count Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <KpiCard
            label="ADMIN"
            value={adminCount}
            subtitle="System administrators"
            colorVariant="amber"
          />
          <KpiCard
            label="MANAGER"
            value={managerCount}
            subtitle="Store managers"
            colorVariant="indigo"
          />
          <KpiCard
            label="CASHIER"
            value={cashierCount}
            subtitle="Cashiers"
            colorVariant="green"
          />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={users || []}
          isLoading={isLoading}
          emptyMessage="No users found"
        />
      </main>

      {/* User Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(null);
          reset();
        }}
        title={editingUser ? "Edit User" : "Add New User"}
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
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              label="Email"
              type="email"
              placeholder="user@example.com"
              error={errors.email?.message}
            />
            {!editingUser && (
              <FormInput
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters",
                  },
                })}
                label="Temporary Password"
                type="password"
                placeholder="Enter temporary password"
                error={errors.password?.message}
              />
            )}
            <Select
              {...register("role", { required: "Role is required" })}
              label="Role"
              options={roleOptions}
              error={errors.role?.message}
            />
            <FormInput
              {...register("pin", {
                pattern: {
                  value: /^[0-9]{6}$/,
                  message: "PIN must be 6 digits",
                },
              })}
              label="PIN (Optional)"
              type="text"
              placeholder="6-digit PIN for quick login"
              error={errors.pin?.message}
              maxLength={6}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingUser(null);
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
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toggle Active Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isToggleDialogOpen}
        onClose={() => setIsToggleDialogOpen(false)}
        onConfirm={() => toggleActiveMutation.mutate(togglingUserId)}
        message={`Are you sure you want to ${
          togglingUser?.isActive ? "disable" : "enable"
        } this user?`}
        confirmLabel={togglingUser?.isActive ? "Disable" : "Enable"}
        confirmVariant={togglingUser?.isActive ? "danger" : "success"}
        title="Update User Status"
      />
    </div>
  );
};

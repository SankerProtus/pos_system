import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { DataTable } from "../components/shared/DataTable";
import { SearchInput } from "../components/shared/SearchInput";
import { KpiCard } from "../components/shared/KpiCard";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { FormInput } from "../components/common/FormInput";
import { Select } from "../components/common/Select";
import { Badge } from "../components/common/Badge";
import { UserAvatar } from "../components/shared/UserAvatar";
import { apiClient } from "../api/axios";
import { formatDate } from "../utils/formatDate";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";
import { useAuth } from "../hooks/useAuth";
import { UserPlus, Edit, Power } from "lucide-react";
import toast from "react-hot-toast";

export const UsersPage = () => {
  const { user, refreshUser, updateAuthenticatedUser } = useAuth();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewImageName, setPreviewImageName] = useState("Profile Image");
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const profileImageObjectUrlRef = useRef(null);
  const pageSize = 10;

  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const watchedProfileImageUrl = watch("profileImageUrl");

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
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
    onSuccess: async (updatedUser) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.refetchQueries({ queryKey: ["users"] });

      if (updatedUser.id === user?.id) {
        updateAuthenticatedUser?.(updatedUser);
        refreshUser?.();
      }

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
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
    if (profileImageObjectUrlRef.current) {
      URL.revokeObjectURL(profileImageObjectUrlRef.current);
      profileImageObjectUrlRef.current = null;
    }
    setProfileImageFile(null);
    setProfileImagePreview("");
    reset({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    if (profileImageObjectUrlRef.current) {
      URL.revokeObjectURL(profileImageObjectUrlRef.current);
      profileImageObjectUrlRef.current = null;
    }
    setProfileImageFile(null);
    setProfileImagePreview(user.profileImageUrl || "");
    reset({
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl || "",
      role: user.role,
      pin: user.pin,
    });
    setIsFormModalOpen(true);
  };

  const handleProfileImageFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    if (profileImageObjectUrlRef.current) {
      URL.revokeObjectURL(profileImageObjectUrlRef.current);
      profileImageObjectUrlRef.current = null;
    }

    if (!selectedFile) {
      setProfileImageFile(null);
      setProfileImagePreview(editingUser?.profileImageUrl || "");
      return;
    }

    const isImageFile = selectedFile.type?.startsWith("image/");
    if (!isImageFile) {
      toast.error("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 3 * 1024 * 1024) {
      toast.error("Profile image must be 3MB or less.");
      event.target.value = "";
      return;
    }

    setProfileImageFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    profileImageObjectUrlRef.current = objectUrl;
    setProfileImagePreview(objectUrl);
  };

  const handleOpenImagePreview = (imageUrl, imageName = "Profile Image") => {
    const resolvedImageUrl = resolveMediaUrl(imageUrl);

    if (!resolvedImageUrl) {
      toast.error("No profile image available for preview.");
      return;
    }

    setPreviewImageUrl(resolvedImageUrl);
    setPreviewImageName(imageName);
    setIsImagePreviewOpen(true);
  };

  useEffect(() => {
    return () => {
      if (profileImageObjectUrlRef.current) {
        URL.revokeObjectURL(profileImageObjectUrlRef.current);
      }
    };
  }, []);

  const handleOpenToggle = (userId) => {
    setTogglingUserId(userId);
    setIsToggleDialogOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingUser) {
        let payload = data;

        if (profileImageFile) {
          setIsUploadingProfileImage(true);
          const formData = new FormData();
          formData.append("profileImage", profileImageFile);
          const uploadResponse = await apiClient.patch(
            `/users/${editingUser.id}/profile-image`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          payload = {
            ...payload,
            profileImageUrl: uploadResponse.data.profileImageUrl,
          };
        }

        await updateMutation.mutateAsync({ id: editingUser.id, data: payload });
      } else {
        await createMutation.mutateAsync(data);
        if (profileImageFile) {
          toast("Upload is available after the user is created.");
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to update profile image",
      );
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const adminCount = users?.filter((u) => u.role === "ADMIN").length || 0;
  const managerCount = users?.filter((u) => u.role === "MANAGER").length || 0;
  const cashierCount = users?.filter((u) => u.role === "CASHIER").length || 0;

  const filteredUsers = useMemo(() => {
    const list = users || [];
    const query = searchTerm.trim().toLowerCase();

    if (!query) return list;

    return list.filter((u) => {
      const haystack = [
        u.name,
        u.email,
        u.role,
        u.isActive ? "active" : "disabled",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

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
          <button
            type="button"
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() =>
              handleOpenImagePreview(row.profileImageUrl, `${row.name} profile`)
            }
            title={row.profileImageUrl ? "Preview profile image" : "No image"}
          >
            <UserAvatar
              name={row.name}
              imageUrl={row.profileImageUrl}
              className="w-10 h-10"
              fallbackClassName="bg-indigo-500"
            />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-slate-100 truncate">{row.name}</p>
            <p
              className="text-sm text-slate-400 truncate leading-tight"
              title={row.email}
            >
              {row.email}
            </p>
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

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, role, or status"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedUsers}
          isLoading={isLoading}
          emptyMessage="No users found"
          cellClassName="whitespace-nowrap px-4 py-3 text-sm text-slate-300"
          pagination={
            filteredUsers.length > pageSize
              ? {
                  currentPage,
                  totalItems: filteredUsers.length,
                  itemsPerPage: pageSize,
                  onPageChange: (page) => {
                    const safePage = Math.min(Math.max(page, 1), totalPages);
                    setCurrentPage(safePage);
                  },
                  itemLabel: "users",
                }
              : undefined
          }
        />
      </main>

      {/* User Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(null);
          if (profileImageObjectUrlRef.current) {
            URL.revokeObjectURL(profileImageObjectUrlRef.current);
            profileImageObjectUrlRef.current = null;
          }
          setProfileImageFile(null);
          setProfileImagePreview("");
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Upload Profile Picture (Optional)
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-3">
                <UserAvatar
                  name={editingUser?.name || "User"}
                  imageUrl={profileImagePreview || watchedProfileImageUrl}
                  className="w-12 h-12"
                  fallbackClassName="bg-indigo-500"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageFileChange}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleOpenImagePreview(
                      profileImagePreview || watchedProfileImageUrl,
                      `${editingUser?.name || "User"} profile`,
                    )
                  }
                >
                  Preview
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Upload takes priority over image URL. Max file size: 3MB.
              </p>
            </div>
            <FormInput
              {...register("profileImageUrl", {
                validate: (value) => {
                  if (!value) return true;
                  try {
                    const parsed = new URL(value);
                    return ["http:", "https:"].includes(parsed.protocol)
                      ? true
                      : "Image URL must start with http or https";
                  } catch {
                    return "Enter a valid image URL";
                  }
                },
              })}
              label="Profile Image URL (Optional)"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              error={errors.profileImageUrl?.message}
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
                if (profileImageObjectUrlRef.current) {
                  URL.revokeObjectURL(profileImageObjectUrlRef.current);
                  profileImageObjectUrlRef.current = null;
                }
                setProfileImageFile(null);
                setProfileImagePreview("");
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={
                createMutation.isLoading ||
                updateMutation.isLoading ||
                isUploadingProfileImage
              }
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

      <Modal
        isOpen={isImagePreviewOpen}
        onClose={() => {
          setIsImagePreviewOpen(false);
          setPreviewImageUrl("");
          setPreviewImageName("Profile Image");
        }}
        title={previewImageName}
        width={560}
      >
        <div className="p-4">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt={previewImageName}
              className="mx-auto max-h-[65vh] w-full rounded-xl object-contain bg-slate-100"
            />
          ) : (
            <p className="text-sm text-slate-500">No image available.</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/common/Button";
import { FormInput } from "../components/common/FormInput";
import { DataTable } from "../components/shared/DataTable";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import toast from "react-hot-toast";
import { apiClient } from "../api/axios";

export const CategoryManagementPage = () => {
  const queryClient = useQueryClient();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/categories", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      toast.success("Category created successfully");
      setIsFormModalOpen(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      toast.success("Category updated successfully");
      setIsFormModalOpen(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["categories"]);
      toast.success("Category deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingCategoryId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete category");
    },
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (categoryId) => {
    setDeletingCategoryId(categoryId);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Category Name",
      render: (row) => (
        <span className="font-medium text-slate-100">{row.name}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="text-indigo-400 hover:text-indigo-300"
          >
            Edit
          </button>
          <button
            onClick={() => handleOpenDelete(row.id)}
            className="text-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-6">
        <h2 className="text-2xl font-bold text-slate-100">
          Category Management
        </h2>
        <Button variant="primary" onClick={handleOpenCreate}>
          Add Category
        </Button>
      </div>
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        <DataTable
          columns={columns}
          data={categories?.data || []}
          isLoading={isLoading}
          emptyMessage="No categories found"
        />
      </main>
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? "Edit Category" : "Add New Category"}
        width={400}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get("name");
            onSubmit({ name });
          }}
          className="p-6"
        >
          <FormInput
            name="name"
            label="Category Name"
            placeholder="Enter category name"
            required
          />
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={createMutation.isLoading || updateMutation.isLoading}
            >
              {editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate(deletingCategoryId)}
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        title="Delete Category"
      />
    </div>
  );
};

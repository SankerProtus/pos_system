import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { DataTable } from "../components/shared/DataTable";
import { SearchInput } from "../components/shared/SearchInput";
import { Select } from "../components/common/Select";
import { Modal } from "../components/common/Modal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { Badge } from "../components/common/Badge";
import { FormInput } from "../components/common/FormInput";
import { apiClient } from "../api/axios";
import { formatCurrency } from "../utils/formatCurrency";
import { Plus, Edit, Trash2, Download } from "lucide-react";
import toast from "react-hot-toast";

const csvEscape = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const ProductsPage = () => {
  // Image upload state
  const [imageMode, setImageMode] = useState("upload"); // "upload" or "url"
  const [imageFile, setImageFile] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Handle image file change
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setImageUrlInput("");
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // Handle image URL change
  const handleImageUrlChange = (e) => {
    setImageUrlInput(e.target.value);
    setImageFile(null);
    setImagePreview(e.target.value);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  // Image zoom modal state
  const [zoomImageUrl, setZoomImageUrl] = useState(null);
  const handleImageClick = (url) => setZoomImageUrl(url);
  const handleCloseZoom = () => setZoomImageUrl(null);

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

  const { data: products, isLoading } = useQuery({
    queryKey: [
      "products",
      { search: debouncedSearchTerm, categoryId: selectedCategory },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      const response = await apiClient.get(`/products?${params}`);
      return response.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post("/products", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product created successfully");
      setIsFormModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create product");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product updated successfully");
      setIsFormModalOpen(false);
      setEditingProduct(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      toast.success("Product deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingProductId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete product");
    },
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    reset({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    reset({
      ...product,
      name: product.productName,
      cost: product.costPrice,
      price: product.price,
      taxRate: product.taxRate,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId || product.category?.id,
      description: product.description,
      lowStockThreshold: product.inventory?.lowStockLevel,
    });
    // Reset image input states
    setImageFile(null);
    setImageUrlInput(product.imageUrl || "");
    setImagePreview(product.imageUrl || null);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (productId) => {
    setDeletingProductId(productId);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data) => {
    let imageUrl = "";
    if (imageMode === "upload" && imageFile) {
      imageUrl = imagePreview;
    } else if (imageMode === "url" && imageUrlInput) {
      imageUrl = imageUrlInput;
    } else if (editingProduct && editingProduct.imageUrl) {
      imageUrl = editingProduct.imageUrl;
    }
    const payload = {
      productName: data.name,
      sku: data.sku,
      barcode: data.barcode,
      description: data.description,
      price: data.price,
      costPrice: data.cost,
      taxRate: data.taxRate,
      categoryId: data.categoryId,
      imageUrl,
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStockBadge = (product) => {
    const stock = product.inventory?.quantity || 0;
    const threshold = product.inventory?.lowStockLevel || 10;

    return (
      <Badge
        variant={
          stock === 0
            ? "red"
            : stock <= threshold
              ? "red"
              : stock <= threshold * 1.5
                ? "amber"
                : "green"
        }
      >
        {stock === 0
          ? "Out of Stock"
          : stock <= threshold
            ? "Low Stock"
            : stock <= threshold * 1.5
              ? "Limited Stock"
              : "In Stock"}
      </Badge>
    );
  };

  const columns = [
    {
      key: "image",
      header: "Image",
      render: (row) => (
        <button
          style={{
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
          onClick={() => handleImageClick(row.imageUrl || "/no-image.jpg")}
          aria-label="View product image"
        >
          <img
            src={row.imageUrl || "/no-image.jpg"}
            alt={row.productName}
            key={row.imageUrl || row.id}
            style={{
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: 6,
              background: "#222",
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/no-image.png";
            }}
          />
        </button>
      ),
    },
    {
      key: "productName",
      header: "Product Name",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-100">{row.productName}</p>
          <p className="text-xs text-slate-500">{row.category?.name}</p>
        </div>
      ),
    },
    {
      key: "sku",
      header: "SKU",
    },
    {
      key: "barcode",
      header: "Barcode",
      render: (row) => <span className="tabular-nums">{row.barcode}</span>,
    },
    {
      key: "price",
      header: "Price",
      render: (row) => (
        <span className="font-mono text-amber-400">
          {formatCurrency(row.price)}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (row) => (
        <span className="font-mono text-slate-300">
          {formatCurrency(row.costPrice)}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (row) => (
        <span className="font-mono">{row.inventory?.quantity || 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => getStockBadge(row),
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
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleOpenDelete(row.id)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...(categories?.data?.map((cat) => ({ value: cat.id, label: cat.name })) ||
      []),
  ];

  const handleExportCsv = () => {
    const rows = products?.data || [];

    if (!rows.length) {
      toast.error("No products to export");
      return;
    }

    const headers = [
      "Product Name",
      "Category",
      "SKU",
      "Barcode",
      "Price",
      "Cost",
      "Stock",
      "Status",
      "Description",
    ];

    const lines = rows.map((row) => {
      const stock = row.inventory?.quantity || 0;
      const threshold = row.inventory?.lowStockLevel || 10;
      const status =
        stock === 0
          ? "Out of Stock"
          : stock <= threshold
            ? "Low Stock"
            : stock <= threshold * 1.5
              ? "Limited Stock"
              : "In Stock";

      return [
        row.productName || "",
        row.category?.name || "",
        row.sku || "",
        row.barcode || "",
        Number(row.price || 0).toFixed(2),
        Number(row.costPrice || 0).toFixed(2),
        stock,
        status,
        row.description || "",
      ];
    });

    const csv = [headers, ...lines]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `products-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Image Zoom Modal */}
      {zoomImageUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseZoom}
        >
          <img
            src={zoomImageUrl}
            alt="Product"
            style={{
              maxWidth: "80vw",
              maxHeight: "80vh",
              borderRadius: 12,
              boxShadow: "0 4px 32px #000",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <Topbar
        title="Product Management"
        subtitle="Manage your product catalog"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={handleOpenCreate}
          >
            Add Product
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* Toolbar */}
        <div className="flex gap-2 mb-5 items-center">
          <div className="flex-1 min-w-70">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm("")}
              placeholder="Search products..."
            />
          </div>
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="w-80"
          />
          <Button
            variant="ghost"
            icon={<Download size={18} />}
            className="w-70 gap-2"
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={products?.data || []}
          isLoading={isLoading}
          emptyMessage="No products found"
          cellClassName="whitespace-nowrap px-4 py-3 text-sm text-slate-300"
        />
      </main>

      {/* Product Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProduct(null);
          reset();
        }}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        width={600}
      >
        <form
          onSubmit={handleSubmit((data) => {
            let imageUrl = "";
            if (imageMode === "upload" && imageFile) {
              // In real app, upload imageFile to server or cloud and get URL
              // For demo, use base64 preview
              imageUrl = imagePreview;
            } else if (imageMode === "url" && imageUrlInput) {
              imageUrl = imageUrlInput;
            }
            onSubmit({ ...data, imageUrl });
          })}
          className="p-6"
        >
          {/* Image input section */}
          <div className="col-span-2 mb-4">
            <label className="block font-medium mb-2 text-slate-100">
              Product Image
            </label>
            <div className="flex gap-3 mb-2">
              <Button
                type="button"
                variant={imageMode === "upload" ? "primary" : "outline"}
                size="sm"
                onClick={() => setImageMode("upload")}
              >
                Upload
              </Button>
              <Button
                type="button"
                variant={imageMode === "url" ? "primary" : "outline"}
                size="sm"
                onClick={() => setImageMode("url")}
              >
                URL
              </Button>
            </div>
            {imageMode === "upload" ? (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="block mb-2 text-slate-100 bg-[#1e293b] border border-amber-500 rounded px-3 py-2"
                style={{ color: "#f8fafc" }}
              />
            ) : (
              <input
                type="text"
                value={imageUrlInput}
                onChange={handleImageUrlChange}
                placeholder="Paste image URL..."
                className="block w-full mb-2 px-3 py-2 rounded border border-amber-500 bg-[#1e293b] text-slate-100"
                style={{ color: "#f8fafc" }}
              />
            )}
            {imagePreview && (
              <>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #222",
                    cursor: "pointer",
                  }}
                  className="mt-2"
                  onClick={() => setIsImageModalOpen(true)}
                />
                {isImageModalOpen && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      background: "rgba(0,0,0,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1000,
                    }}
                    onClick={() => setIsImageModalOpen(false)}
                  >
                    <img
                      src={imagePreview}
                      alt="Full Preview"
                      style={{
                        maxWidth: "80vw",
                        maxHeight: "80vh",
                        borderRadius: 12,
                        boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
                        border: "2px solid #fff",
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormInput
              {...register("name", { required: "Name is required" })}
              label="Product Name"
              placeholder="Enter product name"
              error={errors.name?.message}
            />
            <FormInput
              {...register("sku", { required: "SKU is required" })}
              label="SKU"
              placeholder="Enter SKU"
              error={errors.sku?.message}
            />
            <FormInput
              {...register("barcode", { required: "Barcode is required" })}
              label="Barcode"
              placeholder="Enter barcode"
              error={errors.barcode?.message}
            />
            <Select
              {...register("categoryId", { required: "Category is required" })}
              label="Category"
              options={
                categories?.data?.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })) || []
              }
              error={errors.categoryId?.message}
            />
            <FormInput
              {...register("price", {
                required: "Price is required",
                min: { value: 0.01, message: "Price must be positive" },
              })}
              label="Selling Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.price?.message}
            />
            <FormInput
              {...register("cost", {
                required: "Cost is required",
                min: { value: 0, message: "Cost cannot be negative" },
              })}
              label="Cost Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.cost?.message}
            />
            {!editingProduct && (
              <FormInput
                {...register("initialQuantity", {
                  required: "Initial quantity is required",
                  min: { value: 0, message: "Quantity cannot be negative" },
                })}
                label="Initial Quantity"
                type="number"
                placeholder="0"
                error={errors.initialQuantity?.message}
              />
            )}
            <FormInput
              {...register("lowStockThreshold", {
                required: "Low stock threshold is required",
                min: { value: 1, message: "Threshold must be at least 1" },
              })}
              label="Low Stock Alert At"
              type="number"
              placeholder="10"
              error={errors.lowStockLevel?.message}
            />
            <FormInput
              {...register("description")}
              label="Description"
              placeholder="Enter product description"
              error={errors.description?.message}
            />
          </div>
          <div className="mb-6">
            <FormInput
              {...register("taxRate", {
                required: "Tax rate is required",
                min: { value: 0, message: "Tax rate cannot be negative" },
                max: { value: 100, message: "Tax rate cannot exceed 100%" },
              })}
              label="Tax Rate (%)"
              type="number"
              step="0.01"
              placeholder="5.0"
              error={errors.taxRate?.message}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingProduct(null);
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
              {editingProduct ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate(deletingProductId)}
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        title="Delete Product"
      />
    </div>
  );
};

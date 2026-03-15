import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/common/Button';
import { DataTable } from "../components/shared/DataTable";
import { SearchInput } from '../components/shared/SearchInput';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Badge } from '../components/common/Badge';
import { FormInput } from '../components/common/FormInput';
import { apiClient } from '../api/axios';
import { formatCurrency } from '../utils/formatCurrency';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', { search: searchTerm, categoryId: selectedCategory }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      const response = await apiClient.get(`/products?${params}`);
      return response.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product created successfully');
      setIsFormModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product updated successfully');
      setIsFormModalOpen(false);
      setEditingProduct(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingProductId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    reset({});
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    reset(product);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (productId) => {
    setDeletingProductId(productId);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStockBadge = (product) => {
    const stock = product.inventory?.quantity || 0;
    const threshold = product.inventory?.lowStockThreshold || 10;

    if (stock <= threshold) {
      return <Badge variant="red">Low Stock</Badge>;
    } else if (stock <= threshold * 1.5) {
      return <Badge variant="amber">Medium</Badge>;
    } else {
      return <Badge variant="green">In Stock</Badge>;
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Product Name',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-100">{row.name}</p>
          <p className="text-xs text-slate-500">{row.category?.name}</p>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (row) => <span className="font-mono text-slate-300">{row.sku}</span>,
    },
    {
      key: 'barcode',
      header: 'Barcode',
      render: (row) => <span className="font-mono text-slate-300">{row.barcode}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => (
        <span className="font-mono text-amber-400">{formatCurrency(row.price)}</span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (row) => (
        <span className="font-mono text-slate-300">{formatCurrency(row.cost)}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (row) => (
        <span className="font-mono">{row.inventory?.quantity || 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => getStockBadge(row),
    },
    {
      key: 'actions',
      header: 'Actions',
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
    { value: '', label: 'All Categories' },
    ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []),
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="Product Management"
        subtitle="Manage your product catalog"
        actions={
          <Button variant="primary" icon={<Plus size={18} />} onClick={handleOpenCreate}>
            Add Product
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
        {/* Toolbar */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Search products..."
            />
          </div>
          <Select
            options={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            className="w-48"
          />
          <Button variant="ghost" icon={<Download size={18} />}>
            Export CSV
          </Button>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={products?.data || []}
          isLoading={isLoading}
          emptyMessage="No products found"
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        width={600}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormInput
              {...register('name', { required: 'Name is required' })}
              label="Product Name"
              placeholder="Enter product name"
              error={errors.name?.message}
            />
            <FormInput
              {...register('sku', { required: 'SKU is required' })}
              label="SKU"
              placeholder="Enter SKU"
              error={errors.sku?.message}
            />
            <FormInput
              {...register('barcode', { required: 'Barcode is required' })}
              label="Barcode"
              placeholder="Enter barcode"
              error={errors.barcode?.message}
            />
            <Select
              {...register('categoryId', { required: 'Category is required' })}
              label="Category"
              options={categories?.map((cat) => ({
                value: cat.id,
                label: cat.name,
              })) || []}
              error={errors.categoryId?.message}
            />
            <FormInput
              {...register('price', {
                required: 'Price is required',
                min: { value: 0.01, message: 'Price must be positive' },
              })}
              label="Selling Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.price?.message}
            />
            <FormInput
              {...register('cost', {
                required: 'Cost is required',
                min: { value: 0, message: 'Cost cannot be negative' },
              })}
              label="Cost Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.cost?.message}
            />
            {!editingProduct && (
              <FormInput
                {...register('initialQuantity', {
                  required: 'Initial quantity is required',
                  min: { value: 0, message: 'Quantity cannot be negative' },
                })}
                label="Initial Quantity"
                type="number"
                placeholder="0"
                error={errors.initialQuantity?.message}
              />
            )}
            <FormInput
              {...register('lowStockThreshold', {
                required: 'Low stock threshold is required',
                min: { value: 1, message: 'Threshold must be at least 1' },
              })}
              label="Low Stock Alert At"
              type="number"
              placeholder="10"
              error={errors.lowStockThreshold?.message}
            />
          </div>
          <div className="mb-6">
            <FormInput
              {...register('taxRate', {
                required: 'Tax rate is required',
                min: { value: 0, message: 'Tax rate cannot be negative' },
                max: { value: 100, message: 'Tax rate cannot exceed 100%' },
              })}
              label="Tax Rate (%)"
              type="number"
              step="0.1"
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
              {editingProduct ? 'Update Product' : 'Create Product'}
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
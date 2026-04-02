import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { useCartStore } from "../store/cartStore";
import { apiClient } from "../api/axios";
import { formatCurrency } from "../utils/formatCurrency";
import { Search, Minus, Plus, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Receipt } from "../components/shared/Receipt";
import { useReactToPrint } from "react-to-print";

export const POSPage = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [completedSale, setCompletedSale] = useState(null);
  const barcodeInputRef = useRef(null);
  const receiptRef = useRef(null);

  const {
    items,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    subtotal,
    taxTotal,
    grandTotal,
    itemCount,
  } = useCartStore();

  const queryClient = useQueryClient();

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: [
      "products",
      { categoryId: selectedCategory, search: searchTerm },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (searchTerm) params.append("search", searchTerm);
      const response = await apiClient.get(`/products?${params}`);
      return response.data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers", "pos-selection"],
    queryFn: async () => {
      const response = await apiClient.get("/customers");
      return response.data;
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      const response = await apiClient.post("/sales", saleData);
      return response.data;
    },
    onSuccess: (response) => {
      // Backend returns payload as { data: mappedSale }
      setCompletedSale(response?.data || null);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      queryClient.invalidateQueries(["dashboard-daily"]);
      queryClient.invalidateQueries(["dashboard-sales"]);
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["customers"]);
      queryClient.invalidateQueries(["customer-sales"]);
      toast.success("Sale completed successfully!");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to complete sale",
      );
    },
  });

  const handleBarcodeSearch = async (e) => {
    if (e.key === "Enter" && barcode.trim()) {
      try {
        const response = await apiClient.get(`/products/barcode/${barcode}`);
        addItem(response.data);
        setBarcode("");
        setSearchTerm("");
        toast.success("Product added to cart");
      } catch {
        toast.error("Product not found");
      }
    }
  };

  const handleScannerInputChange = (e) => {
    const value = e.target.value;
    setBarcode(value);
    setSearchTerm(value.trim());
  };

  // Debounce Charge button
  const [chargeDisabled, setChargeDisabled] = useState(false);
  const handleCharge = () => {
    if (items.length === 0 || chargeDisabled) return;
    setChargeDisabled(true);
    setIsPaymentModalOpen(true);
    setAmountPaid(grandTotal(discount).toFixed(2));
    setTimeout(() => setChargeDisabled(false), 1500);
  };
  // Offline handling stub
  useEffect(() => {
    if (!navigator.onLine) {
      toast.error("You are offline. Some features may not work.");
    }
  }, []);

  const handleConfirmPayment = () => {
    const total = Math.round(grandTotal(discount) * 100) / 100;
    const parsedPaid = parseFloat(amountPaid);
    const paid = Math.round(parsedPaid * 100) / 100;

    if (!Number.isFinite(parsedPaid) || paid <= 0) {
      toast.error("Enter a valid amount tendered");
      return;
    }

    if (paid < total) {
      toast.error("Amount paid is less than total");
      return;
    }

    const saleData = {
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        barcode: item.barcode,
        price: item.price,
        taxRate: item.taxRate,
        quantity: item.quantity,
      })),
      paymentMethod,
      amountPaid: paid,
      discountAmount: discount,
      customerId: selectedCustomerId || null,
    };

    createSaleMutation.mutate(saleData);
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const handleNewSale = () => {
    clearCart();
    setIsReceiptModalOpen(false);
    setCompletedSale(null);
    setDiscount(0);
    setAmountPaid("");
    setSelectedCustomerId("");
    setPaymentMethod("CASH");
    barcodeInputRef.current?.focus();
  };

  const change = parseFloat(amountPaid || 0) - grandTotal(discount);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar title="POS Terminal" subtitle="Point of Sale" />
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col bg-[#080e1a] p-4 overflow-hidden">
          {/* Barcode Scanner */}
          <div className="mb-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"
                size={20}
              />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={handleScannerInputChange}
                onKeyDown={handleBarcodeSearch}
                placeholder="Scan barcode or type to search..."
                className="w-full pl-10 pr-4 py-3 bg-[#0a1628] border-2 border-amber-500/50 text-slate-100 rounded-lg font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                selectedCategory === null
                  ? "bg-indigo-500 text-white"
                  : "bg-[#141d2e] text-slate-300 hover:bg-indigo-900/20"
              }`}
            >
              All
            </button>
            {categories?.data?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-indigo-500 text-white"
                    : "bg-[#141d2e] text-slate-300 hover:bg-indigo-900/20"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pos-scrollbar">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {products?.data?.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="bg-[#141d2e] border border-[#1e2d45] rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition"
                >
                  <h4 className="text-sm font-semibold text-slate-100 mb-1 line-clamp-2">
                    {product.productName || product.name}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">
                    {product.category?.name}
                  </p>
                  <p className="text-lg font-bold font-mono text-amber-400 mb-2">
                    {formatCurrency(product.price)}
                  </p>
                  <Badge
                    variant={product.inventory?.quantity > 10 ? "green" : "red"}
                  >
                    Stock: {product.inventory?.quantity || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Cart */}
        <div className="w-85 bg-[#0f172a] border-l border-[#1e2d45] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#1e2d45]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Order Cart
              </h3>
              <Badge variant="amber">{itemCount()}</Badge>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Cart is empty</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="bg-[#141d2e] border border-[#1e2d45] rounded-lg p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-slate-100 flex-1">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {formatCurrency(item.price)} each
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQty(item.productId, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded bg-[#0f172a] border border-[#1e2d45] flex items-center justify-center text-slate-300 hover:bg-indigo-900/20"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-mono text-slate-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQty(item.productId, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded bg-[#0f172a] border border-[#1e2d45] flex items-center justify-center text-slate-300 hover:bg-indigo-900/20"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-mono font-semibold text-amber-400">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="p-4 border-t border-[#1e2d45] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-100 font-mono">
                {formatCurrency(subtotal())}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">VAT</span>
              <span className="text-slate-100 font-mono">
                {formatCurrency(taxTotal())}
              </span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-400">Discount</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 bg-[#0a1628] border border-[#263548] text-slate-100 rounded text-right font-mono text-sm"
              />
            </div>
            <div className="border-t border-[#1e2d45] pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-100">
                  TOTAL
                </span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {formatCurrency(grandTotal(discount))}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                fullWidth
                onClick={clearCart}
                disabled={items.length === 0}
                leftIcon={<Trash2 size={16} />}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleCharge}
                disabled={items.length === 0}
              >
                Charge {formatCurrency(grandTotal(discount))}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Complete Payment"
        width={500}
      >
        <div className="p-6 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
            <p className="text-sm text-amber-400 mb-1">Amount Due</p>
            <p className="text-3xl font-bold font-mono text-amber-400">
              {formatCurrency(grandTotal(discount))}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Customer (optional)
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Walk-in Customer</option>
              {(customers?.data || []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["CASH", "MOBILE_MONEY", "CARD"].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition ${
                    paymentMethod === method
                      ? "bg-indigo-500 text-white"
                      : "bg-[#0f172a] text-slate-300 hover:bg-indigo-900/20"
                  }`}
                >
                  {method.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount Tendered
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              step="0.01"
            />
          </div>

          {change > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-400">Change Due</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              fullWidth
              onClick={handleConfirmPayment}
              loading={createSaleMutation.isLoading}
              disabled={createSaleMutation.isLoading}
            >
              {createSaleMutation.isLoading
                ? "Processing..."
                : "Confirm Payment ✓"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={handleNewSale}
        title="Sale Completed"
        width={600}
      >
        <div className="p-6">
          {completedSale && (
            <Receipt
              ref={receiptRef}
              sale={completedSale}
              storeName={completedSale?.receipt?.storeName || ""}
              storeTIN={completedSale?.receipt?.storeTaxId || ""}
              storeAddress={completedSale?.receipt?.storeAddress || ""}
            />
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" fullWidth onClick={handlePrint}>
              Print
            </Button>
            <Button variant="primary" fullWidth onClick={handleNewSale}>
              New Sale →
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

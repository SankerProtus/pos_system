import { useEffect, useRef, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { Pagination } from "../components/shared/Pagination";
import { useCartStore } from "../store/cartStore";
import { apiClient } from "../api/axios";
import { formatCurrency } from "../utils/formatCurrency";
import { Search, Minus, Plus, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Receipt } from "../components/shared/Receipt";
import { MobileMoneyPaymentModal } from "../components/shared/MobileMoneyPaymentModal";
import { useReactToPrint } from "react-to-print";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import {
  isTerminalMobileMoneyFailure,
  toMobileMoneyFailureMessage,
} from "../utils/mobileMoneyStatus";

const PRODUCT_PAGE_SIZE = 24;

const createPaymentInitializeIdempotencyKey = () => {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
};

const getPaymentInitializeHeaders = (idempotencyKeyRef) => {
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = createPaymentInitializeIdempotencyKey();
  }

  return {
    headers: {
      "Idempotency-Key": idempotencyKeyRef.current,
    },
  };
};

const isEditableTarget = (target) => {
  const tagName = target?.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target?.isContentEditable
  );
};

export const POSPage = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [barcode, setBarcode] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMobileMoneyModalOpen, setIsMobileMoneyModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [completedSale, setCompletedSale] = useState(null);
  const [mobileMoneyPhoneNumber, setMobileMoneyPhoneNumber] = useState("");
  const [mobileMoneyOtp, setMobileMoneyOtp] = useState("");
  const [mobileMoneyReference, setMobileMoneyReference] = useState("");
  const [mobileMoneyRequiresOtp, setMobileMoneyRequiresOtp] = useState(false);
  const [mobileMoneyAwaitingApproval, setMobileMoneyAwaitingApproval] =
    useState(false);
  const [mobileMoneySubmitting, setMobileMoneySubmitting] = useState(false);
  const [mobileMoneyStatusMessage, setMobileMoneyStatusMessage] = useState("");
  const [mobileMoneyExpiresAt, setMobileMoneyExpiresAt] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [isRemoveItemDialogOpen, setIsRemoveItemDialogOpen] = useState(false);
  const [pendingRemoveItem, setPendingRemoveItem] = useState(null);
  const barcodeInputRef = useRef(null);
  const receiptRef = useRef(null);
  const productItemRefs = useRef([]);
  const cartItemRefs = useRef([]);
  const mobileMoneyPollingActiveRef = useRef(false);
  const paymentInitializeIdempotencyKeyRef = useRef("");
  const shortcutStateRef = useRef({
    isPaymentModalOpen: false,
    isMobileMoneyModalOpen: false,
    isReceiptModalOpen: false,
    selectedCartItem: null,
    handleCharge: null,
    handleConfirmPayment: null,
    handleMobileMoneyConfirm: null,
    handleNewSale: null,
    moveCartSelection: null,
    removeItem: null,
    updateQty: null,
  });

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setProductPage(1);
      setSelectedProductIndex(0);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchTerm, selectedCategory]);

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: products,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: [
      "pos-products",
      {
        categoryId: selectedCategory,
        search: debouncedSearchTerm,
        page: productPage,
        limit: PRODUCT_PAGE_SIZE,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);
      params.append("page", String(productPage));
      params.append("limit", String(PRODUCT_PAGE_SIZE));
      const response = await apiClient.get(`/products?${params}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const { data: customers, error: customersError } = useQuery({
    queryKey: ["customers", "pos-selection"],
    queryFn: async () => {
      const response = await apiClient.get("/customers");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings");
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const productRows = Array.isArray(products?.data) ? products.data : [];
  const getProductImage = (product) => product?.imageUrl || "/no-image.jpg";
  const getCartItemImage = (item) =>
    item?.imageUrl ||
    getProductImage(
      productRows.find((product) => product.id === item?.productId),
    ) ||
    "/no-image.jpg";
  const totalProductPages = Math.max(products?.meta?.totalPages || 1, 1);
  const totalProductCount = Number(products?.meta?.total || productRows.length);
  const activeProduct = productRows[selectedProductIndex] || null;
  const selectedCartItem = items[selectedCartIndex] || null;
  const receiptStoreName =
    completedSale?.receipt?.storeName || settings?.storeName || "";
  const receiptStoreTIN =
    completedSale?.receipt?.storeTaxId ||
    settings?.storeTaxId ||
    settings?.vatTIN ||
    "";
  const receiptStoreAddress =
    completedSale?.receipt?.storeAddress || settings?.storeAddress || "";

  useEffect(() => {
    setProductPage((currentPage) => Math.min(currentPage, totalProductPages));
  }, [totalProductPages]);

  useEffect(() => {
    setSelectedProductIndex((currentIndex) =>
      productRows.length === 0
        ? 0
        : Math.min(currentIndex, productRows.length - 1),
    );
  }, [productRows.length]);

  useEffect(() => {
    const selectedProductElement =
      productItemRefs.current[selectedProductIndex];
    if (selectedProductElement) {
      selectedProductElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedProductIndex, productRows.length]);

  useEffect(() => {
    setSelectedCartIndex((currentIndex) =>
      items.length === 0 ? 0 : Math.min(currentIndex, items.length - 1),
    );
  }, [items.length]);

  useEffect(() => {
    const selectedCartElement = cartItemRefs.current[selectedCartIndex];
    if (selectedCartElement) {
      selectedCartElement.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedCartIndex, items.length]);

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setBarcode("");
    setProductPage(1);
    setSelectedProductIndex(0);
    barcodeInputRef.current?.focus();
  };

  const requestClearCart = () => {
    if (items.length === 0) return;
    setIsClearCartDialogOpen(true);
  };

  const requestRemoveItem = (item) => {
    if (!item?.productId) return;
    setPendingRemoveItem(item);
    setIsRemoveItemDialogOpen(true);
  };

  const handleConfirmRemoveItem = () => {
    if (pendingRemoveItem?.productId) {
      removeItem(pendingRemoveItem.productId);
    }
    setPendingRemoveItem(null);
  };

  const addProductToCart = (product) => {
    if (!product) return false;

    addItem(product);
    setBarcode("");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setProductPage(1);
    setSelectedProductIndex(0);
    toast.success(`${product.productName || product.name} added to cart`);
    barcodeInputRef.current?.focus();
    return true;
  };

  const selectActiveProduct = async () => {
    if (activeProduct) {
      addProductToCart(activeProduct);
      return;
    }

    if (!barcode.trim()) {
      toast.error("Search for an item or scan a barcode first");
      return;
    }

    try {
      const response = await apiClient.get(
        `/products/barcode/${barcode.trim()}`,
      );
      addProductToCart(response.data);
    } catch {
      toast.error("Product not found");
    }
  };

  const moveProductSelection = (delta) => {
    if (productRows.length === 0) return;

    setSelectedProductIndex((currentIndex) => {
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0) return 0;
      if (nextIndex >= productRows.length) return productRows.length - 1;
      return nextIndex;
    });
  };

  const moveCartSelection = (delta) => {
    if (items.length === 0) return;

    setSelectedCartIndex((currentIndex) => {
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0) return 0;
      if (nextIndex >= items.length) return items.length - 1;
      return nextIndex;
    });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      selectActiveProduct();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveProductSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveProductSelection(-1);
    }
  };

  const handleProductGridKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addProductToCart(activeProduct);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setProductPage((currentPage) =>
        Math.min(currentPage + 1, totalProductPages),
      );
      setSelectedProductIndex(0);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setProductPage((currentPage) => Math.max(currentPage - 1, 1));
      setSelectedProductIndex(0);
      return;
    }
  };

  const handleCartKeyDown = (event, item, index) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedCartIndex(index);
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      setSelectedCartIndex(index);
      requestRemoveItem(item);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCartSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCartSelection(-1);
    }
  };

  const createSaleMutation = useMutation({
    mutationFn: async (saleData) => {
      const response = await apiClient.post("/sales", saleData);
      return response.data;
    },
    onSuccess: (response) => {
      handleSaleCompleted(response?.data || null);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to complete sale",
      );
    },
  });

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);

    const total = grandTotal(discount).toFixed(2);
    // Non-cash must settle exact total; keep amount synced to total due.
    setAmountPaid(total);

    if (method !== "MOBILE_MONEY") {
      mobileMoneyPollingActiveRef.current = false;
      setIsMobileMoneyModalOpen(false);
      setMobileMoneyPhoneNumber("");
      setMobileMoneyOtp("");
      setMobileMoneyReference("");
      setMobileMoneyExpiresAt(null);
      setMobileMoneyRequiresOtp(false);
      setMobileMoneyAwaitingApproval(false);
      setMobileMoneySubmitting(false);
      setMobileMoneyStatusMessage("");
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
    paymentInitializeIdempotencyKeyRef.current =
      createPaymentInitializeIdempotencyKey();
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

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handleNewSale = () => {
    mobileMoneyPollingActiveRef.current = false;
    paymentInitializeIdempotencyKeyRef.current = "";
    clearCart();
    setIsReceiptModalOpen(false);
    setCompletedSale(null);
    setIsPaymentModalOpen(false);
    setIsMobileMoneyModalOpen(false);
    setDiscount(0);
    setAmountPaid("");
    setSelectedCustomerId("");
    setPaymentMethod("CASH");
    setMobileMoneyPhoneNumber("");
    setMobileMoneyOtp("");
    setMobileMoneyReference("");
    setMobileMoneyExpiresAt(null);
    setMobileMoneyRequiresOtp(false);
    setMobileMoneyAwaitingApproval(false);
    setMobileMoneySubmitting(false);
    setMobileMoneyStatusMessage("");
    setProductPage(1);
    setSelectedProductIndex(0);
    setSelectedCartIndex(0);
    clearSearch();
    barcodeInputRef.current?.focus();
  };

  function handleSaleCompleted(sale) {
    mobileMoneyPollingActiveRef.current = false;
    paymentInitializeIdempotencyKeyRef.current = "";
    setCompletedSale(sale || null);
    setIsPaymentModalOpen(false);
    setIsMobileMoneyModalOpen(false);
    setIsReceiptModalOpen(true);
    clearCart();
    setMobileMoneyPhoneNumber("");
    setMobileMoneyOtp("");
    setMobileMoneyReference("");
    setMobileMoneyExpiresAt(null);
    setMobileMoneyRequiresOtp(false);
    setMobileMoneyAwaitingApproval(false);
    setMobileMoneySubmitting(false);
    setMobileMoneyStatusMessage("");
    setSelectedProductIndex(0);
    setSelectedCartIndex(0);
    setProductPage(1);
    queryClient.invalidateQueries({ queryKey: ["dashboard-daily"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-weekly"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-sales"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["customer-sales"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    toast.success("Sale completed successfully!");
  }

  const pollMobileMoneyStatus = async (reference, initialExpiresAt) => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let attempt = 0;
    let deadline = initialExpiresAt
      ? new Date(initialExpiresAt).getTime()
      : Date.now() + 15 * 60 * 1000;

    while (mobileMoneyPollingActiveRef.current && Date.now() <= deadline) {
      if (attempt > 0) {
        await wait(attempt < 10 ? 3000 : 5000);
      }

      if (!mobileMoneyPollingActiveRef.current) {
        const cancelledError = new Error("Payment polling stopped");
        cancelledError.isPollingStopped = true;
        throw cancelledError;
      }

      attempt += 1;

      try {
        const verifyResponse = await apiClient.get(
          `/payments/verify/${reference}`,
        );
        const paymentData = verifyResponse?.data?.data || {};

        if (paymentData?.expiresAt) {
          const nextDeadline = new Date(paymentData.expiresAt).getTime();
          if (Number.isFinite(nextDeadline) && nextDeadline > 0) {
            deadline = nextDeadline;
          }
        }

        const paymentStatus = String(paymentData?.status || "").toUpperCase();
        const saleStatus = String(paymentData?.saleStatus || "").toUpperCase();
        const providerStatus = String(
          paymentData?.providerStatus || "",
        ).toUpperCase();
        const statusMessage =
          paymentData?.failureReason ||
          paymentData?.providerMessage ||
          paymentData?.gatewayResponse ||
          "";

        if (
          paymentData?.sale?.status === "COMPLETED" ||
          paymentStatus === "SUCCESS" ||
          saleStatus === "COMPLETED"
        ) {
          if (paymentData?.sale) {
            handleSaleCompleted(paymentData.sale);
            return;
          }
        }

        if (
          ["FAILED", "CANCELLED", "CANCELED"].includes(paymentStatus) ||
          ["FAILED", "CANCELLED", "CANCELED"].includes(saleStatus) ||
          ["FAILED", "ABANDONED", "REVERSED", "CANCELLED", "CANCELED"].includes(
            providerStatus,
          ) ||
          isTerminalMobileMoneyFailure(statusMessage)
        ) {
          const terminalError = new Error(
            toMobileMoneyFailureMessage(statusMessage),
          );
          terminalError.isTerminal = true;
          throw terminalError;
        }

        setMobileMoneyStatusMessage(
          paymentData?.providerMessage ||
            paymentData?.gatewayResponse ||
            "Waiting for customer approval...",
        );
      } catch (error) {
        const apiErrorMessage =
          error?.response?.data?.error || error?.message || "";

        if (error?.isPollingStopped) {
          throw error;
        }

        if (
          error?.isTerminal ||
          isTerminalMobileMoneyFailure(apiErrorMessage)
        ) {
          throw new Error(toMobileMoneyFailureMessage(apiErrorMessage));
        }

        if (Date.now() + 5000 > deadline) {
          throw error;
        }
      }
    }

    if (!mobileMoneyPollingActiveRef.current) {
      const cancelledError = new Error("Payment polling stopped");
      cancelledError.isPollingStopped = true;
      throw cancelledError;
    }

    throw new Error(
      toMobileMoneyFailureMessage(
        "Payment timed out - ask customer to check their phone approvals",
      ),
    );
  };

  const handleMobileMoneyStart = async () => {
    const normalizedPhone = String(mobileMoneyPhoneNumber || "")
      .trim()
      .replace(/[\s()-]/g, "");

    if (!/^(?:\+233\d{9}|0\d{9})$/.test(normalizedPhone)) {
      throw new Error(
        "Phone must be +233XXXXXXXXX or 0XXXXXXXXX (e.g. 0540000000)",
      );
    }

    const selectedCustomer = (customers?.data || []).find(
      (customer) => customer.id === selectedCustomerId,
    );

    const response = await apiClient.post(
      "/payments/initialize",
      {
        amount: grandTotal(discount),
        paymentMethod: "MOBILE_MONEY",
        customerId: selectedCustomerId || null,
        customerEmail: selectedCustomer?.email || null,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          barcode: item.barcode,
          price: item.price,
          taxRate: item.taxRate,
          quantity: item.quantity,
        })),
        phoneNumber: mobileMoneyPhoneNumber,
        discountAmount: discount,
        metadata: {
          source: "POS",
        },
      },
      getPaymentInitializeHeaders(paymentInitializeIdempotencyKeyRef),
    );

    const paymentData = response?.data?.data || {};
    const reference = paymentData?.reference;

    if (!reference) {
      throw new Error("Unable to initialize Paystack payment");
    }

    setMobileMoneyReference(reference);
    setMobileMoneyExpiresAt(paymentData?.expiresAt || null);
    setMobileMoneyStatusMessage(
      paymentData?.providerMessage ||
        "Payment prompt sent. Waiting for customer approval.",
    );

    const providerStatus = String(
      paymentData?.providerStatus || paymentData?.status || "",
    ).toUpperCase();

    if (providerStatus === "SEND_OTP") {
      setMobileMoneyRequiresOtp(true);
      setMobileMoneyAwaitingApproval(false);
      setMobileMoneyStatusMessage(
        "Enter the OTP sent to the customer's phone.",
      );
      return;
    }

    setMobileMoneyRequiresOtp(false);
    setMobileMoneyAwaitingApproval(true);
    mobileMoneyPollingActiveRef.current = true;
    await pollMobileMoneyStatus(reference, paymentData?.expiresAt || null);
  };

  const handleMobileMoneySubmitOtp = async () => {
    if (!mobileMoneyReference) {
      throw new Error("Payment reference is missing");
    }

    if (!mobileMoneyOtp.trim()) {
      throw new Error("Enter the OTP sent to the customer's phone");
    }

    const response = await apiClient.post("/payments/submit-otp", {
      reference: mobileMoneyReference,
      otp: mobileMoneyOtp.trim(),
    });

    const paymentData = response?.data?.data || {};
    const status = String(paymentData?.status || "").toUpperCase();

    if (status === "FAILED") {
      throw new Error(paymentData?.gatewayResponse || "OTP submission failed");
    }

    setMobileMoneyRequiresOtp(false);
    setMobileMoneyAwaitingApproval(true);
    setMobileMoneyStatusMessage(
      paymentData?.gatewayResponse || "Waiting for customer approval...",
    );

    mobileMoneyPollingActiveRef.current = true;
    await pollMobileMoneyStatus(
      mobileMoneyReference,
      paymentData?.expiresAt || mobileMoneyExpiresAt,
    );
  };

  const handleCancelMobileMoneyRequest = async () => {
    if (!mobileMoneyReference) {
      setIsMobileMoneyModalOpen(false);
      return;
    }

    try {
      setMobileMoneySubmitting(true);
      mobileMoneyPollingActiveRef.current = false;

      const response = await apiClient.post("/payments/cancel", {
        reference: mobileMoneyReference,
        reason: "Cancelled from POS terminal",
      });

      const result = response?.data?.data || {};
      setMobileMoneyAwaitingApproval(false);
      setMobileMoneyStatusMessage(
        result?.failureReason || "Payment request cancelled.",
      );

      toast.success("Payment request cancelled");
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      setTimeout(() => {
        setIsMobileMoneyModalOpen(false);
        setMobileMoneyPhoneNumber("");
        setMobileMoneyOtp("");
        setMobileMoneyReference("");
        setMobileMoneyExpiresAt(null);
        setMobileMoneyRequiresOtp(false);
        setMobileMoneyAwaitingApproval(false);
        setMobileMoneyStatusMessage("");
      }, 200);
    } catch (error) {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to cancel payment request",
      );
    } finally {
      setMobileMoneySubmitting(false);
    }
  };

  const handleMobileMoneyConfirm = async () => {
    if (mobileMoneyAwaitingApproval) {
      return;
    }

    try {
      setMobileMoneySubmitting(true);

      if (mobileMoneyRequiresOtp) {
        await handleMobileMoneySubmitOtp();
        return;
      }

      await handleMobileMoneyStart();
    } catch (error) {
      if (error?.isPollingStopped) {
        return;
      }

      const rawErrorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to process Paystack payment";
      const errorMessage = toMobileMoneyFailureMessage(rawErrorMessage);

      setMobileMoneyAwaitingApproval(false);
      setMobileMoneyStatusMessage(errorMessage);

      toast.error(errorMessage);
    } finally {
      setMobileMoneySubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    const total = Math.round(grandTotal(discount) * 100) / 100;
    const parsedPaid = parseFloat(amountPaid);
    const paid = Math.round(parsedPaid * 100) / 100;

    if (!Number.isFinite(parsedPaid) || paid <= 0) {
      toast.error("Enter a valid amount tendered");
      return;
    }

    if (paymentMethod !== "CASH" && paid < total) {
      toast.error("Amount paid is less than total for non-cash payment");
      return;
    }

    if (paymentMethod === "CASH" && paid < total) {
      toast.error("Amount tendered is less than total");
      return;
    }

    if (paymentMethod === "MOBILE_MONEY") {
      if (paid !== total) {
        toast.error("Amount paid must match total for mobile money payments");
        return;
      }
    }

    if (paymentMethod === "CARD") {
      if (paid !== total) {
        toast.error("Amount paid must match total for card payments");
        return;
      }
    }

    const submitSale = async (resolvedReference) => {
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
        reference: resolvedReference || null,
      };

      return createSaleMutation.mutateAsync(saleData);
    };

    const openMobileMoneyModal = () => {
      paymentInitializeIdempotencyKeyRef.current =
        createPaymentInitializeIdempotencyKey();
      const selectedCustomer = (customers?.data || []).find(
        (customer) => customer.id === selectedCustomerId,
      );

      setMobileMoneyPhoneNumber(selectedCustomer?.phone || "");
      setMobileMoneyOtp("");
      setMobileMoneyReference("");
      setMobileMoneyExpiresAt(null);
      setMobileMoneyRequiresOtp(false);
      setMobileMoneyAwaitingApproval(false);
      setMobileMoneySubmitting(false);
      setMobileMoneyStatusMessage(
        "Enter the customer's phone number to send the mobile money prompt.",
      );

      setIsPaymentModalOpen(false);
      setIsMobileMoneyModalOpen(true);
    };

    const runNonCashFlow = async () => {
      const selectedCustomer = (customers?.data || []).find(
        (c) => c.id === selectedCustomerId,
      );

      const initResponse = await apiClient.post(
        "/payments/initialize",
        {
          amount: paid,
          paymentMethod,
          customerId: selectedCustomerId || null,
          customerEmail: selectedCustomer?.email || null,
          metadata: {
            source: "POS",
          },
        },
        getPaymentInitializeHeaders(paymentInitializeIdempotencyKeyRef),
      );

      const authorizationUrl = initResponse?.data?.data?.authorizationUrl;
      const reference = initResponse?.data?.data?.reference;

      if (!authorizationUrl || !reference) {
        throw new Error("Unable to initialize Paystack payment");
      }

      const popup = window.open(
        authorizationUrl,
        "_blank",
        "noopener,noreferrer",
      );
      if (!popup) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }

      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let attempt = 0; attempt < 40; attempt += 1) {
        await wait(3000);

        try {
          const verifyResponse = await apiClient.get(
            `/payments/verify/${reference}`,
          );
          const status = verifyResponse?.data?.data?.status;
          if (status === "success") {
            toast.success("Payment verified successfully");
            await submitSale(reference);
            return;
          }
        } catch {
          // Keep polling until timeout.
        }
      }

      throw new Error(
        "Payment verification timed out. Complete payment and retry.",
      );
    };

    if (paymentMethod === "CASH") {
      await submitSale(null);
      return;
    }

    if (paymentMethod === "MOBILE_MONEY") {
      openMobileMoneyModal();
      return;
    }

    runNonCashFlow().catch((error) => {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to process Paystack payment",
      );
    });
  };

  useEffect(() => {
    shortcutStateRef.current = {
      isPaymentModalOpen,
      isMobileMoneyModalOpen,
      isReceiptModalOpen,
      selectedCartItem,
      handleCharge,
      handleConfirmPayment,
      handleMobileMoneyConfirm,
      handleNewSale,
      moveCartSelection,
      removeItem: requestRemoveItem,
      updateQty,
    };
  });

  useEffect(() => {
    const handleGlobalShortcuts = (event) => {
      const state = shortcutStateRef.current;

      if (
        state.isPaymentModalOpen ||
        state.isMobileMoneyModalOpen ||
        state.isReceiptModalOpen
      ) {
        if (event.key === "Enter" && !isEditableTarget(event.target)) {
          event.preventDefault();
          if (state.isPaymentModalOpen) {
            state.handleConfirmPayment?.();
            return;
          }
          if (state.isMobileMoneyModalOpen) {
            state.handleMobileMoneyConfirm?.();
            return;
          }
          if (state.isReceiptModalOpen) {
            state.handleNewSale?.();
          }
        }
        return;
      }

      if ((event.ctrlKey && event.key === "Enter") || event.key === "F4") {
        event.preventDefault();
        state.handleCharge?.();
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        (event.key === "/" || event.key === "F2")
      ) {
        event.preventDefault();
        barcodeInputRef.current?.focus();
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        event.altKey &&
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        state.moveCartSelection?.(1);
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        event.altKey &&
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        state.moveCartSelection?.(-1);
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        (event.key === "+" || event.key === "=")
      ) {
        if (state.selectedCartItem) {
          event.preventDefault();
          state.updateQty?.(
            state.selectedCartItem.productId,
            state.selectedCartItem.quantity + 1,
          );
        }
        return;
      }

      if (!isEditableTarget(event.target) && event.key === "-") {
        if (state.selectedCartItem) {
          event.preventDefault();
          state.updateQty?.(
            state.selectedCartItem.productId,
            state.selectedCartItem.quantity - 1,
          );
        }
        return;
      }

      if (
        !isEditableTarget(event.target) &&
        (event.key === "Delete" || event.key === "Backspace") &&
        state.selectedCartItem
      ) {
        event.preventDefault();
        state.removeItem?.(state.selectedCartItem);
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, []);

  const change = parseFloat(amountPaid || 0) - grandTotal(discount);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#080e1a]">
      <Topbar title="POS Terminal" subtitle="Point of Sale" />
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 pt-3 xl:overflow-hidden lg:px-4">
        <div className="grid min-h-0 grid-cols-1 gap-3 xl:h-full xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="flex flex-col gap-3 rounded-2xl border border-[#1e2d45] bg-[#09111f] p-3 shadow-[0_24px_60px_rgba(2,8,23,0.45)] xl:min-h-0 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="mt-1 text-2xl font-semibold text-slate-50">
                  Quick Checkout
                </h1>
              </div>
            </div>

            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400"
                size={20}
              />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={handleScannerInputChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode or search products"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-amber-500/35 bg-[#0a1628] py-4 pl-12 pr-4 font-mono text-base text-slate-100 shadow-inner shadow-black/10 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:text-lg"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setProductPage(1);
                }}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === null
                    ? "bg-indigo-500 text-white"
                    : "bg-[#141d2e] text-slate-300 hover:bg-indigo-900/20"
                }`}
              >
                All
              </button>
              {isCategoriesLoading && (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#263548] px-4 py-2 text-sm text-slate-500">
                  Loading categories...
                </div>
              )}
              {categories?.data?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setProductPage(1);
                  }}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === cat.id
                      ? "bg-indigo-500 text-white"
                      : "bg-[#141d2e] text-slate-300 hover:bg-indigo-900/20"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {categoriesError && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                Categories did not load. You can still search and complete
                sales.
              </div>
            )}

            <div className="flex flex-col xl:min-h-0 xl:flex-1">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Products
                  </h2>
                  <p className="text-sm text-slate-500">
                    {activeProduct
                      ? `Highlighted: ${activeProduct.productName || activeProduct.name}`
                      : "Use the search box to find products quickly."}
                  </p>
                </div>
                {isProductsFetching && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    Refreshing
                  </span>
                )}
              </div>

              <div
                className="pr-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto pos-scrollbar"
                tabIndex={0}
                onKeyDown={handleProductGridKeyDown}
              >
                {isProductsLoading ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-41 animate-pulse rounded-2xl border border-[#1e2d45] bg-[#141d2e]"
                      />
                    ))}
                  </div>
                ) : productsError ? (
                  <EmptyState
                    title="Product lookup failed"
                    description="The cart is still available. Retry the lookup or keep working from the current cart."
                    actionLabel="Retry"
                    onAction={() => refetchProducts()}
                    secondaryActionLabel="Clear search"
                    onSecondaryAction={clearSearch}
                    className="min-h-80 rounded-2xl border border-dashed border-[#263548] bg-[#0f172a]"
                  />
                ) : productRows.length === 0 ? (
                  <EmptyState
                    title="No products found"
                    description={
                      debouncedSearchTerm
                        ? "Try a different barcode, product name, or category."
                        : "Start typing to search, or scan a barcode to add an item."
                    }
                    actionLabel={
                      debouncedSearchTerm ? "Clear search" : "Focus search"
                    }
                    onAction={
                      debouncedSearchTerm
                        ? clearSearch
                        : () => barcodeInputRef.current?.focus()
                    }
                    className="min-h-80 rounded-2xl border border-dashed border-[#263548] bg-[#0f172a]"
                  />
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {productRows.map((product, index) => {
                      const isActive = index === selectedProductIndex;

                      return (
                        <button
                          key={product.id}
                          ref={(element) => {
                            productItemRefs.current[index] = element;
                          }}
                          type="button"
                          onClick={() => addProductToCart(product)}
                          onFocus={() => setSelectedProductIndex(index)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              addProductToCart(product);
                            }
                          }}
                          className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                            isActive
                              ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
                              : "border-[#1e2d45] bg-[#141d2e] hover:border-indigo-500 hover:bg-[#172338]"
                          }`}
                        >
                          <div
                            className="mb-3 cursor-zoom-in overflow-hidden rounded-xl border border-[#263548] bg-[#0f172a]"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setPreviewImage({
                                url: getProductImage(product),
                                name: product.productName || product.name,
                              });
                            }}
                          >
                            <img
                              src={getProductImage(product)}
                              alt={product.productName || product.name}
                              className="h-24 w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = "/no-image.png";
                              }}
                            />
                          </div>
                          <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-slate-100">
                            {product.productName || product.name}
                          </h4>
                          <p className="mb-2 text-xs text-slate-500">
                            {product.category?.name || "Uncategorized"}
                          </p>
                          <p className="mb-3 font-mono text-lg font-bold text-amber-400">
                            {formatCurrency(product.price)}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant={
                                product.inventory?.quantity > 10
                                  ? "green"
                                  : "red"
                              }
                            >
                              Stock: {product.inventory?.quantity || 0}
                            </Badge>
                            {isActive && (
                              <span className="text-xs font-medium text-amber-300">
                                Selected
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {totalProductPages > 1 && (
                <Pagination
                  totalItems={totalProductCount}
                  itemsPerPage={PRODUCT_PAGE_SIZE}
                  currentPage={productPage}
                  onPageChange={(page) => {
                    setProductPage(page);
                    setSelectedProductIndex(0);
                  }}
                  itemLabel="products"
                />
              )}
            </div>
          </section>

          <aside className="flex flex-col rounded-2xl border border-[#1e2d45] bg-[#0f172a] shadow-[0_24px_60px_rgba(2,8,23,0.45)] xl:min-h-0 xl:overflow-hidden xl:sticky xl:top-3">
            <div className="border-b border-[#1e2d45] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Cart</h3>
                </div>
                <Badge variant="amber">{itemCount()}</Badge>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 xl:min-h-0 xl:overflow-y-auto pos-scrollbar">
              {items.length === 0 ? (
                <EmptyState
                  title="Cart is empty"
                  description="Search for products or scan a barcode to start building the sale."
                  actionLabel="Focus search"
                  onAction={() => barcodeInputRef.current?.focus()}
                  className="min-h-65 rounded-2xl border border-dashed border-[#263548] bg-[#141d2e]"
                />
              ) : (
                items.map((item, index) => {
                  const isSelected = index === selectedCartIndex;

                  return (
                    <div
                      key={item.productId}
                      ref={(element) => {
                        cartItemRefs.current[index] = element;
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedCartIndex(index)}
                      onKeyDown={(event) =>
                        handleCartKeyDown(event, item, index)
                      }
                      className={`rounded-2xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                        isSelected
                          ? "border-amber-400 bg-amber-500/10"
                          : "border-[#1e2d45] bg-[#141d2e] hover:border-indigo-500"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewImage({
                                url: getCartItemImage(item),
                                name: item.name,
                              });
                            }}
                            className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#263548] bg-[#0f172a]"
                            aria-label={`Preview ${item.name}`}
                          >
                            <img
                              src={getCartItemImage(item)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = "/no-image.png";
                              }}
                            />
                          </button>
                          <h4 className="flex-1 text-sm font-medium text-slate-100">
                            {item.name}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestRemoveItem(item);
                          }}
                          className="text-red-400 transition hover:text-red-300"
                          aria-label={`Remove ${item.name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="mb-3 text-xs text-slate-500">
                        {formatCurrency(item.price)} each
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateQty(item.productId, item.quantity - 1);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2d45] bg-[#0f172a] text-slate-300 transition hover:bg-indigo-900/20"
                            aria-label={`Decrease ${item.name}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-mono text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateQty(item.productId, item.quantity + 1);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2d45] bg-[#0f172a] text-slate-300 transition hover:bg-indigo-900/20"
                            aria-label={`Increase ${item.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="font-mono font-semibold text-amber-400">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#1e2d45] bg-[#0b1220] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[#1e2d45] bg-[#141d2e] px-3 py-2">
                  <p className="flex items-center justify-between gap-2 text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-100">
                      {formatCurrency(subtotal())}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e2d45] bg-[#141d2e] px-3 py-2">
                  <p className="flex items-center justify-between gap-2 text-slate-500">
                    <span>VAT</span>
                    <span className="font-mono text-slate-100">
                      {formatCurrency(taxTotal())}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#1e2d45] bg-[#141d2e] px-3 py-3">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Discount
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#263548] bg-[#0a1628] px-3 py-3 text-right font-mono text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-200">
                    Total
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-300">
                    {formatCurrency(grandTotal(discount))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  fullWidth
                  size="lg"
                  onClick={requestClearCart}
                  disabled={items.length === 0}
                  leftIcon={<Trash2 size={16} />}
                >
                  Clear Cart
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  size="md"
                  className="whitespace-nowrap font-semibold"
                  onClick={handleCharge}
                  disabled={items.length === 0}
                >
                  Charge {formatCurrency(grandTotal(discount))}
                </Button>
              </div>

              {customersError && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  Customer lookup is unavailable. You can still complete the
                  sale.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Complete Payment"
        width={500}
      >
        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
            <p className="text-sm text-amber-400 mb-1">Amount Due</p>
            <p className="text-3xl font-bold font-mono text-amber-400">
              {formatCurrency(grandTotal(discount))}
            </p>
          </div>

          <div className="rounded-2xl border border-[#1e2d45] bg-[#0f172a] px-4 py-3 text-sm text-slate-300">
            {createSaleMutation.isLoading
              ? "Saving the sale and preparing the receipt..."
              : paymentMethod === "CASH"
                ? "Cash sales post immediately once confirmed."
                : "Non-cash payments must match the total exactly."}
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
                  onClick={() => handlePaymentMethodChange(method)}
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
              {paymentMethod === "CASH" ? "Amount Tendered" : "Amount Paid"}
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              disabled={paymentMethod !== "CASH"}
              className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              step="0.01"
            />
          </div>

          {paymentMethod === "CASH" && change > 0 && (
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

      <MobileMoneyPaymentModal
        isOpen={isMobileMoneyModalOpen}
        onClose={() => {
          if (!mobileMoneyAwaitingApproval) {
            setIsMobileMoneyModalOpen(false);
            setMobileMoneyPhoneNumber("");
            setMobileMoneyOtp("");
            setMobileMoneyReference("");
            setMobileMoneyExpiresAt(null);
            setMobileMoneyRequiresOtp(false);
            setMobileMoneyAwaitingApproval(false);
            setMobileMoneySubmitting(false);
            setMobileMoneyStatusMessage("");
          }
        }}
        amount={grandTotal(discount)}
        phoneNumber={mobileMoneyPhoneNumber}
        onPhoneNumberChange={setMobileMoneyPhoneNumber}
        otp={mobileMoneyOtp}
        onOtpChange={setMobileMoneyOtp}
        onConfirm={handleMobileMoneyConfirm}
        onCancelPending={handleCancelMobileMoneyRequest}
        isSubmitting={mobileMoneySubmitting}
        isAwaitingApproval={mobileMoneyAwaitingApproval}
        statusMessage={mobileMoneyStatusMessage}
        showOtpInput={mobileMoneyRequiresOtp}
        confirmLabel={mobileMoneyRequiresOtp ? "Submit OTP" : "Confirm Payment"}
      />

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={handleNewSale}
        title="Sale Completed"
        width={600}
      >
        <div className="p-6">
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Receipt generated successfully. Print it now or start a new sale.
          </div>
          {completedSale && (
            <Receipt
              ref={receiptRef}
              sale={completedSale}
              storeName={receiptStoreName}
              storeTIN={receiptStoreTIN}
              storeAddress={receiptStoreAddress}
            />
          )}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="ghost" fullWidth size="lg" onClick={handlePrint}>
              Print
            </Button>
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleNewSale}
            >
              New Sale →
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.name || "Product Preview"}
        width={560}
      >
        <div className="p-5">
          <div className="overflow-hidden rounded-xl border border-[#263548] bg-[#0f172a]">
            <img
              src={previewImage?.url || "/no-image.jpg"}
              alt={previewImage?.name || "Product image"}
              className="max-h-[70vh] w-full object-contain"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/no-image.png";
              }}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isClearCartDialogOpen}
        onClose={() => setIsClearCartDialogOpen(false)}
        onConfirm={clearCart}
        message="Are you sure you want to clear the cart? All current line items will be removed."
        confirmLabel="Clear Cart"
        confirmVariant="danger"
        title="Clear Cart"
      />

      <ConfirmDialog
        isOpen={isRemoveItemDialogOpen}
        onClose={() => {
          setIsRemoveItemDialogOpen(false);
          setPendingRemoveItem(null);
        }}
        onConfirm={handleConfirmRemoveItem}
        message={`Remove ${pendingRemoveItem?.name || "this item"} from the cart?`}
        confirmLabel="Remove Item"
        confirmVariant="danger"
        title="Remove Cart Item"
      />
    </div>
  );
};

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Topbar } from "../components/layout/Topbar";
import { Button } from "../components/common/Button";
import { FormInput } from "../components/common/FormInput";
import { Select } from "../components/common/Select";
import { Badge } from "../components/common/Badge";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { apiClient } from "../api/axios";
import { formatDate } from "../utils/formatDate";
import { Store, DollarSign, Receipt, Star, Database } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../utils/cn";

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("store");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const queryClient = useQueryClient();
  const {
    register: registerStore,
    handleSubmit: handleSubmitStore,
    reset: resetStore,
  } = useForm();
  const {
    register: registerTax,
    handleSubmit: handleSubmitTax,
    reset: resetTax,
  } = useForm();
  const {
    register: registerReceipt,
    handleSubmit: handleSubmitReceipt,
    reset: resetReceipt,
  } = useForm();
  const {
    register: registerLoyalty,
    handleSubmit: handleSubmitLoyalty,
    reset: resetLoyalty,
  } = useForm();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings");
      return response.data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.patch("/settings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to update settings",
      );
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/settings/backup");
      return response.data;
    },
    onSuccess: () => {
      toast.success("Backup created successfully");
      queryClient.invalidateQueries(["settings"]);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create backup",
      );
    },
  });

  const tabs = [
    { id: "store", label: "Store Info", icon: Store },
    { id: "tax", label: "Tax & Pricing", icon: DollarSign },
    { id: "receipt", label: "Receipt", icon: Receipt },
    { id: "loyalty", label: "Loyalty", icon: Star },
    { id: "backup", label: "Backup", icon: Database },
  ];

  useEffect(() => {
    if (!settings) return;

    const numericTaxRate = Number(settings.taxRate);
    const taxRatePercent = Number.isFinite(numericTaxRate)
      ? numericTaxRate * 100
      : settings.globalVatRate;

    resetStore({
      storeName: settings.storeName || "",
      storeAddress: settings.storeAddress || "",
      vatTIN: settings.vatTIN || settings.storeTaxId || "",
      storePhone: settings.storePhone || "",
      currencySymbol: settings.currencySymbol || settings.currency || "USD",
      storeEmail: settings.storeEmail || "",
    });

    resetTax({
      globalVatRate: taxRatePercent ?? 5,
      roundingMethod: settings.roundingMethod || "NEAREST",
    });

    resetReceipt({
      receiptHeaderText: settings.receiptHeaderText || "",
      receiptFooterText:
        settings.receiptFooterText || settings.receiptFooter || "",
      receiptPaperWidth: settings.receiptPaperWidth || "80mm",
      autoPrint: Boolean(settings.autoPrint),
      showLoyaltyPoints: Boolean(settings.showLoyaltyPoints),
      showStoreLogo: Boolean(settings.showStoreLogo),
    });

    resetLoyalty({
      pointsPerGHC: settings.pointsPerGHC ?? 1,
      ghcPerPoint: settings.ghcPerPoint ?? 0.1,
      minimumPointsToRedeem: settings.minimumPointsToRedeem ?? 100,
    });
  }, [settings, resetStore, resetTax, resetReceipt, resetLoyalty]);

  const onSubmitStore = (data) => {
    setPendingAction({
      type: "UPDATE_SETTINGS",
      payload: {
        storeName: data.storeName,
        storeAddress: data.storeAddress,
        storeTaxId: data.vatTIN,
        currency: data.currencySymbol,
      },
      title: "Confirm Store Settings Update",
      message:
        "Apply these store information changes? This updates system-wide receipt and profile details.",
      confirmLabel: "Save Changes",
    });
    setIsConfirmDialogOpen(true);
  };

  const onSubmitTax = (data) => {
    const globalVatRate = Number(data.globalVatRate);

    if (!Number.isFinite(globalVatRate)) {
      toast.error("Enter a valid VAT rate");
      return;
    }

    setPendingAction({
      type: "UPDATE_SETTINGS",
      payload: {
        taxRate: globalVatRate / 100,
      },
      title: "Confirm Tax Settings Update",
      message:
        "Apply this VAT change? New tax settings affect checkout totals for future transactions.",
      confirmLabel: "Apply Tax Settings",
    });
    setIsConfirmDialogOpen(true);
  };

  const onSubmitReceipt = (data) => {
    setPendingAction({
      type: "UPDATE_SETTINGS",
      payload: {
        receiptHeaderText: data.receiptHeaderText,
        receiptFooter: data.receiptFooterText,
        receiptPaperWidth: data.receiptPaperWidth,
        autoPrint: Boolean(data.autoPrint),
        showLoyaltyPoints: Boolean(data.showLoyaltyPoints),
        showStoreLogo: Boolean(data.showStoreLogo),
      },
      title: "Confirm Receipt Settings Update",
      message:
        "Apply these receipt settings? They will be used for all newly printed receipts.",
      confirmLabel: "Apply Receipt Settings",
    });
    setIsConfirmDialogOpen(true);
  };

  const onSubmitLoyalty = (data) => {
    const pointsPerGHC = Number(data.pointsPerGHC);
    const ghcPerPoint = Number(data.ghcPerPoint);
    const minimumPointsToRedeem = Number(data.minimumPointsToRedeem);

    if (!Number.isFinite(pointsPerGHC) || pointsPerGHC < 0) {
      toast.error("Enter a valid points-per-GH₵ value");
      return;
    }

    if (!Number.isFinite(ghcPerPoint) || ghcPerPoint < 0) {
      toast.error("Enter a valid GH₵-per-point value");
      return;
    }

    if (!Number.isInteger(minimumPointsToRedeem) || minimumPointsToRedeem < 0) {
      toast.error("Enter a valid minimum redeemable points value");
      return;
    }

    setPendingAction({
      type: "UPDATE_SETTINGS",
      payload: {
        pointsPerGHC,
        ghcPerPoint,
        minimumPointsToRedeem,
      },
      title: "Confirm Loyalty Settings Update",
      message:
        "Apply loyalty program changes? These values affect future points accrual and redemption.",
      confirmLabel: "Apply Loyalty Settings",
    });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (pendingAction?.type === "UPDATE_SETTINGS" && pendingAction.payload) {
      updateSettingsMutation.mutate(pendingAction.payload);
    }

    if (pendingAction?.type === "BACKUP_NOW") {
      backupMutation.mutate();
    }

    setPendingAction(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        title="Settings"
        subtitle="Configure system settings (ADMIN Only)"
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tabs */}
        <div className="w-50 bg-[#0f172a] border-r border-[#1e2d45] p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                    activeTab === tab.id
                      ? "bg-indigo-500 text-white"
                      : "text-slate-400 hover:bg-indigo-900/20 hover:text-slate-300",
                  )}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#080e1a] p-6">
          {/* Store Info Tab */}
          {activeTab === "store" && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-5">
                Store Information
              </h2>
              <form
                onSubmit={handleSubmitStore(onSubmitStore)}
                className="space-y-4"
              >
                <FormInput
                  {...registerStore("storeName")}
                  label="Store Name"
                  defaultValue={settings?.storeName || ""}
                  placeholder={settings?.storeName || "SwiftPOS Retail"}
                />
                <FormInput
                  {...registerStore("storeAddress")}
                  label="Store Address"
                  defaultValue={settings?.storeAddress || ""}
                  placeholder={
                    settings?.storeAddress || "123 Main Street, Accra"
                  }
                />
                <FormInput
                  {...registerStore("vatTIN")}
                  label="VAT/TIN"
                  defaultValue={settings?.vatTIN || ""}
                  placeholder={settings?.vatTIN || "C0000000000"}
                />
                <FormInput
                  {...registerStore("storePhone")}
                  label="Phone"
                  defaultValue={settings?.storePhone || ""}
                  placeholder={settings?.storePhone || "+233XXXXXXXXX"}
                  disabled
                />
                <FormInput
                  {...registerStore("currencySymbol")}
                  label="Currency Symbol"
                  defaultValue={settings?.currency || "GH₵"}
                  placeholder={settings?.currency || "GH₵"}
                />
                <FormInput
                  {...registerStore("storeEmail")}
                  label="Email"
                  type="email"
                  defaultValue={settings?.storeEmail || ""}
                  placeholder={settings?.storeEmail || "store@example.com"}
                  disabled
                />
                <p className="text-xs text-slate-400">
                  Phone and email fields are display-only for now and are not
                  saved in system settings.
                </p>
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateSettingsMutation.isLoading}
                >
                  Save Store Info
                </Button>
              </form>
            </div>
          )}

          {/* Tax & Pricing Tab */}
          {activeTab === "tax" && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-5">
                Tax & Pricing Settings
              </h2>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-5">
                <p className="text-sm text-indigo-400">
                  ℹ️ Per-product tax rates will override this global rate
                </p>
              </div>
              <form
                onSubmit={handleSubmitTax(onSubmitTax)}
                className="space-y-4"
              >
                <FormInput
                  {...registerTax("globalVatRate")}
                  label="Global VAT Rate (%)"
                  type="number"
                  step="0.1"
                  defaultValue={settings?.globalVatRate || 5}
                  placeholder="5.0"
                />
                <Select
                  {...registerTax("roundingMethod")}
                  label="Rounding Method"
                  options={[
                    { value: "NEAREST", label: "Round to Nearest" },
                    { value: "UP", label: "Always Round Up" },
                    { value: "DOWN", label: "Always Round Down" },
                  ]}
                  defaultValue={settings?.roundingMethod || "NEAREST"}
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateSettingsMutation.isLoading}
                >
                  Save Tax Settings
                </Button>
              </form>
            </div>
          )}

          {/* Receipt Tab */}
          {activeTab === "receipt" && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-5">
                Receipt Settings
              </h2>
              <form
                onSubmit={handleSubmitReceipt(onSubmitReceipt)}
                className="space-y-4"
              >
                <FormInput
                  {...registerReceipt("receiptHeaderText")}
                  label="Header Text"
                  defaultValue={settings?.receiptHeaderText || ""}
                  placeholder="Thank you for your purchase"
                />
                <FormInput
                  {...registerReceipt("receiptFooterText")}
                  label="Footer Text"
                  defaultValue={settings?.receiptFooterText || ""}
                  placeholder="Please come again"
                />
                <Select
                  {...registerReceipt("receiptPaperWidth")}
                  label="Paper Width"
                  options={[
                    { value: "58mm", label: "58mm (Thermal)" },
                    { value: "80mm", label: "80mm (Thermal)" },
                    { value: "A4", label: "A4 (Standard)" },
                  ]}
                  defaultValue={settings?.receiptPaperWidth || "80mm"}
                />
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...registerReceipt("autoPrint")}
                      defaultChecked={settings?.autoPrint || false}
                      className="w-5 h-5 rounded border-[#263548] bg-[#0a1628] text-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-300">
                      Auto-print receipts
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...registerReceipt("showLoyaltyPoints")}
                      defaultChecked={settings?.showLoyaltyPoints || false}
                      className="w-5 h-5 rounded border-[#263548] bg-[#0a1628] text-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-300">
                      Show loyalty points on receipt
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...registerReceipt("showStoreLogo")}
                      defaultChecked={settings?.showStoreLogo || false}
                      className="w-5 h-5 rounded border-[#263548] bg-[#0a1628] text-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-300">
                      Show store logo
                    </span>
                  </label>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateSettingsMutation.isLoading}
                >
                  Save Receipt Settings
                </Button>
              </form>
            </div>
          )}

          {/* Loyalty Tab */}
          {activeTab === "loyalty" && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-5">
                Loyalty Program Settings
              </h2>
              <form
                onSubmit={handleSubmitLoyalty(onSubmitLoyalty)}
                className="space-y-4"
              >
                <FormInput
                  {...registerLoyalty("pointsPerGHC")}
                  label="Points per GH₵ Spent"
                  type="number"
                  step="0.1"
                  defaultValue={settings?.pointsPerGHC || 1}
                  placeholder="1.0"
                />
                <FormInput
                  {...registerLoyalty("ghcPerPoint")}
                  label="GH₵ Value per Point"
                  type="number"
                  step="0.01"
                  defaultValue={settings?.ghcPerPoint || 0.1}
                  placeholder="0.10"
                />
                <FormInput
                  {...registerLoyalty("minimumPointsToRedeem")}
                  label="Minimum Points to Redeem"
                  type="number"
                  defaultValue={settings?.minimumPointsToRedeem || 100}
                  placeholder="100"
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateSettingsMutation.isLoading}
                >
                  Save Loyalty Settings
                </Button>
              </form>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === "backup" && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-100 mb-5">
                Backup & Data Management
              </h2>

              {settings?.lastBackup && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-400 mb-1">
                        Last Backup
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate.standard(settings.lastBackup)}
                      </p>
                    </div>
                    <Badge variant="green">Success</Badge>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Select
                  label="Backup Frequency"
                  options={[
                    { value: "DAILY", label: "Daily" },
                    { value: "WEEKLY", label: "Weekly" },
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "MANUAL", label: "Manual Only" },
                  ]}
                  defaultValue={settings?.backupFrequency || "DAILY"}
                />

                <div className="pt-4 space-y-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setPendingAction({
                        type: "BACKUP_NOW",
                        title: "Confirm Backup",
                        message:
                          "Create a manual backup now? This may take a moment while data is prepared.",
                        confirmLabel: "Start Backup",
                      });
                      setIsConfirmDialogOpen(true);
                    }}
                    loading={backupMutation.isLoading}
                  >
                    Backup Now
                  </Button>
                  <Button variant="ghost" fullWidth>
                    Restore Backup
                  </Button>
                  <Button variant="ghost" fullWidth>
                    Export All Data
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => {
          setIsConfirmDialogOpen(false);
          setPendingAction(null);
        }}
        onConfirm={handleConfirmAction}
        message={
          pendingAction?.message ||
          "Are you sure you want to continue with this action?"
        }
        confirmLabel={pendingAction?.confirmLabel || "Confirm"}
        confirmVariant="danger"
        title={pendingAction?.title || "Confirm Action"}
      />
    </div>
  );
};

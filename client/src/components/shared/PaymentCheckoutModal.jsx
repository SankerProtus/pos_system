import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  Smartphone,
  CreditCard,
  Building2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

export const PaymentCheckoutModal = ({
  isOpen,
  onClose,
  amount,
  onPaymentSelect,
  isProcessing,
}) => {
  const [step, setStep] = useState("method-selection"); // method-selection, form, confirming
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    provider: "",
    otp: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    bankAccount: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  const paymentMethods = [
    {
      id: "MOBILE_MONEY",
      name: "Pay with Mobile Money",
      icon: Smartphone,
      description: "Use your mobile money account",
    },
    {
      id: "CARD",
      name: "Pay with Card",
      icon: CreditCard,
      description: "Use debit or credit card",
    },
    {
      id: "BANK_TRANSFER",
      name: "Pay with Bank Transfer",
      icon: Building2,
      description: "Direct bank transfer",
    },
  ];

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setFormData({
      phoneNumber: "",
      provider: "",
      otp: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      bankAccount: "",
    });
    setStatusMessage("");
    setRequiresOtp(false);
    setAwaitingApproval(false);
    setStep("form");
  };

  const handleBack = () => {
    if (step === "form") {
      setStep("method-selection");
      setSelectedMethod(null);
    } else if (step === "confirming") {
      setStep("form");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) return;

    // Basic validation
    if (selectedMethod === "MOBILE_MONEY") {
      if (!formData.phoneNumber || !formData.provider) {
        setStatusMessage("Please enter phone number and select provider");
        return;
      }
    } else if (selectedMethod === "CARD") {
      if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCvv) {
        setStatusMessage("Please enter all card details");
        return;
      }
    } else if (selectedMethod === "BANK_TRANSFER") {
      if (!formData.bankAccount) {
        setStatusMessage("Please enter bank account details");
        return;
      }
    }

    setStep("confirming");

    // Call parent handler with method and data
    await onPaymentSelect({
      method: selectedMethod,
      formData,
    });
  };

  const renderMethodSelection = () => (
    <div className="space-y-3">
      {paymentMethods.map((method) => {
        const IconComponent = method.icon;
        return (
          <button
            key={method.id}
            onClick={() => handleMethodSelect(method.id)}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-[#263548] hover:border-indigo-500/50 hover:bg-[#0f1c2e] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <IconComponent className="w-6 h-6 text-indigo-400" />
              <div>
                <p className="font-medium text-slate-100">{method.name}</p>
                <p className="text-xs text-slate-400">{method.description}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        );
      })}
    </div>
  );

  const renderMobileMoneyForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Mobile Money Number
        </label>
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          placeholder="050 000 0000"
          disabled={isProcessing || awaitingApproval}
          className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Provider
        </label>
        <select
          name="provider"
          value={formData.provider}
          onChange={handleInputChange}
          disabled={isProcessing || awaitingApproval}
          className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">Choose Provider</option>
          <option value="MTN">MTN Mobile Money</option>
          <option value="VODAFON">Vodafon Cash</option>
          <option value="AIRTEL">AirtelTigo Money</option>
        </select>
      </div>

      {requiresOtp && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            OTP
          </label>
          <input
            type="text"
            name="otp"
            value={formData.otp}
            onChange={handleInputChange}
            placeholder="Enter the OTP from your phone"
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );

  const renderCardForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Card Number
        </label>
        <input
          type="text"
          name="cardNumber"
          value={formData.cardNumber}
          onChange={handleInputChange}
          placeholder="0000 0000 0000 0000"
          maxLength="19"
          disabled={isProcessing}
          className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Card Expiry
          </label>
          <input
            type="text"
            name="cardExpiry"
            value={formData.cardExpiry}
            onChange={handleInputChange}
            placeholder="MM / YY"
            maxLength="7"
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            CVV
          </label>
          <input
            type="text"
            name="cardCvv"
            value={formData.cardCvv}
            onChange={handleInputChange}
            placeholder="123"
            maxLength="4"
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );

  const renderBankTransferForm = () => (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-300 mb-2 font-medium">
          Bank Transfer Instructions
        </p>
        <p className="text-xs text-blue-200">
          Transfer the exact amount to the provided account. Your order will be
          processed once payment is confirmed.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Bank Account Number
        </label>
        <input
          type="text"
          name="bankAccount"
          value={formData.bankAccount}
          onChange={handleInputChange}
          placeholder="Enter your account number"
          disabled={isProcessing}
          className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );

  const renderForm = () => {
    if (selectedMethod === "MOBILE_MONEY") {
      return renderMobileMoneyForm();
    } else if (selectedMethod === "CARD") {
      return renderCardForm();
    } else if (selectedMethod === "BANK_TRANSFER") {
      return renderBankTransferForm();
    }
    return null;
  };

  const getMethodName = () => {
    return (
      paymentMethods.find((m) => m.id === selectedMethod)?.name || "Payment"
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "method-selection" ? "Payment Checkout" : getMethodName()}
      width={500}
    >
      <div className="p-6 space-y-4">
        {step !== "method-selection" && (
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-400 mb-1">Amount Due</p>
          <p className="text-3xl font-bold font-mono text-amber-400">
            {formatCurrency(amount)}
          </p>
        </div>

        {step === "method-selection" && renderMethodSelection()}

        {step === "form" && (
          <>
            {renderForm()}
            {statusMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {statusMessage}
              </div>
            )}
            {awaitingApproval && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-400">
                Waiting for payment confirmation on your phone...
              </div>
            )}
          </>
        )}

        {step === "confirming" && (
          <div className="text-center space-y-3">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full mx-auto"></div>
            <p className="text-slate-300">Processing payment...</p>
            <p className="text-xs text-slate-400">
              {statusMessage || "Please wait while we process your payment."}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step !== "confirming" && (
            <>
              <Button
                variant="ghost"
                fullWidth
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              {step === "form" && (
                <Button
                  variant="success"
                  fullWidth
                  onClick={handleConfirmPayment}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  Pay {formatCurrency(amount)}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

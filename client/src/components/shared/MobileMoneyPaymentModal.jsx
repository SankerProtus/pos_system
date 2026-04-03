import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { formatCurrency } from "../../utils/formatCurrency";

export const MobileMoneyPaymentModal = ({
  isOpen,
  onClose,
  amount,
  phoneNumber,
  onPhoneNumberChange,
  otp,
  onOtpChange,
  onConfirm,
  isSubmitting,
  isAwaitingApproval,
  statusMessage,
  showOtpInput = false,
  confirmLabel = "Confirm Payment",
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={isAwaitingApproval ? () => {} : onClose}
      title="Mobile Money Payment"
      width={500}
    >
      <div className="p-6 space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-400 mb-1">Amount Due</p>
          <p className="text-3xl font-bold font-mono text-amber-400">
            {formatCurrency(amount)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Mobile Money Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(event) => onPhoneNumberChange(event.target.value)}
            placeholder="e.g. +233241234567"
            disabled={isSubmitting || isAwaitingApproval}
            className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {showOtpInput && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(event) => onOtpChange(event.target.value)}
              placeholder="Enter the OTP from Paystack"
              disabled={isSubmitting || isAwaitingApproval}
              className="w-full px-4 py-3 bg-[#0a1628] border border-[#263548] text-slate-100 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        )}

        <div className="bg-[#0f172a] border border-[#1e2d45] rounded-lg p-3 text-sm text-slate-300">
          {statusMessage || "Confirm to send payment prompt to customer phone."}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={isSubmitting || isAwaitingApproval}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            fullWidth
            onClick={onConfirm}
            loading={isSubmitting}
            disabled={isSubmitting || isAwaitingApproval}
          >
            {isAwaitingApproval ? "Waiting for Approval..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

import { forwardRef } from "react";
import Barcode from "react-barcode";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import {
  formatTransactionId,
  resolveTransactionId,
} from "../../utils/formatTransactionId";

export const Receipt = forwardRef(
  ({ sale, storeName, storeTIN, storeAddress }, ref) => {
    const rawTxnId = resolveTransactionId(sale);
    const displayTxnId = formatTransactionId(rawTxnId);

    const receiptItems =
      Array.isArray(sale?.items) && sale.items.length > 0
        ? sale.items
        : Array.isArray(sale?.saleItems)
          ? sale.saleItems.map((item) => ({
              ...item,
              lineTotal:
                Number(item.lineTotal ?? item.subtotal) ||
                Number(item.unitPrice || 0) * Number(item.quantity || 0),
            }))
          : [];

    return (
      <div
        ref={ref}
        className="bg-white text-black font-mono p-8 max-w-[80mm] mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold">{storeName}</h1>
          <p className="text-xs">{storeAddress}</p>
          <p className="text-xs">TIN: {storeTIN}</p>
        </div>

        <div className="border-t-2 border-dashed border-black my-3"></div>

        {/* Transaction Info */}
        <div className="text-xs space-y-1 mb-3">
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{formatDate.standard(sale.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>TXN:</span>
            <span title={rawTxnId}>{displayTxnId}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{sale.user?.name}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customer?.name}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-dashed border-black my-3"></div>

        {/* Items */}
        <div className="mb-3">
          {receiptItems.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>{item.productName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </span>
                <span>
                  {formatCurrency(item.lineTotal ?? item.subtotal ?? 0)}
                </span>
              </div>
              {item.barcode && (
                <div className="text-xs text-gray-500 mt-1">
                  Barcode: {item.barcode}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-black my-3"></div>

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT:</span>
            <span>{formatCurrency(sale.taxAmount)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(sale.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-black pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid:</span>
            <span>
              {formatCurrency(Number(sale.payment?.amountPaid) || 0.0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Change:</span>
            <span>
              {formatCurrency(Number(sale.payment?.changeDue) || 0.0)}
            </span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-black my-3"></div>

        {/* Footer */}
        <div className="text-center text-xs space-y-1">
          <p className="font-semibold">Thank you for your purchase!</p>
          <p>Please come again</p>
        </div>

        {/* Receipt barcode (transaction) */}
        {rawTxnId !== "N/A" && (
          <div className="mt-4 flex justify-center items-center w-full">
            <Barcode
              value={rawTxnId}
              width={1.5}
              height={50}
              fontSize={15}
              displayValue={true}
            />
          </div>
        )}
      </div>
    );
  },
);

Receipt.displayName = "Receipt";

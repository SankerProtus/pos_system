import { forwardRef } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export const Receipt = forwardRef(
  ({ sale, storeName, storeTIN, storeAddress }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black font-mono p-8 max-w-[80mm] mx-auto"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
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
            <span>{sale.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{sale.cashier?.name}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customer.name}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-dashed border-black my-3"></div>

        {/* Items */}
        <div className="mb-3">
          {sale.items?.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>{item.productName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
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
            <span>{formatCurrency(sale.amountPaid)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change:</span>
            <span>{formatCurrency(sale.change)}</span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-black my-3"></div>

        {/* Footer */}
        <div className="text-center text-xs space-y-1">
          <p className="font-semibold">Thank you for your purchase!</p>
          <p>Please come again</p>
        </div>

        {/* Barcode Placeholder */}
        <div className="mt-4 flex justify-center">
          <svg width="120" height="40">
            <rect x="0" y="0" width="2" height="40" fill="black" />
            <rect x="4" y="0" width="1" height="40" fill="black" />
            <rect x="7" y="0" width="3" height="40" fill="black" />
            <rect x="12" y="0" width="1" height="40" fill="black" />
            <rect x="15" y="0" width="2" height="40" fill="black" />
            <rect x="19" y="0" width="1" height="40" fill="black" />
            <rect x="22" y="0" width="3" height="40" fill="black" />
            <rect x="27" y="0" width="2" height="40" fill="black" />
          </svg>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
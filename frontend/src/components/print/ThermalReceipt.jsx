import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const ThermalReceipt = ({ sale, settings }) => {
  if (!sale) return null;

  const widthClass = settings?.receiptWidth === '58mm' ? 'w-[58mm]' : 'w-[80mm]';
  const currencySymbol = settings?.currencySymbol || '₹';
  const isGst = sale.isGstBill !== undefined ? sale.isGstBill : settings?.enableGst;

  return (
    <div id="printable-receipt" className="hidden print:block bg-white text-black font-mono text-xs p-2 mx-auto select-none">
      <div className={`${widthClass} mx-auto leading-tight text-center border-b border-dashed border-black pb-2`}>
        <div className="font-bold text-sm uppercase">{settings?.shopName || 'ELEGANCE DRESS SHOP'}</div>
        <div>{settings?.address || 'Main Road, Tamil Nadu'}</div>
        <div>Phone: {settings?.phone || '9876543210'}</div>
        {isGst && settings?.gstNumber && <div>GSTIN: {settings?.gstNumber}</div>}
        {!isGst && <div className="font-bold text-[10px] uppercase border border-black px-1 mt-1 inline-block">ESTIMATE / NON-GST BILL</div>}
      </div>

      <div className={`${widthClass} mx-auto py-1 text-[11px] border-b border-dashed border-black space-y-0.5`}>
        <div className="flex justify-between">
          <span>Invoice:</span>
          <span className="font-bold">{sale.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span>{sale.cashierName || 'Admin'}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span>{sale.customerName || 'Walk-in'}</span>
        </div>
      </div>

      <table className={`${widthClass} mx-auto my-2 border-b border-dashed border-black text-left text-[11px]`}>
        <thead>
          <tr className="border-b border-black">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="py-1 pr-1">
                <div className="font-semibold">{item.productName}</div>
                <div className="text-[9px] text-gray-700">Size: {item.size} | Color: {item.color}</div>
              </td>
              <td className="py-1 text-center align-top">{item.quantity}</td>
              <td className="py-1 text-right align-top">{formatCurrency(item.unitPrice, currencySymbol)}</td>
              <td className="py-1 text-right align-top font-bold">{formatCurrency(item.totalAmount, currencySymbol)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`${widthClass} mx-auto space-y-0.5 text-[11px]`}>
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal, currencySymbol)}</span>
        </div>
        {(sale.itemDiscountTotal > 0 || sale.billDiscountTotal > 0) && (
          <div className="flex justify-between font-semibold">
            <span>Total Discount:</span>
            <span>-{formatCurrency(sale.itemDiscountTotal + sale.billDiscountTotal, currencySymbol)}</span>
          </div>
        )}
        {isGst && (
          <>
            <div className="flex justify-between text-[10px]">
              <span>CGST:</span>
              <span>{formatCurrency(sale.cgstTotal, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>SGST:</span>
              <span>{formatCurrency(sale.sgstTotal, currencySymbol)}</span>
            </div>
          </>
        )}
        {sale.roundOff !== 0 && (
          <div className="flex justify-between text-[10px]">
            <span>Round Off:</span>
            <span>{sale.roundOff > 0 ? `+${sale.roundOff}` : sale.roundOff}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
          <span>GRAND TOTAL:</span>
          <span>{formatCurrency(sale.grandTotal, currencySymbol)}</span>
        </div>
        <div className="flex justify-between text-[10px] pt-1">
          <span>Payment Method:</span>
          <span className="font-bold">{sale.paymentMethod}</span>
        </div>
      </div>

      <div className={`${widthClass} mx-auto mt-4 text-center border-t border-dashed border-black pt-2 text-[10px]`}>
        <div className="font-bold uppercase">THANK YOU FOR YOUR VISIT!</div>
        <div>Goods once sold can be returned within 7 days with invoice.</div>
      </div>
    </div>
  );
};

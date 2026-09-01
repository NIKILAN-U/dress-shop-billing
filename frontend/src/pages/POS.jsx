import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  addToCart,
  updateCartItemQty,
  updateCartItemUnitPrice,
  updateCartItemDiscount,
  removeFromCart,
  clearCart,
  setSelectedCustomer,
  setBillDiscount,
  setIsGstBill,
  holdCurrentBill,
  resumeHeldBill,
  deleteHeldBill,
  setLastCompletedSale
} from '../store/slices/posSlice';
import { getProductByBarcode } from '../services/productService';
import { createSale } from '../services/posService';
import { BarcodeScannerInput } from '../components/pos/BarcodeScannerInput';
import { ProductSearchModal } from '../components/pos/ProductSearchModal';
import { CustomerSelectModal } from '../components/pos/CustomerSelectModal';
import { DiscountModal } from '../components/pos/DiscountModal';
import { PaymentModal } from '../components/pos/PaymentModal';
import { HoldBillsDrawer } from '../components/pos/HoldBillsDrawer';
import { ThermalReceipt } from '../components/print/ThermalReceipt';
import { formatCurrency } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import {
  Plus,
  Minus,
  Trash2,
  User,
  Percent,
  CreditCard,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Tag,
  Zap,
  Banknote,
  QrCode,
  FileCheck,
  FileX,
  Edit2
} from 'lucide-react';

export const POS = () => {
  const dispatch = useDispatch();
  const { cart, selectedCustomer, billDiscountType, billDiscountValue, isGstBill, heldBills, lastCompletedSale } =
    useSelector((state) => state.pos);
  const { settings } = useSelector((state) => state.settings);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Modals visibility
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);

  const [scanError, setScanError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currencySymbol = settings?.currencySymbol || '₹';

  // Handle USB Barcode scan
  const handleBarcodeScan = async (barcode) => {
    setScanError('');
    try {
      const res = await getProductByBarcode(barcode);
      if (res.success && res.product) {
        dispatch(
          addToCart({
            product: res.product,
            variant: res.product.selectedVariant,
            quantity: 1
          })
        );
      }
    } catch (err) {
      setScanError(err.response?.data?.message || `Barcode "${barcode}" not found in catalog`);
    }
  };

  // Select variant from search modal
  const handleSelectVariantFromModal = (product, variant) => {
    dispatch(
      addToCart({
        product,
        variant,
        quantity: 1
      })
    );
  };

  // Calculate Totals
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountTotal = cart.reduce((sum, item) => sum + item.discountAmount * item.quantity, 0);

  let calculatedBillDiscount = 0;
  if (billDiscountType === 'percentage') {
    calculatedBillDiscount = ((subtotal - itemDiscountTotal) * (billDiscountValue || 0)) / 100;
  } else {
    calculatedBillDiscount = Number(billDiscountValue || 0);
  }

  const netDiscountTotal = itemDiscountTotal + calculatedBillDiscount;
  const taxableAmount = Math.max(0, subtotal - netDiscountTotal);

  // Tax calculation — depends on isGstBill (With or Without GST option)
  let cgstTotal = 0;
  let sgstTotal = 0;
  let taxTotal = 0;

  if (isGstBill && settings?.enableGst) {
    const gstRate = settings?.defaultGstRate || 5;
    taxTotal = (taxableAmount * gstRate) / 100;
    cgstTotal = taxTotal / 2;
    sgstTotal = taxTotal / 2;
  }

  const rawGrandTotal = taxableAmount + taxTotal;
  const roundOff = Math.round(rawGrandTotal) - rawGrandTotal;
  const grandTotal = Math.round(rawGrandTotal);

  // Handle Payment Submit
  const handleConfirmPayment = async ({ paymentMethod, payments }) => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setScanError('');

    try {
      const payload = {
        customerId: selectedCustomer?._id || null,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerMobile: selectedCustomer?.mobile || '',
        items: cart,
        subtotal,
        itemDiscountTotal,
        billDiscountTotal: calculatedBillDiscount,
        taxableAmount,
        cgstTotal,
        sgstTotal,
        taxTotal,
        roundOff,
        grandTotal,
        paymentMethod,
        payments,
        isGstBill
      };

      const res = await createSale(payload);
      dispatch(setLastCompletedSale(res.sale));
      dispatch(clearCart());
      setShowPaymentModal(false);

      // Trigger thermal print automatically
      setTimeout(() => {
        window.print();
      }, 200);
    } catch (err) {
      setScanError(err.response?.data?.message || 'Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  };

  // Instant 1-Click Quick Checkout (< 5 seconds!)
  const handleQuickPay = (method) => {
    if (cart.length === 0) return;
    handleConfirmPayment({
      paymentMethod: method,
      payments: [{ method, amount: grandTotal }]
    });
  };

  // Keyboard Shortcuts (F1, F2, F4, F8, F9)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        dispatch(clearCart());
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowSearchModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) handleQuickPay('Cash');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, dispatch]);

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col gap-4">
      {/* Top Barcode & Search Input */}
      <BarcodeScannerInput
        onBarcodeScan={handleBarcodeScan}
        onOpenSearch={() => setShowSearchModal(true)}
      />

      {scanError && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scanError}</span>
          </div>
          <button onClick={() => setScanError('')} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Billing Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Left Side: Cart Items Table with Editable Prices & Rupee Discounts */}
        <div
          className={`lg:col-span-2 border rounded-2xl flex flex-col overflow-hidden shadow-sm transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/60'
          }`}
        >
          <div
            className={`px-5 py-3 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider">Current Cart</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-black">
                {cart.length} ITEMS
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline ml-2">
                (Click price or discount to edit directly)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {heldBills.length > 0 && (
                <button
                  onClick={() => setShowHeldDrawer(true)}
                  className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Held ({heldBills.length})</span>
                </button>
              )}

              {cart.length > 0 && (
                <>
                  <button
                    onClick={() => dispatch(holdCurrentBill())}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer border ${
                      isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hold</span>
                  </button>

                  <button
                    onClick={() => dispatch(clearCart())}
                    className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear (F1)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 select-none">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 flex items-center justify-center text-indigo-500">
                  <Tag className="w-8 h-8 stroke-1.5" />
                </div>
                <div className="text-base font-bold text-slate-700 dark:text-slate-200">POS Cart is Empty</div>
                <p className="text-xs text-slate-500 max-w-xs text-center">
                  Scan barcode with USB Scanner or press{' '}
                  <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-bold">
                    F2
                  </kbd>{' '}
                  to search catalog
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead
                  className={`uppercase text-[10px] font-bold tracking-wider sticky top-0 ${
                    isDark ? 'bg-slate-800/90 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <tr>
                    <th className="py-2.5 px-3">Product / Variant</th>
                    <th className="py-2.5 px-3 text-center">Edit Price ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-center">Discount ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-right">Row Total</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => {
                    const effectivePrice = Math.max(0, item.unitPrice - item.discountAmount);
                    return (
                      <tr key={item.variantBarcode} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">{item.productName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                              {item.variantBarcode}
                            </span>
                            <span>
                              Size: <strong className="text-slate-800 dark:text-slate-200 font-bold">{item.size}</strong>
                            </span>
                            <span>
                              Color: <strong className="text-slate-800 dark:text-slate-200 font-bold">{item.color}</strong>
                            </span>
                          </div>
                        </td>

                        {/* EDITABLE UNIT PRICE INPUT */}
                        <td className="py-3 px-3 text-center">
                          <div className="relative inline-block">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) =>
                                dispatch(
                                  updateCartItemUnitPrice({
                                    barcode: item.variantBarcode,
                                    unitPrice: e.target.value
                                  })
                                )
                              }
                              className={`w-20 px-2 py-1 border rounded text-center text-xs font-mono font-extrabold outline-none focus:border-indigo-600 ${
                                isDark
                                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                                  : 'bg-white border-slate-300 text-emerald-600 shadow-xs'
                              }`}
                            />
                          </div>
                        </td>

                        {/* QUANTITY +/- BUTTONS */}
                        <td className="py-3 px-3 text-center">
                          <div className={`inline-flex items-center gap-1.5 border rounded-lg p-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                            <button
                              onClick={() =>
                                dispatch(
                                  updateCartItemQty({
                                    barcode: item.variantBarcode,
                                    quantity: item.quantity - 1
                                  })
                                )
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-black text-slate-900 dark:text-white">{item.quantity}</span>
                            <button
                              onClick={() =>
                                dispatch(
                                  updateCartItemQty({
                                    barcode: item.variantBarcode,
                                    quantity: item.quantity + 1
                                  })
                                )
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* EDITABLE RUPEE DISCOUNT INPUT (e.g. ₹200 discount) */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              value={item.discountAmount}
                              placeholder="0"
                              onChange={(e) =>
                                dispatch(
                                  updateCartItemDiscount({
                                    barcode: item.variantBarcode,
                                    discountAmount: e.target.value
                                  })
                                )
                              }
                              className={`w-20 px-2 py-1 border rounded text-center text-xs font-mono font-bold outline-none focus:border-indigo-600 ${
                                item.discountAmount > 0
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-600 dark:text-rose-300 font-extrabold'
                                  : isDark
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            {item.discountAmount > 0 && (
                              <span className="text-[10px] text-rose-500 font-bold mt-0.5">
                                (-{currencySymbol}{item.discountAmount} off)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                            {formatCurrency(item.totalAmount, currencySymbol)}
                          </div>
                          {item.discountAmount > 0 && (
                            <div className="text-[10px] text-slate-400 line-through">
                              {formatCurrency(item.unitPrice * item.quantity, currencySymbol)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => dispatch(removeFromCart(item.variantBarcode))}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Bill Summary with WITH / WITHOUT GST Option & Fast Checkout */}
        <div
          className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/60'
          }`}
        >
          <div className="space-y-4">
            {/* Customer Info Box */}
            <div
              className={`p-3 border rounded-xl flex items-center justify-between ${
                isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {selectedCustomer ? selectedCustomer.mobile : 'Standard Customer'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCustomerModal(true)}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Change (F4)
              </button>
            </div>

            {/* WITH GST / WITHOUT GST OPTION SELECTOR */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                GST Billing Mode Option:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => dispatch(setIsGstBill(true))}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                    isGstBill
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>WITH GST</span>
                </button>

                <button
                  type="button"
                  onClick={() => dispatch(setIsGstBill(false))}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                    !isGstBill
                      ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/20'
                      : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileX className="w-4 h-4" />
                  <span>WITHOUT GST</span>
                </button>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(subtotal, currencySymbol)}</span>
              </div>

              {itemDiscountTotal > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                  <span>Item Discounts Total</span>
                  <span>-{formatCurrency(itemDiscountTotal, currencySymbol)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <span>Bill Discount</span>
                  {calculatedBillDiscount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                      (-{formatCurrency(calculatedBillDiscount, currencySymbol)})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  {calculatedBillDiscount > 0 ? 'Edit' : 'Apply'}
                </button>
              </div>

              {isGstBill && settings?.enableGst ? (
                <>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>CGST Total</span>
                    <span>{formatCurrency(cgstTotal, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>SGST Total</span>
                    <span>{formatCurrency(sgstTotal, currencySymbol)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                  <span>Tax Billing</span>
                  <span>WITHOUT GST (PLAIN BILL)</span>
                </div>
              )}

              {roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off</span>
                  <span>{roundOff > 0 ? `+${roundOff}` : roundOff}</span>
                </div>
              )}
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
              <div className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Grand Total Amount
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(grandTotal, currencySymbol)}
              </div>
            </div>

            {/* INSTANT 1-CLICK QUICK CHECKOUT (< 30 SEC BILL GENERATION) */}
            {cart.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Instant 1-Click Fast Pay (Under 5 Secs)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={submitting}
                    onClick={() => handleQuickPay('Cash')}
                    className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>⚡ CASH (F9)</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleQuickPay('UPI')}
                    className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>⚡ UPI / QR</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={cart.length === 0 || submitting}
            onClick={() => setShowPaymentModal(true)}
            className={`w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
              cart.length === 0
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-slate-900/20'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>SELECT METHOD & PRINT (F8)</span>
          </button>
        </div>
      </div>

      {/* POS Dialog Modals */}
      <ProductSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectVariant={handleSelectVariantFromModal}
        settings={settings}
      />

      <CustomerSelectModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelectCustomer={(cust) => dispatch(setSelectedCustomer(cust))}
      />

      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        subtotal={subtotal}
        currentDiscountType={billDiscountType}
        currentDiscountValue={billDiscountValue}
        onApplyDiscount={(type, val) => dispatch(setBillDiscount({ type, value: val }))}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        grandTotal={grandTotal}
        onConfirmPayment={handleConfirmPayment}
        loading={submitting}
        settings={settings}
      />

      <HoldBillsDrawer
        isOpen={showHeldDrawer}
        onClose={() => setShowHeldDrawer(false)}
        heldBills={heldBills}
        onResume={(id) => dispatch(resumeHeldBill(id))}
        onDelete={(id) => dispatch(deleteHeldBill(id))}
        settings={settings}
      />

      {/* Hidden printable receipt for window.print() */}
      <ThermalReceipt sale={lastCompletedSale} settings={settings} />
    </div>
  );
};

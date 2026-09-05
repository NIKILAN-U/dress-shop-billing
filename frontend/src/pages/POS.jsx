import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  addToCart,
  updateCartItemQty,
  updateCartItemUnitPrice,
  updateCartItemDiscount,
  updateCartItemStaff,
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
import { printElementSilently } from '../utils/silentPrint';
import { getStaffMembers } from '../services/staffService';
import { BarcodeScannerInput } from '../components/pos/BarcodeScannerInput';
import { ProductSearchModal } from '../components/pos/ProductSearchModal';
import { CustomerSelectModal } from '../components/pos/CustomerSelectModal';
import { DiscountModal } from '../components/pos/DiscountModal';
import { PaymentModal } from '../components/pos/PaymentModal';
import { HoldBillsDrawer } from '../components/pos/HoldBillsDrawer';
import { ReceiptPreviewModal } from '../components/pos/ReceiptPreviewModal';
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
  Edit2,
  UserCheck
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
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  const [scanError, setScanError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeStaffList, setActiveStaffList] = useState([]);
  const [selectedBillStaffId, setSelectedBillStaffId] = useState('');

  const barcodeInputRef = useRef(null);

  useEffect(() => {
    fetchActiveStaff();
  }, []);

  // Drop focus straight back into the scan box the instant every modal is
  // closed — search, customer, discount, payment, held-bills, the post-sale
  // receipt — so a cashier never has to click back in before scanning the
  // next item. Watching them all together (rather than adding a refocus call
  // at each individual close site) catches every way a modal can close:
  // selection, Cancel, the X button, or Escape.
  useEffect(() => {
    if (!showSearchModal && !showCustomerModal && !showDiscountModal && !showPaymentModal && !showHeldDrawer && !showReceiptPreview) {
      barcodeInputRef.current?.focus();
    }
  }, [showSearchModal, showCustomerModal, showDiscountModal, showPaymentModal, showHeldDrawer, showReceiptPreview]);

  const fetchActiveStaff = async () => {
    try {
      const res = await getStaffMembers({ status: 'Active' });
      setActiveStaffList(res.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  const currencySymbol = settings?.currencySymbol || '₹';

  // Apply selected staff to ALL items in the entire bill
  const handleApplyStaffToEntireBill = (staffMongoId) => {
    setSelectedBillStaffId(staffMongoId || '');
    const sObj = activeStaffList.find((s) => s._id === staffMongoId);
    const sMongoId = sObj?._id || null;
    const sStaffId = sObj?.staffId || null;
    const sName = sObj?.name || null;

    cart.forEach((i) => {
      dispatch(
        updateCartItemStaff({
          barcode: i.variantBarcode,
          staffMongoId: sMongoId,
          staffId: sStaffId,
          staffName: sName
        })
      );
    });
  };

  const autoAssignBillStaff = (barcode) => {
    if (selectedBillStaffId) {
      const sObj = activeStaffList.find((s) => s._id === selectedBillStaffId);
      if (sObj) {
        dispatch(
          updateCartItemStaff({
            barcode,
            staffMongoId: sObj._id,
            staffId: sObj.staffId,
            staffName: sObj.name
          })
        );
      }
    }
  };

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
        autoAssignBillStaff(res.product.selectedVariant.barcode);
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
    autoAssignBillStaff(variant.barcode);
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
  // Rupee rounding was removed from the bill, but the total still has to be
  // settled to paise — otherwise float drift (e.g. 1234.5600000000002) is what
  // gets stored on the sale and shown on the receipt.
  const roundOff = 0;
  const grandTotal = Math.round(rawGrandTotal * 100) / 100;

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

      // Show the bill on screen and keep it there — it does NOT auto-close.
      // The cashier or admin dismisses it themselves once they've confirmed
      // the print (or reprinted it from here), so the bill is never gone
      // before printing was actually taken.
      setShowReceiptPreview(true);

      // Also attempt a background silent print immediately, for speed on the
      // common case — this does not affect the preview above either way.
      setTimeout(() => {
        printElementSilently('printable-receipt', settings?.receiptPrinterName);
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

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    dispatch(holdCurrentBill());
    barcodeInputRef.current?.focus();
  };

  // Keyboard Shortcuts. Each action responds to its F-key AND a Ctrl+Shift
  // alias — many laptops remap bare F1-F12 to hardware functions (volume,
  // brightness) unless "Fn Lock" is on, which silently swallows the F-key
  // before it ever reaches the app. Ctrl+Shift combinations are not subject
  // to that remapping, so they work as a reliable fallback on any keyboard.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const alias = (letter) => e.ctrlKey && e.shiftKey && e.key.toLowerCase() === letter;

      if (e.key === 'F1' || alias('n')) {
        e.preventDefault();
        dispatch(clearCart());
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F2' || alias('s')) {
        e.preventDefault();
        setShowSearchModal(true);
      } else if (e.key === 'F3' || alias('h')) {
        e.preventDefault();
        handleHoldCart();
      } else if (e.key === 'F4' || alias('c')) {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === 'F8' || alias('enter')) {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
      } else if (e.key === 'F9' || alias('q')) {
        e.preventDefault();
        if (cart.length > 0) handleQuickPay('Cash');
      } else if (e.key === 'F10' || alias('u')) {
        e.preventDefault();
        if (cart.length > 0) handleQuickPay('UPI');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, dispatch]);

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col gap-4">
      {/* Top Barcode & Search Input */}
      <BarcodeScannerInput
        ref={barcodeInputRef}
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
        <div className="lg:col-span-2 border rounded-2xl flex flex-col overflow-hidden shadow-xs transition-colors bg-white border-slate-200">
          <div className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Current Cart</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-black border border-amber-200">
                {cart.length} ITEMS
              </span>
            </div>

            {/* BILL SALES STAFF SELECTOR (Applies staff to all items in current bill) */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs">
              <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-slate-800 font-extrabold whitespace-nowrap text-[11px]">Bill Staff:</span>
              <select
                value={selectedBillStaffId}
                onChange={(e) => handleApplyStaffToEntireBill(e.target.value)}
                className="bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-slate-900 font-extrabold text-xs outline-none cursor-pointer"
              >
                <option value="">-- Apply to Entire Bill --</option>
                {activeStaffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.staffId})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {heldBills.length > 0 && (
                <button
                  onClick={() => setShowHeldDrawer(true)}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Held ({heldBills.length})</span>
                </button>
              )}

              {cart.length > 0 && (
                <>
                  <button
                    onClick={handleHoldCart}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Hold Cart (F3)</span>
                  </button>

                  <button
                    onClick={() => { dispatch(clearCart()); barcodeInputRef.current?.focus(); }}
                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
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
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Tag className="w-8 h-8 stroke-1.5" />
                </div>
                <div className="text-base font-extrabold text-slate-800">POS Cart is Empty</div>
                <p className="text-xs text-slate-500 max-w-xs text-center font-medium">
                  Scan barcode with USB Scanner or press{' '}
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800 font-bold">
                    F2
                  </kbd>{' '}
                  to search catalog
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="uppercase text-[10px] font-extrabold tracking-wider sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product / Variant</th>
                    <th className="py-2.5 px-3 text-center">Assigned Staff</th>
                    <th className="py-2.5 px-3 text-center">Edit Price ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-center">Discount ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-right">Row Total</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item) => {
                    const effectivePrice = Math.max(0, item.unitPrice - item.discountAmount);
                    return (
                      <tr key={item.variantBarcode} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 text-xs">{item.productName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                              {item.variantBarcode}
                            </span>
                            <span>
                              Size: <strong className="text-slate-800 font-extrabold">{item.size}</strong>
                            </span>
                            <span>
                              Color: <strong className="text-slate-800 font-extrabold">{item.color}</strong>
                            </span>
                            {item.availableStock !== undefined && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                  item.quantity > item.availableStock
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                Stock: {item.availableStock}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STAFF SELECTION DROPDOWN (Selecting on any item applies to entire bill) */}
                        <td className="py-3 px-3 text-center">
                          <select
                            value={item.staff || selectedBillStaffId || ''}
                            onChange={(e) => handleApplyStaffToEntireBill(e.target.value)}
                            className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-amber-500 shadow-xs cursor-pointer"
                          >
                            <option value="">-- Select --</option>
                            {activeStaffList.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name} ({s.staffId})
                              </option>
                            ))}
                          </select>
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
                              className="w-20 px-2 py-1 border rounded-lg text-center text-xs font-mono font-extrabold outline-none focus:border-amber-500 bg-white border-slate-300 text-emerald-700 shadow-xs"
                            />
                          </div>
                        </td>

                        {/* QUANTITY +/- BUTTONS */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 border rounded-lg p-1 bg-slate-50 border-slate-200">
                            <button
                              onClick={() =>
                                dispatch(
                                  updateCartItemQty({
                                    barcode: item.variantBarcode,
                                    quantity: item.quantity - 1
                                  })
                                )
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                dispatch(
                                  updateCartItemQty({
                                    barcode: item.variantBarcode,
                                    // Typing is clamped to at least 1 rather than reusing the
                                    // "0 removes the row" behaviour the -/+ buttons have — a row
                                    // disappearing mid-edit (e.g. clearing the field to type a
                                    // new multi-digit quantity) would make it impossible to type
                                    // a replacement value in one motion.
                                    quantity: Math.max(1, Number(e.target.value) || 1)
                                  })
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              className="w-11 text-center font-black text-slate-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              onClick={() =>
                                dispatch(
                                  updateCartItemQty({
                                    barcode: item.variantBarcode,
                                    quantity: item.quantity + 1
                                  })
                                )
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* EDITABLE RUPEE DISCOUNT INPUT */}
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
                              className={`w-20 px-2 py-1 border rounded-lg text-center text-xs font-mono font-bold outline-none focus:border-amber-500 ${
                                item.discountAmount > 0
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-extrabold'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            {item.discountAmount > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold mt-0.5">
                                (-{currencySymbol}{item.discountAmount} off)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-emerald-600 text-xs">
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
        <div className="border rounded-2xl p-5 flex flex-col justify-between shadow-xs transition-colors bg-white border-slate-200">
          <div className="space-y-4">
            {/* Customer Info Box */}
            <div className="p-3 border rounded-xl flex items-center justify-between bg-slate-50 border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">
                    {selectedCustomer ? selectedCustomer.mobile : 'Standard Customer'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCustomerModal(true)}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-extrabold transition cursor-pointer"
              >
                Change (F4)
              </button>
            </div>

            {/* WITH GST / WITHOUT GST OPTION SELECTOR */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700">
                GST Billing Mode Option:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => dispatch(setIsGstBill(true))}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                    isGstBill
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
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
                      ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
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
                <span className="text-slate-500 font-semibold">Subtotal</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(subtotal, currencySymbol)}</span>
              </div>

              {itemDiscountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Item Discounts Total</span>
                  <span>-{formatCurrency(itemDiscountTotal, currencySymbol)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <span>Bill Discount</span>
                  {calculatedBillDiscount > 0 && (
                    <span className="text-[10px] text-emerald-600 font-extrabold">
                      (-{formatCurrency(calculatedBillDiscount, currencySymbol)})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className="text-xs text-amber-700 font-extrabold hover:underline cursor-pointer"
                >
                  {calculatedBillDiscount > 0 ? 'Edit' : 'Apply'}
                </button>
              </div>

              {isGstBill && settings?.enableGst ? (
                <>
                  <div className="flex justify-between text-slate-500 text-[11px] font-semibold">
                    <span>CGST Total</span>
                    <span>{formatCurrency(cgstTotal, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px] font-semibold">
                    <span>SGST Total</span>
                    <span>{formatCurrency(sgstTotal, currencySymbol)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-amber-700 text-[11px] font-black">
                  <span>Tax Billing</span>
                  <span>WITHOUT GST (PLAIN BILL)</span>
                </div>
              )}

            </div>

            <hr className="border-slate-200" />

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                Grand Total Amount
              </div>
              <div className="text-3xl font-black text-slate-900 mt-0.5">
                {formatCurrency(grandTotal, currencySymbol)}
              </div>
            </div>

            {/* INSTANT 1-CLICK QUICK CHECKOUT */}
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
                    className="py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
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
            className={`w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
              cart.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
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

      {/* Visible bill confirmation — stays open until explicitly closed */}
      <ReceiptPreviewModal
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        sale={lastCompletedSale}
        settings={settings}
      />

      {/* Hidden printable receipt, serialized by the silent-print pipeline */}
      <ThermalReceipt sale={lastCompletedSale} settings={settings} />
    </div>
  );
};

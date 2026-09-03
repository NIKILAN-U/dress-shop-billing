import React, { useState, useEffect } from 'react';
import { getReturns, createReturn } from '../services/returnService';
import { getSales } from '../services/posService';
import { getProductByBarcode } from '../services/productService';
import { ProductSearchModal } from '../components/pos/ProductSearchModal';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector } from 'react-redux';
import {
  RotateCcw,
  Search,
  CheckCircle,
  ArrowRightLeft,
  CreditCard,
  Tag,
  RefreshCw,
  User,
  Phone,
  FileText,
  Eye,
  PackageCheck,
  Plus,
  Minus,
  Trash2,
  ShoppingCart
} from 'lucide-react';

export const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Return & Exchange Detail Modal State
  const [selectedReturnDetail, setSelectedReturnDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Invoice Search State (Supports Invoice #, Customer Name, Phone Number)
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [matchingSales, setMatchingSales] = useState([]);
  const [foundSale, setFoundSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [refundMethod, setRefundMethod] = useState('Cash'); // 'Cash' | 'UPI' | 'Card' | 'StoreCredit' | 'Exchange'
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Multi-Item Exchange Cart State
  const [exchangeBarcode, setExchangeBarcode] = useState('');
  const [exchangeCartItems, setExchangeCartItems] = useState([]); // [{ product, variantBarcode, productName, size, color, quantity, unitPrice, stock }]
  const [exchangeError, setExchangeError] = useState('');
  const [searchingExchange, setSearchingExchange] = useState(false);
  const [showCatalogSearchModal, setShowCatalogSearchModal] = useState(false);

  const { settings } = useSelector((state) => state.settings);
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchReturnsList();
  }, []);

  const fetchReturnsList = async () => {
    setLoading(true);
    try {
      const data = await getReturns();
      setReturns(data.returns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Search invoice by Invoice Number, Customer Name, or Phone Number
  const handleSearchInvoice = async (e) => {
    e.preventDefault();
    setError('');
    setFoundSale(null);
    setMatchingSales([]);
    try {
      const data = await getSales({ search: invoiceSearch.trim() });
      const salesList = data.sales || [];

      if (salesList.length === 1) {
        selectSaleInvoice(salesList[0]);
      } else if (salesList.length > 1) {
        setMatchingSales(salesList);
      } else {
        setError(`No invoice or customer found matching "${invoiceSearch}"`);
      }
    } catch (err) {
      setError('Error searching sales invoices');
    }
  };

  const selectSaleInvoice = (sale) => {
    setFoundSale(sale);
    setMatchingSales([]);
    const initialQty = {};
    sale.items.forEach((item) => {
      initialQty[item.variantBarcode] = 0;
    });
    setReturnQuantities(initialQty);
  };

  const handleQtyChange = (barcode, val, maxVal) => {
    const num = Math.min(maxVal, Math.max(0, Number(val || 0)));
    setReturnQuantities({
      ...returnQuantities,
      [barcode]: num
    });
  };

  // Add item to Exchange Cart
  const addVariantToExchangeCart = (product, variant) => {
    setExchangeError('');
    setExchangeCartItems((prevItems) => {
      const existingIdx = prevItems.findIndex((i) => i.variantBarcode === variant.barcode);
      if (existingIdx > -1) {
        const updated = [...prevItems];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [
          ...prevItems,
          {
            product: product._id,
            variantBarcode: variant.barcode,
            productName: product.name,
            size: variant.size,
            color: variant.color,
            quantity: 1,
            unitPrice: product.sellingPrice,
            stock: variant.stock
          }
        ];
      }
    });
  };

  // Direct Barcode Lookup to add to Exchange Cart
  const handleLookupExchangeBarcode = async (e) => {
    if (e) e.preventDefault();
    if (!exchangeBarcode.trim()) return;
    setExchangeError('');
    setSearchingExchange(true);
    try {
      const res = await getProductByBarcode(exchangeBarcode.trim());
      if (res.product && res.variant) {
        addVariantToExchangeCart(res.product, res.variant);
        setExchangeBarcode('');
      } else {
        setExchangeError('No product variant found matching barcode');
      }
    } catch (err) {
      setExchangeError('Barcode not found in product catalog');
    } finally {
      setSearchingExchange(false);
    }
  };

  // Select Replacement Product Variant from Product Catalog Search Replica Modal
  const handleSelectExchangeVariant = (product, variant) => {
    addVariantToExchangeCart(product, variant);
    setExchangeError('');
  };

  // Quantity control in Exchange Cart
  const updateExchangeCartQty = (barcode, delta) => {
    setExchangeCartItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.variantBarcode === barcode) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeExchangeCartItem = (barcode) => {
    setExchangeCartItems((prevItems) => prevItems.filter((i) => i.variantBarcode !== barcode));
  };

  // Calculate current total refund amount from selected return item quantities
  const calculateTotalRefund = () => {
    if (!foundSale) return 0;
    let total = 0;
    foundSale.items.forEach((item) => {
      const qty = returnQuantities[item.variantBarcode] || 0;
      total += item.unitPrice * qty;
    });
    return total;
  };

  // Calculate total exchange cart amount
  const calculateTotalExchange = () => {
    return exchangeCartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  };

  const totalRefund = calculateTotalRefund();
  const totalExchange = calculateTotalExchange();
  const priceDifference = totalExchange - totalRefund;

  const handleProcessReturn = async () => {
    if (!foundSale) return;
    setError('');

    const itemsToReturn = [];
    foundSale.items.forEach((item) => {
      const qty = returnQuantities[item.variantBarcode] || 0;
      if (qty > 0) {
        itemsToReturn.push({
          product: item.product,
          variantBarcode: item.variantBarcode,
          quantity: qty,
          refundUnitPrice: item.unitPrice
        });
      }
    });

    if (itemsToReturn.length === 0) {
      setError('Please select at least 1 item quantity to return');
      return;
    }

    if (refundMethod === 'Exchange' && exchangeCartItems.length === 0) {
      setError('Please add at least 1 replacement item to the exchange bill');
      return;
    }

    try {
      const payload = {
        saleId: foundSale._id,
        items: itemsToReturn,
        refundMethod,
        reason
      };

      if (refundMethod === 'Exchange' && exchangeCartItems.length > 0) {
        payload.exchangeItems = exchangeCartItems.map((i) => ({
          product: i.product,
          variantBarcode: i.variantBarcode,
          productName: i.productName,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalAmount: i.unitPrice * i.quantity
        }));
        payload.totalExchangeAmount = totalExchange;
        payload.priceDifference = priceDifference;

        // Backward compatibility single-item fields
        payload.exchangeBarcode = exchangeCartItems.map((i) => i.variantBarcode).join(', ');
        payload.exchangeProductName = exchangeCartItems
          .map((i) => `${i.quantity}x ${i.productName} (${i.size}/${i.color})`)
          .join(', ');
        payload.exchangeUnitPrice = totalExchange;
      }

      await createReturn(payload);
      setShowModal(false);
      fetchReturnsList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process return/exchange');
    }
  };

  const handleOpenDetailModal = (ret) => {
    setSelectedReturnDetail(ret);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-amber-600" />
            <span>Customer Sales Returns & Item Exchanges</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Process refunds, multi-item exchanges & auto-restock inventory</p>
        </div>

        <button
          onClick={() => {
            setFoundSale(null);
            setMatchingSales([]);
            setInvoiceSearch('');
            setExchangeCartItems([]);
            setExchangeBarcode('');
            setError('');
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Sales Return / Exchange</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <LoadingSpinner label="Loading returns ledger..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                <tr>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Returned & Replacement Items</th>
                  <th className="py-3 px-4 text-center">Mode</th>
                  <th className="py-3 px-4 text-right">Value / Balance</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{ret.returnNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{ret.originalInvoiceNumber}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{ret.customerName || 'Walk-in Customer'}</td>

                    {/* RETURNED & REPLACEMENT ITEMS COLUMN */}
                    <td className="py-3 px-4 space-y-1">
                      <div className="font-semibold text-slate-800">
                        {ret.items?.map((i) => `${i.quantity}x ${i.productName} (${i.size}/${i.color})`).join(', ')}
                      </div>

                      {ret.refundMethod === 'Exchange' && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl space-y-0.5 text-[11px]">
                          <div className="font-extrabold text-amber-900 flex items-center gap-1">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                            <span>
                              {ret.exchangeItems && ret.exchangeItems.length > 0
                                ? ret.exchangeItems
                                    .map((ex) => `${ex.quantity}x ${ex.productName} (${ex.size}/${ex.color})`)
                                    .join(', ')
                                : ret.exchangeProductName || 'Item Replacement'}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          ret.refundMethod === 'Exchange'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : ret.refundMethod === 'StoreCredit'
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {ret.refundMethod === 'Exchange'
                          ? 'Item Exchange'
                          : ret.refundMethod === 'StoreCredit'
                          ? 'Store Credit'
                          : `${ret.refundMethod} Refund`}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-black text-rose-600 text-xs">
                        {formatCurrency(ret.totalRefundAmount, symbol)}
                      </div>
                      {ret.refundMethod === 'Exchange' && ret.priceDifference !== undefined && (
                        <div
                          className={`text-[10px] font-extrabold ${
                            ret.priceDifference > 0
                              ? 'text-rose-600'
                              : ret.priceDifference < 0
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {ret.priceDifference > 0
                            ? `+${formatCurrency(ret.priceDifference, symbol)} Paid`
                            : ret.priceDifference < 0
                            ? `-${formatCurrency(Math.abs(ret.priceDifference), symbol)} Balance`
                            : 'Even Swap'}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetailModal(ret)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return & Exchange Process Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Process Customer Return / Multi-Item Exchange" maxWidth="max-w-3xl">
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          {!foundSale ? (
            <div className="space-y-4">
              <form onSubmit={handleSearchInvoice} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Search Original Sales Invoice #, Customer Name, or Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600" />
                    <input
                      type="text"
                      required
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="e.g. AURA-2026-001001 or 9988776655 or Rajesh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold outline-none focus:border-amber-500 shadow-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    Find Invoice / Customer
                  </button>
                </div>
              </form>

              {matchingSales.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                    <span>Found {matchingSales.length} Matching Sales Invoices for "{invoiceSearch}":</span>
                    <span className="text-[11px] text-slate-500 font-normal">Click an invoice to select</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Total Amount</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matchingSales.map((sale) => (
                          <tr key={sale._id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-extrabold text-amber-800">{sale.invoiceNumber}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {sale.customerName}
                              {sale.customerMobile && (
                                <span className="text-[11px] text-slate-400 font-medium ml-1">
                                  ({sale.customerMobile})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              {formatCurrency(sale.grandTotal, symbol)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => selectSaleInvoice(sale)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-[11px] cursor-pointer"
                              >
                                Select Invoice
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span>Invoice: {foundSale.invoiceNumber}</span>
                  <button
                    onClick={() => {
                      setFoundSale(null);
                      setMatchingSales([]);
                    }}
                    className="text-[11px] text-amber-700 hover:underline font-bold"
                  >
                    Change Invoice
                  </button>
                </div>
                <div className="text-slate-600 font-semibold">Customer: {foundSale.customerName} ({foundSale.customerMobile || 'N/A'})</div>
                <div className="text-slate-500 font-medium">Purchased Date: {formatDateTime(foundSale.createdAt)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Select Item Quantities to Return:</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center">Purchased</th>
                        <th className="py-2.5 px-3 text-center">Return Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {foundSale.items.map((item) => (
                        <tr key={item.variantBarcode} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-900 font-extrabold">
                            {item.productName} ({item.size}/{item.color})
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={returnQuantities[item.variantBarcode] || 0}
                              onChange={(e) => handleQtyChange(item.variantBarcode, e.target.value, item.quantity)}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center text-slate-900 font-extrabold outline-none focus:border-amber-500 shadow-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {formatCurrency(item.unitPrice, symbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mode & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return / Exchange Option *</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-extrabold outline-none focus:border-amber-500"
                  >
                    <option value="Cash">Cash Refund</option>
                    <option value="UPI">UPI / Online Transfer</option>
                    <option value="Card">Card Refund</option>
                    <option value="StoreCredit">Store Credit / Exchange Voucher</option>
                    <option value="Exchange">Direct Item Exchange / Multi-Product Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return / Exchange Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Size mismatch, color change, defect, etc."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* MULTI-ITEM EXCHANGE REPLACEMENT BILL CART SECTION */}
              {refundMethod === 'Exchange' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-amber-700" />
                      <span>Select Replacement Products for Exchange ({exchangeCartItems.length} items)</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowCatalogSearchModal(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Search className="w-4 h-4 text-slate-950" />
                      <span>Search & Add Products (F2)</span>
                    </button>
                  </div>

                  {/* MULTI-ITEM EXCHANGE REPLACEMENT CART TABLE */}
                  {exchangeCartItems.length > 0 ? (
                    <div className="space-y-3">
                      <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-amber-100/60 text-amber-950 uppercase text-[10px] font-extrabold border-b border-amber-200">
                            <tr>
                              <th className="py-2.5 px-3">Replacement Item</th>
                              <th className="py-2.5 px-3 text-center">Unit Price</th>
                              <th className="py-2.5 px-3 text-center">Qty</th>
                              <th className="py-2.5 px-3 text-right">Subtotal</th>
                              <th className="py-2.5 px-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {exchangeCartItems.map((item) => (
                              <tr key={item.variantBarcode} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-extrabold text-slate-900">
                                  {item.productName} ({item.size}/{item.color})
                                  <div className="text-[10px] text-slate-500 font-mono">Barcode: {item.variantBarcode}</div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                  {formatCurrency(item.unitPrice, symbol)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                                    <button
                                      type="button"
                                      onClick={() => updateExchangeCartQty(item.variantBarcode, -1)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-6 text-center font-black text-slate-900 text-xs">{item.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateExchangeCartQty(item.variantBarcode, 1)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                  {formatCurrency(item.unitPrice * item.quantity, symbol)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeExchangeCartItem(item.variantBarcode)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                                    title="Remove Item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* EXCHANGE BALANCE SUMMARY BOX */}
                      <div className="p-3 bg-white border border-amber-300 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span>Total Replacement Products Bill ({exchangeCartItems.reduce((acc, i) => acc + i.quantity, 0)} pcs):</span>
                          <span className="text-slate-900 font-black text-sm">{formatCurrency(totalExchange, symbol)}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold">
                          <span>Returned Items Refund Credit Value:</span>
                          <span className="text-emerald-600 font-black text-sm">{formatCurrency(totalRefund, symbol)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black">
                          <span>Net Exchange Balance:</span>
                          <span
                            className={
                              priceDifference > 0
                                ? 'text-rose-600 font-black text-sm'
                                : priceDifference < 0
                                ? 'text-emerald-600 font-black text-sm'
                                : 'text-amber-800 font-black text-sm'
                            }
                          >
                            {priceDifference > 0
                              ? `Customer Pays Additional ${formatCurrency(priceDifference, symbol)}`
                              : priceDifference < 0
                              ? `Refund Balance to Customer ${formatCurrency(Math.abs(priceDifference), symbol)}`
                              : 'Even Exchange (₹0 Difference)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-amber-800 text-xs font-semibold bg-white border border-dashed border-amber-300 rounded-xl">
                      No replacement items added yet. Click "Search & Add Products (F2)" above to select replacement products for the exchange bill.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setFoundSale(null);
                    setMatchingSales([]);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold"
                >
                  Back
                </button>
                <button
                  onClick={handleProcessReturn}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {refundMethod === 'Exchange' ? 'CONFIRM MULTI-ITEM EXCHANGE' : 'CONFIRM RETURN & RESTOCK'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* VIEW RETURN & EXCHANGE DETAIL MODAL */}
      {selectedReturnDetail && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Return & Exchange Voucher — ${selectedReturnDetail.returnNumber}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-extrabold text-slate-900">Original Invoice: {selectedReturnDetail.originalInvoiceNumber}</div>
              <div className="text-slate-600 font-semibold">Customer: {selectedReturnDetail.customerName || 'Walk-in Customer'}</div>
              <div className="text-slate-500 font-medium">Processed Date: {formatDateTime(selectedReturnDetail.createdAt)}</div>
              <div className="text-slate-500 font-medium">Processed By: {selectedReturnDetail.processedByName || 'System'}</div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Returned Items List:</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Returned Product</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Refund Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReturnDetail.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-extrabold text-slate-900">
                          {item.productName} ({item.size}/{item.color})
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {formatCurrency(item.totalRefund, symbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedReturnDetail.refundMethod === 'Exchange' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <div className="font-black text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                  <span>Issued Replacement Items List</span>
                </div>
                
                {selectedReturnDetail.exchangeItems && selectedReturnDetail.exchangeItems.length > 0 ? (
                  <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-100/50 text-amber-900 uppercase text-[10px] font-extrabold border-b border-amber-200">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReturnDetail.exchangeItems.map((ex, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {ex.productName} ({ex.size}/{ex.color})
                              <div className="text-[10px] text-slate-400 font-mono">{ex.variantBarcode}</div>
                            </td>
                            <td className="py-2 px-3 text-center font-bold">{ex.quantity}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-900">
                              {formatCurrency(ex.totalAmount, symbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-1 font-semibold">
                    <div className="font-extrabold text-slate-900 text-sm">
                      {selectedReturnDetail.exchangeProductName || 'Item Replacement'}
                    </div>
                    {selectedReturnDetail.exchangeBarcode && (
                      <div className="text-slate-600 font-mono text-xs">
                        Barcode: <strong className="text-slate-900">{selectedReturnDetail.exchangeBarcode}</strong>
                      </div>
                    )}
                  </div>
                )}

                {selectedReturnDetail.priceDifference !== undefined && (
                  <div className="flex items-center justify-between pt-1 font-black text-xs">
                    <span>Net Exchange Balance:</span>
                    <span
                      className={
                        selectedReturnDetail.priceDifference > 0
                          ? 'text-rose-600 font-black'
                          : selectedReturnDetail.priceDifference < 0
                          ? 'text-emerald-600 font-black'
                          : 'text-slate-800'
                      }
                    >
                      {selectedReturnDetail.priceDifference > 0
                        ? `Customer Paid Extra ${formatCurrency(selectedReturnDetail.priceDifference, symbol)}`
                        : selectedReturnDetail.priceDifference < 0
                        ? `Refund Balance to Customer ${formatCurrency(Math.abs(selectedReturnDetail.priceDifference), symbol)}`
                        : 'Even Swap (₹0 Balance)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CATALOG SEARCH REPLICA MODAL FOR ITEM EXCHANGE */}
      <ProductSearchModal
        isOpen={showCatalogSearchModal}
        onClose={() => setShowCatalogSearchModal(false)}
        onSelectVariant={handleSelectExchangeVariant}
        settings={settings}
      />
    </div>
  );
};

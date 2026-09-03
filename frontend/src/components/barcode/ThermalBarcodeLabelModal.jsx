import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Code128Barcode } from './Code128Barcode';
import { logBarcodePrint } from '../../services/barcodeService';
import { formatCurrency } from '../../utils/formatters';
import { useSelector } from 'react-redux';
import { Printer, Package, Hash, Tag, Layers, CheckCircle2 } from 'lucide-react';

export const ThermalBarcodeLabelModal = ({
  isOpen,
  onClose,
  items = [], // Array of { productId, productName, sku, barcode, size, color, sellingPrice, stock }
  onPrinted
}) => {
  const { settings } = useSelector((state) => state.settings);
  const shopName = settings?.shopName || 'AURA TEXTILES';
  const currencySymbol = settings?.currencySymbol || '₹';

  const [quantities, setQuantities] = useState({});
  const [printing, setPrinting] = useState(false);

  // Settings for printable thermal label
  const [labelSettings, setLabelSettings] = useState({
    showShopName: settings?.barcodeShowShopName ?? true,
    showProductName: settings?.barcodeShowProductName ?? true,
    showSizeColor: settings?.barcodeShowSizeColor ?? true,
    showPrice: settings?.barcodeShowPrice ?? true,
    labelWidth: settings?.barcodeLabelWidth || '50mm',
    labelHeight: settings?.barcodeLabelHeight || '25mm'
  });

  useEffect(() => {
    if (isOpen && items.length > 0) {
      const initialQty = {};
      items.forEach((item) => {
        const key = item.variantId || item.barcode;
        initialQty[key] = item.stock && item.stock > 0 ? item.stock : 1;
      });
      setQuantities(initialQty);
    }
  }, [isOpen, items]);

  const handleQtyChange = (key, val) => {
    const qty = Math.max(1, parseInt(val, 10) || 1);
    setQuantities((prev) => ({ ...prev, [key]: qty }));
  };

  const handleSetStockQty = () => {
    const stockQty = {};
    items.forEach((item) => {
      const key = item.variantId || item.barcode;
      stockQty[key] = item.stock && item.stock > 0 ? item.stock : 1;
    });
    setQuantities(stockQty);
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      // Log print jobs in backend
      for (const item of items) {
        const key = item.variantId || item.barcode;
        const printCount = quantities[key] || 1;
        await logBarcodePrint({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          variantBarcode: item.barcode,
          sizeColor: `${item.size || ''} / ${item.color || ''}`,
          quantityPrinted: printCount,
          labelDimensions: `${labelSettings.labelWidth} x ${labelSettings.labelHeight}`
        });
      }

      if (onPrinted) onPrinted();
      window.print();
    } catch (err) {
      console.error('Failed to log print job', err);
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  // Generate expanded list of individual label instances to render
  const labelInstances = [];
  items.forEach((item) => {
    const key = item.variantId || item.barcode;
    const count = quantities[key] || 1;
    for (let i = 0; i < count; i++) {
      labelInstances.push({ ...item, copyIndex: i + 1 });
    }
  });

  if (!isOpen || items.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Print Barcode Labels (${labelInstances.length} Total Copies)`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Print Configuration Controls */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Label Copy Quantities</span>
            </h4>

            <button
              onClick={handleSetStockQty}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Print Based on Stock Quantity</span>
            </button>
          </div>

          {/* List of items with editable print quantity */}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {items.map((item) => {
              const key = item.variantId || item.barcode;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-slate-900">{item.productName}</span>
                    <span className="text-slate-500 ml-2 font-mono">
                      ({item.size} / {item.color}) — stock: <strong>{item.stock}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold">Print Copies:</span>
                    <input
                      type="number"
                      min="1"
                      value={quantities[key] || 1}
                      onChange={(e) => handleQtyChange(key, e.target.value)}
                      className="w-16 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thermal Label Display Toggle Controls */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-extrabold">Label Elements:</span>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={labelSettings.showShopName}
                onChange={(e) => setLabelSettings({ ...labelSettings, showShopName: e.target.checked })}
                className="accent-amber-500 rounded"
              />
              <span>Shop Name</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={labelSettings.showProductName}
                onChange={(e) => setLabelSettings({ ...labelSettings, showProductName: e.target.checked })}
                className="accent-amber-500 rounded"
              />
              <span>Product Name</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={labelSettings.showSizeColor}
                onChange={(e) => setLabelSettings({ ...labelSettings, showSizeColor: e.target.checked })}
                className="accent-amber-500 rounded"
              />
              <span>Size & Color</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={labelSettings.showPrice}
                onChange={(e) => setLabelSettings({ ...labelSettings, showPrice: e.target.checked })}
                className="accent-amber-500 rounded"
              />
              <span>Selling Price</span>
            </label>
          </div>
        </div>

        {/* Live Thermal Label Preview Grid */}
        <div className="space-y-2">
          <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Thermal Label Preview</span>
            <span className="text-slate-400 font-mono">50mm × 25mm Label Size</span>
          </div>

          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl max-h-64 overflow-y-auto flex flex-wrap gap-4 justify-center">
            {items.map((item) => (
              <div
                key={item.variantId || item.barcode}
                className="w-48 p-2.5 bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col items-center justify-between text-center select-none"
                style={{ minHeight: '120px' }}
              >
                {labelSettings.showShopName && (
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-0.5 w-full">
                    {shopName}
                  </div>
                )}

                {labelSettings.showProductName && (
                  <div className="text-xs font-black text-slate-900 line-clamp-1 mt-1">
                    {item.productName}
                  </div>
                )}

                {labelSettings.showSizeColor && (
                  <div className="text-[10px] text-slate-600 font-bold">
                    Size: {item.size} | Color: {item.color}
                  </div>
                )}

                {labelSettings.showPrice && (
                  <div className="text-xs font-black text-slate-900 mt-0.5">
                    {formatCurrency(item.sellingPrice, currencySymbol)}
                  </div>
                )}

                <div className="my-1 scale-90">
                  <Code128Barcode value={item.barcode} height={28} width={1.4} showText={true} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{printing ? 'Preparing Print...' : `PRINT ${labelInstances.length} LABELS`}</span>
          </button>
        </div>
      </div>

      {/* Hidden Thermal Print Sheet triggered by window.print() */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-50">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .thermal-print-area, .thermal-print-area * { visibility: visible; }
            .thermal-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .thermal-label {
              width: 50mm;
              height: 25mm;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm;
              box-sizing: border-box;
              font-family: sans-serif;
              text-align: center;
            }
          }
        `}</style>
        <div className="thermal-print-area">
          {labelInstances.map((label, idx) => (
            <div key={idx} className="thermal-label">
              {labelSettings.showShopName && (
                <div style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {shopName}
                </div>
              )}
              {labelSettings.showProductName && (
                <div style={{ fontSize: '9px', fontWeight: '900', margin: '1px 0' }}>
                  {label.productName}
                </div>
              )}
              {labelSettings.showSizeColor && (
                <div style={{ fontSize: '7.5px', fontWeight: 'bold' }}>
                  Size: {label.size} | Color: {label.color}
                </div>
              )}
              {labelSettings.showPrice && (
                <div style={{ fontSize: '9px', fontWeight: '900', margin: '1px 0' }}>
                  {formatCurrency(label.sellingPrice, currencySymbol)}
                </div>
              )}
              <Code128Barcode value={label.barcode} height={22} width={1.2} showText={true} />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

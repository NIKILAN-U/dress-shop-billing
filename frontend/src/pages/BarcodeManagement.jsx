import React, { useState, useEffect } from 'react';
import {
  getBarcodeCatalog,
  generateVariantBarcode,
  bulkGenerateBarcodes,
  getBarcodePrintLogs
} from '../services/barcodeService';
import { getCategories } from '../services/categoryService';
import { updateSettings } from '../services/settingService';
import { Code128Barcode } from '../components/barcode/Code128Barcode';
import { ThermalBarcodeLabelModal } from '../components/barcode/ThermalBarcodeLabelModal';
import { ProductFormModal } from './ProductFormModal';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSettings } from '../store/slices/settingSlice';
import {
  QrCode,
  Search,
  Filter,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Edit2,
  Eye,
  Settings,
  History,
  Tag,
  SlidersHorizontal,
  Plus
} from 'lucide-react';

export const BarcodeManagement = () => {
  const dispatch = useDispatch();
  const { settings } = useSelector((state) => state.auth);
  const currencySymbol = settings?.currencySymbol || '₹';

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'history' | 'settings'
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [barcodeFilter, setBarcodeFilter] = useState(''); // '' | 'true' | 'false'

  // Master Data State
  const [categories, setCategories] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    withBarcode: 0,
    withoutBarcode: 0,
    printedJobsCount: 0
  });

  // Selected Checkboxes for Bulk Printing
  const [selectedItemsMap, setSelectedItemsMap] = useState({});

  // Single View / Generate Barcode Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [modalError, setModalError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Regenerate Confirmation Modal
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);
  const [regenTargetItem, setRegenTargetItem] = useState(null);

  // Thermal Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetItems, setPrintTargetItems] = useState([]);

  // Product Edit Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProductData, setEditProductData] = useState(null);

  // Print History Log State
  const [printLogs, setPrintLogs] = useState([]);

  // Barcode Label Printer Settings State
  const [settingsForm, setSettingsForm] = useState({
    barcodePrefix: 'DSS',
    barcodeLabelWidth: '50mm',
    barcodeLabelHeight: '25mm',
    barcodeFontSize: 10,
    barcodeHeight: 35,
    barcodeShowPrice: true,
    barcodeShowProductName: true,
    barcodeShowSizeColor: true,
    barcodeShowShopName: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    } else if (activeTab === 'history') {
      fetchPrintLogs();
    }
  }, [activeTab, searchTerm, selectedCategory, barcodeFilter]);

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.categories || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await getBarcodeCatalog({
        search: searchTerm,
        category: selectedCategory,
        hasBarcode: barcodeFilter
      });
      setCatalogItems(res.items || []);
      setStats(res.stats || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrintLogs = async () => {
    setLoading(true);
    try {
      const res = await getBarcodePrintLogs();
      setPrintLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Bulk Generate Barcodes for All Missing Products
  const handleBulkGenerate = async () => {
    if (!window.confirm('Generate unique barcodes for all products missing barcodes?')) return;
    setLoading(true);
    try {
      const res = await bulkGenerateBarcodes();
      alert(res.message);
      fetchCatalog();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to bulk generate barcodes');
    } finally {
      setLoading(false);
    }
  };

  // Handle Checkbox Selection
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      const map = {};
      catalogItems.forEach((item) => {
        if (item.barcode) {
          map[item.variantId] = item;
        }
      });
      setSelectedItemsMap(map);
    } else {
      setSelectedItemsMap({});
    }
  };

  const handleToggleSelectItem = (item) => {
    const key = item.variantId;
    setSelectedItemsMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = item;
      return next;
    });
  };

  // Open Single View / Generate Modal
  const handleOpenViewModal = (item) => {
    setActiveItem(item);
    setManualBarcode(item.barcode || '');
    setModalError('');
    setShowViewModal(true);
  };

  const handleGenerateBarcode = async (isRegenerate = false) => {
    setModalError('');
    setGenerating(true);
    try {
      const res = await generateVariantBarcode({
        productId: activeItem.productId,
        variantId: activeItem.variantId,
        barcode: manualBarcode,
        isRegenerate
      });

      setShowViewModal(false);
      setShowConfirmRegenerate(false);
      fetchCatalog();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to generate barcode');
    } finally {
      setGenerating(false);
    }
  };

  // Open Confirm Regenerate Prompt
  const handleOpenRegenConfirm = (item) => {
    setRegenTargetItem(item);
    setShowConfirmRegenerate(true);
  };

  const handleConfirmRegenerate = async () => {
    setGenerating(true);
    try {
      await generateVariantBarcode({
        productId: regenTargetItem.productId,
        variantId: regenTargetItem.variantId,
        isRegenerate: true
      });
      setShowConfirmRegenerate(false);
      fetchCatalog();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to regenerate barcode');
    } finally {
      setGenerating(false);
    }
  };

  // Open Thermal Print Modal for Single Item
  const handleOpenPrintSingle = (item) => {
    if (!item.barcode) {
      alert('Please generate a barcode for this product before printing.');
      return;
    }
    setPrintTargetItems([item]);
    setShowPrintModal(true);
  };

  // Open Thermal Print Modal for Selected Checked Items
  const handleOpenPrintSelected = () => {
    const selectedList = Object.values(selectedItemsMap);
    if (selectedList.length === 0) {
      alert('Please select at least one product with a barcode to print.');
      return;
    }
    setPrintTargetItems(selectedList);
    setShowPrintModal(true);
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings(settingsForm);
      dispatch(fetchSettings());
      alert('Barcode Printer Settings saved successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const selectedCount = Object.keys(selectedItemsMap).length;

  return (
    <div className="space-y-6">
      {/* Header Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <QrCode className="w-6 h-6 text-amber-600" />
            <span>Barcode Management System</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Generate, manage, regenerate CODE128 product barcodes and print thermal barcode labels
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedCount > 0 && (
            <button
              onClick={handleOpenPrintSelected}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Selected ({selectedCount})</span>
            </button>
          )}

          <button
            onClick={handleBulkGenerate}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Generate Barcodes for All Products</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Variants</div>
          <div className="text-2xl font-black text-slate-900">{stats.totalItems || 0} Items</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">With Barcode</div>
          <div className="text-2xl font-black text-emerald-600">{stats.withBarcode || 0} Assigned</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Without Barcode</div>
          <div className="text-2xl font-black text-rose-600">{stats.withoutBarcode || 0} Missing</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Print Jobs Logged</div>
          <div className="text-2xl font-black text-amber-800">{stats.printedJobsCount || 0} Printed</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center gap-2 shadow-xs">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Barcode Catalog ({catalogItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Print History Log</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Thermal Label Printer Settings</span>
        </button>
      </div>

      {/* TAB 1: BARCODE CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Barcode, Product Name, SKU, Category, Size, or Color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                <option value="">All Barcode Status</option>
                <option value="true">With Barcode Only</option>
                <option value="false">Missing Barcode Only</option>
              </select>
            </div>
          </div>

          {/* Barcode Catalog Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <LoadingSpinner label="Loading barcode catalog..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          onChange={handleToggleSelectAll}
                          checked={
                            catalogItems.length > 0 &&
                            catalogItems.filter((i) => i.barcode).length === Object.keys(selectedItemsMap).length
                          }
                          className="accent-amber-500 rounded"
                        />
                      </th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Size / Color</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Stock</th>
                      <th className="py-3 px-4 text-center">Barcode Number</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catalogItems.map((item) => {
                      const isSelected = !!selectedItemsMap[item.variantId];
                      return (
                        <tr key={item.variantId} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              disabled={!item.barcode}
                              checked={isSelected}
                              onChange={() => handleToggleSelectItem(item)}
                              className="accent-amber-500 rounded cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-900">{item.productName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-600">{item.sku}</td>
                          <td className="py-3 px-4 font-bold text-slate-700">{item.category}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {item.size} / {item.color}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatCurrency(item.sellingPrice, currencySymbol)}
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-slate-900">{item.stock}</td>
                          <td className="py-3 px-4 text-center font-mono font-extrabold">
                            {item.barcode ? (
                              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-xs">
                                {item.barcode}
                              </span>
                            ) : (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                                No Barcode
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.barcode ? (
                                <>
                                  <button
                                    onClick={() => handleOpenViewModal(item)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                    title="View Barcode"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenPrintSingle(item)}
                                    className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition"
                                    title="Print Label"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenRegenConfirm(item)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                                    title="Regenerate Barcode"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleOpenViewModal(item)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-[11px]"
                                >
                                  Generate Barcode
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRINT HISTORY LOG */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading barcode print logs..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Print Date</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Variant Barcode</th>
                    <th className="py-3 px-4 text-center">Size / Color</th>
                    <th className="py-3 px-4 text-center">Quantity Printed</th>
                    <th className="py-3 px-4">Printed By</th>
                    <th className="py-3 px-4">Label Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-semibold">{formatDateTime(log.printDate)}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{log.productName}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{log.variantBarcode}</td>
                      <td className="py-3 px-4 text-center font-bold">{log.sizeColor || '-'}</td>
                      <td className="py-3 px-4 text-center font-black text-emerald-600">{log.quantityPrinted}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{log.printedByName}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{log.labelDimensions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LABEL PRINTER SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>Thermal Barcode Label Preferences</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Internal Barcode Prefix</label>
              <input
                type="text"
                value={settingsForm.barcodePrefix}
                onChange={(e) => setSettingsForm({ ...settingsForm, barcodePrefix: e.target.value.toUpperCase() })}
                placeholder="e.g. DSS or AURA"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Label Width</label>
              <select
                value={settingsForm.barcodeLabelWidth}
                onChange={(e) => setSettingsForm({ ...settingsForm, barcodeLabelWidth: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                <option value="50mm">50mm (Standard)</option>
                <option value="40mm">40mm</option>
                <option value="38mm">38mm</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Label Height</label>
              <select
                value={settingsForm.barcodeLabelHeight}
                onChange={(e) => setSettingsForm({ ...settingsForm, barcodeLabelHeight: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
              >
                <option value="25mm">25mm (Standard)</option>
                <option value="30mm">30mm</option>
                <option value="20mm">20mm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Barcode Height (px)</label>
              <input
                type="number"
                min="20"
                max="60"
                value={settingsForm.barcodeHeight}
                onChange={(e) => setSettingsForm({ ...settingsForm, barcodeHeight: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="block text-xs font-black text-slate-900 uppercase">Printable Label Elements</label>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.barcodeShowShopName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, barcodeShowShopName: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <span>Show Shop Name (AURA TEXTILES)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.barcodeShowProductName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, barcodeShowProductName: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <span>Show Product Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.barcodeShowSizeColor}
                  onChange={(e) => setSettingsForm({ ...settingsForm, barcodeShowSizeColor: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <span>Show Size & Color</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.barcodeShowPrice}
                  onChange={(e) => setSettingsForm({ ...settingsForm, barcodeShowPrice: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <span>Show Selling Price</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
            >
              {savingSettings ? 'Saving...' : 'SAVE BARCODE PRINTER SETTINGS'}
            </button>
          </div>
        </form>
      )}

      {/* SINGLE BARCODE VIEW / GENERATE MODAL */}
      {activeItem && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Barcode Detail — ${activeItem.productName} (${activeItem.size}/${activeItem.color})`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                {modalError}
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
              {activeItem.barcode ? (
                <Code128Barcode value={activeItem.barcode} height={45} width={2} showText={true} />
              ) : (
                <div className="text-xs text-rose-600 font-extrabold">No Barcode Assigned Yet</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Manufacturer Barcode (Optional)
              </label>
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Leave empty to auto-generate DSS000xxx"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => handleGenerateBarcode(false)}
                disabled={generating}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {generating ? 'Saving...' : activeItem.barcode ? 'Update Barcode' : 'Generate Unique Barcode'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REGENERATE CONFIRMATION MODAL */}
      {regenTargetItem && (
        <Modal
          isOpen={showConfirmRegenerate}
          onClose={() => setShowConfirmRegenerate(false)}
          title="Regenerate Barcode Confirmation"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-rose-900 font-extrabold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Warning: Invalidates Previous Barcode Labels</span>
              </div>
              <p>
                Changing this barcode will make previously printed labels invalid for product{' '}
                <strong>"{regenTargetItem.productName}"</strong>. Do you want to continue?
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmRegenerate(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={generating}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {generating ? 'Regenerating...' : 'Yes, Regenerate Barcode'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* THERMAL PRINT MODAL */}
      <ThermalBarcodeLabelModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        items={printTargetItems}
        onPrinted={() => fetchCatalog()}
      />
    </div>
  );
};

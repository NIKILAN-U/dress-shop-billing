import React, { useState, useEffect } from 'react';
import {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  getCommissionSummary,
  recordCommissionPayment,
  getPaymentHistory,
  getItemizedCommissionLedger
} from '../services/staffService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector } from 'react-redux';
import {
  Users,
  UserPlus,
  Edit2,
  DollarSign,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  TrendingUp,
  Search,
  PlusCircle,
  Receipt
} from 'lucide-react';

export const StaffCommission = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'directory' | 'ledger' | 'payments'
  const [loading, setLoading] = useState(true);

  // Staff Directory State
  const [staffList, setStaffList] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    staffId: '',
    name: '',
    mobile: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    notes: ''
  });

  // Filter State for Commission Reports
  const [filterRange, setFilterRange] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');

  // Dashboard Summary State
  const [summaryData, setSummaryData] = useState([]);
  const [grandTotals, setGrandTotals] = useState({});

  // Itemized Ledger State
  const [itemizedList, setItemizedList] = useState([]);

  // Payment History State
  const [paymentsList, setPaymentsList] = useState([]);

  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payTargetStaff, setPayTargetStaff] = useState(null);
  const [payForm, setPayForm] = useState({
    amountPaid: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { settings } = useSelector((state) => state.settings);
  const currencySymbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchSummary();
    } else if (activeTab === 'ledger') {
      fetchItemized();
    } else if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab, filterRange, customStart, customEnd, selectedStaffFilter]);

  const fetchStaff = async () => {
    try {
      const res = await getStaffMembers();
      setStaffList(res.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await getCommissionSummary({
        filter: filterRange,
        startDate: customStart,
        endDate: customEnd,
        staffId: selectedStaffFilter
      });
      setSummaryData(res.summary || []);
      setGrandTotals(res.grandTotals || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemized = async () => {
    setLoading(true);
    try {
      const res = await getItemizedCommissionLedger({
        filter: filterRange,
        startDate: customStart,
        endDate: customEnd,
        staffId: selectedStaffFilter
      });
      setItemizedList(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getPaymentHistory({ staffId: selectedStaffFilter });
      setPaymentsList(res.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open Create / Edit Staff Modal
  const handleOpenStaffModal = (staff = null) => {
    setFormError('');
    if (staff) {
      setEditingStaff(staff);
      setStaffForm({
        staffId: staff.staffId,
        name: staff.name,
        mobile: staff.mobile,
        joiningDate: new Date(staff.joiningDate).toISOString().split('T')[0],
        status: staff.status,
        notes: staff.notes || ''
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        staffId: '',
        name: '',
        mobile: '',
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: ''
      });
    }
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaffMember(editingStaff._id, staffForm);
      } else {
        await createStaffMember(staffForm);
      }
      setShowStaffModal(false);
      fetchStaff();
      fetchSummary();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save staff details');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Record Payment Modal for a staff member
  const handleOpenPaymentModal = (staffSummary) => {
    setFormError('');
    setPayTargetStaff(staffSummary);
    setPayForm({
      amountPaid: staffSummary.pendingCommission > 0 ? staffSummary.pendingCommission : '',
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await recordCommissionPayment({
        staffId: payTargetStaff._id,
        amountPaid: Number(payForm.amountPaid),
        paymentMethod: payForm.paymentMethod,
        paymentDate: payForm.paymentDate,
        notes: payForm.notes
      });
      setShowPaymentModal(false);
      fetchSummary();
      if (activeTab === 'payments') fetchPayments();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record commission payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            <span>Staff & Product Commission Management</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage staff profiles, itemized billing commission calculations, payouts, and financial ledger reports
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleOpenStaffModal()}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center gap-2 shadow-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Commission Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Itemized Commission Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payout History</span>
        </button>
      </div>

      {/* Date & Staff Filter Bar (for dashboard, ledger, payments) */}
      {activeTab !== 'directory' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Timeframe:</span>
            </span>

            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterRange(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterRange === btn.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {filterRange === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                />
              </div>
            )}

            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
            >
              <option value="">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.staffId} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: COMMISSION DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Products Sold</div>
              <div className="text-2xl font-black text-slate-900">{grandTotals.totalProductsSold || 0} Items</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Sales Revenue</div>
              <div className="text-2xl font-black text-slate-900">{formatCurrency(grandTotals.totalSalesAmount || 0, currencySymbol)}</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Commission Earned</div>
              <div className="text-2xl font-black text-emerald-600">{formatCurrency(grandTotals.totalCommissionEarned || 0, currencySymbol)}</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Commission Paid</div>
              <div className="text-2xl font-black text-amber-800">{formatCurrency(grandTotals.totalCommissionPaid || 0, currencySymbol)}</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Pending Balance</div>
              <div className="text-2xl font-black text-rose-600">{formatCurrency(grandTotals.pendingCommission || 0, currencySymbol)}</div>
            </div>
          </div>

          {/* Staff Summary Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <LoadingSpinner label="Calculating staff commission totals..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                    <tr>
                      <th className="py-3 px-4">Staff ID</th>
                      <th className="py-3 px-4">Staff Name</th>
                      <th className="py-3 px-4 text-center">Products Sold</th>
                      <th className="py-3 px-4 text-right">Sales Amount</th>
                      <th className="py-3 px-4 text-right">Commission Earned</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Pending Balance</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryData.map((row) => (
                      <tr key={row._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{row.staffId}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          {row.name}
                          {row.status === 'Inactive' && (
                            <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{row.totalProductsSold}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(row.totalSalesAmount, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600">
                          {formatCurrency(row.totalCommissionEarned, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-700">
                          {formatCurrency(row.totalCommissionPaid, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-600">
                          {formatCurrency(row.pendingCommission, currencySymbol)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenPaymentModal(row)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-[11px] shadow-xs cursor-pointer"
                          >
                            Pay Commission
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                <tr>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{staff.staffId}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{staff.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{staff.mobile}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{new Date(staff.joiningDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          staff.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenStaffModal(staff)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ITEMIZED LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading itemized commission breakdown..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Staff</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Sale Amount</th>
                    <th className="py-3 px-4 text-center">Config Rate</th>
                    <th className="py-3 px-4 text-right">Commission Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemizedList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{item.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {item.staffName} <span className="text-slate-400 font-mono">({item.staffId})</span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {item.productName} <span className="text-slate-400 font-normal">({item.sizeColor})</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(item.totalAmount, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {item.commissionType === 'Percentage' ? `${item.commissionValue}%` : `₹${item.commissionValue} / pc`}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        {formatCurrency(item.commissionAmount, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYOUT HISTORY */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading payout history..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Staff ID</th>
                    <th className="py-3 px-4">Staff Name</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4">Notes / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentsList.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-semibold">{formatDateTime(p.paymentDate)}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{p.staffId}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">{p.staffName}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{p.paymentMethod}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        {formatCurrency(p.amountPaid, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT STAFF MODAL */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        title={editingStaff ? `Edit Staff — ${editingStaff.staffId}` : 'Add New Staff Member'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Staff ID (Auto-generated if empty)</label>
            <input
              type="text"
              value={staffForm.staffId}
              onChange={(e) => setStaffForm({ ...staffForm, staffId: e.target.value })}
              placeholder="e.g. ST001"
              disabled={!!editingStaff}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold outline-none focus:border-amber-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              placeholder="Enter staff full name"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
            <input
              type="text"
              required
              value={staffForm.mobile}
              onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })}
              placeholder="Enter mobile number"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={staffForm.joiningDate}
                onChange={(e) => setStaffForm({ ...staffForm, joiningDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={staffForm.status}
                onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-extrabold outline-none focus:border-amber-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Address</label>
            <input
              type="text"
              value={staffForm.notes}
              onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
              placeholder="Optional notes"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowStaffModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'SAVE STAFF MEMBER'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD COMMISSION PAYMENT MODAL */}
      {payTargetStaff && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={`Record Commission Payout — ${payTargetStaff.name} (${payTargetStaff.staffId})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSavePayment} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                {formError}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-medium">
              <div>Total Commission Earned: <strong className="text-emerald-600 font-black">{formatCurrency(payTargetStaff.totalCommissionEarned, currencySymbol)}</strong></div>
              <div>Already Paid: <strong className="text-slate-900 font-extrabold">{formatCurrency(payTargetStaff.totalCommissionPaid, currencySymbol)}</strong></div>
              <div>Current Pending Balance: <strong className="text-rose-600 font-black">{formatCurrency(payTargetStaff.pendingCommission, currencySymbol)}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payForm.amountPaid}
                onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
                placeholder="Enter amount to pay"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-black outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payForm.paymentDate}
                  onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Voucher Reference</label>
              <input
                type="text"
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                placeholder="e.g. Monthly commission payout"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {submitting ? 'Recording...' : 'CONFIRM PAYMENT'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

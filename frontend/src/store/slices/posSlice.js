import { createSlice } from '@reduxjs/toolkit';

const posSlice = createSlice({
  name: 'pos',
  initialState: {
    cart: [],
    selectedCustomer: null, // null defaults to Walk-in Customer
    billDiscountType: 'fixed', // 'fixed' | 'percentage'
    billDiscountValue: 0,
    isGstBill: true, // Toggleable: true = With GST, false = Without GST (Plain bill)
    paymentMethod: 'Cash', // Cash, UPI, Card, BankTransfer, Mixed
    paymentsSplit: [],
    heldBills: [],
    lastCompletedSale: null
  },
  reducers: {
    addToCart: (state, action) => {
      const { product, variant, quantity = 1 } = action.payload;
      const barcode = variant.barcode;

      const existingIndex = state.cart.findIndex((item) => item.variantBarcode === barcode);

      if (existingIndex > -1) {
        state.cart[existingIndex].quantity += quantity;
      } else {
        const unitPrice = product.sellingPrice;
        state.cart.push({
          product: product._id,
          productName: product.name,
          variantBarcode: variant.barcode,
          size: variant.size,
          color: variant.color,
          availableStock: variant.stock,
          unitPrice,
          mrp: product.mrp || unitPrice,
          purchasePrice: product.purchasePrice || 0,
          quantity,
          discountAmount: 0,
          taxPercent: product.taxPercent || 0,
          totalAmount: unitPrice * quantity
        });
      }
    },
    updateCartItemQty: (state, action) => {
      const { barcode, quantity } = action.payload;
      const item = state.cart.find((i) => i.variantBarcode === barcode);
      if (item) {
        if (quantity <= 0) {
          state.cart = state.cart.filter((i) => i.variantBarcode !== barcode);
        } else {
          item.quantity = quantity;
          const discountedPrice = item.unitPrice - item.discountAmount;
          item.totalAmount = Math.max(0, discountedPrice) * quantity;
        }
      }
    },
    updateCartItemUnitPrice: (state, action) => {
      const { barcode, unitPrice } = action.payload;
      const item = state.cart.find((i) => i.variantBarcode === barcode);
      if (item) {
        item.unitPrice = Math.max(0, Number(unitPrice || 0));
        const discountedPrice = item.unitPrice - item.discountAmount;
        item.totalAmount = Math.max(0, discountedPrice) * item.quantity;
      }
    },
    updateCartItemDiscount: (state, action) => {
      const { barcode, discountAmount } = action.payload;
      const item = state.cart.find((i) => i.variantBarcode === barcode);
      if (item) {
        item.discountAmount = Math.max(0, Number(discountAmount || 0));
        const discountedPrice = item.unitPrice - item.discountAmount;
        item.totalAmount = Math.max(0, discountedPrice) * item.quantity;
      }
    },
    removeFromCart: (state, action) => {
      const barcode = action.payload;
      state.cart = state.cart.filter((i) => i.variantBarcode !== barcode);
    },
    clearCart: (state) => {
      state.cart = [];
      state.selectedCustomer = null;
      state.billDiscountValue = 0;
      state.paymentsSplit = [];
    },
    setSelectedCustomer: (state, action) => {
      state.selectedCustomer = action.payload;
    },
    setBillDiscount: (state, action) => {
      const { type, value } = action.payload;
      state.billDiscountType = type;
      state.billDiscountValue = Math.max(0, Number(value || 0));
    },
    setIsGstBill: (state, action) => {
      state.isGstBill = action.payload;
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    setPaymentsSplit: (state, action) => {
      state.paymentsSplit = action.payload;
    },
    holdCurrentBill: (state, action) => {
      if (state.cart.length === 0) return;
      const note = action.payload || `Held at ${new Date().toLocaleTimeString()}`;
      state.heldBills.push({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        customer: state.selectedCustomer,
        cart: [...state.cart],
        billDiscountType: state.billDiscountType,
        billDiscountValue: state.billDiscountValue,
        isGstBill: state.isGstBill,
        note
      });
      state.cart = [];
      state.selectedCustomer = null;
      state.billDiscountValue = 0;
    },
    resumeHeldBill: (state, action) => {
      const heldId = action.payload;
      const bill = state.heldBills.find((b) => b.id === heldId);
      if (bill) {
        state.cart = bill.cart;
        state.selectedCustomer = bill.customer;
        state.billDiscountType = bill.billDiscountType;
        state.billDiscountValue = bill.billDiscountValue;
        if (bill.isGstBill !== undefined) state.isGstBill = bill.isGstBill;
        state.heldBills = state.heldBills.filter((b) => b.id !== heldId);
      }
    },
    deleteHeldBill: (state, action) => {
      const heldId = action.payload;
      state.heldBills = state.heldBills.filter((b) => b.id !== heldId);
    },
    setLastCompletedSale: (state, action) => {
      state.lastCompletedSale = action.payload;
    }
  }
});

export const {
  addToCart,
  updateCartItemQty,
  updateCartItemUnitPrice,
  updateCartItemDiscount,
  removeFromCart,
  clearCart,
  setSelectedCustomer,
  setBillDiscount,
  setIsGstBill,
  setPaymentMethod,
  setPaymentsSplit,
  holdCurrentBill,
  resumeHeldBill,
  deleteHeldBill,
  setLastCompletedSale
} = posSlice.actions;

export default posSlice.reducer;

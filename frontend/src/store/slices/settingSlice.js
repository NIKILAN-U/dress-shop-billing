import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSettings } from '../../services/settingService';

export const fetchSettings = createAsyncThunk('settings/fetchSettings', async () => {
  const data = await getSettings();
  return data.settings;
});

const settingSlice = createSlice({
  name: 'settings',
  initialState: {
    settings: {
      shopName: 'ELEGANCE DRESS SHOP',
      tagline: 'Fashion & Trends',
      address: 'Main Road, Shop Town',
      phone: '9876543210',
      email: 'contact@dressshop.com',
      gstNumber: '33AAAAA0000A1Z5',
      invoicePrefix: 'INV-2026-',
      currencySymbol: '₹',
      enableGst: true,
      defaultGstRate: 5,
      receiptWidth: '80mm',
      lowStockThreshold: 5,
      maxCashierDiscountPercent: 10
    },
    loading: false
  },
  reducers: {
    setSettings: (state, action) => {
      state.settings = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state) => {
        state.loading = false;
      });
  }
});

export const { setSettings } = settingSlice.actions;
export default settingSlice.reducer;

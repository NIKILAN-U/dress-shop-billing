import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import posReducer from './slices/posSlice';
import settingReducer from './slices/settingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pos: posReducer,
    settings: settingReducer
  }
});

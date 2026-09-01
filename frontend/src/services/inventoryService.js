import api from './api';

export const getStockSummary = async () => {
  const response = await api.get('/inventory/summary');
  return response.data;
};

export const getStockTransactions = async (params) => {
  const response = await api.get('/inventory/transactions', { params });
  return response.data;
};

export const adjustStock = async (adjustmentData) => {
  const response = await api.post('/inventory/adjust', adjustmentData);
  return response.data;
};

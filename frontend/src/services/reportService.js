import api from './api';

export const getDashboardStats = async () => {
  const response = await api.get('/reports/dashboard');
  return response.data;
};

export const getSalesReport = async (params) => {
  const response = await api.get('/reports/sales', { params });
  return response.data;
};

export const getProfitReport = async (params) => {
  const response = await api.get('/reports/profit', { params });
  return response.data;
};

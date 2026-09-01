import api from './api';

export const getSales = async (params) => {
  const response = await api.get('/sales', { params });
  return response.data;
};

export const getSaleById = async (id) => {
  const response = await api.get(`/sales/${id}`);
  return response.data;
};

export const createSale = async (saleData) => {
  const response = await api.post('/sales', saleData);
  return response.data;
};

export const cancelSale = async (id) => {
  const response = await api.put(`/sales/${id}/cancel`);
  return response.data;
};

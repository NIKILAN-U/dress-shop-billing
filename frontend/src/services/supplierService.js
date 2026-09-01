import api from './api';

export const getSuppliers = async () => {
  const response = await api.get('/suppliers');
  return response.data;
};

export const createSupplier = async (data) => {
  const response = await api.post('/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id, data) => {
  const response = await api.put(`/suppliers/${id}`, data);
  return response.data;
};

export const getSupplierHistory = async (id) => {
  const response = await api.get(`/suppliers/${id}/history`);
  return response.data;
};

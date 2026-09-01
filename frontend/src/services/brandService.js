import api from './api';

export const getBrands = async () => {
  const response = await api.get('/brands');
  return response.data;
};

export const createBrand = async (data) => {
  const response = await api.post('/brands', data);
  return response.data;
};

export const updateBrand = async (id, data) => {
  const response = await api.put(`/brands/${id}`, data);
  return response.data;
};

export const deleteBrand = async (id) => {
  const response = await api.delete(`/brands/${id}`);
  return response.data;
};

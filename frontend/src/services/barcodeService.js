import axios from 'axios';

const API_URL = '/api/barcodes';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const getBarcodeCatalog = async (params = {}) => {
  const response = await axios.get(`${API_URL}/catalog`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const generateVariantBarcode = async (data) => {
  const response = await axios.post(`${API_URL}/generate`, data, getAuthHeaders());
  return response.data;
};

export const bulkGenerateBarcodes = async () => {
  const response = await axios.post(`${API_URL}/bulk-generate`, {}, getAuthHeaders());
  return response.data;
};

export const logBarcodePrint = async (logData) => {
  const response = await axios.post(`${API_URL}/log-print`, logData, getAuthHeaders());
  return response.data;
};

export const getBarcodePrintLogs = async () => {
  const response = await axios.get(`${API_URL}/print-history`, getAuthHeaders());
  return response.data;
};

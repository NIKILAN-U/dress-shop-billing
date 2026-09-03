import axios from 'axios';

const API_URL = '/api/staff';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const getStaffMembers = async (params = {}) => {
  const response = await axios.get(API_URL, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const createStaffMember = async (staffData) => {
  const response = await axios.post(API_URL, staffData, getAuthHeaders());
  return response.data;
};

export const updateStaffMember = async (id, staffData) => {
  const response = await axios.put(`${API_URL}/${id}`, staffData, getAuthHeaders());
  return response.data;
};

export const getCommissionSummary = async (params = {}) => {
  const response = await axios.get(`${API_URL}/commission-summary`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const recordCommissionPayment = async (paymentData) => {
  const response = await axios.post(`${API_URL}/payments`, paymentData, getAuthHeaders());
  return response.data;
};

export const getPaymentHistory = async (params = {}) => {
  const response = await axios.get(`${API_URL}/payments`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

export const getItemizedCommissionLedger = async (params = {}) => {
  const response = await axios.get(`${API_URL}/commission-items`, {
    ...getAuthHeaders(),
    params
  });
  return response.data;
};

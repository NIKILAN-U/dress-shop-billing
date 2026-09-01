import api from './api';

export const getBackups = async () => {
  const response = await api.get('/backups');
  return response.data;
};

export const createBackup = async () => {
  const response = await api.post('/backups/create');
  return response.data;
};

export const restoreBackup = async (filename) => {
  const response = await api.post('/backups/restore', { filename });
  return response.data;
};

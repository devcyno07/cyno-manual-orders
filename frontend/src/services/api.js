import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${BASE}`,
  timeout: 15000,
});

export const fetchProducts = async () => {
  const { data } = await api.get('/products');
  return data.data || [];
};

export const fetchBankDetails = async () => {
  const { data } = await api.get('/bank-details');
  return data.data || {}; 
}; 

export const submitOrder = async (formData) => {
  const { data } = await api.post('/orders', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

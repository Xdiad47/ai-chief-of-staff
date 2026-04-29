import api from './api';
import { auth } from '../lib/firebase';

export const authService = {
  verifyToken: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const id_token = await user.getIdToken(true);
    const res = await api.post('/api/auth/verify', { id_token });
    return res.data;
  },

  registerCompany: async (data: { name: string; domain: string; admin_email: string }) => {
    const res = await api.post('/api/auth/register-company', data);
    return res.data;
  }
};

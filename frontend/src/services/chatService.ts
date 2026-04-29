import api from './api';

export const chatService = {
  sendMessage: async (data: { message: string; company_id: string; employee_id: string; conversation_history: Record<string, unknown>[] }) => {
    const res = await api.post('/api/chat', data);
    return res.data;
  }
};

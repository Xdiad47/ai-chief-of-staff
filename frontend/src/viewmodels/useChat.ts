import { useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatMessage } from '../types';
import { useAuth } from '../lib/auth-context';
import toast from 'react-hot-toast';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const sendMessage = async (content: string) => {
    console.log("Sending message:", content);
    if (!content.trim() || !user?.companyId || !user?.employeeId) {
      console.error("Cannot send message. Missing data:", { 
        content: !!content.trim(), 
        companyId: user?.companyId, 
        employeeId: user?.employeeId 
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await chatService.sendMessage({
        message: content,
        company_id: user.companyId,
        employee_id: user.employeeId,
        conversation_history: conversationHistory
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(res.timestamp || Date.now())
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return { messages, setMessages, loading, sendMessage };
};

import { useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';
import { LeaveRecord } from '../types';
import { useAuth } from '../lib/auth-context';
import toast from 'react-hot-toast';

export const useLeave = () => {
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.companyId && user?.employeeId) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getLeaveHistory(user!.companyId, user!.employeeId);
      setLeaveHistory(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  return { leaveHistory, loading, refresh: fetchHistory };
};

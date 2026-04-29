import { useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';
import { Employee, LeaveBalance } from '../types';
import { useAuth } from '../lib/auth-context';
import toast from 'react-hot-toast';

export const useEmployee = () => {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.companyId && user?.employeeId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileData, leaveData, pointsData] = await Promise.all([
        employeeService.getProfile(user!.companyId, user!.employeeId),
        employeeService.getLeaveBalance(user!.companyId, user!.employeeId),
        employeeService.getPoints(user!.companyId, user!.employeeId),
      ]);
      setProfile(profileData);
      setLeaveBalance(leaveData);
      setPoints(pointsData.performance_points);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  return { profile, leaveBalance, points, loading, refresh: fetchData };
};

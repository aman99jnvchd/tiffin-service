import { useAuthStore } from '../store/useAuthStore';
import { AdminDashboard } from '../components/AdminDashboard';
import { VendorDashboard } from '../components/VendorDashboard';
import { CustomerDashboard } from '../components/CustomerDashboard';

export const HomePage = () => {
  const { role } = useAuthStore();

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'vendor') return <VendorDashboard />;
  return <CustomerDashboard />; // default: customer + guests
};

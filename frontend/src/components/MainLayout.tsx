import { Topbar } from './Topbar';
import { FloatingMenu } from './FloatingMenu';
import { useLocation } from 'react-router-dom';
import '../styles/MainLayout.css';
import { useAuthStore } from '../store/useAuthStore';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { role } = useAuthStore();
  const isCustomer = role === 'customer';

  // Map path to Titles
  const getTitle = (path: string) => {
    if (path === '/admin/cities') return 'City Management';
    if (path === '/admin/roles') return 'Roles & Permissions';
    if (path === '/admin/users') return 'User Management';
    if (path.startsWith('/admin/users/') && path.endsWith('/meals')) return 'Vendor Meals';
    if (path.startsWith('/admin/users/')) return 'User Details';
    if (path === '/admin/menu') return 'Menu Management';
    if (path === '/profile') return 'Profile';
    if (path === '/checkout') return 'Checkout';
    if (path === '/my-deliveries') return 'Deliveries';
    if (path === '/subscriptions') return 'Subscriptions';
    if (path === '/wallet') return 'Tiffini Wallet';
    if (path === '/history') return 'Delivery History';
    return 'Dashboard';
  };

  const shouldShowTopbar = () => {
    const path = location.pathname;
    const hideOnPaths = [
      '/', 
      '/checkout', 
      '/my-deliveries', 
      '/subscriptions', 
      '/wallet', 
      '/history'
    ];
    
    if (hideOnPaths.includes(path)) return false;
    if (path.startsWith('/kitchen/')) return false;
    if (path === '/profile' && role === 'customer') return false;
    
    return true;
  };

  return (
    <div className="app-shell">
      <FloatingMenu />
      <div className="main-content-wrapper">
        {shouldShowTopbar() && <Topbar title={getTitle(location.pathname)} />}
        <main className={`page-content ${isCustomer || location.pathname === '/' || location.pathname.startsWith('/kitchen/') || location.pathname === '/checkout' ? 'customer-page-content' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

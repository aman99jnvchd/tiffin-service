import { Topbar } from './Topbar';
import { FloatingMenu } from './FloatingMenu';
import { useLocation } from 'react-router-dom';
import '../styles/MainLayout.css';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Map path to Titles
  const getTitle = (path: string) => {
    if (path === '/admin/cities') return 'City Management';
    if (path === '/admin/roles') return 'Roles & Permissions';
    if (path === '/admin/users') return 'User Management';
    if (path.startsWith('/admin/users/') && path.endsWith('/meals')) return 'Vendor Meals';
    if (path.startsWith('/admin/users/')) return 'User Details';
    if (path === '/admin/menu') return 'Menu Management';
    if (path === '/profile') return 'My Profile';
    return 'Dashboard';
  };

  return (
    <div className="app-shell">
      <FloatingMenu />
      <div className="main-content-wrapper">
        <Topbar title={getTitle(location.pathname)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

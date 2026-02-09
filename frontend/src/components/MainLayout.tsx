import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useLocation } from 'react-router-dom';
import '../styles/MainLayout.css';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Map path to Titles
  const getTitle = (path: string) => {
    if (path === '/admin/cities') return 'City Management';
    if (path === '/admin/roles') return 'Roles & Permissions';
    return 'Dashboard';
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content-wrapper">
        <Topbar title={getTitle(location.pathname)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

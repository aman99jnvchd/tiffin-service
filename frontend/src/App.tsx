import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { CityManager } from './pages/CityManager';
import { RoleManager } from './pages/RoleManager';
import { UserManager } from './pages/UserManager';
import { UserView } from './pages/UserView';
import { MenuPage } from './pages/MenuPage';
import { ProfilePage } from './pages/ProfilePage';
import { Background } from './components/Background';
import { useAuthStore } from './store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Toast } from './components/Toast'; 
import { MainLayout } from './components/MainLayout'; // Import your new Layout

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  const token = useAuthStore((state) => state.token);
  const permissions = useAuthStore((state) => state.permissions);

  const hasPermission = (slug: string) => {
    if (!token) return false;
    if (permissions.length === 0) return false;
    return permissions.includes(slug);
  };

  const canViewCities = hasPermission('city:view');
  const canViewRoles = hasPermission('role:view');
  const canViewUsers = hasPermission('user:view');
  
  const content = (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Dashboard - No login required */}
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        
        <Route path="/login" element={
          <GuestRoute>
            <PageWrapper><LoginPage /></PageWrapper>
          </GuestRoute>
        } />

        <Route path="/register" element={
          <GuestRoute>
            <PageWrapper><RegisterPage /></PageWrapper>
          </GuestRoute>
        } />

        <Route path="/profile" element={
          token ? <PageWrapper><ProfilePage /></PageWrapper> : <Navigate to="/login" replace />
        } />

        {/* Protected Routes - Only show if user has permission */}
        {canViewCities && (
          <Route path="/admin/cities" element={
            <PageWrapper><CityManager /></PageWrapper>
          } />
        )}
        
        {canViewRoles && (
          <Route path="/admin/roles" element={
            <PageWrapper><RoleManager /></PageWrapper>
          } />
        )}

        {canViewUsers && (
          <>
            <Route path="/admin/users" element={
              <PageWrapper><UserManager /></PageWrapper>
            } />
            <Route path="/admin/users/:userId" element={
              <PageWrapper><UserView /></PageWrapper>
            } />
            <Route path="/admin/users/:userId/meals" element={
              <PageWrapper><MenuPage /></PageWrapper>
            } />
          </>
        )}

        {/* Standalone menu page removed — meals accessed via vendor user page */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );

  // Wrap with MainLayout only if NOT on login/register pages
  return !isAuthPage ? <MainLayout>{content}</MainLayout> : content;
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.3 }}
    className="auth-container"
  >
    {children}
  </motion.div>
);

function App() {
  useEffect(() => {
    const handlePersist = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePersist);
    return () => window.removeEventListener('pageshow', handlePersist);
  }, []);

  return (
    <div className="app-container">
      <Background /> 
      <Toast /> 
      <Router>
        <AnimatedRoutes />
      </Router>
    </div>
  );
}

export default App;
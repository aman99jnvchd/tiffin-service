import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { CityManager } from './pages/CityManager';
import { RoleManager } from './pages/RoleManager';
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
  
  const content = (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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

        <Route path="/admin/cities" element={
          <PageWrapper><CityManager /></PageWrapper>
        } />
        
        <Route path="/admin/roles" element={
          <PageWrapper><RoleManager /></PageWrapper>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );

  // Wrap with MainLayout if it's NOT a login/register page
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
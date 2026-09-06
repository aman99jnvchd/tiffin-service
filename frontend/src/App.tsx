import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { CityManager } from './pages/CityManager';
import { RoleManager } from './pages/RoleManager';
import { UserManager } from './pages/UserManager';
import { UserView } from './pages/UserView';
import { MenuPage } from './pages/MenuPage';
import { ProfilePage } from './pages/ProfilePage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { MyDeliveries } from './pages/MyDeliveries';
import { SubscriptionHub } from './pages/SubscriptionHub';
import { WalletDashboard } from './pages/WalletDashboard';
import { DeliveryHistoryList } from './pages/DeliveryHistoryList';
import { VendorKitchenPage } from './pages/VendorKitchenPage';
import { VendorOnboardingWizard } from './pages/VendorOnboardingWizard';
import { Background } from './components/Background';
import { useAuthStore } from './store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect } from 'react';
import { Toast } from './components/Toast';
import { MainLayout } from './components/MainLayout'; // Import your new Layout
import { CheckoutPage } from './pages/CheckoutPage';

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ['/login', '/register', '/vendor-onboarding'].includes(location.pathname);

  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const isOnboardingComplete = useAuthStore((state) => state.isOnboardingComplete);
  const permissions = useAuthStore((state) => state.permissions);

  // Jump to top IMMEDIATELY as soon as the route changes (as soon as the page "loads")
  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Some of these wrappers might be the actual scroll container depending on CSS
    document.querySelectorAll('.app-shell, .main-content-wrapper, .page-content, .auth-container, #root').forEach(el => {
      if (el) el.scrollTop = 0;
    });
  }, [location.pathname]);

  useEffect(() => {
    if (token && role === 'vendor' && !isOnboardingComplete && location.pathname !== '/vendor-onboarding') {
      navigate('/vendor-onboarding', { replace: true });
    }
  }, [token, role, isOnboardingComplete, location.pathname, navigate]);

  const hasPermission = (slug: string) => {
    if (!token) return false;
    if (permissions.length === 0) return false;
    return permissions.includes(slug);
  };

  const canViewCities = hasPermission('city:view');
  const canViewRoles = hasPermission('role:view');
  const canViewUsers = hasPermission('user:view');
  const canViewMeals = hasPermission('meal:view');

  const content = (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Dashboard - No login required */}
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />

        {/* Vendor Kitchen Page - Public */}
        <Route path="/kitchen/:id" element={<PageWrapper><VendorKitchenPage /></PageWrapper>} />

        <Route path="/vendor-onboarding" element={
          token && role === 'vendor' && !isOnboardingComplete ? <PageWrapper style={{ overflowX: 'hidden' }}><VendorOnboardingWizard /></PageWrapper> : <Navigate to="/" replace />
        } />

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

        <Route path="/checkout" element={
          <PageWrapper><CheckoutPage /></PageWrapper>
        } />

        <Route path="/orders" element={<Navigate to="/my-deliveries" replace />} />

        <Route path="/my-deliveries" element={
          token ? <PageWrapper><MyDeliveries /></PageWrapper> : <Navigate to="/login" replace />
        } />

        <Route path="/subscriptions" element={
          token ? <PageWrapper><SubscriptionHub /></PageWrapper> : <Navigate to="/login" replace />
        } />

        <Route path="/wallet" element={
          token ? <PageWrapper><WalletDashboard /></PageWrapper> : <Navigate to="/login" replace />
        } />

        <Route path="/history" element={
          token ? <PageWrapper><DeliveryHistoryList /></PageWrapper> : <Navigate to="/login" replace />
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

        {/* Standalone menu page for vendors */}
        {canViewMeals && (
          <Route path="/admin/menu" element={
            <PageWrapper><MenuPage /></PageWrapper>
          } />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );

  // Wrap with MainLayout only if NOT on login/register pages
  return !isAuthPage ? <MainLayout>{content}</MainLayout> : content;
};

const PageWrapper = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="auth-container"
      style={style}
    >
      {children}
    </motion.div>
  );
};


function App() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

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
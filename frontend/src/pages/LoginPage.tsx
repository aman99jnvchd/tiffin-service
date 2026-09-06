import { useEffect, useState } from 'react';
import { GlassInput } from '../components/GlassInput';
import { useAuthStore } from '../store/useAuthStore';
import { loginUser, getMyPermissions } from '../api/axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToastStore } from '../store/useToastStore';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setPermissions = useAuthStore((state) => state.setPermissions);
  const showToast = useToastStore((state) => state.showToast);

  // Form State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passError, setPassError] = useState('');

  // 1. Persistent Security State (Load from localStorage)
  const [attempts, setAttempts] = useState(() => 
    Number(localStorage.getItem('login_attempts')) || 0
  );
  const [lockoutEnd, setLockoutEnd] = useState(() => 
    Number(localStorage.getItem('lockout_end')) || 0
  );
  const [countdown, setCountdown] = useState(0);

  // Synchronize attempts with localStorage
  useEffect(() => {
    localStorage.setItem('login_attempts', attempts.toString());
  }, [attempts]);

  // Handle Countdown Logic
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (lockoutEnd > now) {
        setCountdown(Math.ceil((lockoutEnd - now) / 1000));
      } else {
        setCountdown(0);
        if (lockoutEnd !== 0) {
          setLockoutEnd(0);
          setAttempts(0);
          localStorage.removeItem('lockout_end');
          localStorage.setItem('login_attempts', '0');
        }
      }
    };

    checkLockout();
    const timer = setInterval(checkLockout, 1000);
    return () => clearInterval(timer);
  }, [lockoutEnd]);

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Stop further attempts if locked out
    if (countdown > 0) {
      showToast(`Please wait a moment to try again`, "error");
      return;
    }
    
    // Reset errors
    setPhoneError('');
    setPassError('');
    let hasError = false;

    // Phone Number validation
    if (phone.trim() === '' || phone.length !== 10) {
      setPhoneError(phone.trim() === '' ? 'Phone Number is required' : 'Please enter 10 digits valid Phone Number');
      hasError = true;
    }
    // Password validation
    if (password.trim() === '') {
      setPassError('Password is required');
      hasError = true;
    } else if (password.trim().length > 20) {
      setPassError('Password must be at most 20 characters');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const res = await loginUser({ phone, password });

      // Clear attempts related localStorage
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('lockout_end');
      
      const token = res.data.data.access_token;
      const roleSlug = res.data.data.user_role;
      const isOnboardingComplete = res.data.data.is_onboarding_complete;

      setAuth(token, roleSlug, isOnboardingComplete, res.data.data.dietary_preference, res.data.data.include_eggs);

      // Fetch user permissions from backend
      try {
        const permsRes = await getMyPermissions();
        const permissions = permsRes.data.data?.permissions || [];
        setPermissions(permissions);
      } catch {
        // Fallback: if permissions cannot be loaded, set empty array
        setPermissions([]);
      }
      
      showToast("Login successful", "success");
      const locationState = location.state as { from?: string } | null;
      const from = locationState?.from || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        // Timer 60s
        const end = Date.now() + 60000;
        setLockoutEnd(end);
        localStorage.setItem('lockout_end', end.toString());
        showToast("Maximum attempts reached", "error");
      } else {
        const errorMsg = err.response?.data?.detail || err.response?.data?.message || "Login Failed";
        showToast(errorMsg, "error");
        // Don't count blocked/disabled role as a failed attempt
        if (err.response?.status === 403) {
          setAttempts(attempts); // revert increment
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2>Welcome Back</h2>

      <form onSubmit={handleLogin} noValidate>
        {/* Phone Number Input */}
        <GlassInput 
          label="Phone Number" 
          type="text"
          value={phone} 
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          errorMessage={phoneError}
        />

        {/* Password Input */}
        <GlassInput 
          label="Password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          errorMessage={passError}
          maxLength={20}
        />

        {/* Login Button */}
        <button 
          type="submit" 
          className={`glass-button ${loading || countdown > 0 ? 'loading-state' : ''}`} 
          disabled={loading || countdown > 0}
        >
          {loading ? (
            <span className="spinner"></span>
          ) : countdown > 0 ? (
            `Locked (${countdown}s)`
          ) : (
            "Login"
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>Don't have an account? <Link to="/register" className="auth-link">Register</Link></p>
      </div>
    </div>
  );
};

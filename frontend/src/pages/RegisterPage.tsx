import React, { useState, useEffect } from 'react';
import { getCities, registerUser, getMyPermissions } from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { GlassInput } from '../components/GlassInput';
import { GlassSelect } from '../components/GlassSelect'; // Imported your new component
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { useToastStore } from '../store/useToastStore';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth); 
  const setPermissions = useAuthStore((state) => state.setPermissions);
  const showToast = useToastStore((state) => state.showToast);

  const [cities, setCities] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role_id: 2,
    city_id: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    city: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await getCities();
        const citiesList = res.data.data;
        setCities(citiesList);

        // Auto-select Chandigarh by default
        const chandigarh = citiesList.find((c: any) => 
          c.name.toLowerCase() === 'chandigarh' || c.alias?.toLowerCase() === 'chandigarh'
        );
        
        if (chandigarh) {
          setFormData(prev => ({ ...prev, city_id: String(chandigarh.id) }));
        }
      } catch (err) {
        console.error("Failed to load cities");
      }
    };
    fetchCities();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({ name: '', phone: '', city: '', password: '', confirmPassword: '' });

    let hasError = false;
    const newErrors = { name: '', phone: '', city: '', password: '', confirmPassword: '' };

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required';
      hasError = true;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Full Name must be at least 2 characters';
      hasError = true;
    } else if (formData.name.trim().length > 40) {
      newErrors.name = 'Full Name must be at most 40 characters';
      hasError = true;
    }

    // Phone Number validation
    if (formData.phone.length !== 10) {
      newErrors.phone = formData.phone.length === 0 ? 'Phone Number is required' : 'Please enter 10 digits valid Phone Number';
      hasError = true;
    }

    // City validation
    if (!formData.city_id) {
      newErrors.city = 'Location (City) is required';
      hasError = true;
    }

    // Password validation
    if (formData.password.length < 6) {
      newErrors.password = 'Min 6 characters required';
      hasError = true;
    } else if (formData.password.trim().length > 20) {
      newErrors.password = 'Password must be at most 20 characters';
      hasError = true;
    }

    // Confirm Password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm Password is required';
      hasError = true;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const res = await registerUser(submitData);
      const authData = res.data.data;

      if (authData && authData.access_token) {
        showToast('Successfully Registered', 'success');
        setAuth(authData.access_token, authData.user_role);

        // Fetch user permissions from backend
        try {
          const permsRes = await getMyPermissions();
          const permissions = permsRes.data.data?.permissions || [];
          setPermissions(permissions);
        } catch {
          setPermissions([]);
        }
        
        navigate('/', { replace: true });
      } else {
        showToast('Account created! Please login', 'success');
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Registration Failed";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2>Create Your Account</h2>

      <form onSubmit={handleRegister} noValidate>
        {/* Role Toggle - Customer/Vendor */}
        <div className="role-toggle-container">
          <motion.div
            className="role-slider-blob"
            initial={false}
            animate={{
              left: formData.role_id === 2 ? '4px' : '51%',
              width: 'calc(50% - 8px)',
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 1
            }}
          />

          <button 
            type="button"
            className={`role-btn ${formData.role_id === 2 ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role_id: 2})}
          >
            Customer
          </button>
          <button 
            type="button"
            className={`role-btn ${formData.role_id === 3 ? 'active' : ''}`}
            onClick={() => setFormData({...formData, role_id: 3})}
          >
            Vendor
          </button>
        </div>

        {/* Full Name Input */}
        <GlassInput 
          label="Full Name" 
          type="text"
          value={formData.name} 
          onChange={(e) => setFormData({...formData, name: e.target.value})} 
          errorMessage={errors.name}
          maxLength={40}
        />

        {/* Phone Number Input */}
        <GlassInput 
          label="Phone Number" 
          type="text"
          value={formData.phone} 
          onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
          errorMessage={errors.phone}
          maxLength={10}
        />

        {/* Location (City) Select */}
        <GlassSelect 
          label="Location (City)"
          options={cities}
          value={formData.city_id}
          onChange={(val: string) => setFormData({...formData, city_id: val})}
          errorMessage={errors.city}
        />

        {/* Password Input */}
        <GlassInput 
          label="Password" 
          type="password"
          value={formData.password} 
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
          errorMessage={errors.password}
          maxLength={20}
        />

        {/* Confirm Password Input */}
        <GlassInput 
          label="Confirm Password" 
          type="password"
          value={formData.confirmPassword} 
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
          errorMessage={errors.confirmPassword}
          maxLength={20}
        />

        {/* Register Button */}
        <button 
          type="submit" 
          className={`glass-button ${loading ? 'loading-state' : ''}`} 
          disabled={loading}
        >
          {loading ? <span className="spinner"></span> : "Create Account"}
        </button>
      </form>
      
      {/* Login Link */}
      <div className="auth-footer">
        <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
      </div>
    </div>
  );
};

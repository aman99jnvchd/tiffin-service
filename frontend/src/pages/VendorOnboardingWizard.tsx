import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, X, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassInput } from '../components/GlassInput';
import { GlassSelect } from '../components/GlassSelect';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { getMyProfile, updateVendorOnboardingStep, uploadHousePhoto } from '../api/axios';
import '../styles/VendorOnboarding.css';

// Step components
const Step1 = ({ formData, setFormData, onNext }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="onboarding-step"
    >
      <h3>Step 1: Kitchen Basics</h3>
      <p>Let's start with the basics of your kitchen.</p>

      <GlassInput
        label="Kitchen Name"
        value={formData.kitchen_name}
        onChange={(e) => setFormData({ ...formData, kitchen_name: e.target.value })}
      />

      <div className="radio-group-container">
        <label>Dietary Type</label>
        <div className="radio-group">
          {['Pure Veg', 'Non-Veg', 'Both'].map((type) => (
            <label key={type} className={`radio-label ${formData.dietary_type === type ? 'selected' : ''}`}>
              <input
                type="radio"
                name="dietary_type"
                value={type}
                checked={formData.dietary_type === type}
                onChange={(e) => setFormData({ ...formData, dietary_type: e.target.value })}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div className="checkbox-group-container">
        <label>Service Types</label>
        <div className="checkbox-group">
          {['Breakfast', 'Lunch', 'Dinner'].map((type) => {
            const isSelected = formData.service_types.includes(type);
            return (
              <label key={type} className={`checkbox-label ${isSelected ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...formData.service_types, type]
                      : formData.service_types.filter((t: string) => t !== type);
                    setFormData({ ...formData, service_types: newTypes });
                  }}
                />
                {type}
              </label>
            );
          })}
        </div>
      </div>

      <button className="glass-button primary" onClick={onNext}>Continue</button>
    </motion.div>
  );
};

const Step2 = ({ formData, setFormData, onNext, onBack }: any) => {
  const addTimeSlot = (service: string, startVal: string, endVal: string) => {
    if (!startVal || !endVal) return;
    
    const formatTime = (timeValue: string) => {
      const [hourStr, minStr] = timeValue.split(':');
      let h = parseInt(hourStr);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${minStr} ${ampm}`;
    };

    const formattedStart = formatTime(startVal);
    const formattedEnd = formatTime(endVal);

    const currentSlots = Array.isArray(formData.delivery_windows[service])
      ? formData.delivery_windows[service]
      : [];

    setFormData({
      ...formData,
      delivery_windows: {
        ...formData.delivery_windows,
        [service]: [...currentSlots, { start_time: formattedStart, end_time: formattedEnd }]
      }
    });
  };

  const removeTimeSlot = (service: string, indexToRemove: number) => {
    const currentSlots = Array.isArray(formData.delivery_windows[service])
      ? formData.delivery_windows[service]
      : [];
    setFormData({
      ...formData,
      delivery_windows: {
        ...formData.delivery_windows,
        [service]: currentSlots.filter((_: any, idx: number) => idx !== indexToRemove)
      }
    });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>, service: string) => {
    const startVal = e.target.value;
    if (!startVal) return;
    
    // Auto calculate end time (+30 mins)
    const [h, m] = startVal.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + 30, 0, 0);
    
    const endH = date.getHours().toString().padStart(2, '0');
    const endM = date.getMinutes().toString().padStart(2, '0');
    
    const endInput = document.getElementById(`time-end-${service}`) as HTMLInputElement;
    if (endInput) {
      endInput.value = `${endH}:${endM}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="onboarding-step"
    >
      <h3>Step 2: Time Slots & Logistics</h3>
      <p>Set your schedule and capacity.</p>

      {/* Dynamic Delivery Windows based on selected service types */}
      {formData.service_types.length === 0 && (
        <p className="warning-text">Please go back and select at least one Service Type.</p>
      )}

      {formData.service_types.map((service: string) => (
        <div key={service} className="service-time-slot">
          <h4>{service} Delivery Windows</h4>

          <div className="time-slot-input-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <input 
              type="time" 
              id={`time-start-${service}`} 
              className="glass-input" 
              onChange={(e) => handleStartTimeChange(e, service)}
              title="Start Time"
            />
            <span>to</span>
            <input 
              type="time" 
              id={`time-end-${service}`} 
              className="glass-input" 
              title="End Time"
            />
            <button className="glass-button secondary small-btn add-time-btn" onClick={() => {
              const startInput = document.getElementById(`time-start-${service}`) as HTMLInputElement;
              const endInput = document.getElementById(`time-end-${service}`) as HTMLInputElement;
              if (startInput && endInput) {
                addTimeSlot(service, startInput.value, endInput.value);
                startInput.value = '';
                endInput.value = '';
              }
            }}>
              <Plus size={16} /> <span className="add-time-text">Add</span>
            </button>
          </div>

          <div className="time-slot-badges">
            {(Array.isArray(formData.delivery_windows[service]) ? formData.delivery_windows[service] : []).map((slot: any, idx: number) => (
              <span key={idx} className="time-badge">
                <Clock size={12} /> {slot.start_time || slot} {slot.end_time ? `- ${slot.end_time}` : ''}
                <button onClick={() => removeTimeSlot(service, idx)}><X size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      ))}

      <div className="logistics-badge">
        <span className="logistics-label">Order Cut-off</span>
        <div className="logistics-input-wrapper">
          <input
            type="number"
            min="1"
            className="logistics-number-input"
            value={formData.order_cutoff_hours}
            onChange={(e) => setFormData({ ...formData, order_cutoff_hours: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <span className="logistics-suffix">hrs before</span>
        </div>
      </div>

      <div className="logistics-badge">
        <span className="logistics-label">Max Capacity Per Slot</span>
        <div className="logistics-input-wrapper">
          <input
            type="number"
            min="1"
            className="logistics-number-input"
            value={formData.max_capacity_per_slot}
            onChange={(e) => setFormData({ ...formData, max_capacity_per_slot: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <span className="logistics-suffix">meals</span>
        </div>
      </div>

      <div className="button-row">
        <button className="glass-button secondary" onClick={onBack}>Back</button>
        <button className="glass-button primary" onClick={onNext}>Continue</button>
      </div>
    </motion.div>
  );
};

const Step3 = ({ formData, setFormData, onNext, onBack }: any) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToastStore((s) => s.showToast);
  const [addressFocused, setAddressFocused] = useState(false);
  const API_ORIGIN = 'http://localhost:1415';

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadHousePhoto(file);
      const url = res.data.data.url;
      setFormData({ ...formData, house_photo_url: url });
      showToast('Photo uploaded successfully', 'success');
    } catch (err) {
      showToast('Failed to upload photo', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="onboarding-step"
    >

      <div className="address-form-container">
        {/* Top: Image Upload box */}
        <div className="address-image-upload">
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <div className="image-upload-box dashed" onClick={() => photoInputRef.current?.click()}>
            {formData.house_photo_url ? (
              <img src={`${API_ORIGIN}${formData.house_photo_url}`} alt="shop" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
            ) : (
              <span className="upload-icon-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <ImagePlus size={24} />
                Shop Image
              </span>
            )}
          </div>
        </div>

        {/* Row 1: City Dropdown (disabled), Shop No */}
        <div className="address-row split">
          <div className="address-field locked-field" style={{ flex: 1 }}>
            <div className="input-container">
              <input type="text" className="glass-input input-disabled" value={formData.city_name || 'City'} disabled placeholder=" " />
              <label className="floating-label active">City</label>
              <span className="dropdown-arrow" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>▼</span>
            </div>
          </div>
          <div className="address-field" style={{ flex: 1 }}>
            <GlassInput
              label="Shop No."
              value={formData.house_no}
              onChange={(e) => setFormData({ ...formData, house_no: e.target.value })}
            />
          </div>
        </div>

        {/* Row 2: Full address */}
        <div className="address-field full-width">
          <div className="input-container">
            <textarea 
              className="glass-input"
              rows={3}
              value={formData.address_text}
              onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
              placeholder=" "
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
            <label className={`floating-label ${addressFocused || formData.address_text ? 'active' : ''}`}>Address</label>
          </div>
        </div>

        {/* Row 3: Pincode, Exact Location */}
        <div className="address-row split">
          <div className="address-field" style={{ flex: 1 }}>
            <GlassInput
              label="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            />
          </div>
          <div className="address-field" style={{ flex: 1 }}>
            <GlassInput
              label="Exact Location"
              value={formData.google_maps_url}
              onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
            />
          </div>
        </div>

        <div className="button-row actions-right">
          <button className="glass-button secondary" onClick={onBack}>Back</button>
          <button className="glass-button primary" onClick={onNext}>Add Address</button>
        </div>
      </div>
    </motion.div>
  );
};

const Step4 = ({ formData, setFormData, onFinish, onBack, loading }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="onboarding-step"
    >
      <h3>Step 4: Verification</h3>
      <p>Provide your FSSAI registration details.</p>

      <GlassInput
        label="Phone Number (Registered)"
        value={formData.phone}
        disabled={true}
        onChange={() => {}}
      />

      <GlassInput
        label="FSSAI Registration Number"
        value={formData.fssai_number}
        maxLength={14}
        onChange={(e) => setFormData({ ...formData, fssai_number: e.target.value.replace(/\D/g, '').slice(0, 14) })}
      />

      <div className="button-row">
        <button className="glass-button secondary" onClick={onBack} disabled={loading}>Back</button>
        <button className="glass-button primary" onClick={onFinish} disabled={loading}>
          {loading ? <span className="spinner small"></span> : "Complete Setup"}
        </button>
      </div>
    </motion.div>
  );
};

export const VendorOnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setAuth, token, role } = useAuthStore();
  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    kitchen_name: '',
    dietary_type: '',
    service_types: [] as string[],
    delivery_windows: {} as Record<string, any[]>,
    order_cutoff_hours: 2,
    max_capacity_per_slot: 20,
    address_text: '',
    house_no: '',
    google_maps_url: '',
    house_photo_url: '',
    pincode: '',
    city_id: '',
    city_name: '',
    phone: '',
    fssai_number: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        const data = res.data.data;
        const vendor = data.vendor_profile;

        if (vendor?.is_onboarding_complete) {
          navigate('/');
          return;
        }

        let parsedWindows: Record<string, string[]> = {};
        if (vendor?.delivery_windows) {
          try {
            const raw = JSON.parse(vendor.delivery_windows);
            for (const key in raw) {
              if (typeof raw[key] === 'string') {
                parsedWindows[key] = raw[key].split(',').map((s: string) => s.trim()).filter(Boolean);
              } else if (Array.isArray(raw[key])) {
                parsedWindows[key] = raw[key];
              }
            }
          } catch (e) { }
        }

        const address = data.addresses && data.addresses.length > 0 ? data.addresses[0] : null;

        setFormData(prev => ({
          ...prev,
          kitchen_name: vendor?.kitchen_name || data.name + "'s Kitchen",
          dietary_type: vendor?.dietary_type || '',
          service_types: vendor?.service_types ? vendor.service_types.split(',') : [],
          delivery_windows: parsedWindows,
          order_cutoff_hours: vendor?.order_cutoff_hours || 2,
          max_capacity_per_slot: vendor?.max_capacity_per_slot || 20,
          city_id: data.city?.id?.toString() || '',
          city_name: data.city?.name || '',
          phone: data.phone || '',
          fssai_number: vendor?.fssai_number || '',
          address_text: address?.address_text || prev.address_text,
          house_no: address?.house_no || prev.house_no,
          google_maps_url: address?.google_maps_url || prev.google_maps_url,
          house_photo_url: address?.house_photo_url || prev.house_photo_url,
          pincode: address?.pincode || prev.pincode
        }));

        if (vendor?.onboarding_step) {
          setCurrentStep(vendor.onboarding_step);
        }
      } catch (err) {
        showToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate, showToast]);

  const handleNext = async (step: number) => {
    setSaving(true);
    try {
      if (step === 1) {
        if (!formData.kitchen_name || !formData.dietary_type || formData.service_types.length === 0) {
          showToast("All fields shown here are required.", "error");
          setSaving(false); return;
        }
        await updateVendorOnboardingStep(1, {
          kitchen_name: formData.kitchen_name,
          dietary_type: formData.dietary_type,
          service_types: formData.service_types.join(',')
        });
      } else if (step === 2) {
        const missingDeliveryWindows = formData.service_types.some((s: string) => 
          !formData.delivery_windows[s] || formData.delivery_windows[s].length === 0
        );

        if (!formData.order_cutoff_hours || !formData.max_capacity_per_slot || missingDeliveryWindows) {
          showToast("All fields shown here are required.", "error");
          setSaving(false); return;
        }

        await updateVendorOnboardingStep(2, {
          delivery_windows: JSON.stringify(formData.delivery_windows),
          order_cutoff_hours: formData.order_cutoff_hours,
          max_capacity_per_slot: formData.max_capacity_per_slot
        });
      } else if (step === 3) {
        if (!formData.address_text || formData.pincode.length !== 6 || !formData.house_no) {
          showToast("Please provide complete address, shop no, and 6-digit pincode", "error");
          setSaving(false); return;
        }
        await updateVendorOnboardingStep(3, {
          address_text: formData.address_text,
          pincode: formData.pincode,
          city_id: parseInt(formData.city_id),
          house_no: formData.house_no,
          google_maps_url: formData.google_maps_url,
          house_photo_url: formData.house_photo_url
        });
      }

      setCurrentStep(step + 1);
    } catch (err) {
      showToast("Failed to save progress", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!formData.fssai_number) {
      showToast("FSSAI Number is required", "error");
      return;
    }
    if (!/^[1-3](0[1-9]|[12]\d|3[0-6])(0[6-9]|1\d|2[0-6])\d{9}$/.test(formData.fssai_number)) {
      showToast("Invalid FSSAI Registration Number", "error");
      return;
    }
    setSaving(true);
    try {
      await updateVendorOnboardingStep(4, {
        fssai_number: formData.fssai_number
      });
      showToast("Onboarding Complete! Welcome to Tiffini.", "success");

      // Update local auth state to unlock dashboard
      setAuth(token!, role!, true);
      navigate('/');
    } catch (err) {
      showToast("Verification failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="onboarding-wizard-container">
      <div className="wizard-card glass-card">
        <div className="wizard-progress">
          {[1, 2, 3, 4].map(step => (
            <div key={step} className={`progress-step ${currentStep >= step ? 'active' : ''}`}>
              <div className="step-number">{step}</div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <Step1
              key="step1"
              formData={formData}
              setFormData={setFormData}
              onNext={() => handleNext(1)}
            />
          )}
          {currentStep === 2 && (
            <Step2
              key="step2"
              formData={formData}
              setFormData={setFormData}
              onNext={() => handleNext(2)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <Step3
              key="step3"
              formData={formData}
              setFormData={setFormData}
              onNext={() => handleNext(3)}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 4 && (
            <Step4
              key="step4"
              formData={formData}
              setFormData={setFormData}
              onFinish={handleFinish}
              onBack={() => setCurrentStep(3)}
              loading={saving}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

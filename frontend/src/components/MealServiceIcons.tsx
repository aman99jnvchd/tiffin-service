import React from 'react';
import { Sunrise, Sun, Moon } from 'lucide-react';

interface MealServiceIconsProps {
  serviceTypes: string;
}

export const MealServiceIcons: React.FC<MealServiceIconsProps> = ({ serviceTypes }) => {
  if (!serviceTypes) return null;

  const services = serviceTypes.split(',').map(s => s.trim());

  // Enforce order: Breakfast, Lunch, Dinner
  const order = ['Breakfast', 'Lunch', 'Dinner'];
  const orderedServices = services.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return (
    <div className="cd-bld-icons">
      {orderedServices.map(service => {
        let Icon = null;
        let iconColor = '';
        let iconBg = '';

        if (service === 'Breakfast') {
          Icon = Sunrise;
          iconColor = '#fb923c'; // bright orange
        }
        else if (service === 'Lunch') {
          Icon = Sun;
          iconColor = '#facc15'; // bright yellow
        }
        else if (service === 'Dinner') {
          Icon = Moon;
          iconColor = '#60a5fa'; // bright blue
        }

        iconBg = 'rgba(0, 0, 0, 0.65)';

        if (Icon) {
          return (
            <div key={service} className="cd-bld-icon-wrap" style={{ background: iconBg, color: iconColor }} title={service}>
              <Icon size={15} strokeWidth={2.5} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

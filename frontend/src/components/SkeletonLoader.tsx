import React from 'react';
import '../styles/Skeleton.css';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'text' | 'circular';
  count?: number;
  layout?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'card', 
  count = 1, 
  layout = 'horizontal',
  style,
  className = ''
}) => {
  const elements = Array.from({ length: count }, (_, i) => i);

  if (type === 'card') {
    return (
      <>
        {elements.map(i => (
          <div key={i} className={`skeleton-card skeleton-card-${layout} ${className}`} style={style}>
            <div className="skeleton-image" />
            <div className="skeleton-content">
              <div className="skeleton-title" />
              <div className="skeleton-subtitle" />
              <div className="skeleton-badges">
                <div className="skeleton-badge" />
                <div className="skeleton-badge" />
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'list') {
    return (
      <>
        {elements.map(i => (
          <div key={i} className={`skeleton-list-item ${className}`} style={style}>
            <div className="skeleton-avatar" />
            <div className="skeleton-info">
              <div className="skeleton-line-long" />
              <div className="skeleton-line-short" />
            </div>
          </div>
        ))}
      </>
    );
  }

  // Default block/text
  return (
    <>
      {elements.map(i => (
        <div 
          key={i} 
          className={`skeleton-base ${type === 'circular' ? 'skeleton-circular' : ''} ${className}`} 
          style={style} 
        />
      ))}
    </>
  );
};

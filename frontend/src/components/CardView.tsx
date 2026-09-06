import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';

interface CardData {
  id: number | string;
  [key: string]: any;
}

interface CardViewProps {
  data: CardData[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, item: CardData) => React.ReactNode;
  }[];
  expandedColumns?: {
    key: string;
    label: string;
    render?: (value: any, item: CardData) => React.ReactNode;
  }[];
  onEdit?: (item: CardData) => void;
  onDelete?: (item: CardData) => void;
  editButtonText?: string;
  emptyMessage?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  data,
  columns,
  expandedColumns = [],
  onEdit,
  onDelete,
  editButtonText = 'Edit',
  emptyMessage = 'No items found'
}) => {
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  const toggleExpand = (id: number | string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (data.length === 0) {
    return (
      <div className="card-view-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Combine all columns for display (excluding first column which goes in header)
  const dataColumns = columns.slice(1); // Skip first column (used in header)
  const allColumns = [...dataColumns, ...expandedColumns];
  const maxVisibleColumns = 4;
  const hasMoreColumns = allColumns.length > maxVisibleColumns;

  return (
    <div className="card-view-container">
      {data.map((item) => {
        const isExpanded = expandedId === item.id;
        const visibleColumns = isExpanded 
          ? allColumns 
          : allColumns.slice(0, maxVisibleColumns);
        const remainingColumns = isExpanded 
          ? [] 
          : allColumns.slice(maxVisibleColumns);
        
        return (
          <motion.div
            key={item.id}
            className="card-view-item"
            initial={false}
            animate={{ height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            {/* Card Header - Name on left, Actions on right */}
            <div className="card-view-header">
              <h3 className="card-view-title">
                {columns[0]?.render 
                  ? columns[0].render(item[columns[0].key], item)
                  : item[columns[0]?.key] || `Item ${item.id}`
                }
              </h3>
              
              <div className="card-view-actions">
                {onEdit && (
                  <button 
                    className="action-btn edit"
                    onClick={() => onEdit(item)}
                    title={editButtonText}
                  >
                    <span className="btn-text">{editButtonText}</span>
                    <span className="btn-icon">
                      <Edit size={18} strokeWidth={2} />
                    </span>
                  </button>
                )}
                {onDelete && (
                  <button 
                    className="action-btn delete"
                    onClick={() => onDelete(item)}
                    title="Delete"
                  >
                    <span className="btn-text">Delete</span>
                    <span className="btn-icon">
                      <Trash2 size={18} strokeWidth={2} />
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Column Rows - Label on left, Value on right */}
            <div className="card-view-basic-info">
              {visibleColumns.map((col) => (
                <div key={col.key} className="card-view-info-item">
                  <span className="card-view-info-label">{col.label}</span>
                  <span className="card-view-info-value">
                    {col.render 
                      ? col.render(item[col.key], item)
                      : item[col.key] || '-'
                    }
                  </span>
                </div>
              ))}
            </div>

            {/* Expandable Section for remaining columns */}
            {hasMoreColumns && remainingColumns.length > 0 && (
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="card-view-expanded"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="card-view-expanded-content">
                      {remainingColumns.map((col) => (
                        <div key={col.key} className="card-view-info-item">
                          <span className="card-view-info-label">{col.label}</span>
                          <span className="card-view-info-value">
                            {col.render 
                              ? col.render(item[col.key], item)
                              : item[col.key] || '-'
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* View More/Less Button */}
            {hasMoreColumns && (
              <button
                className="card-view-toggle"
                onClick={() => toggleExpand(item.id)}
              >
                <span>{isExpanded ? 'View Less' : 'View More'}</span>
                {isExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};


import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function SeverityBadge({ severity }) {
  const sev = (severity || 'info').toLowerCase();

  const getIcon = () => {
    switch (sev) {
      case 'critical':
        return <AlertCircle size={12} />;
      case 'high':
      case 'medium':
        return <AlertTriangle size={12} />;
      default:
        return <Info size={12} />;
    }
  };

  return (
    <span className={`badge badge-${sev}`}>
      {getIcon()}
      {sev}
    </span>
  );
}

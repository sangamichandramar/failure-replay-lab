import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Share2 } from 'lucide-react';

export default function ServiceStatusBadge({ status }) {
  const st = (status || 'healthy').toLowerCase();

  const getIcon = () => {
    switch (st) {
      case 'healthy':
        return <ShieldCheck size={12} />;
      case 'degraded':
        return <AlertTriangle size={12} />;
      case 'failed':
        return <XCircle size={12} />;
      case 'affected':
        return <Share2 size={12} />;
      default:
        return <ShieldCheck size={12} />;
    }
  };

  return (
    <span className={`badge badge-service-${st}`}>
      {getIcon()}
      {st}
    </span>
  );
}

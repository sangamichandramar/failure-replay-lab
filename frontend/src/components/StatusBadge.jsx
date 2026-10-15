import React from 'react';
import { CheckCircle2, Clock, AlertOctagon } from 'lucide-react';

export default function StatusBadge({ status }) {
  const st = (status || 'open').toLowerCase();

  const getIcon = () => {
    switch (st) {
      case 'resolved':
        return <CheckCircle2 size={12} />;
      case 'investigating':
        return <Clock size={12} />;
      default:
        return <AlertOctagon size={12} />;
    }
  };

  return (
    <span className={`badge badge-${st}`}>
      {getIcon()}
      {st}
    </span>
  );
}

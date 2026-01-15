import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Props = {
  label?: string | null;
  className?: string;
  forceWhite?: boolean; // when true, always render in white to suit dark/gradient card backgrounds
};

export default function ChangeLabel({ label, className = '', forceWhite = false }: Props) {
  const text = (label ?? '').trim();
  if (!text) return <span className={`text-xs ${forceWhite ? 'text-white' : 'text-gray-400'} ${className}`}>—</span>;

  if (text.startsWith('+')) {
    return (
      <span className={`text-xs flex items-center gap-1 ${forceWhite ? 'text-white' : 'text-green-600'} ${className}`}>
        <ArrowUpRight size={12} />{text}
      </span>
    );
  }

  if (text.startsWith('-')) {
    return (
      <span className={`text-xs flex items-center gap-1 ${forceWhite ? 'text-white' : 'text-red-600'} ${className}`}>
        <ArrowDownRight size={12} />{text}
      </span>
    );
  }

  // Neutral / placeholder like "— par rapport à ..."
  return <span className={`text-xs ${forceWhite ? 'text-white' : 'text-gray-500'} ${className}`}>{text}</span>;
} 

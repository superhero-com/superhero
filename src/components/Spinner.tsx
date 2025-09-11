import React from 'react';

export default function Spinner() {
  return (
    <div 
      className="w-5 h-5 rounded-full border-2 border-white/20 border-t-purple-400 animate-spin" 
      aria-label="loading" 
    />
  );
}



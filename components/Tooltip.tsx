import React from 'react';

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  return (
    <span className="tooltip-container" title="">
      <span className="info-icon">i</span>
      <span className="tooltip-text">{text}</span>
    </span>
  );
}

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  maxWidth?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, maxWidth = 200 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ left: '50%', top: '50%' });
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'right'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && targetRef.current) {
      const tooltip = tooltipRef.current;
      const target = targetRef.current;
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      

      const spaceAbove = targetRect.top;
      const spaceBelow = window.innerHeight - targetRect.bottom;
      const spaceRight = window.innerWidth - targetRect.right;
      
      let newPlacement: 'top' | 'bottom' | 'right' = 'top';
      let newPosition = { top: 0, left: 0 };
      let newArrowPosition = { left: '50%', top: '50%' };


      newPosition = {
        left: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
        top: targetRect.top - tooltipRect.height - 8
      };


      const targetCenter = targetRect.left + targetRect.width / 2;


      if (newPosition.left + tooltipRect.width > window.innerWidth) {
        const oldLeft = newPosition.left;
        newPosition.left = window.innerWidth - tooltipRect.width - 8;
        
    
        const arrowLeft = ((targetCenter - newPosition.left) / tooltipRect.width) * 100;
        newArrowPosition.left = `${Math.min(Math.max(arrowLeft, 10), 90)}%`;
      }

  
      if (newPosition.left < 8) {
        newPosition.left = 8;
        
      
        const arrowLeft = ((targetCenter - newPosition.left) / tooltipRect.width) * 100;
        newArrowPosition.left = `${Math.min(Math.max(arrowLeft, 10), 90)}%`;
      }

     
      if (spaceAbove < tooltipRect.height && spaceBelow > tooltipRect.height) {
        newPlacement = 'bottom';
        newPosition.top = targetRect.bottom + 8;
     
      }


      if (spaceAbove < tooltipRect.height && spaceBelow < tooltipRect.height && spaceRight > tooltipRect.width) {
        newPlacement = 'right';
        newPosition = {
          left: targetRect.right + 8,
          top: targetRect.top + (targetRect.height - tooltipRect.height) / 2
        };

        const targetMiddle = targetRect.top + targetRect.height / 2;
        const arrowTop = ((targetMiddle - newPosition.top) / tooltipRect.height) * 100;
        newArrowPosition = {
          left: '0',
          top: `${Math.min(Math.max(arrowTop, 10), 90)}%`
        };
      }

      setPlacement(newPlacement);
      setPosition(newPosition);
      setArrowPosition(newArrowPosition);
    }
  }, [isVisible, content]);

  return (
    <div 
      ref={targetRef}
      className="inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-2 py-1 text-[13px] text-white bg-[#6c757d] rounded shadow-lg pointer-events-none whitespace-normal break-words"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: `${maxWidth}px`,
            transform: 'scale(1)',
            opacity: 1,
            transition: 'transform 0.1s ease-in-out, opacity 0.1s ease-in-out'
          }}
        >
          {content}
          <div
            className="absolute w-2 h-2  bg-[#6c757d] transform rotate-45"
            style={{
              ...(placement === 'top' ? {
                bottom: '-4px',
                left: arrowPosition.left,
                transform: 'translateX(-50%) rotate(45deg)'
              } : placement === 'bottom' ? {
                top: '-4px',
                left: arrowPosition.left,
                transform: 'translateX(-50%) rotate(45deg)'
              } : {
                left: '-4px',
                top: arrowPosition.top,
                transform: 'translateY(-50%) rotate(45deg)'
              })
            }}
          />
        </div>
      )}
    </div>
  );
};
export default Tooltip;
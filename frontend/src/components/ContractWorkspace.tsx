"use client";
import React, { useState } from "react";
import ToggleDeployAndRun from "./ToggleDeployAndRun";
import TransactionTerminal from "./TransactionTerminal";

interface ContractWorkspaceProps {
  onTransactionExecuted?: () => void;
}

const ContractWorkspace: React.FC<ContractWorkspaceProps> = ({ onTransactionExecuted }) => {
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const containerHeight = window.innerHeight;
    const newHeight = containerHeight - e.clientY;
    
    // Set min and max height
    if (newHeight > 100 && newHeight < containerHeight - 200) {
      setTerminalHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for mouse events outside the component
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const containerHeight = window.innerHeight;
        const newHeight = containerHeight - e.clientY;
        
        if (newHeight > 100 && newHeight < containerHeight - 200) {
          setTerminalHeight(newHeight);
        }
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };
      
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div 
      className="flex flex-col h-screen"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="flex-1 overflow-auto">
        <ToggleDeployAndRun onTransactionExecuted={onTransactionExecuted} />
      </div>
      
      <div 
        className="h-1 bg-gray-300 cursor-ns-resize hover:bg-blue-400"
        onMouseDown={handleMouseDown}
      />
      
      <div style={{ height: `${terminalHeight}px` }} className="overflow-hidden">
        <TransactionTerminal className="h-full" />
      </div>
    </div>
  );
};

export default ContractWorkspace; 
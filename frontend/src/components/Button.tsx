import React from "react";

const Button = ({ label, variant }: { label: string; variant?: string }) => {
  const baseStyle = "px-3 py-1 rounded text-sm";
  
  const variantStyle =
    variant === "primary" ? "bg-red-500 text-white" : "bg-gray-700 text-white";

  return <button className={`${baseStyle} ${variantStyle}`}>{label}</button>;
};

export default Button;

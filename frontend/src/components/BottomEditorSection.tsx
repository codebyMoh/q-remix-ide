import React from "react";

export default function BottomEditorSection() {
  return (
    <div className="absolute left-[392px] top-[561px] w-[1048px] h-[60px] bg-white border-t border-gray-200 flex items-center px-4">
      
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {/* Icon */}
        <div className="w-[18px] h-[18px] bg-gray-500"></div>

        {/* Text */}
        <span className="text-[#23202A] font-urbanist text-[16px] font-medium">
          Editor Section
        </span>
      </div>

      {/* Middle Divider */}
      <div className="h-[40px] w-[1px] bg-gray-300 mx-4"></div>

      {/* Input Field */}
      <div className="flex-1 flex items-center bg-[#F9FAFB] px-3 h-[40px] rounded-md">
        <input
          type="text"
          placeholder="Type something..."
          className="w-full bg-transparent outline-none text-[#94969C] font-urbanist text-[16px] font-medium"
        />
      </div>

      {/* Right Section (Icons) */}
      <div className="flex items-center gap-4 ml-4">
        <div className="w-[16px] h-[16px] bg-gray-500"></div>
        <div className="w-[16px] h-[16px] bg-gray-500"></div>
      </div>
    </div>
  );
}

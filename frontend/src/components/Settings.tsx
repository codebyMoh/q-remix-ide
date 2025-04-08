import React, { useState } from "react";
import { GreenTick, RightArrow } from "@/assets/index";
const Settings = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <div className="relative flex  h-full">
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="mb-2 flex items-center justify-between  h-[3rem] flex-shrink-0">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            Settings
          </span>
          <div className="flex items-center gap-2">
            <GreenTick
              className={`w-5 h-5 text-green-500 transition-opacity ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="transition-all"
            >
              <RightArrow
                className={`w-5 h-5 text-gray-500 mb-[2px] mb-[2px] transition-transform  ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-[0.1rem] mt-[1px]">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">
                featured is comming soon!
              </span>
            </div>
          </div>
        )}
      </div>

      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-5 transition-all"
        >
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default Settings;

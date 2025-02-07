import React from "react";
import TerminalDownArrow from "@/assets/svg/TerminaldownArrow.svg";
import Search from "@/assets/svg/search.svg";
import AlertOctagon from "@/assets/svg/alert-octagon.svg";

const Terminal = ({toggleHeight}) => {
  return (
    <div className="gap-4 border flex items-center p-[10px]  justify-between">
      {/* Arrow icon */}
      <div onClick={toggleHeight} className="cursor-pointer">
        <TerminalDownArrow />
      </div>

      <div className="flex items-center gap-4">
        {/* List of Transitions */}
        <div className="text-[#94969C] t font-medium leading-[var(--Lineheighttext-md)] ">
          List All the Transitions
        </div>

        {/* Search Input */}
        <div className="relative w-[356px]">
          <input
            type="text"
            placeholder="Filter with transitions Hash or Addresss"
            className="w-full p-2 pr-10 border border-gray-200 rounded-md placeholder:text-sm"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Alert Icon */}
        <div>
          <AlertOctagon />
        </div>
      </div>
    </div>
  );
};

export default Terminal;

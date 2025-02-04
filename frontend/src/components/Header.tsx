import React, { useState } from "react";
import Play from "@/assets/svg/play.svg";
import Robot from "@/assets/svg/robot.svg";
import ToggleOff from "@/assets/svg/toggle-off.svg";
import ZoomOut from "@/assets/svg/zoom-out.svg";
import ZoomIn from "@/assets/svg/zoom-in.svg";
import HomeIcon from "@/assets/svg/home.svg";
import Cross from "@/assets/svg/cross.svg";

const icons = [Play, Robot, ToggleOff, ZoomOut, ZoomIn];

const Header = () => {
  const [showHome, setShowHome] = useState(true);

  return (
    <div className="h-[38px]  flex items-center px-4">
      <div className="flex items-center space-x-3">
        {/* Render Main Icons */}
        {icons.map((Icon, index) => (
          <Icon key={index} className="cursor-pointer" />
        ))}
        {/* Conditionally Show Home Text & Icons */}
        {showHome && (
          <div className="flex items-center space-x-1 cursor-pointer">
            <HomeIcon />
            <span>Home</span>
            <button onClick={() => setShowHome(false)}>
              <Cross />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;

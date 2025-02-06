import React, { useState } from "react";
import Play from "@/assets/svg/play.svg";
import Robot from "@/assets/svg/robot.svg";
import ToggleOff from "@/assets/svg/toggle-off.svg";
import ZoomOut from "@/assets/svg/zoom-out.svg";
import ZoomIn from "@/assets/svg/zoom-in.svg";
import HomeIcon from "@/assets/svg/home.svg";
import Cross from "@/assets/svg/cross.svg";

// Icons array for iteration
const icons = [Play, Robot, ToggleOff, ZoomOut, ZoomIn];

const Header = ({ handleZoomIn, handleRun, handleZoomOut, setActiveTab }) => {
  const [showHome, setShowHome] = useState(true);

  return (
    <div className="h-[38px] flex items-center px-4">
      <div className="flex items-center space-x-3">
        {/* Render Main Icons */}
        {icons.map((Icon, index) => {
          let onClickHandler;

          // Attach handlers based on the icon
          if (Icon === Play) {
            onClickHandler = handleRun;
          } else if (Icon === ZoomOut) {
            onClickHandler = handleZoomOut;
          } else if (Icon === ZoomIn) {
            onClickHandler = handleZoomIn;
          }

          return (
            <Icon
              key={index}
              className="cursor-pointer"
              onClick={onClickHandler}
            />
          );
        })}

        {/* Conditionally Show Home Text & Icons */}
        {showHome && (
          <div className="flex items-center space-x-1 cursor-pointer">
            <HomeIcon />
            <span>Home</span>
            <button
              onClick={() => {
                setShowHome(false);
                setActiveTab();
              }}
            >
              <Cross />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;

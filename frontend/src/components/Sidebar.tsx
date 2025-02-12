// "use client";
// import React, { useState } from "react";
// import Logo from "@/assets/svg/logo.svg";
// import Workspace from "@/assets/svg/workspace.svg";
// import Search from "@/assets/svg/search.svg";
// import Compile from "@/assets/svg/compile.svg";
// import Deploy from "@/assets/svg/deploy.svg";
// import Git from "@/assets/svg/git.svg";
// import Settings from "@/assets/svg/settings-up.svg";
// import SettingsD from "@/assets/svg/settings-down.svg";
// import Plugin from "@/assets/svg/plugin.svg";

// interface SidebarProps {
//   onSectionChange: (section: string) => void;
// }

// const Sidebar: React.FC<SidebarProps> = ({ onSectionChange }) => {
//   const [active, setActive] = useState("workspace");

//   return (
//     <div className="w-20 bg-white flex flex-col gap-1 border-[#DEDEDE] items-center p-2 border-r">
//       {/* Logo Icon – click toggles workspace */}
//       <div
//         className="mb-2 mt-2 cursor-pointer"
//         onClick={() => {
//           setActive("workspace");
//           onSectionChange("workspace");
//         }}
//       >
//         <Logo className="w-10 h-10 rounded-full" />
//       </div>
//       <div className="mb-6 w-full flex justify-center">
//         <hr className="w-10 border-t-2 border-[#DEDEDE]" />
//       </div>

//       <nav className="flex flex-col gap-1">
//         <button
//           className={`p-2 rounded-lg ${
//             active === "workspace" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           } flex items-center justify-center`}
//           onClick={() => {
//             setActive("workspace");
//             onSectionChange("workspace");
//           }}
//         >
//           <Workspace
//             className={`w-8 h-8 ${
//               active === "workspace" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>

//         {/* Search Button */}
//         <button
//           className={`p-2 rounded-lg ${
//             active === "search" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => setActive("search")}
//         >
//           <Search
//             className={`w-8 h-8 pl-[8px] pt-[8px] ${
//               active === "search" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>

//         {/* Compile (Code) Button */}
//         <button
//           className={`p-2 rounded-lg ${
//             active === "compile" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => {
//             setActive("compile");
//             onSectionChange("compiler");
//           }}
//         >
//           <Compile
//             className={`w-8 h-8 ${
//               active === "compile" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>

//         <button
//           className={`p-2 rounded-lg ${
//             active === "deploy" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => setActive("deploy")}
//         >
//           <Deploy
//             className={`w-8 h-8 ${
//               active === "deploy" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>

//         <button
//           className={`p-2 rounded-lg ${
//             active === "git" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => setActive("git")}
//         >
//           <Git
//             className={`w-8 h-8 ${
//               active === "git" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>

//         <button
//           className={`p-2 rounded-lg ${
//             active === "settings" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => setActive("settings")}
//         >
//           <Settings
//             className={`w-8 h-8 ${
//               active === "settings" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>
//       </nav>

//       <div className="mt-auto flex flex-col gap-2">
//         <button
//           className={`p-2 rounded-lg ${
//             active === "settingsd" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => setActive("settingsd")}
//         >
//           <SettingsD
//             className={`w-8 h-8 ${
//               active === "settingsd" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>

//         <button
//           className={`p-2 rounded-lg ${
//             active === "plugin" ? "bg-[#FFEAEA]" : "hover:bg-gray-700"
//           }`}
//           onClick={() => setActive("plugin")}
//         >
//           <Plugin
//             className={`w-8 h-8 ${
//               active === "plugin" ? "text-[#CE192D]" : "text-black"
//             }`}
//           />
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;


"use client";
import React, { useState } from "react";
import Logo from "@/assets/svg/logo.svg";
import Workspace from "@/assets/svg/workspace.svg";
import Search from "@/assets/svg/search.svg";
import Compile from "@/assets/svg/compile.svg";
import Deploy from "@/assets/svg/deploy.svg";
import Git from "@/assets/svg/git.svg";
import Settings from "@/assets/svg/settings-up.svg";
import SettingsD from "@/assets/svg/settings-down.svg";
import Plugin from "@/assets/svg/plugin.svg";

interface SidebarProps {
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSectionChange }) => {
  const [active, setActive] = useState("workspace");

  return (
    <div className="w-20 bg-white flex flex-col gap-1 border border-gray-300 items-center p-2">
      {/* Logo Icon */}
      <div
        className="mb-2 mt-2 cursor-pointer"
        onClick={() => {
          setActive("workspace");
          onSectionChange("workspace");
        }}
      >
        <Logo className="w-10 h-10 rounded-full" />
      </div>
      <div className="mb-6 w-full flex justify-center">
        <hr className="w-10 border-t-2 border-gray-300" />
      </div>

      <nav className="flex flex-col gap-1">
        {/* Workspace Button */}
        <button
          className={`p-2 rounded-lg ${
            active === "workspace" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("workspace");
            onSectionChange("workspace");
          }}
        >
          <Workspace className={`w-8 h-8 ${active === "workspace" ? "text-[#CE192D]" : "text-black"}`} />
        </button>

        {/* Search Button (Adjusted for alignment and color) */}
        <button
          className={`p-2 rounded-lg ${
            active === "search" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("search");
            onSectionChange("search");
          }}
        >
          <Search className={`w-8 h-8 pl-[8px] pt-[8px] ${active === "search" ? "text-[#CE192D]" : "text-black"}`} />
        </button>

        {/* Compile Button */}
        <button
          className={`p-2 rounded-lg ${
            active === "compile" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("compile");
            onSectionChange("compiler");
          }}
        >
          <Compile className={`w-8 h-8 ${active === "compile" ? "text-[#CE192D]" : "text-black"}`} />
        </button>

        {/* Deploy & Run Button (Fourth Icon) */}
        <button
          className={`p-2 rounded-lg ${
            active === "deploy-run" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("deploy-run");
            onSectionChange("deploy-run");
          }}
        >
          <Deploy className={`w-8 h-8 ${active === "deploy-run" ? "text-[#CE192D]" : "text-black"}`} />
        </button>

        {/* Git Button */}
        <button
          className={`p-2 rounded-lg ${
            active === "git" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("git");
            onSectionChange("git");
          }}
        >
          <Git className={`w-8 h-8 ${active === "git" ? "text-[#CE192D]" : "text-black"}`} />
        </button>

        {/* Settings Button */}
        <button
          className={`p-2 rounded-lg ${
            active === "settings" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("settings");
            onSectionChange("settings");
          }}
        >
          <Settings className={`w-8 h-8 ${active === "settings" ? "text-[#CE192D]" : "text-black"}`} />
        </button>
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {/* Settings Down Button */}
        <button
          className={`p-2 rounded-lg ${
            active === "settingsd" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("settingsd");
            onSectionChange("settingsd");
          }}
        >
          <SettingsD className={`w-8 h-8 ${active === "settingsd" ? "text-[#CE192D]" : "text-black"}`} />
        </button>

        {/* Plugin Button */}
        <button
          className={`p-2 rounded-lg ${
            active === "plugin" ? "bg-gray-200" : "hover:bg-gray-300"
          }`}
          onClick={() => {
            setActive("plugin");
            onSectionChange("plugin");
          }}
        >
          <Plugin className={`w-8 h-8 ${active === "plugin" ? "text-[#CE192D]" : "text-black"}`} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

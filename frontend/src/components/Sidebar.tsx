"use client";
import React, { useState } from "react";
import {
  Logo,
  Workspace,
  Search,
  Compile,
  Deploy,
  Bug,
  Git,
  Settings,
  SettingsD,
  Plugin,
} from "@/assets/index";
import { useEditor } from "../context/EditorContext";

interface SidebarProps {
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSectionChange }) => {
  const [active, setActive] = useState("workspace");
  const { setActiveFileId, setShowHome } = useEditor();


  const navItems = [
    { id: "workspace", icon: Workspace, label: "Workspace", section: "workspace" },
    { id: "search", icon: Search, label: "Search", section: "search", customClass: " " },
    { id: "compile", icon: Compile, label: "Compile", section: "compiler" },
    { id: "deploy-run", icon: Deploy, label: "Deploy & Run", section: "deploy-run" },
    { id: "debugger", icon: Bug, label: "Debugger", section: "debugger", customClass: "mx-2 w-5 h-5" },
    { id: "git", icon: Git, label: "Git", section: "git" },
    { id: "settings", icon: Settings, label: "Settings", section: "settings" },
  ];

  const bottomItems = [
    { id: "settingsd", icon: SettingsD, label: "Settings Down", section: "settingsd" },
    { id: "plugin", icon: Plugin, label: "Plugin", section: "plugin" },
  ];

  const handleNavClick = (id: string, section: string) => {
    setActive(id);
    onSectionChange(section);
  };

  const handleLogoClick = () => {
    setActive("workspace");
    onSectionChange("workspace");
    setActiveFileId("Home");
    setShowHome(true);
  };
  return (
    <div className="w-20 bg-white flex flex-col gap-1 border border-gray-300 items-center p-2">
      <div className="mb-2 mt-2 cursor-pointer" onClick={handleLogoClick}>
        <Logo className="w-10 h-10 rounded-full" />
      </div>
      <div className="mb-6 w-full flex justify-center">
        <hr className="w-10 border-t-2 border-gray-300" />
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`p-2 rounded-lg ${
                active === item.id ? "bg-gray-200" : "hover:bg-gray-300"
              } ${item.label === "Search" ? "pl-[19px]" : ""}`}
              
              onClick={() => handleNavClick(item.id, item.section)}
              aria-label={item.label}
            >
              <Icon
                className={`${item.customClass || "w-8 h-8"} ${
                  active === item.id ? "text-[#CE192D] fill current" : "text-black"
                }`}
              />
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`p-2 rounded-lg ${
                active === item.id ? "bg-gray-200" : "hover:bg-gray-300"
              }`}
              onClick={() => handleNavClick(item.id, item.section)}
              aria-label={item.label}
            >
              <Icon
                className={`w-8 h-8 ${
                  active === item.id ? "text-[#CE192D]" : "text-black"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
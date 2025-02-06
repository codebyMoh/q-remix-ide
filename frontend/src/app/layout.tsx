"use client";
import React, { useState } from "react";
//import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace";
import { Urbanist } from "next/font/google";
import "./globals.css";
import SolidiyCompiler from "@/components/SolidiyCompiler";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const handleActiveSectionChange = (section: string) => {
    setActiveSection(section);
  };
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen">
          <Sidebar onSectionChange={handleActiveSectionChange} />

          {activeSection === "compiler" ? (
            <SolidiyCompiler />
          ) : (
            <ToggleWorkspace />
          )}
          <div className="flex-1 flex flex-col ">{children}</div>
        </div>
      </body>
    </html>
  );
}

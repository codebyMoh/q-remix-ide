import React from "react";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace"
import { Urbanist } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <Sidebar />
          <ToggleWorkspace />
          <div className="flex-1 flex flex-col ">
            {children} 
          </div>
          <Footer/>
        </div>
      </body>
    </html>
  );
}

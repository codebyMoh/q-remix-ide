import React from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace"
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
<<<<<<< HEAD
      <body>
        <div className="flex h-screen">
          <Sidebar />
          <ToggleWorkspace />
          <div className="flex-1 flex flex-col">
            {/* <Header/> */}
            {children} 
          </div>
        </div>
=======
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        {children}
>>>>>>> 9d177a83dbb78b8b6613b2e3fedbcc0acf012602
      </body>
    </html>
  );
}

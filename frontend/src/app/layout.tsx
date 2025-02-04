import React from "react";
//import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace"
import { Urbanist } from "next/font/google";
import Web3Workspace from "@/components/Web3Workspace";
import FeaturesShow from "@/components/FeaturesShow";
import "./globals.css";

const urbanist = Urbanist({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen">
          <Sidebar />
          <ToggleWorkspace />
          <Web3Workspace/>
          <FeaturesShow/>
          <div className="flex-1 flex flex-col">
            {/* <Header/> */}
            {children} 
          </div>
        </div>
      {/* {/* <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        {children} */}
      </body>
    </html>
  );
}

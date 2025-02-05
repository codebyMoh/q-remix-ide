import React from "react";
import Sidebar from "@/components/Sidebar";
import ToggleWorkspace from "@/components/ToggleWorkspace";
import Web3Workspace from "@/components/Web3Workspace";
import FeaturesShow from "@/components/FeaturesShow";
import Footer from "@/components/Footer"; // Import Footer
import BottomEditorSection from "@/components/BottomEditorSection"; // Import BottomEditorSection
import "./globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <Sidebar />
          <ToggleWorkspace />
          <Web3Workspace />
          <FeaturesShow />
          <div className="flex-1 flex flex-col">{children}</div>
        </div>

        <BottomEditorSection /> {/* This adds the bottom editor section */}
        <Footer />
      </body>
    </html>
  );
}

import React, { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css"; // xterm default styles

// Import your header icons
import TerminalDownArrow from "@/assets/svg/TerminaldownArrow.svg";
import Search from "@/assets/svg/search.svg";
import AlertOctagon from "@/assets/svg/alert-octagon.svg";

const Terminal = ({ toggleHeight }) => {
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  // We'll use this ref to buffer the current command typed by the user
  const currentCommandRef = useRef("");

  useEffect(() => {
    // Initialize the xterm instance with light mode colors
    xtermRef.current = new XTerminal({
      cursorBlink: true,
      theme: {
        background: "#ffffff", // light background
        foreground: "#000000",
      },
      convertEol: true,
    });
    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);

    // Open xterm into our container and fit it to the size
    if (terminalContainerRef.current) {
      xtermRef.current.open(terminalContainerRef.current);
      fitAddonRef.current.fit();
    }

    // Write an initial welcome message and prompt
    xtermRef.current.writeln("Welcome Q-Remix BETA.");
    xtermRef.current.write("$ ");

    // Handle input data
    xtermRef.current.onData((data) => {
      const code = data.charCodeAt(0);
      if (code === 13) { // Enter key
        xtermRef.current.write("\r\n");
        processCommand();
      } else if (code === 127) { // Backspace
        if (currentCommandRef.current.length > 0) {
          currentCommandRef.current = currentCommandRef.current.slice(0, -1);
          // Move cursor back, erase character, and move back again
          xtermRef.current.write("\b \b");
        }
      } else {
        currentCommandRef.current += data;
        xtermRef.current.write(data);
      }
    });

    // Command processing logic
    const processCommand = () => {
      const command = currentCommandRef.current.trim();
      if (command === "clear") {
        xtermRef.current.clear();
      } else if (command === "help") {
        xtermRef.current.writeln("Available commands: help, clear, echo [message]");
      } else if (command.startsWith("echo ")) {
        xtermRef.current.writeln(command.slice(5));
      } else if (command.length > 0) {
        xtermRef.current.writeln(`command not found: ${command}`);
      }
      // Reset command buffer and prompt for the next command
      currentCommandRef.current = "";
      xtermRef.current.write("$ ");
    };

    // Resize the terminal when the window size changes
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      xtermRef.current.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col z-50">
      {/* Terminal Header (matching your old design) */}
      <div className="flex items-center justify-between gap-4 border-b p-[10px] bg-white">
        <div onClick={toggleHeight} className="cursor-pointer">
          <TerminalDownArrow />
        </div>
        <div className="flex items-center gap-4">
          {/* List of Transitions */}
          <div className="text-[#94969C] font-medium text-sm">
            List All the Transitions
          </div>
          {/* Search Input for Transaction filtering */}
          <div className="relative w-[356px]">
            <input
              type="text"
              placeholder="Filter with transitions Hash or Address"
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
      {/* Terminal Display Area */}
      <div
        ref={terminalContainerRef}
        className="flex-1 overflow-hidden"
        style={{ height: "100%" }}
      ></div>
    </div>
  );
};

export default Terminal;



import React, { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

import TerminalDownArrow from "@/assets/svg/TerminaldownArrow.svg";
import Search from "@/assets/svg/search.svg";
import AlertOctagon from "@/assets/svg/alert-octagon.svg";

const Terminal = ({ toggleHeight }) => {
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const currentCommandRef = useRef("");

  useEffect(() => {
    // Initialize xterm with specific dimensions
    xtermRef.current = new XTerminal({
      cursorBlink: true,
      theme: {
        background: "#ffffff",
        foreground: "#000000",
      },
      convertEol: true,
      rows: 10,
      cols: 100,
      scrollback: 1000,
    });

    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);

    if (terminalContainerRef.current) {
      xtermRef.current.open(terminalContainerRef.current);
      setTimeout(() => {
        fitAddonRef.current.fit();
      }, 0);
    }

    xtermRef.current.writeln("Welcome Q-Remix BETA.");
    xtermRef.current.write("$ ");

    // Handle input data
    xtermRef.current.onData((data) => {
      const code = data.charCodeAt(0);
      if (code === 13) {
        xtermRef.current.write("\r\n");
        processCommand();
      } else if (code === 127) {
        if (currentCommandRef.current.length > 0) {
          currentCommandRef.current = currentCommandRef.current.slice(0, -1);
          xtermRef.current.write("\b \b");
        }
      } else {
        currentCommandRef.current += data;
        xtermRef.current.write(data);
      }
    });

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
      currentCommandRef.current = "";
      xtermRef.current.write("$ ");
    };

    // Enhanced resize handler
    const handleResize = () => {
      if (fitAddonRef.current && terminalContainerRef.current) {
        const { width, height } = terminalContainerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          requestAnimationFrame(() => {
            fitAddonRef.current.fit();
            xtermRef.current.scrollToBottom();
          });
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalContainerRef.current) {
      resizeObserver.observe(terminalContainerRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between gap-4 border-b p-[10px] bg-white">
        <div onClick={toggleHeight} className="cursor-pointer">
          <TerminalDownArrow />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[#94969C] font-medium text-sm">
            List All the Transitions
          </div>
          <div className="relative w-[356px]">
            <input
              type="text"
              placeholder="Filter with transitions Hash or Address"
              className="w-full p-2 pr-10 border border-gray-200 rounded-md placeholder:text-sm"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <div>
            <AlertOctagon />
          </div>
        </div>
      </div>
      <div
        ref={terminalContainerRef}
        className="flex-1 overflow-auto"
        style={{
          minHeight: 0, // Important for flex child scrolling
        }}
      />
    </div>
  );
};

export default Terminal;
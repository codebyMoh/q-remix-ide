"use client";
import React, { useEffect, useRef } from "react";
import * as xterm from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { TerminalDownArrow, Search, AlertOctagon } from "@/assets/index";

interface DeployedContract {
  address: string;
  network: { name: string; rpcUrl: string; chainId: string };
  deployedBy: string;
  timestamp: number;
  contractName: string;
  abi: any[];
  txHash: string;
  blockNumber: number;
}

const Terminal = ({ toggleHeight }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<xterm.Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentCommandRef = useRef("");

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    const initializeTerminal = () => {
      if (!xtermRef.current) {
        try {
          xtermRef.current = new xterm.Terminal({
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

          // Check if container has valid dimensions before opening
          const { width, height } = terminalContainerRef.current.getBoundingClientRect();
          if (width > 0 && height > 0) {
            xtermRef.current.open(terminalContainerRef.current);
            fitAddonRef.current.fit();
            xtermRef.current.writeln("Welcome Q-Remix BETA.");
            xtermRef.current.write("$ ");
          } else {
            console.warn("Terminal container not ready, retrying...");
            requestAnimationFrame(initializeTerminal); // Retry next frame
          }
        } catch (err) {
          console.error("Failed to initialize Terminal:", err);
          return;
        }
      }
    };

    // Delay initialization to ensure DOM is ready
    requestAnimationFrame(initializeTerminal);

    if (xtermRef.current) {
      xtermRef.current.onData((data) => {
        const code = data.charCodeAt(0);
        if (code === 13) {
          xtermRef.current!.write("\r\n");
          processCommand();
        } else if (code === 127) {
          if (currentCommandRef.current.length > 0) {
            currentCommandRef.current = currentCommandRef.current.slice(0, -1);
            xtermRef.current!.write("\b \b");
          }
        } else {
          currentCommandRef.current += data;
          xtermRef.current!.write(data);
        }
      });
    }

    const processCommand = () => {
      const command = currentCommandRef.current.trim();
      if (command === "clear") {
        xtermRef.current!.clear();
      } else if (command === "help") {
        xtermRef.current!.writeln("Available commands: help, clear, echo [message]");
      } else if (command.startsWith("echo ")) {
        xtermRef.current!.writeln(command.slice(5));
      } else if (command.length > 0) {
        xtermRef.current!.writeln(`command not found: ${command}`);
      }
      currentCommandRef.current = "";
      xtermRef.current!.write("$ ");
    };

    const handleCompilationOutput = (event: CustomEvent) => {
      const contracts = event.detail as any[];
      xtermRef.current!.writeln("\r\n=== Compilation Output ===");
      contracts.forEach((contract) => {
        xtermRef.current!.writeln(`Contract: ${contract.contractName}`);
        xtermRef.current!.writeln("ABI:");
        xtermRef.current!.writeln(JSON.stringify(contract.abi, null, 2));
        xtermRef.current!.writeln("Bytecode:");
        xtermRef.current!.writeln(contract.byteCode);
        xtermRef.current!.writeln("------------------------");
      });
      xtermRef.current!.write("$ ");
    };

    const handleDeploymentOutput = (event: CustomEvent) => {
      const deployedContract = event.detail as DeployedContract;
      xtermRef.current!.writeln("\r\n=== Deployed Contract ===");
      xtermRef.current!.writeln(
        `[vm] from: ${deployedContract.deployedBy.slice(0, 6)}...${deployedContract.deployedBy.slice(-4)} to: ${
          deployedContract.contractName
        } (constructor) value: ${deployedContract.network.chainId === "11155111" ? "0 wei" : "0 ETH"} data: ${deployedContract.txHash.slice(0, 6)}...${deployedContract.txHash.slice(-6)}`
      );
      xtermRef.current!.writeln(`status: ${deployedContract.txHash ? "success" : "pending"}`);
      xtermRef.current!.writeln(`transaction hash: ${deployedContract.txHash}`);
      xtermRef.current!.writeln(`block hash: ${deployedContract.txHash || "pending"}`);
      xtermRef.current!.writeln(`block number: ${deployedContract.blockNumber || "pending"}`);
      xtermRef.current!.writeln(`contract address: ${deployedContract.address}`);
      xtermRef.current!.writeln(`from: ${deployedContract.deployedBy}`);
      xtermRef.current!.writeln(`to: ${deployedContract.contractName} (constructor)`);
      xtermRef.current!.writeln(`gas: ${deployedContract.txHash ? "pending" : "pending"}`);
      xtermRef.current!.writeln(`transaction cost: pending`);
      xtermRef.current!.writeln(`execution cost: pending`);
      xtermRef.current!.writeln(`input: ${deployedContract.txHash.slice(0, 6)}...${deployedContract.txHash.slice(-6)}`);
      xtermRef.current!.writeln(`output: ${deployedContract.address.slice(0, 6)}...${deployedContract.address.slice(-6)}`);
      xtermRef.current!.writeln("------------------------");
      xtermRef.current!.write("$ ");
    };

    window.addEventListener("compilationOutput", handleCompilationOutput as EventListener);
    window.addEventListener("deploymentOutput", handleDeploymentOutput as EventListener);

    const handleResize = () => {
      if (fitAddonRef.current && terminalContainerRef.current) {
        const { width, height } = terminalContainerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          requestAnimationFrame(() => {
            fitAddonRef.current!.fit();
            xtermRef.current!.scrollToBottom();
          });
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalContainerRef.current);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("compilationOutput", handleCompilationOutput as EventListener);
      window.removeEventListener("deploymentOutput", handleDeploymentOutput as EventListener);
      resizeObserver.disconnect();
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [toggleHeight]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 border-b p-[10px] bg-white">
        <div onClick={toggleHeight} className="cursor-pointer">
          <TerminalDownArrow />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[#94969C] font-medium text-sm">List All the Transitions</div>
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
        className="flex-1 overflow-auto bg-white" // Added bg-white for visibility
        style={{ minHeight: "50px" }} // Enforce a minimum height
      />
    </div>
  );
};

export default Terminal;
import React, { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { TerminalDownArrow, Search, AlertOctagon } from "@/assets/index";
import { terminalOutputService } from "@/services/terminal-output-service";

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

interface ContractData {
  contractName: string;
  abi: any[];
  byteCode: string;
}

interface TransactionOutputEvent {
  contractName: string;
  functionName: string;
  transactionHash: string;
  success: boolean;
  contract: DeployedContract;
  isHardhat?: boolean;
}

interface TerminalProps {
  toggleHeight: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ toggleHeight }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentCommandRef = useRef("");

  useEffect(() => {
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
        fitAddonRef.current?.fit();
      }, 0);
    }

    xtermRef.current.writeln("Welcome Q-Remix BETA.");
    xtermRef.current.write("$ ");

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

    const processCommand = () => {
      const command = currentCommandRef.current.trim();
      if (command === "clear") {
        xtermRef.current!.clear();
      } else if (command === "help") {
        xtermRef.current!.writeln(
          "Available commands: help, clear, echo [message]"
        );
      } else if (command.startsWith("echo ")) {
        xtermRef.current!.writeln(command.slice(5));
      } else if (command.length > 0) {
        xtermRef.current!.writeln(`command not found: ${command}`);
      }
      currentCommandRef.current = "";
      xtermRef.current!.write("$ ");
    };

    // Listen for compilation output
    const handleCompilationOutput = (event: CustomEvent) => {
      const contracts = event.detail as ContractData[];
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

    // Listen for deployment output
    const handleDeploymentOutput = (event: CustomEvent) => {
      const deployedContract = event.detail as DeployedContract;
      xtermRef.current!.writeln("\r\n=== Deployed Contract ===");
      xtermRef.current!.writeln(`[vm] from: ${deployedContract.deployedBy.slice(0, 6)}...${deployedContract.deployedBy.slice(-4)} to: ${deployedContract.contractName} (constructor) value: ${deployedContract.network.chainId === "11155111" ? "0 wei" : "0 ETH"} data: ${deployedContract.txHash.slice(0, 6)}...${deployedContract.txHash.slice(-6)}`);
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

    // Listen for transaction output
    const handleTransactionOutput = async (event: Event) => {
      const customEvent = event as CustomEvent<TransactionOutputEvent>;
      const { transactionHash, contract, functionName } = customEvent.detail;
      
      if (!transactionHash || !contract) return;
      
      xtermRef.current!.writeln("\r\n=== Transaction Output ===");
      xtermRef.current!.writeln(`Processing transaction: ${transactionHash}`);
      
      try {
        // Get detailed transaction information
        const details = await terminalOutputService.getTransactionDetails(
          transactionHash,
          contract,
          functionName
        );
        
        // Display transaction details
        xtermRef.current!.writeln(`[vm] from: ${details.from.slice(0, 6)}...${details.from.slice(-4)} to: ${details.contractName}.${details.functionName}() value: 0 wei`);
        xtermRef.current!.writeln(`status: ${details.status}`);
        xtermRef.current!.writeln(`transaction hash: ${details.transactionHash}`);
        xtermRef.current!.writeln(`block hash: ${details.blockHash}`);
        xtermRef.current!.writeln(`block number: ${details.blockNumber}`);
        xtermRef.current!.writeln(`from: ${details.from}`);
        xtermRef.current!.writeln(`to: ${details.to}`);
        xtermRef.current!.writeln(`gas: ${details.gas}`);
        xtermRef.current!.writeln(`gas price: ${details.gasPrice}`);
        xtermRef.current!.writeln(`transaction cost: ${details.transactionCost}`);
        xtermRef.current!.writeln(`execution cost: ${details.executionCost}`);
        
        // Display input data
        xtermRef.current!.writeln(`input: ${details.input.slice(0, 20)}...`);
        
        // Display decoded input if available
        if (details.decodedInput) {
          xtermRef.current!.writeln(`decoded input:`);
          xtermRef.current!.writeln(JSON.stringify(details.decodedInput, null, 2));
        }
        
        // Display output if available
        if (details.output) {
          xtermRef.current!.writeln(`output: ${details.output}`);
        }
        
        // Display decoded output if available
        if (details.decodedOutput) {
          xtermRef.current!.writeln(`decoded output:`);
          xtermRef.current!.writeln(JSON.stringify(details.decodedOutput, null, 2));
        }
        
        // Display logs if available
        if (details.logs && details.logs.length > 0) {
          xtermRef.current!.writeln(`logs: ${details.logs.length} events`);
          details.logs.forEach((log, index) => {
            xtermRef.current!.writeln(`event #${index + 1}: ${JSON.stringify(log, null, 2)}`);
          });
        }
        
        // Display Hardhat-specific debug info if available
        if (details.hardhatDebugInfo) {
          xtermRef.current!.writeln("\r\n=== Debug Information ===");
          xtermRef.current!.writeln(`gas used: ${details.hardhatDebugInfo.gasUsed}`);
          xtermRef.current!.writeln(`return value: ${details.hardhatDebugInfo.returnValue}`);
          
          // Display memory if available
          if (details.hardhatDebugInfo.memory && details.hardhatDebugInfo.memory.length > 0) {
            xtermRef.current!.writeln(`memory: ${details.hardhatDebugInfo.memory.length} slots`);
            // Show first few memory slots
            details.hardhatDebugInfo.memory.slice(0, 5).forEach((slot, index) => {
              xtermRef.current!.writeln(`  [${index}]: ${slot}`);
            });
            if (details.hardhatDebugInfo.memory.length > 5) {
              xtermRef.current!.writeln(`  ... ${details.hardhatDebugInfo.memory.length - 5} more slots`);
            }
          }
          
          // Display stack if available
          if (details.hardhatDebugInfo.stack && details.hardhatDebugInfo.stack.length > 0) {
            xtermRef.current!.writeln(`stack: ${details.hardhatDebugInfo.stack.length} items`);
            // Show first few stack items
            details.hardhatDebugInfo.stack.slice(0, 5).forEach((item, index) => {
              xtermRef.current!.writeln(`  [${index}]: ${item}`);
            });
            if (details.hardhatDebugInfo.stack.length > 5) {
              xtermRef.current!.writeln(`  ... ${details.hardhatDebugInfo.stack.length - 5} more items`);
            }
          }
          
          // Display storage if available
          if (details.hardhatDebugInfo.storage && Object.keys(details.hardhatDebugInfo.storage).length > 0) {
            xtermRef.current!.writeln(`storage: ${Object.keys(details.hardhatDebugInfo.storage).length} slots`);
            // Show first few storage slots
            Object.entries(details.hardhatDebugInfo.storage).slice(0, 5).forEach(([slot, value]) => {
              xtermRef.current!.writeln(`  ${slot}: ${value}`);
            });
            if (Object.keys(details.hardhatDebugInfo.storage).length > 5) {
              xtermRef.current!.writeln(`  ... ${Object.keys(details.hardhatDebugInfo.storage).length - 5} more slots`);
            }
          }
          
          // Display struct logs count if available
          if (details.hardhatDebugInfo.structLogs && details.hardhatDebugInfo.structLogs.length > 0) {
            xtermRef.current!.writeln(`execution trace: ${details.hardhatDebugInfo.structLogs.length} steps`);
            xtermRef.current!.writeln(`  (use 'debug' command to view detailed execution trace)`);
          }
        }
        
      } catch (error: any) {
        console.error("Error processing transaction:", error);
        xtermRef.current!.writeln(`Error processing transaction: ${error.message}`);
      } finally {
        xtermRef.current!.writeln("------------------------");
        xtermRef.current!.write("$ ");
      }
    };

    window.addEventListener("compilationOutput", handleCompilationOutput as EventListener);
    window.addEventListener("deploymentOutput", handleDeploymentOutput as EventListener);
    window.addEventListener("transactionOutput", handleTransactionOutput as EventListener);

    const handleResize = () => {
      if (fitAddonRef.current && terminalContainerRef.current) {
        const container = terminalContainerRef.current;
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          requestAnimationFrame(() => {
            fitAddonRef.current!.fit();
            xtermRef.current!.scrollToBottom();
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
      window.removeEventListener("compilationOutput", handleCompilationOutput as EventListener);
      window.removeEventListener("deploymentOutput", handleDeploymentOutput as EventListener);
      window.removeEventListener("transactionOutput", handleTransactionOutput as EventListener);
      resizeObserver.disconnect();
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
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
          minHeight: 0,
        }}
      />
    </div>
  );
};

export default Terminal;
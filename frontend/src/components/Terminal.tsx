"use client";
import React, { useEffect, useRef, useState } from "react";
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

interface TransactionOutputEvent {
  transactionHash: string;
  contract: any;
  functionName: string;
}

interface TerminalProps {
  toggleHeight: () => void;
  terminalHeight: number;
}

const Terminal = ({ toggleHeight, terminalHeight }: TerminalProps) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const currentCommandRef = useRef("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import xterm and its addons
    const loadXterm = async () => {
      try {
        const xtermModule = await import('xterm');
        const fitAddonModule = await import('xterm-addon-fit');
        await import('xterm/css/xterm.css');
        
        const xterm = xtermModule.default || xtermModule;
        const FitAddon = fitAddonModule.default || fitAddonModule.FitAddon;
        
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
              const container = terminalContainerRef.current;
              if (container) {
                const { width, height } = container.getBoundingClientRect();
                if (width > 0 && height > 0) {
                  xtermRef.current.open(container);
                  fitAddonRef.current.fit();
                  xtermRef.current.writeln("Welcome Q-Remix BETA.");
                  xtermRef.current.write("$ ");
                } else {
                  console.warn("Terminal container not ready, retrying...");
                  requestAnimationFrame(initializeTerminal); // Retry next frame
                }
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
          xtermRef.current.onData((data: string) => {
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
            xtermRef.current!.writeln("\x1b[32m" + command.slice(5) + "\x1b[0m");
          } else if (command.length > 0) {
            xtermRef.current!.writeln(
              "\x1b[31mcommand not found: \x1b[1;31m" + command + "\x1b[0m"
            );
          }
          currentCommandRef.current = "";
          xtermRef.current!.write("\x1b[90m$ \x1b[0m");
        };

        const handleCompilationOutput = (event: CustomEvent) => {
          const contracts = event.detail as any[];
          xtermRef.current!.writeln("\r\n=== Compilation Output ===");
          contracts.forEach((contract) => {
            xtermRef.current!.writeln(
              `\x1b[1;32mContract: \x1b[0m${contract.contractName}`
            );
            xtermRef.current!.writeln("\x1b[1;33mABI:\x1b[0m");
            xtermRef.current!.writeln(
              "\x1b[90m" + JSON.stringify(contract.abi, null, 2) + "\x1b[0m"
            );
            xtermRef.current!.writeln("\x1b[1;33mBytecode:\x1b[0m");

            // Format bytecode for better readability - show first and last part
            const bytecodePreview =
              contract.byteCode.length > 120
                ? `${contract.byteCode.substring(
                    0,
                    60
                  )}...${contract.byteCode.substring(
                    contract.byteCode.length - 60
                  )}`
                : contract.byteCode;

            xtermRef.current!.writeln("\x1b[90m" + bytecodePreview + "\x1b[0m");
            xtermRef.current!.writeln("\x1b[36m------------------------\x1b[0m");
          });
          xtermRef.current!.write("\x1b[90m$ \x1b[0m");
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

        // Listen for transaction output
        const handleTransactionOutput = async (event: Event) => {
          const customEvent = event as CustomEvent<TransactionOutputEvent>;
          const { transactionHash, contract, functionName } = customEvent.detail;

          if (!transactionHash || !contract) return;

          xtermRef.current!.writeln(
            "\r\n\x1b[1;36m=== Transaction Output ===\x1b[0m"
          );
          xtermRef.current!.writeln(
            `\x1b[90mProcessing transaction: \x1b[36m${transactionHash}\x1b[0m`
          );

          try {
            // Get detailed transaction information
            const details = await terminalOutputService.getTransactionDetails(
              transactionHash,
              contract,
              functionName
            );

            // Display transaction details
            xtermRef.current!.writeln(
              `\x1b[90m[vm] \x1b[0mfrom: \x1b[33m${details.from.slice(
                0,
                6
              )}...${details.from.slice(-4)}\x1b[0m to: \x1b[32m${
                details.contractName
              }\x1b[0m.\x1b[1;32m${
                details.functionName
              }()\x1b[0m value: \x1b[35m0 wei\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;33mstatus: \x1b[0m${
                details.status === "success"
                  ? "\x1b[32msuccess\x1b[0m"
                  : "\x1b[31mfailed\x1b[0m"
              }`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mtransaction hash: \x1b[0m\x1b[36m${details.transactionHash}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mblock hash: \x1b[0m\x1b[36m${details.blockHash}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mblock number: \x1b[0m\x1b[33m${details.blockNumber}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mfrom: \x1b[0m\x1b[33m${details.from}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mto: \x1b[0m\x1b[32m${details.to}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mgas: \x1b[0m\x1b[33m${details.gas}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mgas price: \x1b[0m\x1b[33m${details.gasPrice}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mtransaction cost: \x1b[0m\x1b[33m${details.transactionCost}\x1b[0m`
            );
            xtermRef.current!.writeln(
              `\x1b[1;36mexecution cost: \x1b[0m\x1b[33m${details.executionCost}\x1b[0m`
            );

            // Display input data
            xtermRef.current!.writeln(
              `\x1b[1;36minput: \x1b[0m\x1b[90m${details.input.slice(
                0,
                20
              )}...\x1b[0m`
            );

            // Display decoded input if available
            if (details.decodedInput) {
              xtermRef.current!.writeln(`\x1b[1;36mdecoded input:\x1b[0m`);
              // Pretty print the JSON with indentation and colors
              const formattedInput = formatJsonWithSyntaxHighlighting(
                details.decodedInput
              );
              xtermRef.current!.writeln(formattedInput);
            }

            // Display output if available
            if (details.output) {
              xtermRef.current!.writeln(
                `\x1b[1;36moutput: \x1b[0m\x1b[90m${details.output}\x1b[0m`
              );
            }

            // Display decoded output if available
            if (details.decodedOutput) {
              xtermRef.current!.writeln(`\x1b[1;36mdecoded output:\x1b[0m`);
              // Pretty print the JSON with indentation and colors
              const formattedOutput = formatJsonWithSyntaxHighlighting(
                details.decodedOutput
              );
              xtermRef.current!.writeln(formattedOutput);
            }

            // Display logs if available with syntax highlighting
            if (details.logs && details.logs.length > 0) {
              xtermRef.current!.writeln(
                `\x1b[1;36mlogs: \x1b[0m\x1b[33m${details.logs.length}\x1b[0m events`
              );
              details.logs.forEach((log, index) => {
                xtermRef.current!.writeln(
                  `\x1b[1;35mevent #${
                    index + 1
                  }: \x1b[0m${formatJsonWithSyntaxHighlighting(log)}`
                );
              });
            }

            // Display Hardhat-specific debug info if available
            if (details.hardhatDebugInfo) {
              xtermRef.current!.writeln(
                "\r\n\x1b[1;33m=== Debug Information ===\x1b[0m"
              );
              xtermRef.current!.writeln(
                `\x1b[1;36mgas used: \x1b[0m\x1b[33m${details.hardhatDebugInfo.gasUsed}\x1b[0m`
              );
              xtermRef.current!.writeln(
                `\x1b[1;36mreturn value: \x1b[0m\x1b[32m${details.hardhatDebugInfo.returnValue}\x1b[0m`
              );

              // Display memory if available
              if (
                details.hardhatDebugInfo.memory &&
                details.hardhatDebugInfo.memory.length > 0
              ) {
                xtermRef.current!.writeln(
                  `\x1b[1;36mmemory: \x1b[0m\x1b[33m${details.hardhatDebugInfo.memory.length}\x1b[0m slots`
                );
                // Show first few memory slots
                details.hardhatDebugInfo.memory
                  .slice(0, 5)
                  .forEach((slot, index) => {
                    xtermRef.current!.writeln(
                      `  \x1b[90m[${index}]: \x1b[36m${slot}\x1b[0m`
                    );
                  });
                if (details.hardhatDebugInfo.memory.length > 5) {
                  xtermRef.current!.writeln(
                    `  \x1b[90m... ${
                      details.hardhatDebugInfo.memory.length - 5
                    } more slots\x1b[0m`
                  );
                }
              }

              // Display stack if available
              if (
                details.hardhatDebugInfo.stack &&
                details.hardhatDebugInfo.stack.length > 0
              ) {
                xtermRef.current!.writeln(
                  `\x1b[1;36mstack: \x1b[0m\x1b[33m${details.hardhatDebugInfo.stack.length}\x1b[0m items`
                );
                // Show first few stack items
                details.hardhatDebugInfo.stack
                  .slice(0, 5)
                  .forEach((item, index) => {
                    xtermRef.current!.writeln(
                      `  \x1b[90m[${index}]: \x1b[36m${item}\x1b[0m`
                    );
                  });
                if (details.hardhatDebugInfo.stack.length > 5) {
                  xtermRef.current!.writeln(
                    `  \x1b[90m... ${
                      details.hardhatDebugInfo.stack.length - 5
                    } more items\x1b[0m`
                  );
                }
              }

              // Display storage if available
              if (
                details.hardhatDebugInfo.storage &&
                Object.keys(details.hardhatDebugInfo.storage).length > 0
              ) {
                xtermRef.current!.writeln(
                  `\x1b[1;36mstorage: \x1b[0m\x1b[33m${
                    Object.keys(details.hardhatDebugInfo.storage).length
                  }\x1b[0m slots`
                );
                // Show first few storage slots
                Object.entries(details.hardhatDebugInfo.storage)
                  .slice(0, 5)
                  .forEach(([slot, value]) => {
                    xtermRef.current!.writeln(
                      `  \x1b[90m${slot}: \x1b[36m${value}\x1b[0m`
                    );
                  });
                if (Object.keys(details.hardhatDebugInfo.storage).length > 5) {
                  xtermRef.current!.writeln(
                    `  \x1b[90m... ${
                      Object.keys(details.hardhatDebugInfo.storage).length - 5
                    } more slots\x1b[0m`
                  );
                }
              }

              // Display struct logs count if available
              if (
                details.hardhatDebugInfo.structLogs &&
                details.hardhatDebugInfo.structLogs.length > 0
              ) {
                xtermRef.current!.writeln(
                  `\x1b[1;36mexecution trace: \x1b[0m\x1b[33m${details.hardhatDebugInfo.structLogs.length}\x1b[0m steps`
                );
                xtermRef.current!.writeln(
                  `  \x1b[90m(use '\x1b[1;36mdebug\x1b[90m' command to view detailed execution trace)\x1b[0m`
                );
              }
            }
          } catch (error: any) {
            console.error("Error processing transaction:", error);
            xtermRef.current!.writeln(
              `\x1b[1;31mError processing transaction: \x1b[0m${error.message}`
            );
          } finally {
            xtermRef.current!.writeln("\x1b[36m------------------------\x1b[0m");
            xtermRef.current!.write("\x1b[90m$ \x1b[0m");
          }
        };

        // Helper function to format JSON with syntax highlighting for terminal
        const formatJsonWithSyntaxHighlighting = (json: any): string => {
          const jsonString = JSON.stringify(json, null, 2);
          return jsonString
            .replace(/"([^"]+)":/g, '\x1b[36m"$1"\x1b[0m:') // Keys in cyan
            .replace(/: "([^"]+)"/g, ': \x1b[32m"$1"\x1b[0m') // String values in green
            .replace(/: (true|false)/g, ": \x1b[33m$1\x1b[0m") // Boolean values in yellow
            .replace(/: ([0-9]+)/g, ": \x1b[35m$1\x1b[0m"); // Number values in magenta
        };

        window.addEventListener(
          "compilationOutput",
          handleCompilationOutput as EventListener
        );
        window.addEventListener(
          "deploymentOutput",
          handleDeploymentOutput as EventListener
        );
        window.addEventListener(
          "transactionOutput",
          handleTransactionOutput as EventListener
        );

        const handleResize = () => {
          if (fitAddonRef.current && xtermRef.current) {
            fitAddonRef.current.fit();
          }
        };

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          window.removeEventListener(
            "compilationOutput",
            handleCompilationOutput as EventListener
          );
          window.removeEventListener(
            "deploymentOutput",
            handleDeploymentOutput as EventListener
          );
          window.removeEventListener(
            "transactionOutput",
            handleTransactionOutput as EventListener
          );
          if (xtermRef.current) {
            xtermRef.current.dispose();
            xtermRef.current = null;
          }
        };
      } catch (error) {
        console.error("Error loading xterm:", error);
      }
    };

    loadXterm();
  }, [toggleHeight, terminalHeight]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Terminal</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleHeight}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <TerminalDownArrow />
          </button>
        </div>
      </div>
      <div
        ref={terminalContainerRef}
        className="flex-1 overflow-hidden"
        style={{ height: `${terminalHeight}px` }}
      />
    </div>
  );
};

export default Terminal;
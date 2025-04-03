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

const Terminal: React.FC<TerminalProps> = ({
  toggleHeight,
  terminalHeight,
}) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentCommandRef = useRef("");

  useEffect(() => {
    const terminalTheme = {
      background: "#ffff",
      foreground: "gray",
      black: "#000000",
      brightBlack: "#666666",
      red: "#e74c3c",
      brightRed: "#ff3d00",
      green: "#4caf50",
      brightGreen: "#8bc34a",
      yellow: "#f1c40f",
      brightYellow: "#ffeb3b",
      blue: "#3498db",
      brightBlue: "#4b5563",
      magenta: "#9b59b6",
      brightMagenta: "#9c27b0",
      cyan: "#1abc9c",
      brightCyan: "#26c6da",
      white: "#e0e0e0",
      brightWhite: "#ffffff",
      cursor: "#aeafad",
      cursorAccent: "#ffff",
      selection: "rgba(255, 255, 255, 0.3)",
    };

    xtermRef.current = new XTerminal({
      cursorBlink: true,
      theme: terminalTheme,
      convertEol: true,
      rows: 16,
      cols: 100,
      scrollback: 5000,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      letterSpacing: 0,
      lineHeight: 1.2,
      rendererType: "canvas",
      allowTransparency: true,
    });

    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);

    if (terminalContainerRef.current) {
      xtermRef.current.open(terminalContainerRef.current);
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 0);
    }
    xtermRef.current.write("\x1b[1;34mWelcome to Q-Remix BETA\x1b[0m\r\n");
    xtermRef.current.write("\x1b[90m$ \x1b[0m");

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
        xtermRef.current!.writeln("\x1b[1;33mAvailable commands:\x1b[0m");
        xtermRef.current!.writeln(
          "  \x1b[36mhelp\x1b[0m          - Show this help message"
        );
        xtermRef.current!.writeln(
          "  \x1b[36mclear\x1b[0m         - Clear the terminal"
        );
        xtermRef.current!.writeln(
          "  \x1b[36mecho [message]\x1b[0m - Display a message"
        );
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

    // Listen for compilation output
    const handleCompilationOutput = (event: CustomEvent) => {
      const contracts = event.detail as ContractData[];
      xtermRef.current!.writeln(
        "\r\n\x1b[1;36m=== Compilation Output ===\x1b[0m"
      );
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
      xtermRef.current!.writeln(
        "\r\n\x1b[1;36m=== Deployed Contract ===\x1b[0m"
      );
      xtermRef.current!.writeln(
        `\x1b[90m[vm] \x1b[0mfrom: \x1b[33m${deployedContract.deployedBy.slice(
          0,
          6
        )}...${deployedContract.deployedBy.slice(-4)}\x1b[0m to: \x1b[32m${
          deployedContract.contractName
        }\x1b[0m (constructor) value: \x1b[35m${
          deployedContract.network.chainId === "11155111" ? "0 wei" : "0 ETH"
        }\x1b[0m data: \x1b[36m${deployedContract.txHash.slice(
          0,
          6
        )}...${deployedContract.txHash.slice(-6)}\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;33mstatus: \x1b[0m${
          deployedContract.txHash
            ? "\x1b[32msuccess\x1b[0m"
            : "\x1b[33mpending\x1b[0m"
        }`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mtransaction hash: \x1b[0m\x1b[36m${deployedContract.txHash}\x1b[0m \x1b[90m\u001b]8;;copy\u0007⧉\u001b]8;;\u0007\x1b[0m`
      );

      // Add a click listener to handle copying
      setTimeout(() => {
        const term = document.querySelector(".xterm");
        if (term) {
          term.addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            if (target.innerText.includes("⧉")) {
              navigator.clipboard
                .writeText(deployedContract.txHash)
                .then(() => {});
            }
          });

          // Add cursor pointer to copy icon
          const style = document.createElement("style");
          style.innerHTML = `
      .xterm span:contains("⧉") {
        cursor: pointer;
      }
    `;
          document.head.appendChild(style);
        }
      }, 100);

      xtermRef.current!.writeln(
        `\x1b[1;36mblock hash: \x1b[0m\x1b[36m${
          deployedContract.txHash || "pending"
        }\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mblock number: \x1b[0m\x1b[33m${
          deployedContract.blockNumber || "pending"
        }\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mcontract address: \x1b[0m\x1b[32m${deployedContract.address}\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mfrom: \x1b[0m\x1b[33m${deployedContract.deployedBy}\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mto: \x1b[0m\x1b[32m${deployedContract.contractName}\x1b[0m (constructor)`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mgas: \x1b[0m\x1b[33m${
          deployedContract.txHash ? "pending" : "pending"
        }\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mtransaction cost: \x1b[0m\x1b[33mpending\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36mexecution cost: \x1b[0m\x1b[33mpending\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36minput: \x1b[0m\x1b[90m${deployedContract.txHash.slice(
          0,
          6
        )}...${deployedContract.txHash.slice(-6)}\x1b[0m`
      );
      xtermRef.current!.writeln(
        `\x1b[1;36moutput: \x1b[0m\x1b[90m${deployedContract.address.slice(
          0,
          6
        )}...${deployedContract.address.slice(-6)}\x1b[0m`
      );
      xtermRef.current!.writeln("\x1b[36m------------------------\x1b[0m");
      xtermRef.current!.write("\x1b[90m$ \x1b[0m");
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
          {terminalHeight == "90" ? (
            <TerminalDownArrow style={{ transform: "rotate(180deg)" }} />
          ) : (
            <TerminalDownArrow />
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[#94969C] font-medium text-sm">
            List All the Transitions
          </div>
          <div className="relative w-[356px]">
            <input
              type="text"
              placeholder="Filter with transitions Hash or Address"
              className="w-full p-2 pr-10 border border-gray-200 rounded-md placeholder:text-sm focus:outline-none"
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
          marginLeft: "1.5rem",
        }}
      />
    </div>
  );
};

export default Terminal;
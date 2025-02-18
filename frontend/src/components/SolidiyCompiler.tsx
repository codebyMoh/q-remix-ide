"use client";
import React, { useState } from "react";

import { GreenTick, RightArrow, DownArrow } from "@/assets/index";

import { Urbanist } from "next/font/google";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const SolidiyCompiler = () => {
  const [selectedVersion, setSelectedVersion] = useState(
    "0.8.26+commit.8a97fa7a"
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleSettingsVisibility = () => {
    setShowAdvanced((prev) => !prev);
  };

  const versions = [
    { version: "0.8.28+commit.7893614a" },
    { version: "0.8.27+commit.40a35a09" },
    { version: "0.8.26+commit.8a97fa7a" },
    { version: "0.8.25+commit.b61c2a91" },
    { version: "0.8.24+commit.e11b9ed9" },
    { version: "0.8.23+commit.f704f362" },
    { version: "0.8.22+commit.4fc1097e" },
    { version: "0.8.21+commit.d9974bed" },
    { version: "0.8.20+commit.a1b79de6" },
    { version: "0.8.19+commit.7dd6d404" },
    { version: "0.8.18+commit.87f61d96" },
    { version: "0.8.17+commit.8df45f5f" },
    { version: "0.8.16+commit.07a7930e" },
    { version: "0.8.15+commit.e14f2714" },
  ];

  const checkboxOptions = [
    { label: "Include nightly builds" },
    { label: "Auto compile" },
    { label: "Hide warnings" },
  ];
  const evmVersions = [
    { label: "frontier" },
    { label: "homestead" },
    { label: "tangerineWhistle" },
    { label: "spuriousDragon" },
    { label: "byzantium" },
    { label: "constantinople" },
    { label: "petersburg" },
    { label: "istanbul" },
    { label: "berlin" },
    { label: "london" },
    { label: "paris" },
    { label: "shanghai" },
    { label: "cancun" },
  ];
  return (
    <div className="relative flex">
      {/* Sidebar */}
      <div
        className={`${
          isExpanded ? "w-80 px-4" : "w-0 px-0"
        } bg-white flex flex-col border-r border-[#DEDEDE] py-4 transition-all duration-300 overflow-hidden ${
          urbanist.className
        }`}
      >
        {/* File Explorer Header */}
        <div className="mb-2 flex items-center justify-between">
          <span className={`${isExpanded ? "opacity-100" : "opacity-0"}`}>
            SOLIDITY COMPILER
          </span>
          <div className="flex items-center gap-2">
            <GreenTick
              className={`w-5 h-5 text-green-500 transition-opacity ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* Toggle Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="transition-all"
            >
              <RightArrow
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        {isExpanded && (
          <div className="flex flex-col gap-[0.1rem] mt-[1px]">
            {/* Compiler Header */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">Compiler</span>
            </div>

            {/* Version Selector */}
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="border p-2 rounded "
            >
              {versions.map((data, index) => (
                <option key={index} value={data.version}>
                  {data.version}
                </option>
              ))}
            </select>

            {/* Checkbox Options */}
            <div className="flex flex-col gap-2 mt-3 ">
              {checkboxOptions.map((checkbox, index) => (
                <label key={index} className="flex items-center text-[13px]">
                  <input type="checkbox" className="accent-black" />
                  <span className="pl-2">{checkbox.label}</span>
                </label>
              ))}
            </div>

            {/* Advanced Configurations */}
            <div className="mt-6">
              <div className="flex justify-between items-center">
                <div>Advanced Configurations</div>
                {showAdvanced ? (
                  <DownArrow
                    className=" cursor-pointer"
                    onClick={toggleSettingsVisibility}
                  />
                ) : (
                  <RightArrow
                    className="cursor-pointer"
                    onClick={toggleSettingsVisibility}
                  />
                )}
              </div>

              {showAdvanced && (
                <div className="flex flex-col gap-3 mt-4">
                  <div>
                    <input
                      type="radio"
                      id="config1"
                      name="config"
                      className="accent-black"
                    />
                    <label htmlFor="config1" className="ml-2 text-[14px]">
                      Compiler configuration
                    </label>
                    <div className="flex flex-col  mt-2">
                      <label className="text-[13px]">LANGUAGE</label>
                      <select className="border p-2 rounded">
                        <option>Solidity</option>
                        <option>Yul</option>
                      </select>
                    </div>
                    <div className="flex flex-col mt-2">
                      <label className="text-[13px]">EVM VERSION</label>
                      <select className="border p-2 rounded">
                        <option className="text-[13px]">berlin</option>
                        {evmVersions.map((data, index) => (
                          <option key={index}>{data.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between items-center mt-[15px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="optimization"
                          className="accent-black"
                        />
                        <label htmlFor="optimization" className="text-sm ">
                          Optimization
                        </label>
                      </div>
                      <div>
                        <input
                          type="number"
                          defaultValue={200}
                          className="w-[80px] p-1 border rounded "
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <input
                      type="radio"
                      id="config2"
                      name="config"
                      className="accent-black"
                    />
                    <label htmlFor="config2" className="ml-2 text-[14px]">
                      Use configuration file
                    </label>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-[13px] pl-[20px]">
                        compiler_config.json
                      </div>
                      <button className="border p-[5px] text-[12px] rounded bg-gray-200">
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compile Buttons */}
            <div className="flex flex-col gap-4 mt-6">
              <button className="border p-2 rounded bg-black text-white">
                Compile no file selected
              </button>
              <button className="border p-2 rounded bg-gray-500 text-white">
                Compile and Run script
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Show Arrow When Collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-0 top-5 transition-all"
        >
          <RightArrow className="w-5 h-5 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default SolidiyCompiler;

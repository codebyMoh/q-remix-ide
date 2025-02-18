"use client";
import React, { useState, useMemo } from "react";
import { Rectangle, SmallRectangle } from "@/assets/index";
const FeaturesShow = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("EN");

  // Memoize languages array to prevent unnecessary recalculations
  const languages = useMemo(
    () => [
      { code: "EN", label: "English" },
      { code: "ES", label: "Spanish" },
      { code: "FR", label: "French" },
      { code: "IT", label: "Italian" },
      { code: "KO", label: "Korean" },
      { code: "RU", label: "Russian" },
      { code: "ZH", label: "Chinese" },
    ],
    []
  );
  const plugins = [
    { id: 1, text: "one plugin" },
    { id: 2, text: "two plugin" },
    { id: 3, text: "three plugin" },
  ];

  return (
    <div className="w-full pt-[3.3rem] pl-[2rem] pr-[2rem] align-center">
      <div>
        {/* Select language */}
        <div className="flex justify-between items-center">
          <h1 className="font-semibold text-[24px]">Features</h1>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="border border-[#E7E7E7] p-2 rounded-md"
          >
            {languages.map((language) => (
              <option
                key={language.code}
                value={language.code}
                className="text-[#94969C]"
              >
                {language.label}
              </option>
            ))}
          </select>
        </div>

        {/* Features display554 */}

        <div className="flex w-full h-[313px] rounded-[10px] border-[1px] border-solid p-[10px] gap-[20px] mt-4">
          <div>
            <Rectangle />
          </div>
          <div className="flex flex-col justify-center">
            <div>
              <h3 className="font-semibold">Featured Name</h3>
              <div className="text-[14px] font-medium leading-[16.8px] text-left underline-from-font decoration-none text-[#94969C]">
                Workspace
              </div>
            </div>
          </div>
        </div>
        <div>
          <h1 className="font-semibold text-[22px] pt-[15px]">
            Features Plugins
          </h1>
        </div>
        {/* featured plugin */}
        <div className="w-full  pt-[15px] opacity-100 flex gap-[20px]">
          {plugins.map((plugin, index) => (
            <div
              key={index}
              className="w-[170px] h-[167px] p-[10px_0px_0px_0px] gap-[10px] rounded-[10px] border border-t border-black/10"
            >
              <div className="pl-[10px]">
                <SmallRectangle />
                {/* <div>{plugin.text}</div> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesShow;

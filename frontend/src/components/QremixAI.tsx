import React,{useState}  from"react";
import { FaArrowRight } from "react-icons/fa";
const QremixAI = () => {
  const [query, setQuery] = useState("");
  return (
    <div className="h-[32.8rem] relative bg-white">
      <div className="flex flex-col gap-[6rem] pt-8">
        {/* Header */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="https://img.icons8.com/ios-filled/50/FA5252/bot.png"
            alt="Bot Icon"
            className="h-[60px] w-[60px]"
          />
          <div className="text-gray-800 font-semibold text-xl">Qremix AI</div>
          <div className="text-gray-600 text-sm">Your Web3 AI Assistant</div>
        </div>

        {/* Cards */}
        <div className="flex gap-[0.6rem] justify-center">
          <div className="bg-gray-100 p-8 rounded-lg text-sm text-gray-600  flex items-center justify-center w-[12rem] ">
            Explain What is a Solidity contract!
          </div>
          <div className="bg-gray-100 p-8 rounded-lg text-sm text-gray-600  flex items-center justify-center w-[12rem]">
            Explain briefly the current file in Editor
          </div>
        </div>
      </div>
      <div className="flex items-center absolute bottom-0 left-0 w-full bg-white p-2">
      <div className="relative flex-1">
        {/* Input field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your query"
          className="w-full pl-2 pr-4 py-2 bg-gray-100 rounded focus:outline-none placeholder-gray-400 placeholder:text-sm"

        />
      </div>
      {/* Arrow Button */}
      <div
        className={`p-1 rounded-full flex items-center justify-center w-8 h-8 ml-4 ${
          query ? "bg-[#CE192D] text-white cursor-pointer" : "bg-gray-300 text-gray-600"
        }`}
      >
        <FaArrowRight />
      </div>
    </div>
    </div>
  );
};

export default QremixAI;

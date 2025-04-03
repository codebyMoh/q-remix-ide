import React, { useState, useEffect, useRef } from "react";
import { FaArrowRight, FaTrash } from "react-icons/fa";

const QremixAI = () => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Explain what is a Solidity contract!",
    "Explain briefly the current file in Editor"
  ]);
  const chatContainerRef = useRef(null);

  const API_URL = "http://localhost:5000/chat";
  const CLEAR_URL = "http://localhost:5000/clear";

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("qremixChatHistory");
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("qremixChatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Clear chat history when the window is closed/refreshed
  useEffect(() => {
    const handleUnload = () => {
      localStorage.removeItem("qremixChatHistory");
      clearChatHistory();
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Scroll to bottom of chat container when chat history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Generate dynamic suggestions based on recent conversation
  useEffect(() => {
    if (chatHistory.length > 0) {
      // Get the most recent assistant message
      const recentMessages = chatHistory.filter(msg => msg.role === "assistant").slice(-2);
      
      if (recentMessages.length > 0) {
        generateDynamicSuggestions(recentMessages);
      }
    }
  }, [chatHistory]);

  const generateDynamicSuggestions = (recentMessages) => {
    // Analyze the recent messages to generate relevant follow-up suggestions
    const lastMessage = recentMessages[recentMessages.length - 1].content.toLowerCase();
    const newSuggestions = [];

    // Generate context-aware suggestions
    if (lastMessage.includes("solidity") || lastMessage.includes("smart contract")) {
      newSuggestions.push(
        "Show me a basic ERC20 token contract",
        "How to handle security vulnerabilities in Solidity?"
      );
    } else if (lastMessage.includes("javascript") || lastMessage.includes("js")) {
      newSuggestions.push(
        "How to use async/await in JavaScript?",
        "Show me a React component example"
      );
    } else if (lastMessage.includes("python")) {
      newSuggestions.push(
        "How to use decorators in Python?",
        "Show me a Python web scraping example"
      );
    } else if (lastMessage.includes("error") || lastMessage.includes("bug") || lastMessage.includes("debug")) {
      newSuggestions.push(
        "How to debug a gas optimization issue?",
        "Common errors in smart contracts"
      );
    }

    // If we couldn't generate contextual suggestions, use more general ones
    if (newSuggestions.length === 0) {
      // Extract keywords for more general suggestions
      const keywords = extractKeywords(lastMessage);
      
      if (keywords.length > 0) {
        // Generate suggestions based on keywords
        newSuggestions.push(
          `Tell me more about ${keywords[0]}`,
          `Show an example of ${keywords[0]}`
        );
      } else {
        // Fallback to default topics
        newSuggestions.push(
          "How to optimize gas in Solidity?",
          "Explain Web3 authentication"
        );
      }
    }

    // Take only 2 suggestions and ensure we have at least 2
    const finalSuggestions = newSuggestions.slice(0, 2);
    while (finalSuggestions.length < 2) {
      finalSuggestions.push(
        finalSuggestions.length === 0 
          ? "Explain what is a Solidity contract!" 
          : "Explain Web3 development best practices"
      );
    }

    setSuggestions(finalSuggestions);
  };

  const extractKeywords = (text) => {
    // Simple keyword extraction - could be improved with NLP in a real implementation
    const stopWords = ["the", "and", "a", "an", "in", "on", "at", "to", "for", "with", "is", "are"];
    const words = text.split(/\s+/).filter(word => 
      word.length > 3 && !stopWords.includes(word.toLowerCase())
    );
    
    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[.,?!;:()]/g, "");
      if (cleanWord) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    // Sort by frequency
    return Object.keys(wordCount)
      .sort((a, b) => wordCount[b] - wordCount[a])
      .slice(0, 3);
  };

  const sendMessage = async (message) => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setChatHistory(data.chat_history);
    } catch (error) {
      setChatHistory([...chatHistory, { role: "assistant", content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChatHistory = async () => {
    try {
      await fetch(CLEAR_URL, {
        method: "POST",
      });
      setChatHistory([]);
      // Reset to default suggestions when chat is cleared
      setSuggestions([
        "Explain what is a Solidity contract!",
        "Explain briefly the current file in Editor"
      ]);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  };

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    // Add user message to chat history immediately for better UX
    setChatHistory([...chatHistory, { role: "user", content: query }]);
    sendMessage(query);
    setQuery("");
  };

  const handleCardClick = (queryText) => {
    if (loading) return;
    // Add user message to chat history immediately for better UX
    setChatHistory([...chatHistory, { role: "user", content: queryText }]);
    sendMessage(queryText);
  };

  const formatMessage = (content) => {
    // Handle code blocks with syntax highlighting
    if (content.includes("```")) {
      return content.split("```").map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
          const [language, ...code] = part.split("\n");
          return (
            <pre key={index} className="bg-gray-800 text-white p-3 rounded overflow-x-auto my-2 text-sm">
              <code>{code.join("\n")}</code>
            </pre>
          );
        } else {
          // This is regular text
          return <span key={index}>{part}</span>;
        }
      });
    }
    return content;
  };

  return (
    <div className="h-[32.8rem] relative bg-white flex flex-col">
      {/* Header */}
      {chatHistory.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-4">
          <img
            src="https://img.icons8.com/ios-filled/50/FA5252/bot.png"
            alt="Bot Icon"
            className="h-[40px] w-[40px]"
          />
          <div className="text-gray-800 font-semibold text-xl">Qremix AI</div>
          <div className="text-gray-600 text-sm">Your Web3 AI Assistant</div>
        </div>
      )}
      
        {/* Chat Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {chatHistory.length === 0 ? (
          <p className="text-gray-600 text-center mt-5">Ask me anything or try a suggestion!</p>
        ) : (
          chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
            >
                <div className={`inline-block max-w-[80%] ${
                  msg.role === "user" 
                    ? "bg-blue-100 text-left" 
                    : "bg-gray-100"
                } p-3 rounded-lg shadow-sm`}>
                <div className="font-medium text-xs mb-1 text-gray-500">
                  {msg.role === "user" ? "You" : "QremixAI"}
                </div>
                <div className="whitespace-pre-wrap text-sm break-words">
                  {formatMessage(msg.content)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
  
      {/* Dynamic Suggestion Cards */}
      <div className="px-2">
        <div className="flex gap-2 justify-center mt-2 mb-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="bg-gray-100 p-2 rounded-lg text-xs text-gray-600 flex items-center justify-center flex-1 cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => handleCardClick(suggestion)}
            >
              {suggestion.length > 30 ? suggestion.substring(0, 27) + "..." : suggestion}
            </div>
          ))}
        </div>
      </div>
  
      {/* Input Area */}
      <div className="flex items-center w-full p-2 border-t border-gray-200">
        <button
          onClick={clearChatHistory}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          title="Clear chat history"
        >
          <FaTrash className="text-gray-400 text-sm" />
        </button>
        <form onSubmit={handleQuerySubmit} className="flex-1 flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your query"
            className="w-full pl-3 pr-4 py-2 bg-gray-100 rounded-l focus:outline-none placeholder-gray-400 placeholder:text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            className={`py-2 px-4 rounded-r flex items-center justify-center ${
              query && !loading
                ? "bg-[#CE192D] text-white cursor-pointer"
                : "bg-gray-300 text-gray-600"
            }`}
            disabled={!query.trim() || loading}
          >
            <FaArrowRight />
          </button>
        </form>
      </div>
    </div>
  );
};

export default QremixAI;
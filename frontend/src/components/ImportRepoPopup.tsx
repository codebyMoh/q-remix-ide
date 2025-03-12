import React, { useState } from "react";

interface ImportRepoPopupProps {
  onClose: () => void;
  onImport: (repoUrlOrKey: string, token?: string) => void;
}

const LIBRARY_OPTIONS = [
  { value: "open-zeppelin", label: "OpenZeppelin Contracts" },
  { value: "uniswapv4", label: "Uniswap V4 Core" },
  { value: "", label: "Custom URL" },
];

const ImportRepoPopup: React.FC<ImportRepoPopupProps> = ({ onClose, onImport }) => {
  const [selectedLibrary, setSelectedLibrary] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const repoUrlOrKey = selectedLibrary || customUrl;
    if (repoUrlOrKey.trim()) {
      onImport(repoUrlOrKey, token.trim() || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Import GitHub Repository</h2>
        <form onSubmit={handleSubmit}>
          <select
            value={selectedLibrary}
            onChange={(e) => setSelectedLibrary(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
          >
            <option value="">Select a library</option>
            {LIBRARY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {selectedLibrary === "" && (
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Or enter GitHub URL (e.g., https://github.com/org/repo)"
              className="w-full p-2 border border-gray-300 rounded mb-4"
            />
          )}
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="GitHub token (optional)"
            className="w-full p-2 border border-gray-300 rounded mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportRepoPopup;
import React, { useState, useEffect } from "react";
interface ImportRepoPopupProps {
  onClose: () => void;
  onImport: (repoUrlOrKey: string, token?: string) => void;
}
const LIBRARY_OPTIONS = [
  { value: "open-zeppelin", label: "OpenZeppelin Contracts" },
  { value: "uniswapv4", label: "Uniswap V4 Core" },
  { value: "", label: "Custom URL" },
];
const Popup = ({
  DeleteName,
  type,
  closeDeleteConfirmation,
  confirmDelete,
  setworkspace,
  Worktype,
  addedWorkspace,
  Inputworkspace,
  onClose,
  onImport,
  github
}) => {
  const [show, setShow] = useState(false);
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
  

  useEffect(() => {
    setShow(true); 
  }, []);

  return (
    <>
    {github =="true"? (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-10 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[28rem]">
        <h2 className="font-medium text-lg mb-2">Import GitHub Repository</h2>
        <form onSubmit={handleSubmit}>
          <select
            value={selectedLibrary}
            onChange={(e) => setSelectedLibrary(e.target.value)}
            className="w-full p-2  text-sm text-gray-600 border  border-gray-300 rounded mb-4"
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
              className="w-full p-2 border border-gray-300 rounded mb-4 text-sm text-gray-600 focus:outline-none "
            />
          )}
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="GitHub token (optional)"
            className="w-full p-2 border border-gray-300 rounded mb-4 text-sm text-gray-600 focus:outline-none "
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-[26px] py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
    ):(
      <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-10 z-50">
      <div
        className={`bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 transition-all duration-400 ${
          show ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
        }`}
      >
        {Worktype === "AddWorkspace" ? (
          <div>
            <h3 className="font-medium text-lg mb-2">Create Blank Workspace</h3>
            <label className="text-sm text-gray-600 mb-4">Workspace name</label>
            <input
              onChange={(e) => Inputworkspace(e.target.value)}
      className="border border-gray-300 bg-gray-100 rounded w-full p-2 focus:outline-none pt-1"
            />
          </div>
        ) : (
          <>
            <h3 className="font-medium text-lg mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete
              <span className="font-bold"> {DeleteName}</span>?
              {type === "folder" && " All contents will also be deleted."}
            </p>
          </>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={
              Worktype === "AddWorkspace"
                ? () => setworkspace(false)
                : () => closeDeleteConfirmation()
            }
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          {Worktype === "AddWorkspace" ? (
            <button
              onClick={() => {
                addedWorkspace();
                setworkspace(false);
              }}
              className="px-[26px] py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              OK
            </button>
          ) : (
            <button
              onClick={() => confirmDelete()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  

    )}
      </>
   
  );
};

export default Popup;

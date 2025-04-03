import React, { useState, useEffect } from "react";

const LIBRARY_OPTIONS = [
  { value: "open-zeppelin", label: "OpenZeppelin Contracts" },
  { value: "uniswapv4", label: "Uniswap V4 Core" },
  { value: "", label: "Custom URL" },
];

const PopupTypes = {
  GITHUB: "github",
  ADD_WORKSPACE: "AddWorkspace",
  DELETE: "delete",
};

const Popup = (props) => {
  const {
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
    github,
  } = props;

  const [show, setShow] = useState(false);
  const [importForm, setImportForm] = useState({
    selectedLibrary: "",
    customUrl: "",
    token: "",
  });

  // Determine what type of popup we're showing
  const popupType = github === "true" 
    ? PopupTypes.GITHUB 
    : Worktype === "AddWorkspace" 
      ? PopupTypes.ADD_WORKSPACE 
      : PopupTypes.DELETE;

  useEffect(() => {
    setShow(true);
  }, []);

  const handleInputChange = (field, value) => {
    setImportForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { selectedLibrary, customUrl, token } = importForm;
    const repoUrlOrKey = selectedLibrary || customUrl;
    
    if (repoUrlOrKey.trim()) {
      onImport(repoUrlOrKey, token.trim() || undefined);
      onClose();
    }
  };

  const handleCancel = () => {
    if (popupType === PopupTypes.ADD_WORKSPACE) {
      setworkspace(false);
    } else if (popupType === PopupTypes.DELETE) {
      closeDeleteConfirmation();
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (popupType === PopupTypes.ADD_WORKSPACE) {
      addedWorkspace();
      setworkspace(false);
    } else if (popupType === PopupTypes.DELETE) {
      confirmDelete();
    }
  };

  // Render content based on popup type
  const renderContent = () => {
    switch (popupType) {
      case PopupTypes.GITHUB:
        return (
          <form onSubmit={handleSubmit}>
            <h2 className="font-medium text-lg mb-2">Import GitHub Repository</h2>
            <select
              value={importForm.selectedLibrary}
              onChange={(e) => handleInputChange("selectedLibrary", e.target.value)}
              className="w-full p-2 text-sm text-gray-600 border border-gray-300 rounded mb-4"
            >
              <option value="">Select a library</option>
              {LIBRARY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {importForm.selectedLibrary === "" && (
              <input
                type="text"
                value={importForm.customUrl}
                onChange={(e) => handleInputChange("customUrl", e.target.value)}
                placeholder="Or enter GitHub URL (e.g., https://github.com/org/repo)"
                className="w-full p-2 border border-gray-300 rounded mb-4 text-sm text-gray-600 focus:outline-none"
              />
            )}
            
            <input
              type="text"
              value={importForm.token}
              onChange={(e) => handleInputChange("token", e.target.value)}
              placeholder="GitHub token (optional)"
              className="w-full p-2 border border-gray-300 rounded mb-4 text-sm text-gray-600 focus:outline-none"
            />
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
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
        );
        
      case PopupTypes.ADD_WORKSPACE:
        return (
          <>
            <h3 className="font-medium text-lg mb-2">Create Blank Workspace</h3>
            <label className="text-sm text-gray-600 mb-4">Workspace name</label>
            <input
              onChange={(e) => Inputworkspace(e.target.value)}
              className="border border-gray-300 bg-gray-100 rounded w-full p-2 focus:outline-none pt-1"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-[26px] py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                OK
              </button>
            </div>
          </>
        );
        
      case PopupTypes.DELETE:
        return (
          <>
            <h3 className="font-medium text-lg mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete
              <span className="font-bold"> {DeleteName}</span>?
              {type === "folder" && " All contents will also be deleted."}
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-10 z-50">
      <div
        className={`bg-white rounded-lg shadow-lg p-6 ${
          popupType === PopupTypes.GITHUB ? "w-[28rem]" : "max-w-md w-full mx-4"
        } transition-all duration-400 ${
          show ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
        }`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default Popup;
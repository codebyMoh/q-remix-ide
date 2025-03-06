import React from "react";
const Popup = ({
  DeleteName,
  type,
  closeDeleteConfirmation,
  confirmDelete,
  setworkspace,
  Worktype,
  addedWorkspace,
  Inputworkspace,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        {Worktype === "AddWorkspace" ? (
          <div>
            <h3 className="font-medium text-lg mb-2">Create Blank Workspace</h3>
            <label className="text-sm text-gray-600 mb-4">Workspace name</label>
            <input
              onChange={(e) => Inputworkspace(e.target.value)}
              className="border border-gray-300 rounded w-full p-1 focus:outline-none "
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
  );
};

export default Popup;

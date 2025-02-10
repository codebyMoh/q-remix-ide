import React, { useState } from "react";
import useIndexedDB from "../../hooks/UseIndexDB";
import Toolbar from "./Toolbar";

const Editor = () => {
  const [content, setContent] = useState("");
  const { saveFile, getFile } = useIndexedDB();

  const handleSave = () => {
    saveFile("myFile.txt", content);
  };

  const handleLoad = () => {
    getFile("myFile.txt", (file) => {
      if (file) {
        setContent(file.content);
      } else {
        alert("File not found");
      }
    });
  };

  return (
    <div className="h-full bg-gray-800 rounded-lg p-4">
      <Toolbar />
      <textarea
        className="w-full h-64 text-sm bg-gray-700 text-white rounded-md p-2"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button className="m-2 bg-green-500 p-2 rounded" onClick={handleSave}>
        Save
      </button>
      <button className="m-2 bg-blue-500 p-2 rounded" onClick={handleLoad}>
        Load
      </button>
    </div>
  );
};

export default Editor;

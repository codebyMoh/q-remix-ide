import React from "react";
import Toolbar from "./Toolbar";

const Editor = () => {
  return (
    <div className="h-full bg-gray-800 rounded-lg p-4">
      <Toolbar />
      <pre className="text-sm text-gray-300">
        <code>
          // Imports{'\n'}
          import mongoose, {'{ Schema }'} from "mongoose"{'\n\n'}
          // Collection name{'\n'}
          export const collection = "Designer"
        </code>
      </pre>
    </div>
  );
};

export default Editor;

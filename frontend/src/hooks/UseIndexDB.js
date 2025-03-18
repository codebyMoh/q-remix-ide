import { useEffect, useRef } from "react";

const useIndexedDB = () => {
  const dbRef = useRef(null);

  useEffect(() => {
    const request = indexedDB.open("CodeEditorDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("Files")) {
        db.createObjectStore("Files", { keyPath: "name" });
      }
    };

    request.onsuccess = (event) => {
      dbRef.current = event.target.result;
    };

    request.onerror = (event) => {
      console.error("DB error:", event.target.error);
    };
  }, []);

  const saveFile = (fileName, fileContent) => {
    if (!dbRef.current) {
      console.error("Database not initialized");
      return;
    }

    const transaction = dbRef.current.transaction(["Files"], "readwrite");
    const store = transaction.objectStore("Files");

    const request = store.put({ name: fileName, content: fileContent });

    request.onsuccess = () => {
    };

    request.onerror = (event) => {
      console.error("Save failed:", event.target.error);
    };
  };

  const getFile = (fileName, callback) => {
    if (!dbRef.current) {
      console.error("Database not initialized");
      return;
    }

    const transaction = dbRef.current.transaction(["Files"], "readonly");
    const store = transaction.objectStore("Files");

    const request = store.get(fileName);

    request.onsuccess = (event) => {
      callback(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Fetch failed:", event.target.error);
    };
  };

  return { saveFile, getFile };
};

export default useIndexedDB;

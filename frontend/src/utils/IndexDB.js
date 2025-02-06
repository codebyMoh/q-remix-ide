const DB_NAME = "QRemixDB";
const STORE_NAME = "Files";

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "filename" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to initialize IndexedDB");
  });
}

export async function saveFile(filename, content) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put({ filename, content });
  return tx.complete;
}

export async function loadFile(filename) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await store.get(filename);
  return result ? result.content : null;
}

export async function deleteFile(filename) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(filename);
  return tx.complete;
}

export async function listFiles() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve) => {
    const files = [];
    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        files.push(cursor.value.filename);
        cursor.continue();
      } else {
        resolve(files);
      }
    };
  });
}

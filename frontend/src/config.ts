// src/config.ts
const config = {
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
    routes: {
      compile: "/api/editor/compile",
    },
  };
  
export default config;
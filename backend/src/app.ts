import express from "express";
import editorRoutes from "./routes/editorRoutes";  // Add this

const app = express();
app.use(express.json());  // Ensure this is present to parse JSON bodies

// Existing routes...
app.use("/api/editor", editorRoutes);  // Add this

export default app;
import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/ai-suggestion", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await axios.post("http://localhost:8000/generate", { prompt });
    res.json(response.data);
  } catch (error) {
    console.error("AI suggestion error:", error);
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
});

export default router;
import { NextResponse } from "next/server";
import axios from "axios";

// Handle POST request
export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await axios.post("http://localhost:5000/api/editor/ai-suggestion", { prompt });

    return NextResponse.json(response.data, {
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow all origins (Change in production)
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: any) {
    console.error("Frontend AI error:", error.response?.data || error.message);

    return NextResponse.json(
      { error: "Suggestion failed", details: error.response?.data || "Unknown error" },
      { status: error.response?.status || 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

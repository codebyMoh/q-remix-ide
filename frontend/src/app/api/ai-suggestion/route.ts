import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await axios.post("http://localhost:8000/generate", { prompt });
    
    if (response.data.error) {
      console.error("Backend error:", response.data.error);
      return NextResponse.json(
        { error: response.data.error },
        { status: 500 }
      );
    }

    return NextResponse.json(response.data, {
         headers: {
              "Access-Control-Allow-Origin": "*", // Allow all origins (Change in production)
              "Access-Control-Allow-Methods": "POST, OPTIONS",
             "Access-Control-Allow-Headers": "Content-Type",
           },
          });
  } catch (error) {
    console.error("Frontend AI error:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: error.response?.data?.error || "Failed to connect to AI service" },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
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

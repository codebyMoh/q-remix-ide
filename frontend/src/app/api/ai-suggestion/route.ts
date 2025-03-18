import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  const { prompt } = await request.json();
  try {
    const response = await axios.post("http://localhost:5000/api/editor/ai-suggestion", { prompt });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Frontend AI error:", error);
    return NextResponse.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
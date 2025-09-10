import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function extractActionItems(transcript: string) {
  if (!GEMINI_API_KEY) {
    // Fallback: simple heuristic if no API key is set
    const parts = transcript
      .split(/[.\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    return parts.map((p) => ({
      text: p.length > 160 ? p.slice(0, 157) + "..." : p,
      priority: "Medium",
    }));
  }

  try {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
      model: "gemini-2.0-flash",
      temperature: 0.1,
    });

    const prompt = `Extract up to 8 concise action items from the meeting transcript.
Return only a JSON array, each item an object with "text" and optional "priority": "High"|"Medium"|"Low".

Transcript:
${transcript}`;

    const response = await llm.call([
      new SystemMessage(
        "You are an assistant that extracts actionable items from meeting transcripts."
      ),
      new HumanMessage(prompt),
    ]);

    const content = response.content?.toString() || "";

    // Try parsing JSON response
    const jsonStart = content.indexOf("[");
    const jsonStr = jsonStart >= 0 ? content.slice(jsonStart) : content;

    try {
      const arr = JSON.parse(jsonStr);
      return arr.map((a: any) => ({
        text: String(a.text || a),
        priority: a.priority || "Medium",
      }));
    } catch {
      // If parsing fails → fallback
      const parts = transcript
        .split(/[.\n\r]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);

      return parts.map((p) => ({
        text: p.length > 160 ? p.slice(0, 157) + "..." : p,
        priority: "Medium",
      }));
    }
  } catch (e) {
    console.error("LLM error", e);

    // Fallback on error
    const parts = transcript
      .split(/[.\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    return parts.map((p) => ({
      text: p.length > 160 ? p.slice(0, 157) + "..." : p,
      priority: "Medium",
    }));
  }
}
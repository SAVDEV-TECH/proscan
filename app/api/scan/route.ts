import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is missing. Please add GEMINI_API_KEY to your .env.local file" },
        { status: 500 }
      );
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a universal product identification assistant for a smart POS system.
Analyze the image and identify the primary object. Even if it is not a typical grocery product, do your best to identify it.
Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Object or Product name",
  "category": "Broad category",
  "estimatedPrice": 1500,
  "brand": "Brand name if visible",
  "description": "Short description",
  "image": "https://placehold.co/400x400?text=Item",
  "confidence": "high" or "medium" or "low"
}
Only return { "error": "unidentified" } if the image is completely pitch black or completely unreadable. Always make a reasonable guess. Output ONLY valid JSON without markdown fences.`,
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Gemini API error", details: err }, { status: response.status });
    }

    const data = await response.json();

    // Extract the text response from Gemini
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // We convert it to the format your frontend aiScan.ts file already expects (Anthropic style) 
    // so you don't even have to change your frontend code!
    return NextResponse.json({
      content: [
        {
          text: textOutput
        }
      ]
    });

  } catch (error) {
    console.error("Scan API route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

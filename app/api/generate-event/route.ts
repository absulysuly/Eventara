import { GoogleGenAI, Type } from "@google/genai";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import type { NextRequest } from "next/server";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface City { id: string; name: { en: string; }; }
interface Category { id:string; name: { en: string; }; }

// Initialize rate limiter to prevent abuse: 5 requests per 30 seconds from the same IP.
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "30 s"),
  analytics: true,
});

export async function POST(req: NextRequest) {
  // Apply rate limiting before processing the request.
  const ip = req.ip ?? "127.0.0.1";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again after a short break." }),
      {
        status: 429, // Rate Limit Exceeded
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toUTCString(),
        },
      }
    );
  }

  try {
    const { prompt, cities, categories, imageBase64 } = await req.json();

    if (!prompt || !cities || !categories) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: prompt, cities, or categories.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("FATAL: Gemini API key is not configured in server environment variables.");
      return new Response(JSON.stringify({ error: "Server configuration error. API key is missing." }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const cityOptions = (cities as City[]).map(c => `id: "${c.id}", name: "${c.name.en}"`).join('; ');
    const categoryOptions = (categories as Category[]).filter(c => c.id !== 'all').map(c => `id: "${c.id}", name: "${c.name.en}"`).join('; ');

    const systemInstruction = `You are an expert event planner assistant. Your task is to take a user's event idea and generate structured, creative, and appealing event details.
    1. Analyze the User's Prompt: Understand the core concept, location hints, and event type.
    2. Generate Titles & Descriptions: Create a catchy title and an engaging description. Provide translations for English (en), Arabic (ar), and Kurdish (ku).
    3. Suggest City & Category: Based on the prompt, choose the most appropriate city and category from the provided lists.
        - Available Cities: ${cityOptions}
        - Available Categories: ${categoryOptions}
    4. Create an Image Prompt: Generate a descriptive prompt for an AI image generator.
    ${imageBase64 ? "5. Analyze the Provided Image: An image has been uploaded. Your suggestions should be heavily influenced by this image." : ""}
    Your final output must strictly follow the provided schema.`;

    const textPart = { text: `Here is my event idea: "${prompt}"` };
    const contentParts: any[] = [textPart];

    if (imageBase64) {
      const [mimeTypePart, base64Data] = imageBase64.split(';base64,');
      const mimeType = mimeTypePart?.split(':')[1];
      if (mimeType && base64Data) {
        contentParts.unshift({ inlineData: { mimeType, data: base64Data } });
      }
    }

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.OBJECT,
                properties: {
                    en: { type: Type.STRING },
                    ar: { type: Type.STRING },
                    ku: { type: Type.STRING }
                },
            },
            description: {
                type: Type.OBJECT,
                properties: {
                    en: { type: Type.STRING },
                    ar: { type: Type.STRING },
                    ku: { type: Type.STRING }
                },
            },
            suggestedCityId: { type: Type.STRING },
            suggestedCategoryId: { type: Type.STRING },
            imagePrompt: { type: Type.STRING }
        }
    };

    const textGenResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = textGenResponse.text;
    const details = JSON.parse(jsonText);

    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: details.imagePrompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '16:9' },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("AI failed to generate an image.");
    }
    const generatedImageBase64 = imageResponse.generatedImages[0].image.imageBytes;

    const finalResponse = {
        title: details.title,
        description: details.description,
        suggestedCategoryId: details.suggestedCategoryId,
        suggestedCityId: details.suggestedCityId,
        generatedImageBase64: generatedImageBase64,
    };

    return new Response(JSON.stringify(finalResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[API Error] /api/generate-event:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred on the server.";
    return new Response(JSON.stringify({ error: "Failed to get AI suggestions.", details: errorMessage }), { status: 500 });
  }
}
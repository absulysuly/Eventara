import { GoogleGenAI, Type } from "@google/genai";

// Vercel-specific configuration to enable the Edge Runtime.
export const config = {
  runtime: 'edge',
};

// Define types needed for the function to be self-contained.
interface LocalizedString { en: string; ar: string; ku: string; }
interface City { id: string; name: { en: string; }; }
interface Category { id:string; name: { en: string; }; }

/**
 * Vercel Edge Function to securely generate event details using the Gemini API.
 */
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: `Method ${req.method} Not Allowed` }), {
        status: 405,
        headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, cities, categories, imageBase64 } = await req.json();
    
    if (!prompt || !cities || !categories) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: prompt, cities, categories.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
      });
    }

    // API Key is read from environment variables, which is secure in Edge Functions.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("FATAL: Gemini API key is not configured in server environment variables.");
      return new Response(JSON.stringify({ error: "Server configuration error. API key is missing." }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
      });
    }
    const ai = new GoogleGenAI({ apiKey });

    // This logic is migrated from the original client-side geminiService
    const cityOptions = (cities as City[]).map(c => `id: "${c.id}", name: "${c.name.en}"`).join('; ');
    const categoryOptions = (categories as Category[]).filter(c => c.id !== 'all').map(c => `id: "${c.id}", name: "${c.name.en}"`).join('; ');

    const systemInstruction = `You are an expert event planner assistant. Your task is to take a user's event idea and generate structured, creative, and appealing event details. The output must be in JSON format.
    1.  Analyze the User's Prompt: Understand the core concept, location hints, and event type.
    2.  Generate Titles & Descriptions: Create a catchy title and an engaging description. Provide translations for English (en), Arabic (ar), and Kurdish (ku).
    3.  Suggest City & Category: Based on the prompt, choose the most appropriate city and category from the provided lists.
        - Available Cities: ${cityOptions}
        - Available Categories: ${categoryOptions}
    4.  Create an Image Prompt: Generate a descriptive prompt for an AI image generator.
    ${imageBase64 ? "5. Analyze the Provided Image: An image has been uploaded. Your suggestions should be heavily influenced by this image." : ""}
    Your final output must strictly follow the JSON schema provided.`;

    const textPart = { text: `Here is my event idea: "${prompt}"` };
    const contentParts: any[] = [textPart];

    if (imageBase64) {
      const [mimeTypePart, base64Data] = imageBase64.split(';base64,');
      const mimeType = mimeTypePart?.split(':')[1];
      if (mimeType && base64Data) {
        contentParts.unshift({ inlineData: { mimeType, data: base64Data } });
      }
    }

    const textGenResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: contentParts },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ar: { type: Type.STRING }, ku: { type: Type.STRING }}},
                    description: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ar: { type: Type.STRING }, ku: { type: Type.STRING }}},
                    suggestedCityId: { type: Type.STRING },
                    suggestedCategoryId: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                }
            }
        },
    });

    const jsonText = textGenResponse.text.trim();
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
    return new Response(JSON.stringify({ error: "Failed to get AI suggestions.", details: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
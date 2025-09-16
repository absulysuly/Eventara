// This file defines a Vercel Serverless Function (Node.js runtime).
// It acts as a secure backend endpoint for making calls to the Gemini API.

// Placeholder for rate limiting logic.
// In a real-world application, you would use a library like 'rate-limiter-flexible'
// with a persistent store like Redis (e.g., from Upstash) to prevent abuse.
const rateLimiter = {
  consume: async (ip) => {
    // This is a mock implementation. For production, integrate a real rate limiting solution.
    console.log(`Rate limiting check for IP: ${ip}`);
    return true; // Always allow for this example
  }
};

/**
 * Handles requests to the /api/gemini endpoint.
 * @param {import('http').IncomingMessage} req - The incoming request object.
 * @param {import('http').ServerResponse} res - The server response object.
 */
export default async function handler(req, res) {
  // 1. Ensure the request is a POST request.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // 2. Implement Rate Limiting.
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const isAllowed = await rateLimiter.consume(ip);
    if (!isAllowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // 3. Parse and validate the request body.
    // The Vercel environment automatically parses the body for JSON content types.
    const { prompt, type } = req.body;

    if (!prompt || !type) {
      return res.status(400).json({ error: 'Missing required parameters. "prompt" and "type" are required in the request body.' });
    }

    // 4. Securely access the API key from server-side environment variables.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Log the critical error on the server, but don't expose details to the client.
      console.error("FATAL: Gemini API key is not configured in server environment variables.");
      return res.status(500).json({ error: "Server configuration error. Unable to process AI requests." });
    }

    // --- Gemini API Logic would be implemented here ---
    // Example: You would initialize the Google GenAI client and make a request.
    // import { GoogleGenAI } from "@google/genai";
    // const ai = new GoogleGenAI({ apiKey });
    // const response = await ai.models.generateContent(...);
    
    console.log(`Simulating Gemini API call for type "${type}" with prompt: "${prompt}"`);

    // For this example, we will return a mock response based on the 'type'.
    let mockResponseData;
    if (type === 'summarize') {
      mockResponseData = {
        summary: `This is a successful summary of the provided prompt: "${prompt.substring(0, 50)}..."`,
      };
    } else if (type === 'generate_title') {
      mockResponseData = {
        title: `A Creative Title Based on Your Prompt`,
      };
    } else {
      // Handle unknown types as a bad request.
      return res.status(400).json({ error: `Invalid "type" parameter. Supported types are "summarize" or "generate_title".` });
    }

    // 5. Return a successful JSON response.
    return res.status(200).json(mockResponseData);

  } catch (error) {
    // 6. Implement robust error handling.
    console.error("[API Error] in api/gemini.js:", error);
    
    // Return a generic server error to the client to avoid leaking implementation details.
    return res.status(500).json({ error: 'An unexpected error occurred while processing your request.' });
  }
}

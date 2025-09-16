import type { City, Category, AISuggestionResponse } from '@/lib/types';
import { loggingService } from '@/lib/loggingService';

const MAX_RETRIES = 2; // Total attempts = 1 initial + 2 retries = 3
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 25000; // 25 seconds, should be less than the serverless function timeout

/**
 * Calls the secure backend API to generate event details and an image.
 * Includes timeout handling and a retry mechanism for network errors.
 */
export const generateEventDetailsFromPrompt = async (
  prompt: string,
  cities: City[],
  categories: Category[],
  imageBase64: string | null
): Promise<AISuggestionResponse> => {
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          cities,
          categories,
          imageBase64,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error from server' }));
        // Don't retry on client-side (4xx) or rate limit (429) errors
        if (response.status >= 400 && response.status < 500) {
           loggingService.logError(new Error(`Client-side API Error: ${response.status}`), errorBody);
           throw new Error(errorBody.error || `A client-side error occurred (${response.status}).`);
        }
        // For server-side errors (5xx), we will retry
        throw new Error(errorBody.error || `A server error occurred (${response.status}).`);
      }

      const data: AISuggestionResponse = await response.json();
      return data; // Success, exit the loop

    } catch (error) {
      clearTimeout(timeoutId);
      const err = error as Error;

      // Handle timeout specifically
      if (err.name === 'AbortError') {
        loggingService.logError(new Error('API call timed out'), { attempt });
        // Don't retry on timeout, just fail
        throw new Error('The request to the AI assistant took too long. Please try again.');
      }
      
      loggingService.logError(err, { context: 'generateEventDetailsFromPrompt', attempt: attempt + 1 });

      if (attempt >= MAX_RETRIES) {
        // All retries failed, throw the final error
        throw new Error("Failed to get AI suggestions after multiple attempts. Please check your connection and try again.");
      }

      // Wait before the next retry with exponential backoff
      await new Promise(res => setTimeout(res, RETRY_DELAY_MS * Math.pow(2, attempt)));
    }
  }

  // This should be unreachable, but TypeScript needs a return path.
  throw new Error("An unexpected error occurred in the AI service.");
};

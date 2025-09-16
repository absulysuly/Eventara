import { z } from 'zod';

const localizedStringSchema = z.object({
  en: z.string().describe("The English translation of the text."),
  ar: z.string().describe("The Arabic translation of the text."),
  ku: z.string().describe("The Kurdish (Sorani) translation of the text."),
});

export const eventDetailsSchema = z.object({
  title: localizedStringSchema.describe("A catchy and creative title for the event."),
  description: localizedStringSchema.describe("An engaging and detailed description of the event."),
  suggestedCityId: z.string().describe("The ID of the most appropriate city from the provided list."),
  suggestedCategoryId: z.string().describe("The ID of the most appropriate category from the provided list."),
  imagePrompt: z.string().describe("A highly descriptive, visually rich prompt for an AI image generator (like Midjourney or DALL-E) to create a compelling featured image for this event."),
});

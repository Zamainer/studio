// src/ai/flows/analyze-image-for-ingredients.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for analyzing an image to detect ingredients.
 *
 * - analyzeImageForIngredients - A function that takes an image data URI and returns a list of detected ingredients.
 * - AnalyzeImageForIngredientsInput - The input type for the analyzeImageForIngredients function.
 * - AnalyzeImageForIngredientsOutput - The return type for the analyzeImageForIngredients function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImageForIngredientsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of ingredients, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageForIngredientsInput = z.infer<
  typeof AnalyzeImageForIngredientsInputSchema
>;

const AnalyzeImageForIngredientsOutputSchema = z.object({
  ingredients: z
    .array(z.string())
    .describe('A list of ingredients detected in the image.'),
});
export type AnalyzeImageForIngredientsOutput = z.infer<
  typeof AnalyzeImageForIngredientsOutputSchema
>;

export async function analyzeImageForIngredients(
  input: AnalyzeImageForIngredientsInput
): Promise<AnalyzeImageForIngredientsOutput> {
  return analyzeImageForIngredientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImageForIngredientsPrompt',
  input: {schema: AnalyzeImageForIngredientsInputSchema},
  output: {schema: AnalyzeImageForIngredientsOutputSchema},
  prompt: `You are an expert in food recognition. You will be given an image of ingredients, and you will return a list of the ingredients.

  Here is the image: {{media url=photoDataUri}}

  Return the ingredients as a list of strings.
  `,
});

const analyzeImageForIngredientsFlow = ai.defineFlow(
  {
    name: 'analyzeImageForIngredientsFlow',
    inputSchema: AnalyzeImageForIngredientsInputSchema,
    outputSchema: AnalyzeImageForIngredientsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

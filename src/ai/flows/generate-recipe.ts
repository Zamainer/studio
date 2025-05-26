'use server';

/**
 * @fileOverview Generates a recipe based on a list of ingredients provided by the user.
 *
 * - generateRecipe - A function that takes a list of ingredients and returns a recipe.
 * - GenerateRecipeInput - The input type for the generateRecipe function.
 * - GenerateRecipeOutput - The return type for the generateRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecipeInputSchema = z.object({
  ingredients: z
    .string()
    .describe('A comma-separated list of ingredients that the user has available.'),
});

export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  recipeName: z.string().describe('The name of the generated recipe.'),
  ingredientsList: z.string().describe('A list of ingredients required for the recipe.'),
  instructions: z.string().describe('Step-by-step instructions for preparing the recipe.'),
  additionalTips: z.string().optional().describe('Optional tips for the recipe.'),
});

export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipe(input: GenerateRecipeInput): Promise<GenerateRecipeOutput> {
  return generateRecipeFlow(input);
}

const generateRecipePrompt = ai.definePrompt({
  name: 'generateRecipePrompt',
  input: {schema: GenerateRecipeInputSchema},
  output: {schema: GenerateRecipeOutputSchema},
  prompt: `You are a chef specializing in creating recipes based on user-provided ingredients.

  The user will provide a list of ingredients they have available. Your task is to generate a recipe using those ingredients.
  The recipe should include a recipe name, a list of ingredients, step-by-step instructions, and optional additional tips.

  Ingredients provided by the user: {{{ingredients}}}

  Please provide the recipe in the following format:
  Recipe Name: [Recipe Name]
  Ingredients: [List of Ingredients]
  Instructions: [Step-by-step instructions]
  Tips: [Optional tips]`,
});

const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipeFlow',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GenerateRecipeOutputSchema,
  },
  async input => {
    const {output} = await generateRecipePrompt(input);
    return output!;
  }
);

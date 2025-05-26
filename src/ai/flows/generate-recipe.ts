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
  recipeName: z.string().describe('The name of the generated recipe, in Indonesian.'),
  ingredientsList: z.string().describe('A list of ingredients required for the recipe, in Indonesian, formatted as a multi-line string.'),
  instructions: z.string().describe('Step-by-step instructions for preparing the recipe, in Indonesian, formatted as a multi-line string with each step numbered or bulleted.'),
  additionalTips: z.string().optional().describe('Optional tips for the recipe, in Indonesian.'),
});

export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipe(input: GenerateRecipeInput): Promise<GenerateRecipeOutput> {
  return generateRecipeFlow(input);
}

const generateRecipePrompt = ai.definePrompt({
  name: 'generateRecipePrompt',
  input: {schema: GenerateRecipeInputSchema},
  output: {schema: GenerateRecipeOutputSchema},
  prompt: `Anda adalah seorang koki yang berspesialisasi dalam membuat resep berdasarkan bahan-bahan yang disediakan pengguna.

  Pengguna akan memberikan daftar bahan yang mereka miliki. Tugas Anda adalah membuat resep menggunakan bahan-bahan tersebut.
  Resep harus ditulis sepenuhnya dalam Bahasa Indonesia.
  Resep harus mencakup nama resep, daftar bahan (sebagai string multi-baris), instruksi langkah demi langkah (sebagai string multi-baris, setiap langkah diberi nomor atau poin), dan tips tambahan opsional.

  Bahan-bahan yang disediakan oleh pengguna: {{{ingredients}}}

  Pastikan seluruh output (nama resep, daftar bahan, instruksi, dan tips) dalam Bahasa Indonesia.
  Format output yang diharapkan:
  Nama Resep: [Nama Resep dalam Bahasa Indonesia]
  Bahan-bahan: [Daftar Bahan dalam Bahasa Indonesia, format multi-baris]
  Instruksi: [Instruksi langkah demi langkah dalam Bahasa Indonesia, format multi-baris]
  Tips: [Tips opsional dalam Bahasa Indonesia]`,
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


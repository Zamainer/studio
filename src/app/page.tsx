"use client";

import type { ChangeEvent } from "react";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChefHat, Camera, Keyboard, Loader2, Sparkles, Lightbulb, Edit3, AlertCircle, Heart, PlayCircle, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { analyzeImageForIngredients, type AnalyzeImageForIngredientsOutput } from "@/ai/flows/analyze-image-for-ingredients";
import { generateRecipe, type GenerateRecipeOutput } from "@/ai/flows/generate-recipe";
import CookingModeModal from "@/components/scrapchef/cooking-mode-modal";

export default function ScrapChefPage() {
  const [inputMode, setInputMode] = useState<"scan" | "text">("scan");
  const [ingredientsText, setIngredientsText] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [recipe, setRecipe] = useState<GenerateRecipeOutput | null>(null);
  
  const [isLoadingIngredients, setIsLoadingIngredients] = useState<boolean>(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showCookingMode, setShowCookingMode] = useState<boolean>(false);

  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setIngredientsText(""); // Clear previous ingredients
      setRecipe(null); // Clear previous recipe
      setError(null);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imagePreview) {
      setError("Please select an image first.");
      return;
    }
    setIsLoadingIngredients(true);
    setError(null);
    setRecipe(null);
    try {
      const result: AnalyzeImageForIngredientsOutput = await analyzeImageForIngredients({ photoDataUri: imagePreview });
      setIngredientsText(result.ingredients.join(", "));
      toast({
        title: "Ingredients Detected!",
        description: "Review and edit the ingredients if needed.",
      });
    } catch (e) {
      console.error(e);
      setError("Failed to analyze image. Please try again.");
      toast({
        variant: "destructive",
        title: "Error Analyzing Image",
        description: (e as Error).message || "An unknown error occurred.",
      });
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!ingredientsText.trim()) {
      setError("Please enter or detect some ingredients first.");
      return;
    }
    setIsLoadingRecipe(true);
    setError(null);
    setRecipe(null);
    try {
      const result: GenerateRecipeOutput = await generateRecipe({ ingredients: ingredientsText });
      setRecipe(result);
      toast({
        title: "Recipe Generated!",
        description: `Enjoy your ${result.recipeName}!`,
      });
    } catch (e) {
      console.error(e);
      setError("Failed to generate recipe. Please try again.");
      toast({
        variant: "destructive",
        title: "Error Generating Recipe",
        description: (e as Error).message || "An unknown error occurred.",
      });
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleSaveRecipe = () => {
    if (recipe) {
      toast({
        title: "Recipe Saved (Mock)",
        description: `${recipe.recipeName} has been notionally saved! Full save functionality coming soon.`,
      });
    }
  };
  
  const formatMultilineText = (text: string | undefined) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <span key={index} className="block">{line}</span>
    ));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background font-sans">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center space-x-2">
          <ChefHat className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-primary">ScrapChef</h1>
        </div>
        <p className="text-muted-foreground mt-2">Resep Instan dari Sisa Bahan Kulkas Anda!</p>
      </header>

      <main className="w-full max-w-2xl space-y-8">
        <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "scan" | "text")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2"><Camera className="h-4 w-4" /> Scan Ingredients</TabsTrigger>
            <TabsTrigger value="text" className="gap-2"><Keyboard className="h-4 w-4" /> Enter Manually</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan Ingredients with Camera</CardTitle>
                <CardDescription>Upload a photo of your ingredients, and we&apos;ll detect them for you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input type="file" accept="image/*" onChange={handleFileChange} className="file:text-primary file:font-semibold" data-ai-hint="food items" />
                {imagePreview && (
                  <div className="mt-4 border rounded-md overflow-hidden aspect-video relative w-full">
                    <Image src={imagePreview} alt="Selected ingredients" layout="fill" objectFit="contain" data-ai-hint="food ingredients"/>
                  </div>
                )}
                <Button onClick={handleAnalyzeImage} disabled={isLoadingIngredients || !imagePreview} className="w-full">
                  {isLoadingIngredients ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Analyze Image
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Enter Ingredients Manually</CardTitle>
                <CardDescription>Type in the ingredients you have available.</CardDescription>
              </CardHeader>
              <CardContent>
                 {/* This section is part of the "text" tab but will also show ingredients from scan */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Common area for ingredients text and recipe generation button */}
        {(inputMode === 'scan' && ingredientsText) || inputMode === 'text' ? (
          <Card className="mt-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5 text-primary"/> Your Ingredients</CardTitle>
              <CardDescription>
                {inputMode === 'scan' && ingredientsText ? "Detected ingredients. Edit if needed." : "Enter your ingredients, separated by commas."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., chicken breast, broccoli, soy sauce, garlic"
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={4}
                className="text-base"
              />
              <Button onClick={handleGenerateRecipe} disabled={isLoadingRecipe || !ingredientsText.trim()} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoadingRecipe ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Get Recipe
              </Button>
            </CardContent>
          </Card>
        ) : null}


        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoadingRecipe && (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
            <CardFooter className="space-x-2">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/2" />
            </CardFooter>
          </Card>
        )}

        {recipe && !isLoadingRecipe && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{recipe.recipeName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" /> Ingredients</h3>
                <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md shadow-inner">
                  {formatMultilineText(recipe.ingredientsList) || "No ingredients listed."}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ChefHat className="h-5 w-5 text-accent" /> Instructions</h3>
                <div className="text-sm text-muted-foreground space-y-2 bg-secondary/30 p-3 rounded-md shadow-inner">
                  {formatMultilineText(recipe.instructions) || "No instructions provided."}
                </div>
              </div>
              {recipe.additionalTips && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Tips</h3>
                  <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md shadow-inner">
                    {formatMultilineText(recipe.additionalTips)}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={handleSaveRecipe} className="w-full sm:w-auto">
                <Heart className="mr-2 h-4 w-4" /> Save Recipe
              </Button>
              <Button onClick={() => setShowCookingMode(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                <PlayCircle className="mr-2 h-4 w-4" /> Start Cooking Mode
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>

      {recipe && showCookingMode && (
        <CookingModeModal
          isOpen={showCookingMode}
          onClose={() => setShowCookingMode(false)}
          recipe={recipe}
        />
      )}

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ScrapChef. Cook with what you have!</p>
      </footer>
    </div>
  );
}

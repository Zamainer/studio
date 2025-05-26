
"use client";

import type { ChangeEvent } from "react";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from 'next/link'; // Ditambahkan untuk navigasi
import { ChefHat, Camera, Keyboard, Loader2, Sparkles, Lightbulb, Edit3, AlertCircle, Heart, PlayCircle, ListChecks, Mic, BookMarked } from "lucide-react"; // Ditambahkan BookMarked

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
import ThemeToggleButton from "@/components/theme-toggle-button"; // Import tombol tema

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition | undefined;
    webkitSpeechRecognition: typeof SpeechRecognition | undefined;
  }
}

export default function ScrapChefPage() {
  const [inputMode, setInputMode] = useState<"scan" | "text" | "voice">("scan");
  const [ingredientsText, setIngredientsText] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [recipe, setRecipe] = useState<GenerateRecipeOutput | null>(null);
  
  const [isLoadingIngredients, setIsLoadingIngredients] = useState<boolean>(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showCookingMode, setShowCookingMode] = useState<boolean>(false);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false; // Process after a pause
        recognitionRef.current.interimResults = false; // Only final results
        recognitionRef.current.lang = 'id-ID'; // Set to Indonesian, adjust as needed

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError(null);
          toast({ title: "Mendengarkan...", description: "Sebutkan bahan-bahan Anda." });
        };

        recognitionRef.current.onresult = (event) => {
          const currentTranscript = event.results[event.results.length - 1][0].transcript;
          setIngredientsText(prev => {
            const newText = prev ? `${prev}, ${currentTranscript}` : currentTranscript;
            // Sanitize potential double commas or leading/trailing commas
            return newText.replace(/, ,/g, ',').replace(/^,|,$/g, '').trim();
          });
          toast({ title: "Bahan Ditambahkan!", description: `"${currentTranscript}" berhasil ditambahkan.` });
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          let errMessage = "Terjadi kesalahan pada pengenalan suara.";
          if (event.error === 'no-speech') {
            errMessage = "Tidak ada suara terdeteksi. Silakan coba lagi.";
          } else if (event.error === 'audio-capture') {
            errMessage = "Masalah dengan mikrofon. Silakan periksa mikrofon Anda.";
          } else if (event.error === 'not-allowed') {
            errMessage = "Akses mikrofon ditolak. Mohon aktifkan di pengaturan browser Anda.";
          } else if (event.error === 'network') {
            errMessage = "Masalah jaringan. Pengenalan suara membutuhkan koneksi internet.";
          }
          setError(errMessage);
          toast({ variant: "destructive", title: "Kesalahan Input Suara", description: errMessage });
          setIsListening(false); // Ensure listening stops on error
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
         setError("Pengenalan suara tidak didukung di browser ini.");
      }
    } else {
      console.warn("Speech recognition not supported in this browser.");
       //setError("Pengenalan suara tidak didukung di browser ini."); // Optionally inform user
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]); // Added toast to dependencies

  // Effect to stop listening if input mode changes away from voice or component unmounts
  useEffect(() => {
    if (inputMode !== 'voice' && isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [inputMode, isListening]);


  const handleToggleListening = async () => {
    if (!recognitionRef.current) {
      setError("Pengenalan suara tidak tersedia atau belum siap.");
      toast({ variant: "destructive", title: "Kesalahan Input Suara", description: "Pengenalan suara tidak tersedia." });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        // Ensure microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
      } catch (err) {
        console.error('Microphone access denied or error', err);
        let userMessage = "Akses mikrofon ditolak. Mohon aktifkan di pengaturan browser Anda.";
        if ((err as Error).name === 'NotFoundError' || (err as Error).name === 'DevicesNotFoundError' ) {
            userMessage = "Mikrofon tidak ditemukan. Pastikan mikrofon terpasang dengan benar.";
        }
        setError(userMessage);
        toast({ variant: "destructive", title: "Kesalahan Mikrofon", description: userMessage });
        setIsListening(false);
      }
    }
  };


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setRecipe(null); 
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
    try {
      const result: AnalyzeImageForIngredientsOutput = await analyzeImageForIngredients({ photoDataUri: imagePreview });
      setIngredientsText(prev => {
        const newIngredients = result.ingredients.join(", ");
        return prev ? `${prev}, ${newIngredients}` : newIngredients;
      });
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
    // TODO: Implement actual save logic (e.g., to localStorage or backend)
    if (recipe) {
      toast({
        title: "Resep Disimpan (Mock)",
        description: `${recipe.recipeName} telah disimpan (sementara). Fitur penyimpanan penuh akan datang!`,
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
      <header className="mb-8 text-center w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <ThemeToggleButton /> {/* Tombol tema ditambahkan di sini */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center space-x-2">
              <ChefHat className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-primary">ScrapChef</h1>
            </div>
            <p className="text-muted-foreground mt-2">Resep Instan dari Sisa Bahan Kulkas Anda!</p>
          </div>
          <div className="flex items-center space-x-2"> {/* Kontainer untuk tombol kanan */}
            <Link href="/history" passHref>
              <Button variant="outline" size="icon" aria-label="Lihat Riwayat Resep">
                <BookMarked className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-2xl space-y-8">
        <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as "scan" | "text" | "voice")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" className="gap-2"><Camera className="h-4 w-4" /> Scan</TabsTrigger>
            <TabsTrigger value="text" className="gap-2"><Keyboard className="h-4 w-4" /> Tulis</TabsTrigger>
            <TabsTrigger value="voice" className="gap-2"><Mic className="h-4 w-4" /> Suara</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scan" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan Bahan via Kamera</CardTitle>
                <CardDescription>Unggah foto bahan-bahan Anda, dan kami akan mendeteksinya.</CardDescription>
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
                  Analisis Gambar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Masukkan Bahan Secara Manual</CardTitle>
                <CardDescription>Ketik bahan-bahan yang Anda miliki.</CardDescription>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground">Daftar bahan akan muncul di bawah setelah Anda menambahkannya.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Masukkan Bahan via Suara</CardTitle>
                <CardDescription>Klik tombol di bawah dan sebutkan bahan-bahan Anda satu per satu.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col items-center">
                <Button onClick={handleToggleListening} variant={isListening ? "destructive" : "default"} className="w-full max-w-xs">
                  {isListening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isListening ? "Berhenti Mendengarkan..." : "Mulai Mendengarkan"}
                </Button>
                 {isListening && <p className="text-sm text-muted-foreground mt-2">Mendengarkan...</p>}
                 {!recognitionRef.current && typeof window !== 'undefined' && !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Fitur Tidak Didukung</AlertTitle>
                        <AlertDescription>Pengenalan suara tidak didukung oleh browser Anda. Coba gunakan browser lain seperti Chrome atau Edge.</AlertDescription>
                    </Alert>
                 )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {(ingredientsText || inputMode === 'text' || inputMode === 'voice' || (inputMode === 'scan' && imagePreview)) && (
          <Card className="mt-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5 text-primary"/> Bahan-bahan Anda</CardTitle>
              <CardDescription>
                {inputMode === 'scan' && ingredientsText && !imagePreview ? "Bahan terdeteksi. Edit jika perlu." : 
                 inputMode === 'scan' && !ingredientsText && imagePreview ? "Analisis gambar untuk melihat bahan." :
                 inputMode === 'voice' && ingredientsText ? "Bahan dari suara. Edit jika perlu." :
                 "Masukkan bahan Anda, pisahkan dengan koma."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="contoh: dada ayam, brokoli, kecap asin, bawang putih"
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={4}
                className="text-base"
              />
              <Button onClick={handleGenerateRecipe} disabled={isLoadingRecipe || !ingredientsText.trim()} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoadingRecipe ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Dapatkan Resep
              </Button>
            </CardContent>
          </Card>
        )}


        {error && (
          <Alert variant="destructive" className="mt-4">
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
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-accent" /> Bahan-bahan</h3>
                <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md shadow-inner">
                  {formatMultilineText(recipe.ingredientsList) || "Tidak ada bahan yang terdaftar."}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ChefHat className="h-5 w-5 text-accent" /> Instruksi</h3>
                <div className="text-sm text-muted-foreground space-y-2 bg-secondary/30 p-3 rounded-md shadow-inner">
                  {formatMultilineText(recipe.instructions) || "Tidak ada instruksi yang diberikan."}
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
                <Heart className="mr-2 h-4 w-4" /> Simpan Resep
              </Button>
              <Button onClick={() => setShowCookingMode(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                <PlayCircle className="mr-2 h-4 w-4" /> Mode Memasak
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
        <p>&copy; {new Date().getFullYear()} ScrapChef. Masak dengan apa yang ada!</p>
      </footer>
    </div>
  );
}

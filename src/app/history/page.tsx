
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ChefHat, Trash2, Eye, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { GenerateRecipeOutput } from "@/ai/flows/generate-recipe";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface HistoricRecipe extends GenerateRecipeOutput {
  id: string;
  dateSaved: string;
  ingredientsInput: string; // The original ingredients text used for generation
  imageUrl?: string; // Optional, as we are not saving images from page.tsx
  dataAiHint?: string; // Optional
}

// // Mock data untuk riwayat resep - Akan diganti dengan data dari localStorage
// const mockHistoryData: HistoricRecipe[] = [
//   { id: "1", recipeName: "Ayam Goreng Mentega Lezat", dateSaved: "2024-07-28", imageUrl: "https://placehold.co/300x200.png", ingredientsInput: "Ayam, mentega, bawang bombay, kecap", ingredientsList: "", instructions: "", dataAiHint: "butter chicken" },
//   { id: "2", recipeName: "Nasi Goreng Spesial Keluarga", dateSaved: "2024-07-27", ingredientsInput: "Nasi, telur, udang, sayuran", ingredientsList: "", instructions: "", dataAiHint: "special fried rice" },
//   { id: "3", recipeName: "Tumis Kangkung Bumbu Terasi", dateSaved: "2024-07-26", imageUrl: "https://placehold.co/300x200.png", ingredientsInput: "Kangkung, bawang putih, cabai, terasi", ingredientsList: "", instructions: "", dataAiHint: "stirred water spinach" },
//   { id: "4", recipeName: "Sup Ayam Jahe Hangat", dateSaved: "2024-07-25", ingredientsInput: "Ayam, jahe, wortel, daun bawang", ingredientsList: "", instructions: "", dataAiHint: "chicken ginger soup"},
// ];


export default function HistoryPage() {
  const [recipeHistory, setRecipeHistory] = useState<HistoricRecipe[]>([]);
  const { toast } = useToast();
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);


  useEffect(() => {
    try {
      const storedRecipesRaw = localStorage.getItem('scrapchef_recipes');
      if (storedRecipesRaw) {
        const storedRecipes: HistoricRecipe[] = JSON.parse(storedRecipesRaw);
        setRecipeHistory(storedRecipes);
      }
    } catch (error) {
      console.error("Gagal memuat riwayat resep dari local storage:", error);
      toast({
        variant: "destructive",
        title: "Gagal Memuat Riwayat",
        description: "Tidak dapat memuat riwayat resep Anda dari penyimpanan lokal.",
      });
    }
  }, [toast]);

  const handleDeleteRecipe = (id: string) => {
    try {
      const updatedHistory = recipeHistory.filter(recipe => recipe.id !== id);
      localStorage.setItem('scrapchef_recipes', JSON.stringify(updatedHistory));
      setRecipeHistory(updatedHistory);
      toast({ title: "Resep Dihapus", description: "Resep telah berhasil dihapus dari riwayat Anda." });
    } catch (error) {
      console.error("Gagal menghapus resep dari local storage:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Resep",
        description: "Terjadi kesalahan saat mencoba menghapus resep.",
      });
    }
    setRecipeToDelete(null);
  };

  const handleViewRecipe = (recipe: HistoricRecipe) => {
    // Di aplikasi nyata, ini akan mengarahkan ke halaman detail resep atau membuka modal
    // Untuk saat ini, kita bisa menampilkan alert atau log detail resep
    alert(`Melihat detail untuk resep: ${recipe.recipeName}\n\nBahan Input: ${recipe.ingredientsInput}\n\n(Fitur detail lengkap akan segera hadir!)`);
    // console.log("Viewing recipe:", recipe); 
    // toast({ title: "Lihat Detail Resep", description: `Membuka detail untuk resep ID: ${id}. Fitur ini akan datang!` });
  };


  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background font-sans">
      <header className="mb-8 text-center w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" passHref>
            <Button variant="outline" size="icon" aria-label="Kembali ke Halaman Utama">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <ChefHat className="h-10 w-10 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary">Riwayat Resep</h1>
          </div>
          <div className="w-10 h-10">{/* Spacer untuk menyeimbangkan tombol kembali */}</div>
        </div>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        {recipeHistory.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center text-lg">
                Anda belum memiliki resep yang disimpan.
              </p>
              <div className="mt-6 text-center">
                <Link href="/" passHref>
                    <Button size="lg">Cari & Masak Resep Sekarang</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recipeHistory.map((recipe) => (
              <Card key={recipe.id} className="shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out">
                <div className="flex flex-col sm:flex-row">
                  {recipe.imageUrl && ( // Gambar hanya ditampilkan jika ada URL
                    <div className="sm:w-1/3 relative aspect-video sm:aspect-auto rounded-t-lg sm:rounded-l-lg sm:rounded-t-none overflow-hidden">
                      <Image 
                        src={recipe.imageUrl} 
                        alt={recipe.recipeName} 
                        layout="fill" 
                        objectFit="cover" 
                        data-ai-hint={recipe.dataAiHint || "food cooked"}
                      />
                    </div>
                  )}
                   {!recipe.imageUrl && ( // Placeholder jika tidak ada gambar
                    <div className="sm:w-1/3 relative aspect-video sm:aspect-auto rounded-t-lg sm:rounded-l-lg sm:rounded-t-none overflow-hidden bg-muted flex items-center justify-center">
                       <ChefHat className="h-16 w-16 text-primary/50" />
                    </div>
                  )}
                  <div className={`p-4 flex flex-col justify-between ${recipe.imageUrl ? 'sm:w-2/3' : 'w-full'}`}>
                    <div>
                      <CardTitle className="text-xl text-primary mb-1">{recipe.recipeName}</CardTitle>
                      <CardDescription className="text-xs mb-2">Disimpan: {recipe.dateSaved}</CardDescription>
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Bahan Digunakan:</span> {recipe.ingredientsInput}
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2 mt-auto pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewRecipe(recipe)}>
                        <Eye className="mr-1.5 h-4 w-4" /> Lihat
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" onClick={() => setRecipeToDelete(recipe.id)}>
                            <Trash2 className="mr-1.5 h-4 w-4" /> Hapus
                          </Button>
                        </AlertDialogTrigger>
                        {recipeToDelete === recipe.id && (
                           <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anda yakin ingin menghapus resep ini?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan. Resep "{recipe.recipeName}" akan dihapus secara permanen dari riwayat Anda.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setRecipeToDelete(null)}>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteRecipe(recipe.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        )}
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ScrapChef. Masak dengan apa yang ada!</p>
      </footer>
    </div>
  );
}

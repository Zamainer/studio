
"use client";

import React, { useState } from 'react'; // useState diimpor dari React
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ChefHat, Trash2, Eye } from 'lucide-react';
// import { useToast } from "@/hooks/use-toast"; // Uncomment jika ingin menggunakan toast

interface HistoricRecipe {
  id: string;
  name: string;
  dateSaved: string;
  imageUrl?: string;
  ingredientsSummary: string;
  dataAiHint?: string; // Ditambahkan untuk placeholder image
}

// Mock data untuk riwayat resep
const mockHistoryData: HistoricRecipe[] = [
  { id: "1", name: "Ayam Goreng Mentega Lezat", dateSaved: "2024-07-28", imageUrl: "https://placehold.co/300x200.png", ingredientsSummary: "Ayam, mentega, bawang bombay, kecap", dataAiHint: "butter chicken" },
  { id: "2", name: "Nasi Goreng Spesial Keluarga", dateSaved: "2024-07-27", ingredientsSummary: "Nasi, telur, udang, sayuran", dataAiHint: "special fried rice" },
  { id: "3", name: "Tumis Kangkung Bumbu Terasi", dateSaved: "2024-07-26", imageUrl: "https://placehold.co/300x200.png", ingredientsSummary: "Kangkung, bawang putih, cabai, terasi", dataAiHint: "stirred water spinach" },
  { id: "4", name: "Sup Ayam Jahe Hangat", dateSaved: "2024-07-25", ingredientsSummary: "Ayam, jahe, wortel, daun bawang", dataAiHint: "chicken ginger soup"},
];


export default function HistoryPage() {
  const [recipeHistory, setRecipeHistory] = useState<HistoricRecipe[]>(mockHistoryData);
  // const { toast } = useToast(); // Uncomment jika ingin menggunakan toast

  const handleDeleteRecipe = (id: string) => {
    setRecipeHistory(prev => prev.filter(recipe => recipe.id !== id));
    // toast({ title: "Resep Dihapus", description: "Resep telah berhasil dihapus dari riwayat Anda." });
    alert("Resep telah dihapus (mock)."); // Placeholder, ganti dengan toast jika diinginkan
  };

  const handleViewRecipe = (id: string) => {
    // Di aplikasi nyata, ini akan mengarahkan ke halaman detail resep atau membuka modal
    // toast({ title: "Lihat Detail Resep", description: `Membuka detail untuk resep ID: ${id}. Fitur ini akan datang!` });
    alert(`Melihat detail resep (ID: ${id}). Fitur ini akan segera hadir!`);
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
                  {recipe.imageUrl && (
                    <div className="sm:w-1/3 relative aspect-video sm:aspect-auto rounded-t-lg sm:rounded-l-lg sm:rounded-t-none overflow-hidden">
                      <Image 
                        src={recipe.imageUrl} 
                        alt={recipe.name} 
                        layout="fill" 
                        objectFit="cover" 
                        data-ai-hint={recipe.dataAiHint || "food cooked"}
                      />
                    </div>
                  )}
                  <div className={`p-4 flex flex-col justify-between ${recipe.imageUrl ? 'sm:w-2/3' : 'w-full'}`}>
                    <div>
                      <CardTitle className="text-xl text-primary mb-1">{recipe.name}</CardTitle>
                      <CardDescription className="text-xs mb-2">Disimpan: {recipe.dateSaved}</CardDescription>
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Bahan:</span> {recipe.ingredientsSummary}
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2 mt-auto pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewRecipe(recipe.id)}>
                        <Eye className="mr-1.5 h-4 w-4" /> Lihat
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRecipe(recipe.id)}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Hapus
                      </Button>
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


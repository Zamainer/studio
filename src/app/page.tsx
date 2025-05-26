
"use client";

import type { ChangeEvent } from "react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from 'next/link';
import { ChefHat, Camera, Keyboard, Loader2, Sparkles, Lightbulb, Edit3, AlertCircle, Heart, PlayCircle, ListChecks, Mic, BookMarked, UploadCloud, Video } from "lucide-react";

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
import ThemeToggleButton from "@/components/theme-toggle-button";

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition | undefined;
    webkitSpeechRecognition: typeof SpeechRecognition | undefined;
  }
}

interface SavedRecipe extends GenerateRecipeOutput {
  id: string;
  dateSaved: string;
  ingredientsInput: string; // The original ingredients text used for generation
  imageUrl?: string;
  dataAiHint?: string;
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

  const [scanTabActiveView, setScanTabActiveView] = useState<'upload' | 'camera'>('upload');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false); 
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'id-ID';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError(null);
          toast({ title: "Mendengarkan...", description: "Sebutkan bahan-bahan Anda." });
        };

        recognitionRef.current.onresult = (event) => {
          const currentTranscript = event.results[event.results.length - 1][0].transcript;
          setIngredientsText(prev => {
            const newText = prev ? `${prev}, ${currentTranscript}` : currentTranscript;
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
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
         setError("Pengenalan suara tidak didukung di browser ini.");
      }
    } else {
      console.warn("Speech recognition not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // activeStream cleanup is handled in the other useEffect
    };
  }, [toast]); 

  useEffect(() => {
    if (inputMode !== 'voice' && isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [inputMode, isListening]);

  const stopActiveStream = useCallback(() => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      console.log("Camera stream stopped.");
    }
  }, [activeStream]);

  useEffect(() => {
    let isEffectMounted = true;

    if (inputMode === 'scan' && scanTabActiveView === 'camera') {
      if (!activeStream) { // Only attempt to initialize if no active stream
        setIsCameraLoading(true);
        setHasCameraPermission(false); // Reset permission status for this attempt
        console.log("Attempting to initialize camera...");

        const initializeCamera = async () => {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (isEffectMounted) {
              toast({
                variant: 'destructive',
                title: 'Kamera Tidak Didukung',
                description: 'Browser Anda tidak mendukung akses kamera.',
              });
              setHasCameraPermission(false);
              setIsCameraLoading(false);
            }
            return;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (isEffectMounted) {
              setActiveStream(stream);
              setHasCameraPermission(true);
              console.log("Camera permission granted and stream acquired.");
              if (videoRef.current) {
                const videoElement = videoRef.current;
                videoElement.srcObject = stream;
                
                let metadataLoaded = false;
                const handleMetadataLoaded = () => {
                  metadataLoaded = true;
                  if (isEffectMounted) {
                    console.log("Video metadata loaded.");
                    setIsCameraLoading(false);
                  }
                };
                videoElement.onloadedmetadata = handleMetadataLoaded;

                videoElement.play()
                  .then(() => {
                    console.log("Video play attempted successfully.");
                    // Fallback: If onloadedmetadata is too slow or doesn't fire,
                    // but play() promise resolves, consider loading done.
                    // This makes the UI responsive faster, handleTakePhoto will gate actual capture.
                    if (isEffectMounted && !metadataLoaded) {
                       // Check if video has dimensions after a short delay, if not, metadata might still be loading
                       setTimeout(() => {
                          if (isEffectMounted && !metadataLoaded && videoElement.videoWidth > 0) {
                            console.log("Video play resolved, video has dimensions. Forcing loading to false as fallback.");
                            setIsCameraLoading(false);
                          } else if (isEffectMounted && !metadataLoaded) {
                            console.log("Video play resolved, but video dimensions not yet available or metadata not loaded.");
                            // It's possible onloadedmetadata will still fire. If not, spinner might persist.
                            // For now, we will rely on onloadedmetadata or explicit error for isCameraLoading=false
                          }
                       }, 500); // Check after 500ms
                    }
                  })
                  .catch(err => {
                    console.error('Error playing video:', err);
                    if (isEffectMounted) {
                      setIsCameraLoading(false);
                      setHasCameraPermission(false); // Assume play error might be related to deeper permission/access issue
                       toast({
                        variant: 'destructive',
                        title: 'Gagal Memutar Video',
                        description: 'Tidak dapat memulai feed kamera. Coba lagi atau periksa izin kamera.',
                      });
                    }
                  });
              } else {
                if (isEffectMounted) setIsCameraLoading(false); // videoRef not available
                console.log("videoRef not current when stream acquired.");
              }
            } else { 
              stream.getTracks().forEach(track => track.stop()); // Cleanup if effect unmounted
              console.log("Effect unmounted before camera could be fully set up.");
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            if (isEffectMounted) {
              setHasCameraPermission(false);
              toast({
                variant: 'destructive',
                title: 'Akses Kamera Ditolak',
                description: 'Mohon aktifkan izin kamera di pengaturan browser Anda.',
              });
              setIsCameraLoading(false);
            }
          }
        };
        initializeCamera();
      } else if (videoRef.current && !videoRef.current.srcObject && activeStream) {
        // Re-attach stream if it exists but video element lost it (e.g. tab re-focus)
        console.log("Re-attaching active stream to video element.");
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(err => console.warn("Error re-playing video:", err));
        setIsCameraLoading(false); // Assume re-attaching is fast
      } else if (activeStream) {
        // Stream is active, video should be playing or ready
        setIsCameraLoading(false);
      }
    } else { // Not in camera mode or scan mode
      stopActiveStream();
      if (isEffectMounted) {
        setIsCameraLoading(false); 
      }
    }

    return () => {
      isEffectMounted = false;
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
      }
      // stopActiveStream() is called when inputMode/scanTabActiveView changes, or on component unmount if needed by main cleanup
    };
  }, [inputMode, scanTabActiveView, activeStream, toast, stopActiveStream]); // Removed cameraInitialized

  // Cleanup stream on component unmount
  useEffect(() => {
    return () => {
      stopActiveStream();
    };
  }, [stopActiveStream]);


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
        // Ensure microphone permission is implicitly checked by starting recognition
        // For some browsers, a separate getUserMedia({audio:true}) might be needed first
        // if direct start() doesn't prompt. But usually, start() handles it.
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting speech recognition', err);
        let userMessage = "Akses mikrofon ditolak atau terjadi error. Mohon aktifkan di pengaturan browser Anda.";
         if ((err as SpeechRecognitionErrorEvent || err as Event ).type === 'error') { // DOMError in some cases
            const speechError = err as SpeechRecognitionErrorEvent;
            if (speechError.error === 'not-allowed' || speechError.error === 'service-not-allowed') {
                 userMessage = "Akses mikrofon ditolak. Mohon aktifkan di pengaturan browser Anda.";
            } else if (speechError.error === 'no-speech') {
                // This is handled by onresult/onerror usually, but catch if start() throws it
                userMessage = "Tidak ada suara terdeteksi. Silakan coba lagi.";
            } else {
                userMessage = `Gagal memulai pengenalan suara: ${speechError.error}`;
            }
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

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Komponen kamera tidak siap. Coba aktifkan ulang tab kamera.");
      toast({ variant: "destructive", title: "Error Kamera", description: "Komponen kamera tidak ditemukan." });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Kamera belum siap atau feed video bermasalah. Mohon tunggu video termuat sepenuhnya dan coba lagi.");
      toast({ variant: "destructive", title: "Kamera Belum Siap", description: "Feed video belum sepenuhnya dimuat. Tunggu beberapa saat dan coba lagi." });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/png'); // Menggunakan PNG untuk kualitas lebih baik dari kamera
      setImagePreview(dataUri);
      setSelectedFile(null); 
      setScanTabActiveView('upload'); 
      stopActiveStream(); 
      setError(null); 
      toast({ title: "Gambar Diambil!", description: "Gambar dari kamera berhasil diambil." });
    } else {
      setError("Gagal mengambil konteks canvas untuk memproses gambar.");
      toast({ variant: "destructive", title: "Error Pengambilan Gambar", description: "Tidak dapat memproses gambar dari kamera." });
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imagePreview) {
      setError("Silakan pilih atau ambil gambar terlebih dahulu.");
      toast({ variant: "destructive", title: "Gambar Tidak Ada", description: "Tidak ada gambar untuk dianalisis." });
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
        title: "Bahan Terdeteksi!",
        description: "Periksa dan edit bahan jika diperlukan.",
      });
    } catch (e) {
      console.error(e);
      setError("Gagal menganalisis gambar. Silakan coba lagi.");
      toast({
        variant: "destructive",
        title: "Error Analisis Gambar",
        description: (e as Error).message || "Terjadi kesalahan tidak diketahui.",
      });
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!ingredientsText.trim()) {
      setError("Silakan masukkan atau deteksi beberapa bahan terlebih dahulu.");
      toast({ variant: "destructive", title: "Bahan Kosong", description: "Masukkan bahan sebelum membuat resep." });
      return;
    }
    setIsLoadingRecipe(true);
    setError(null);
    setRecipe(null);
    try {
      const result: GenerateRecipeOutput = await generateRecipe({ ingredients: ingredientsText });
      setRecipe(result);
      toast({
        title: "Resep Dihasilkan!",
        description: `Nikmati ${result.recipeName} Anda!`,
      });
    } catch (e) {
      console.error("Error di handleGenerateRecipe:", e);
      const errorMessage = (e instanceof Error) ? e.message : "Terjadi kesalahan tidak diketahui saat menghasilkan resep.";
      setError(`Gagal menghasilkan resep: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Error Pembuatan Resep",
        description: errorMessage,
      });
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleSaveRecipe = () => {
    if (recipe) {
      const newRecipeToSave: SavedRecipe = {
        ...recipe,
        id: new Date().toISOString(),
        dateSaved: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
        ingredientsInput: ingredientsText,
        // imageUrl and dataAiHint are not explicitly set here, relying on potential future enhancements
        // For now, they will be undefined when saving.
      };

      try {
        const existingRecipesRaw = localStorage.getItem('scrapchef_recipes');
        const existingRecipes: SavedRecipe[] = existingRecipesRaw ? JSON.parse(existingRecipesRaw) : [];
        
        const isDuplicate = existingRecipes.some(r => r.recipeName === newRecipeToSave.recipeName && r.ingredientsInput === newRecipeToSave.ingredientsInput);
        if (isDuplicate) {
            toast({
                variant: "default",
                title: "Resep Sudah Disimpan",
                description: `${recipe.recipeName} dengan bahan serupa sepertinya sudah ada di riwayat Anda.`,
            });
            return;
        }

        existingRecipes.unshift(newRecipeToSave); 
        localStorage.setItem('scrapchef_recipes', JSON.stringify(existingRecipes));
        toast({
          title: "Resep Disimpan!",
          description: `${recipe.recipeName} telah berhasil disimpan ke riwayat Anda.`,
        });
      } catch (error) {
        console.error("Gagal menyimpan resep ke local storage:", error);
        toast({
          variant: "destructive",
          title: "Gagal Menyimpan Resep",
          description: "Terjadi kesalahan saat mencoba menyimpan resep Anda.",
        });
      }
    } else {
        toast({
            variant: "destructive",
            title: "Tidak Ada Resep",
            description: "Tidak ada resep untuk disimpan.",
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
          <ThemeToggleButton />
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center space-x-2">
              <ChefHat className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-primary">ScrapChef</h1>
            </div>
            <p className="text-muted-foreground mt-2">Resep Instan dari Sisa Bahan Kulkas Anda!</p>
          </div>
          <div className="flex items-center space-x-2">
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
                <CardTitle>Scan Bahan</CardTitle>
                <CardDescription>Pilih metode scan: unggah file atau gunakan kamera langsung.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2 mb-4">
                  <Button 
                    variant={scanTabActiveView === 'upload' ? 'default' : 'outline'} 
                    onClick={() => {
                        setScanTabActiveView('upload');
                        stopActiveStream(); // Stop camera if switching from camera view
                    }}
                    className="flex-1"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" /> Unggah File
                  </Button>
                  <Button 
                    variant={scanTabActiveView === 'camera' ? 'default' : 'outline'} 
                    onClick={() => {
                      setScanTabActiveView('camera');
                      setImagePreview(null); 
                      setSelectedFile(null);
                      // Initialization will be triggered by useEffect
                    }}
                    className="flex-1"
                  >
                    <Video className="mr-2 h-4 w-4" /> Kamera Langsung
                  </Button>
                </div>

                {scanTabActiveView === 'upload' && (
                  <div>
                    <Input type="file" accept="image/*" onChange={handleFileChange} className="file:text-primary file:font-semibold" data-ai-hint="food items various" />
                    {imagePreview && (
                      <div className="mt-4 border rounded-md overflow-hidden aspect-video relative w-full">
                        <Image src={imagePreview} alt="Pratinjau Bahan" layout="fill" objectFit="contain" data-ai-hint="food ingredients preview"/>
                      </div>
                    )}
                  </div>
                )}

                {scanTabActiveView === 'camera' && (
                  <div className="space-y-4">
                    <div className="border rounded-md overflow-hidden aspect-video relative w-full bg-muted flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline data-ai-hint="live camera feed" />
                      {isCameraLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>}
                    </div>
                    
                    {!isCameraLoading && !hasCameraPermission && scanTabActiveView === 'camera' && ( 
                       <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Akses Kamera Diperlukan</AlertTitle>
                          <AlertDescription>
                            Izinkan akses kamera di browser Anda untuk menggunakan fitur ini. Jika sudah diizinkan dan masih bermasalah, coba muat ulang halaman atau pilih ulang tab kamera.
                          </AlertDescription>
                        </Alert>
                    )}

                    <Button onClick={handleTakePhoto} disabled={isCameraLoading || !hasCameraPermission || !activeStream} className="w-full" data-ai-hint="capture ingredient photo">
                      <Camera className="mr-2 h-4 w-4" /> Ambil Gambar
                    </Button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden"></canvas> 
                
                {/* Tombol analisis muncul jika mode upload ATAU jika sudah ada imagePreview (dari kamera) */}
                {(scanTabActiveView === 'upload' || imagePreview) && ( 
                  <Button onClick={handleAnalyzeImage} disabled={isLoadingIngredients || !imagePreview} className="w-full mt-4">
                    {isLoadingIngredients ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analisis Gambar
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Masukkan Bahan Secara Manual</CardTitle>
                <CardDescription>Ketik bahan-bahan yang Anda miliki, pisahkan dengan koma.</CardDescription>
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
                <CardDescription>Klik tombol di bawah dan sebutkan bahan-bahan Anda satu per satu. Bicara dengan jelas.</CardDescription>
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
        
        {(ingredientsText || inputMode === 'text' || inputMode === 'voice' || (inputMode === 'scan' && imagePreview) || (inputMode === 'scan' && scanTabActiveView === 'camera')) && (
          <Card className="mt-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5 text-primary"/> Bahan-bahan Anda</CardTitle>
              <CardDescription>
                {ingredientsText ? "Periksa dan edit daftar bahan Anda di bawah ini." : 
                  inputMode === 'scan' && scanTabActiveView === 'camera' && isCameraLoading ? "Memuat kamera..." :
                  inputMode === 'scan' && scanTabActiveView === 'camera' && !hasCameraPermission ? "Izinkan akses kamera atau periksa izin di browser Anda." :
                  inputMode === 'scan' && scanTabActiveView === 'camera' && hasCameraPermission ? "Arahkan kamera ke bahan dan ambil gambar, atau unggah file." :
                  inputMode === 'scan' && scanTabActiveView === 'upload' && !imagePreview ? "Unggah gambar bahan Anda." :
                  inputMode === 'voice' ? "Mulai berbicara untuk menambahkan bahan atau edit di bawah." :
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

    
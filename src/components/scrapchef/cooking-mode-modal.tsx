
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from "lucide-react";
import type { GenerateRecipeOutput } from "@/ai/flows/generate-recipe";
import { useToast } from "@/hooks/use-toast"; // Ditambahkan untuk notifikasi

interface CookingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: GenerateRecipeOutput;
}

export default function CookingModeModal({ isOpen, onClose, recipe }: CookingModeModalProps) {
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const { toast } = useToast(); // Inisialisasi toast

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID'; // Atur bahasa untuk konsistensi jika didukung
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error("Speech synthesis error:", event.error, "Event object:", event);
        setIsSpeaking(false);

        // Jangan tampilkan toast untuk 'canceled' atau 'interrupted' karena bisa jadi operasi normal
        if (event.error === 'canceled' || event.error === 'interrupted') {
          return;
        }

        let userMessage = "Gagal membacakan langkah.";
        switch (event.error) {
          case 'audio-busy':
            userMessage = "Audio perangkat sedang sibuk. Silakan coba lagi.";
            break;
          case 'audio-hardware':
            userMessage = "Terjadi masalah dengan perangkat keras audio Anda.";
            break;
          case 'network':
            userMessage = "Kesalahan jaringan. Pembacaan suara mungkin memerlukan koneksi internet.";
            break;
          case 'synthesis-unavailable':
          case 'synthesis-failed':
            userMessage = "Tidak dapat memproses suara untuk langkah ini.";
            break;
          case 'language-unavailable':
            userMessage = "Bahasa yang diperlukan untuk pembacaan suara tidak tersedia di perangkat Anda.";
            break;
          case 'voice-unavailable':
            userMessage = "Suara yang diperlukan untuk pembacaan tidak tersedia di perangkat Anda.";
            break;
          default:
            userMessage = `Terjadi kesalahan saat mencoba membacakan langkah (${event.error || 'tidak diketahui'}).`;
        }
        toast({
          variant: "destructive",
          title: "Kesalahan Pembacaan Suara",
          description: userMessage,
        });
      };

      window.speechSynthesis.cancel(); // Batalkan ucapan sebelumnya
      window.speechSynthesis.speak(utterance);
    }
  }, [toast]); // Tambahkan toast sebagai dependensi useCallback

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    if (recipe.instructions) {
      const parsedSteps = recipe.instructions
        .split(/\n(?=\d+\.\s|-\s|\*\s)/) 
        .map(step => step.trim().replace(/^(\d+\.\s*|-\s*|\*\s*)/, '').trim())
        .filter(step => step.length > 0);
      
      if (parsedSteps.length > 0) {
        setSteps(parsedSteps);
      } else {
        setSteps(recipe.instructions.split('\n').map(s => s.trim()).filter(s => s.length > 0));
      }
    } else {
      setSteps([]);
    }
    setCurrentStepIndex(0);
  }, [recipe.instructions]);

  useEffect(() => {
    if (isOpen && isTtsEnabled && steps.length > 0 && steps[currentStepIndex]) {
      speak(steps[currentStepIndex]);
    } else {
      stopSpeaking(); 
    }
  }, [isOpen, isTtsEnabled, currentStepIndex, steps, speak, stopSpeaking]);

  useEffect(() => {
    return () => {
      if (isSpeaking) { 
        stopSpeaking();
      }
    };
  }, [stopSpeaking, isSpeaking]);
  
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
    }
  }, [isOpen, stopSpeaking]);


  const handleNextStep = () => {
    setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handlePreviousStep = () => {
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  };

  const toggleTts = () => {
    setIsTtsEnabled(prev => {
      const newState = !prev;
      if (!newState) { 
        stopSpeaking();
      }
      return newState;
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        stopSpeaking(); 
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl text-primary">{recipe.recipeName} - Mode Memasak</DialogTitle>
          {steps.length > 0 && (
             <DialogDescription>
                Langkah {currentStepIndex + 1} dari {steps.length}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="p-6 min-h-[200px] max-h-[60vh] overflow-y-auto">
          {steps.length > 0 ? (
            <p className="text-lg leading-relaxed">{steps[currentStepIndex]}</p>
          ) : (
            <p className="text-muted-foreground">Tidak ada instruksi tersedia atau format instruksi tidak dapat dipecah menjadi langkah-langkah.</p>
          )}
        </div>
        <DialogFooter className="p-6 pt-2 flex flex-col sm:flex-row justify-between items-center w-full border-t">
          <div className="flex gap-2 w-full sm:w-auto mb-4 sm:mb-0">
            <Button variant="outline" onClick={handlePreviousStep} disabled={currentStepIndex === 0 || steps.length === 0} className="flex-1 sm:flex-none">
              <ChevronLeft className="mr-2 h-4 w-4" /> Sebelumnya
            </Button>
            <Button variant="outline" onClick={handleNextStep} disabled={currentStepIndex === steps.length - 1 || steps.length === 0} className="flex-1 sm:flex-none">
              Berikutnya <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={toggleTts} className="w-auto" title={isTtsEnabled ? "Matikan suara" : "Aktifkan suara"}>
              {isTtsEnabled ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              <span className="sr-only">{isTtsEnabled ? "Matikan Suara" : "Aktifkan Suara"}</span>
            </Button>
            <Button variant="ghost" onClick={() => {
              stopSpeaking(); 
              onClose();
            }} className="w-auto">
              <X className="mr-2 h-4 w-4" /> Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


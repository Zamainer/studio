
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Volume2, VolumeX } from "lucide-react";
import type { GenerateRecipeOutput } from "@/ai/flows/generate-recipe";

interface CookingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: GenerateRecipeOutput;
}

export default function CookingModeModal({ isOpen, onClose, recipe }: CookingModeModalProps) {
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(true); // TTS is now enabled by default
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        console.error("Speech synthesis error:", utterance.error);
        setIsSpeaking(false);
      }
      window.speechSynthesis.cancel(); // Cancel any previous speech
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  useEffect(() => {
    if (recipe.instructions) {
      // Improved regex to handle various list markers (numbers, hyphens, asterisks)
      // and ensure it doesn't split mid-sentence if a number appears.
      // It looks for a newline followed by a number/bullet and a space.
      const parsedSteps = recipe.instructions
        .split(/\n(?=\d+\.\s|-\s|\*\s)/) 
        .map(step => step.trim().replace(/^(\d+\.\s*|-\s*|\*\s*)/, '').trim()) // Remove list markers and trim
        .filter(step => step.length > 0);
      
      if (parsedSteps.length > 0) {
        setSteps(parsedSteps);
      } else {
        // Fallback if no specific list markers are found, split by newline
        setSteps(recipe.instructions.split('\n').map(s => s.trim()).filter(s => s.length > 0));
      }
    } else {
      setSteps([]);
    }
    setCurrentStepIndex(0); // Reset to first step when recipe changes
  }, [recipe.instructions]);

  useEffect(() => {
    if (isOpen && isTtsEnabled && steps.length > 0 && steps[currentStepIndex]) {
      speak(steps[currentStepIndex]);
    } else {
      stopSpeaking(); // Stop speaking if modal is closed, TTS disabled, or no steps
    }
  }, [isOpen, isTtsEnabled, currentStepIndex, steps, speak, stopSpeaking]);

  // Cleanup speech synthesis on component unmount or when modal closes
  useEffect(() => {
    return () => {
      if (isSpeaking) { // Ensure speech is stopped if component unmounts while speaking
        stopSpeaking();
      }
    };
  }, [stopSpeaking, isSpeaking]);
  
  // Specific cleanup for when the modal is closed
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
      if (!newState) { // If TTS is being turned off
        stopSpeaking();
      }
      // If TTS is being turned on and modal is open, speech will be triggered by the other useEffect
      return newState;
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        stopSpeaking(); // Ensure speech stops when dialog is closed via X or overlay click
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl text-primary">{recipe.recipeName} - Cooking Mode</DialogTitle>
          {steps.length > 0 && (
             <DialogDescription>
                Step {currentStepIndex + 1} of {steps.length}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="p-6 min-h-[200px] max-h-[60vh] overflow-y-auto">
          {steps.length > 0 ? (
            <p className="text-lg leading-relaxed">{steps[currentStepIndex]}</p>
          ) : (
            <p className="text-muted-foreground">No instructions available or instructions are not formatted into steps.</p>
          )}
        </div>
        <DialogFooter className="p-6 pt-2 flex flex-col sm:flex-row justify-between items-center w-full border-t">
          <div className="flex gap-2 w-full sm:w-auto mb-4 sm:mb-0">
            <Button variant="outline" onClick={handlePreviousStep} disabled={currentStepIndex === 0 || steps.length === 0} className="flex-1 sm:flex-none">
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" onClick={handleNextStep} disabled={currentStepIndex === steps.length - 1 || steps.length === 0} className="flex-1 sm:flex-none">
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={toggleTts} className="w-auto" title={isTtsEnabled ? "Mute speech" : "Enable speech"}>
              {isTtsEnabled ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              <span className="sr-only">{isTtsEnabled ? "Mute" : "Speak"}</span>
            </Button>
            <Button variant="ghost" onClick={() => {
              stopSpeaking(); // Ensure speech stops when closing with button
              onClose();
            }} className="w-auto">
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

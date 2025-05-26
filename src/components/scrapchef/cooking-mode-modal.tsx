"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GenerateRecipeOutput } from "@/ai/flows/generate-recipe";

interface CookingModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: GenerateRecipeOutput;
}

export default function CookingModeModal({ isOpen, onClose, recipe }: CookingModeModalProps) {
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  useEffect(() => {
    if (recipe.instructions) {
      // Attempt to parse steps. This might need refinement based on AI output format.
      // Common patterns: numbered list (1.), dashed list (-), or just newlines.
      const parsedSteps = recipe.instructions
        .split(/\n(?=\d+\.|\-|\*)/) // Split on newlines followed by a list marker
        .map(step => step.trim())
        .filter(step => step.length > 0);
      
      if (parsedSteps.length > 1) {
        setSteps(parsedSteps);
      } else {
        // Fallback if complex parsing fails, just split by newline
        setSteps(recipe.instructions.split('\n').map(s => s.trim()).filter(s => s.length > 0));
      }
    } else {
      setSteps([]);
    }
    setCurrentStepIndex(0);
  }, [recipe.instructions]);

  const handleNextStep = () => {
    setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handlePreviousStep = () => {
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handlePreviousStep} disabled={currentStepIndex === 0 || steps.length === 0} className="flex-1 sm:flex-none">
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" onClick={handleNextStep} disabled={currentStepIndex === steps.length - 1 || steps.length === 0} className="flex-1 sm:flex-none">
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose} className="mt-4 sm:mt-0">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

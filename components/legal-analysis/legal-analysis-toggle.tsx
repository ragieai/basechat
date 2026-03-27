"use client";

import { BookOpen, ChevronRight, X } from "lucide-react";
import { useState } from "react";

import { LegalAnalysisContent } from "./legal-analysis-content";
import { Button } from "@/components/ui/button";
import { PracticeArea } from "@/lib/legal-analysis/types";

interface LegalAnalysisToggleProps {
  practiceArea?: PracticeArea;
}

/**
 * Toggle button and slide-out panel for Legal Analysis content
 */
export function LegalAnalysisToggle({ practiceArea }: LegalAnalysisToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
        title="View legal analysis and insights"
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden sm:inline">Legal Thoughts</span>
      </Button>

      {/* Slide-over Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-xl z-50 overflow-y-auto transition-transform duration-300 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Legal Thoughts
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4">
              <LegalAnalysisContent
                filters={practiceArea ? { practiceArea } : undefined}
                className="space-y-6"
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Desktop inline version - displays as a collapsible sidebar section
 */
export function LegalAnalysisSidebar({ practiceArea }: LegalAnalysisToggleProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isExpanded) {
    return (
      <div className="w-12 border-l bg-muted/30 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="p-2 h-auto"
          title="Show legal analysis"
        >
          <BookOpen className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[320px] border-l bg-muted/30 overflow-y-auto">
      <div className="sticky top-0 bg-muted/30 border-b px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Legal Thoughts
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="p-1 h-auto"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4">
        <LegalAnalysisContent
          filters={practiceArea ? { practiceArea } : undefined}
          className="space-y-4"
        />
      </div>
    </div>
  );
}

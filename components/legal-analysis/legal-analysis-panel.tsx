"use client";

import { BookOpen, ChevronRight, Clock, User } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LegalAnalysis,
  LegalAnalysisFilters,
  PRACTICE_AREA_LABELS,
  PracticeArea,
} from "@/lib/legal-analysis/types";

interface LegalAnalysisPanelProps {
  analyses: LegalAnalysis[];
  filters?: LegalAnalysisFilters;
  onFilterChange?: (filters: LegalAnalysisFilters) => void;
  className?: string;
}

export function LegalAnalysisPanel({
  analyses,
  filters,
  onFilterChange,
  className,
}: LegalAnalysisPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (analyses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No legal analysis content available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Legal Thoughts</h2>
        <span className="text-sm text-muted-foreground">{analyses.length} articles</span>
      </div>

      <div className="space-y-3">
        {analyses.map((analysis) => (
          <LegalAnalysisCard
            key={analysis.id}
            analysis={analysis}
            isExpanded={expandedId === analysis.id}
            onToggle={() => handleCardClick(analysis.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface LegalAnalysisCardProps {
  analysis: LegalAnalysis;
  isExpanded: boolean;
  onToggle: () => void;
}

function LegalAnalysisCard({ analysis, isExpanded, onToggle }: LegalAnalysisCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isExpanded ? "ring-2 ring-primary" : ""
      }`}
      onClick={onToggle}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-medium">{analysis.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{analysis.excerpt}</CardDescription>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-muted-foreground transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{analysis.author.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{analysis.readTimeMinutes} min read</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{PRACTICE_AREA_LABELS[analysis.practiceArea as PracticeArea]}</span>
          </div>
        </div>

        {analysis.featured && (
          <div className="mt-2">
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
              Featured
            </span>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="border-t pt-4 mt-2">
            <div className="prose prose-sm max-w-none">
              <div
                className="text-sm text-muted-foreground whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: analysis.content }}
              />
            </div>

            {analysis.tags && analysis.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {analysis.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Published {new Date(analysis.publishedAt).toLocaleDateString()}
              </div>
              <button
                className="text-sm text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  // Future: navigate to full article page
                }}
              >
                Read full analysis
              </button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

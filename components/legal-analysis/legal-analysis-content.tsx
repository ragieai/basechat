import { LegalAnalysisPanel } from "./legal-analysis-panel";
import { getLegalAnalyses } from "@/lib/legal-analysis/data";
import { LegalAnalysisFilters } from "@/lib/legal-analysis/types";

interface LegalAnalysisContentProps {
  filters?: LegalAnalysisFilters;
  className?: string;
}

/**
 * Server component that fetches legal analysis data
 * and renders the panel
 */
export async function LegalAnalysisContent({ filters, className }: LegalAnalysisContentProps) {
  const analyses = getLegalAnalyses(filters);

  return <LegalAnalysisPanel analyses={analyses} className={className} />;
}

import { z } from "zod";

/**
 * Practice areas for legal content organization
 * Based on standard CLE categorization
 */
export const practiceAreaSchema = z.enum([
  "administrative-law",
  "alternative-dispute-resolution",
  "antitrust",
  "appellate-practice",
  "bankruptcy",
  "business-law",
  "civil-rights",
  "construction-law",
  "consumer-protection",
  "corporate-law",
  "criminal-law",
  "employment-law",
  "environmental-law",
  "estate-planning",
  "family-law",
  "healthcare-law",
  "immigration-law",
  "insurance-law",
  "intellectual-property",
  "international-law",
  "labor-law",
  "litigation",
  "municipal-law",
  "personal-injury",
  "product-liability",
  "professional-responsibility",
  "real-estate",
  "securities-law",
  "tax-law",
  "technology-law",
  "trusts-estates",
  "workers-compensation",
]);

export type PracticeArea = z.infer<typeof practiceAreaSchema>;

export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  "administrative-law": "Administrative Law",
  "alternative-dispute-resolution": "Alternative Dispute Resolution",
  antitrust: "Antitrust",
  "appellate-practice": "Appellate Practice",
  bankruptcy: "Bankruptcy",
  "business-law": "Business Law",
  "civil-rights": "Civil Rights",
  "construction-law": "Construction Law",
  "consumer-protection": "Consumer Protection",
  "corporate-law": "Corporate Law",
  "criminal-law": "Criminal Law",
  "employment-law": "Employment Law",
  "environmental-law": "Environmental Law",
  "estate-planning": "Estate Planning",
  "family-law": "Family Law",
  "healthcare-law": "Healthcare Law",
  "immigration-law": "Immigration Law",
  "insurance-law": "Insurance Law",
  "intellectual-property": "Intellectual Property",
  "international-law": "International Law",
  "labor-law": "Labor Law",
  litigation: "Litigation",
  "municipal-law": "Municipal Law",
  "personal-injury": "Personal Injury",
  "product-liability": "Product Liability",
  "professional-responsibility": "Professional Responsibility",
  "real-estate": "Real Estate",
  "securities-law": "Securities Law",
  "tax-law": "Tax Law",
  "technology-law": "Technology Law",
  "trusts-estates": "Trusts & Estates",
  "workers-compensation": "Workers' Compensation",
};

/**
 * Legal analysis content schema
 * Represents editorial thought pieces and analysis
 */
export const legalAnalysisSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(), // Short summary for cards
  content: z.string(), // Full markdown/HTML content
  practiceArea: practiceAreaSchema,
  author: z.object({
    name: z.string(),
    title: z.string().optional(),
    firm: z.string().optional(),
    imageUrl: z.string().optional(),
  }),
  publishedAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  readTimeMinutes: z.number().int().positive(),
  tags: z.array(z.string()).optional(),
  relatedClassIds: z.array(z.string()).optional(), // Links to CLE classes
  featured: z.boolean().default(false),
});

export type LegalAnalysis = z.infer<typeof legalAnalysisSchema>;

/**
 * Filter options for legal analysis content
 */
export interface LegalAnalysisFilters {
  practiceArea?: PracticeArea;
  searchQuery?: string;
  featured?: boolean;
  tags?: string[];
}

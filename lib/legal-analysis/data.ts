import { LegalAnalysis } from "./types";

/**
 * Sample legal analysis content
 *
 * This is a placeholder data source. In production, this would be replaced by:
 * - Payload CMS collection
 * - Airtable API
 * - Database-backed content system
 *
 * To add content, simply add new entries to this array.
 */
export const legalAnalyses: LegalAnalysis[] = [
  {
    id: "la-001",
    title: "Recent Developments in Employment Law: What Practitioners Need to Know",
    excerpt:
      "A comprehensive review of recent case law and regulatory changes affecting employment practice, including remote work considerations and evolving classification standards.",
    content: `
## Overview

The landscape of employment law continues to evolve rapidly, particularly in the post-pandemic era. This analysis examines key developments that every employment law practitioner should understand.

## Remote Work and Jurisdictional Issues

The shift to remote work has created novel jurisdictional questions...

## Worker Classification Standards

Recent decisions have clarified the independent contractor vs. employee analysis...

## Practical Takeaways

1. Review client policies for remote work compliance
2. Update classification analyses in light of new standards
3. Consider multi-jurisdictional implications
`,
    practiceArea: "employment-law",
    author: {
      name: "Jane Smith",
      title: "Partner",
      firm: "Employment Law Group",
    },
    publishedAt: "2025-03-15T10:00:00Z",
    readTimeMinutes: 8,
    featured: true,
    tags: ["remote work", "worker classification", "compliance"],
  },
  {
    id: "la-002",
    title: "Intellectual Property Considerations in AI-Generated Content",
    excerpt:
      "As AI tools become ubiquitous in content creation, practitioners must navigate unsettled questions around copyrightability and infringement.",
    content: `
## The Current State of AI and Copyright

The Copyright Office has issued guidance on AI-generated works...

## Key Cases to Watch

Several pending cases will shape the future of AI copyright law...

## Recommendations for Clients

Practitioners should advise clients on protective measures...
`,
    practiceArea: "intellectual-property",
    author: {
      name: "Michael Chen",
      title: "IP Practice Chair",
    },
    publishedAt: "2025-03-10T14:30:00Z",
    readTimeMinutes: 12,
    featured: true,
    tags: ["AI", "copyright", "technology"],
  },
  {
    id: "la-003",
    title: "Healthcare Regulatory Update: Telehealth Compliance After the Public Health Emergency",
    excerpt:
      "With the end of the public health emergency, healthcare providers face new compliance requirements for telehealth services.",
    content: `
## Regulatory Changes

The expiration of pandemic-era waivers has significant implications...

## State-by-State Variations

Telehealth licensing requirements vary significantly...

## Compliance Checklist

Providers should ensure they meet all applicable requirements...
`,
    practiceArea: "healthcare-law",
    author: {
      name: "Sarah Johnson",
      title: "Healthcare Regulatory Counsel",
    },
    publishedAt: "2025-03-01T09:00:00Z",
    readTimeMinutes: 10,
    tags: ["telehealth", "compliance", "licensing"],
  },
  {
    id: "la-004",
    title: "Corporate Governance Trends in 2025",
    excerpt:
      "ESG considerations, board diversity, and stakeholder governance continue to reshape corporate law practice.",
    content: `
## ESG Disclosure Requirements

New SEC rules have transformed the ESG disclosure landscape...

## Board Composition and Oversight

Courts continue to emphasize the importance of board oversight...

## Stakeholder Governance Models

The debate between shareholder and stakeholder primacy evolves...
`,
    practiceArea: "corporate-law",
    author: {
      name: "Robert Williams",
      title: "Corporate Governance Partner",
    },
    publishedAt: "2025-02-20T11:00:00Z",
    readTimeMinutes: 15,
    featured: true,
    tags: ["ESG", "board governance", "SEC"],
  },
  {
    id: "la-005",
    title: "Data Privacy Enforcement: Lessons from Recent Actions",
    excerpt:
      "Analysis of recent enforcement actions provides insights into regulator priorities and compliance expectations.",
    content: `
## FTC Enforcement Priorities

Recent FTC actions reveal key focus areas...

## State Privacy Laws

The patchwork of state laws creates compliance challenges...

## Best Practices

Organizations should implement comprehensive privacy programs...
`,
    practiceArea: "technology-law",
    author: {
      name: "Emily Davis",
      title: "Privacy Practice Lead",
    },
    publishedAt: "2025-02-15T16:00:00Z",
    readTimeMinutes: 9,
    tags: ["privacy", "FTC", "data protection"],
  },
];

/**
 * Get legal analyses with optional filtering
 */
export function getLegalAnalyses(filters?: {
  practiceArea?: string;
  featured?: boolean;
  searchQuery?: string;
}): LegalAnalysis[] {
  let results = [...legalAnalyses];

  if (filters?.practiceArea) {
    results = results.filter((la) => la.practiceArea === filters.practiceArea);
  }

  if (filters?.featured) {
    results = results.filter((la) => la.featured);
  }

  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    results = results.filter(
      (la) =>
        la.title.toLowerCase().includes(query) ||
        la.excerpt.toLowerCase().includes(query) ||
        la.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  // Sort by published date (newest first)
  return results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Get a single legal analysis by ID
 */
export function getLegalAnalysisById(id: string): LegalAnalysis | undefined {
  return legalAnalyses.find((la) => la.id === id);
}

/**
 * Get all unique practice areas that have content
 */
export function getPracticeAreasWithContent(): string[] {
  return [...new Set(legalAnalyses.map((la) => la.practiceArea))];
}

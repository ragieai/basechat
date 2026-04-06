# Legal Analysis Panel ("Legal Thoughts")

A collapsible side panel that displays editorial legal analysis content alongside the chat interface.

## Features

- **Practice Area Organization**: Content is organized by 38 legal practice areas
- **Expandable Cards**: Click to expand and read full analysis excerpts
- **Author Information**: Displays author name, title, and firm
- **Read Time**: Shows estimated reading time for each article
- **Featured Content**: Highlights featured analyses
- **Tag Filtering**: Content can be filtered by tags
- **Responsive Design**: Works as slide-over panel on mobile, inline sidebar on desktop

## File Structure

```
components/legal-analysis/
├── index.ts                          # Public exports
├── legal-analysis-panel.tsx          # Main panel component (client)
├── legal-analysis-content.tsx        # Server component for data fetching
├── legal-analysis-toggle.tsx         # Toggle button and slide-out panel
├── README.md                         # This file
└── ...

lib/legal-analysis/
├── types.ts                          # TypeScript types and schemas
├── data.ts                           # Sample content (replace with CMS)
└── ...
```

## Data Source

Currently uses static JSON data in `lib/legal-analysis/data.ts`. To integrate with a CMS:

### Payload CMS

```typescript
// lib/legal-analysis/payload.ts
import { getPayloadClient } from '@/lib/payload'

export async function getLegalAnalyses(filters) {
  const payload = await getPayloadClient()
  const results = await payload.find({
    collection: 'legal-analyses',
    where: {
      ...(filters.practiceArea && {
        practiceArea: { equals: filters.practiceArea }
      }),
      ...(filters.featured && {
        featured: { equals: true }
      })
    }
  })
  return results.docs
}
```

### Airtable

```typescript
// lib/legal-analysis/airtable.ts
import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID)

export async function getLegalAnalyses(filters) {
  const records = await base('LegalAnalyses').select({
    filterByFormula: buildFilterFormula(filters)
  }).all()

  return records.map(record => mapToLegalAnalysis(record))
}
```

## Usage

### In Header (Global Toggle)

```tsx
import { LegalAnalysisToggle } from '@/components/legal-analysis'

export function Header() {
  return (
    <header>
      <LegalAnalysisToggle />
    </header>
  )
}
```

### With Practice Area Filter

```tsx
import { LegalAnalysisToggle } from '@/components/legal-analysis'
import { PracticeArea } from '@/lib/legal-analysis/types'

export function ClassPage({ practiceArea }: { practiceArea: PracticeArea }) {
  return (
    <aside>
      <LegalAnalysisToggle practiceArea={practiceArea} />
    </aside>
  )
}
```

### Inline Sidebar (Desktop)

```tsx
import { LegalAnalysisSidebar } from '@/components/legal-analysis'

export function ConversationLayout() {
  return (
    <div className="flex">
      <main>...</main>
      <LegalAnalysisSidebar />
    </div>
  )
}
```

## Adding Content

### Via Data File (Quick Start)

Edit `lib/legal-analysis/data.ts`:

```typescript
export const legalAnalyses: LegalAnalysis[] = [
  {
    id: "la-006",
    title: "Your Article Title",
    excerpt: "Brief summary...",
    content: `Full markdown content...`,
    practiceArea: "employment-law",
    author: {
      name: "Author Name",
      title: "Partner",
      firm: "Law Firm",
    },
    publishedAt: "2025-03-20T10:00:00Z",
    readTimeMinutes: 8,
    featured: true,
    tags: ["tag1", "tag2"],
  },
  // ... more articles
]
```

### Practice Areas

Available practice area keys:

```typescript
"administrative-law"
"alternative-dispute-resolution"
"antitrust"
"appellate-practice"
"bankruptcy"
"business-law"
"civil-rights"
"construction-law"
"consumer-protection"
"corporate-law"
"criminal-law"
"employment-law"
"environmental-law"
"estate-planning"
"family-law"
"healthcare-law"
"immigration-law"
"insurance-law"
"intellectual-property"
"international-law"
"labor-law"
"litigation"
"municipal-law"
"personal-injury"
"product-liability"
"professional-responsibility"
"real-estate"
"securities-law"
"tax-law"
"technology-law"
"trusts-estates"
"workers-compensation"
```

## Styling

Uses existing Base Chat design system:
- Radix UI components
- Tailwind CSS
- Lucide icons

To customize colors or spacing, modify the component classes or update `tailwind.config.ts`.

## Future Enhancements

- [ ] Full article page with slug-based routing
- [ ] Search functionality across all analyses
- [ ] Related content suggestions
- [ ] Bookmark/favorite functionality
- [ ] Print/export to PDF
- [ ] Social sharing
- [ ] Comment/annotation system
- [ ] CLE credit tracking integration

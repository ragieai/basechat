# Memex Memory Rules (OpenMemory MCP)

## Goals

- Persist key project knowledge across chats (decisions, statuses, contacts, links, environments).
- Retrieve the most relevant prior context automatically on each turn.
- Keep memories concise, structured, and attributable (who/when/source).

## Tools

- `search_memory(userId, query, filters?, threshold?)`
- `add_memories(userId, content, metadata?)`
- `list_memories(userId)`
- `delete_all_memories(userId)` ← dev-only, never call without explicit user request.

Use `userId: "john"` unless another id is provided in session context.

---

## When to **Search** (always do this first)

On **every user message**, extract entities (project, repo, ticket, person, env, service) and call:

```json
search_memory({
  "userId": "john",
  "query": "<concise query built from the user’s message>",
  "filters": {
    "tenant": "LineLead",
    "project": "<active project name>",
    "repo": "<repo or path>",
    "service": "<service/component>",
    "sprint": "<sprint tag>",
    "store": "<store id>",
    "station": "<station name>"
  },
  "threshold": 0.2
})
```

- Prefer **anchored search → widen**: start with the most specific filters; if no results, drop one filter at a time.
- Summarize results into the reply. Show provenance: `(memory • <date> • <project>/<service>)`.

---

## When to **Write** (`add_memories`)

Write only when one of these is true:

1. User explicitly says _remember/save/log/note_.
2. A **decision** is made or confirmed.
3. A **status change** or **deadline** is set.
4. **New entity/contact/endpoint/credential placeholder** is introduced.
5. A **correction** to prior memory is given (then write a superseding memory).

Do **not** write speculative or low-confidence content.

Create **short, declarative** content (one idea per memory). Include `metadata` per the schema below.

---

## Memory Metadata Schema

Use these keys to make memories queryable and scannable.

```json
{
  "tenant": "LineLead",
  "project": "Line Lead",
  "repo": "line_lead/app",
  "service": "api",
  "area": "auth|billing|infra|ui",
  "ticket": "LL-142",
  "env": "dev|staging|prod|local",
  "person": "Jimmy Feeman",
  "company": "Donatos",
  "kind": "decision|status|fact|contact|procedure|link|endpoint|definition|todo",
  "status": "planned|in-progress|blocked|done",
  "due": "2025-09-30",
  "date": "2025-08-27",
  "lto": "2025-09-01",
  "store": "112",
  "station": "Grill",
  "tags": ["rollout", "migration"],
  "source": "memex://chat/abc123#msg45",
  "expiresAt": "2026-01-01"
}
```

**Conventions**

- Use `kind` + one of `status|decision|fact|contact|link|endpoint|definition|procedure|todo`.
- For sensitive data, store **placeholders** (e.g., “API key stored in 1Password vault ‘LineLead’”)—never raw secrets.
- Set `expiresAt` for time-bound info (e.g., feature flags, LTOs, temporary workarounds).

---

## Write Patterns (examples)

### Decision

```json
add_memories({
  "userId": "john",
  "content": "Decision: migrate auth service to Postgres 16; feature flag rollout in two phases.",
  "metadata": {
    "tenant": "LineLead", "project": "Line Lead", "service": "auth", "area": "infra",
    "kind": "decision", "date": "2025-08-27", "tags": ["migration","feature-flag"],
    "source": "<memex message link>"
  }
})
```

### Status

```json
add_memories({
  "userId": "john",
  "content": "Status: Order webhooks blocked by Donatos sandbox cert mismatch.",
  "metadata": {
    "tenant": "LineLead", "project": "QSR Pilots", "service": "orders", "area": "integrations",
    "kind": "status", "status": "blocked", "ticket": "LL-142", "date": "2025-08-27"
  }
})
```

### Contact

```json
add_memories({
  "userId": "john",
  "content": "Contact: Jimmy Feeman (advisor) — slack @jimmyf — scope: product strategy.",
  "metadata": {
    "tenant": "LineLead", "project": "Line Lead", "kind": "contact", "person": "Jimmy Feeman"
  }
})
```

### Endpoint / Link

```json
add_memories({
  "userId": "john",
  "content": "Endpoint: POST /v1/orders/webhook (staging) — https://staging.api.example.com/v1/orders/webhook",
  "metadata": {
    "tenant": "LineLead", "project": "QSR Pilots", "service": "orders",
    "kind": "endpoint", "env": "staging"
  }
})
```

### QSR domain (store/station)

```json
add_memories({
  "userId": "john",
  "content": "Store 112 manager prefers voice-first prompts at Grill.",
  "metadata": {
    "tenant": "LineLead", "project": "Line Lead", "kind": "fact",
    "store": "112", "station": "Grill"
  }
})
```

---

## Retrieval Patterns (examples)

### Turn-start retrieval

```json
search_memory({
  "userId": "john",
  "query": "auth migration postgres feature flag",
  "filters": { "tenant": "LineLead", "project": "Line Lead", "service": "auth", "area": "infra" },
  "threshold": 0.2
})
```

### Timeline recall

```json
search_memory({
  "userId": "john",
  "query": "timeline decisions status",
  "filters": { "project": "Line Lead" }
})
```

---

## Corrections & Supersession

When the user corrects a prior fact, write a new memory with `kind:"decision"` or `kind:"fact"` and include `tags:["supersedes"]`. Echo the correction in the reply and prefer the latest by `date`.

---

## Safety & Hygiene

- Don’t store secrets/PII. Use vault references or placeholders.
- Respect `expiresAt` and deprioritize stale memories in retrieval.
- Always cite memory usage with a short provenance note.

# CLAUDE.md — AdForge

## Project Overview

AdForge is an AI-powered ad intelligence SaaS platform. It discovers winning ads across platforms, reverse-engineers them with AI-powered anatomy breakdowns, and helps users remix/create their own variations.

The product follows a four-phase pipeline: **Discover → Deconstruct → Remix → Launch**.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, TailwindCSS
- **Backend:** Node.js with Express or Fastify
- **Database:** PostgreSQL via Prisma ORM
- **Vector DB:** Pinecone or Weaviate (ad similarity search)
- **Queue:** BullMQ + Redis (background jobs)
- **AI:** Claude API (ad analysis, script generation, remixing)
- **Payments:** Stripe (subscriptions, usage-based credits)
- **Auth:** NextAuth.js or Clerk
- **Monorepo:** Turborepo

## Project Structure

```
adforge/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/              # App Router (route groups: auth, dashboard, marketing)
│   │   ├── components/       # ui/, ads/, anatomy/, remix/, layout/
│   │   ├── lib/              # Utils, API client, hooks, constants
│   │   └── styles/
│   └── api/                  # Node.js backend
│       ├── routes/
│       ├── services/
│       ├── workers/          # Background job processors (scraping, AI enrichment)
│       ├── middleware/
│       └── integrations/     # Meta API, TikTok API, Claude API, Stripe
├── packages/
│   ├── shared/               # Types, constants, Zod validation schemas
│   └── db/                   # Prisma schema + migrations
├── infrastructure/
│   └── docker-compose.yml
└── turbo.json
```

## Code Style & Conventions

### TypeScript
- Strict mode enabled everywhere — no `any` types unless absolutely necessary
- Use `interface` for object shapes, `type` for unions/intersections
- Export types from `packages/shared` — never duplicate type definitions across apps

### React / Next.js
- Use Server Components by default; add `"use client"` only when state or interactivity is needed
- Colocate components: page-specific components live in the route folder, shared ones in `components/`
- Use named exports for components, default exports only for pages
- Data fetching: Server Components for initial loads, TanStack Query for client-side mutations and cache

### Naming
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Folders: always `kebab-case`
- API routes: `kebab-case` (e.g., `/api/ad-anatomy`, `/api/remix/generate-hooks`)
- Database columns: `snake_case`
- TypeScript variables/functions: `camelCase`
- TypeScript types/interfaces: `PascalCase`
- Environment variables: `UPPER_SNAKE_CASE`

### Styling
- TailwindCSS utility classes only — no custom CSS files unless absolutely unavoidable
- Use `cn()` helper (clsx + twMerge) for conditional class composition
- Design tokens defined in `tailwind.config.ts` under `extend`
- Dark mode first — all components should look correct on dark backgrounds by default
- Mobile-first responsive: start at 375px, breakpoints at `sm`, `md`, `lg`, `xl`

### API / Backend
- Validate all request bodies with Zod schemas
- Return consistent response shapes: `{ data, error, meta }` on every endpoint
- Use middleware for auth checks, plan gating, and rate limiting
- Never expose internal IDs in URLs — use UUIDs or slugs
- All database queries go through Prisma — no raw SQL unless it's a performance-critical query with a comment explaining why

### AI Integration (Claude API)
- All Claude API calls go through a centralized service (`integrations/claude.ts`)
- System prompts are stored as versioned templates in `integrations/prompts/`
- Always request structured JSON output from Claude — parse and validate with Zod before storing
- Sanitize all user input before injecting into prompts
- Stream responses to the frontend for remix/generation UIs (use Server-Sent Events or streaming responses)
- Log token usage per call for cost tracking

## Key Domain Terms

| Term | Meaning |
|---|---|
| Early Velocity | Predictive score measuring how fast an ad gains traction in its first 48–72 hours relative to niche baseline |
| Ad Anatomy | AI-generated breakdown of an ad: hook type, script structure, audience psychology, visual/audio analysis, funnel type |
| Remix | AI-generated variation of an existing ad — can be a script rewrite, hook alternatives, ad copy, creative brief, or landing page wireframe |
| Forge Pipeline | The full user workflow: Discover → Deconstruct → Remix → Launch |
| Credit | One unit of AI generation usage, tracked per billing cycle |
| Workspace | Isolated environment for team/agency collaboration with its own ads, remixes, and settings |

## Environment Variables

```
# Database
DATABASE_URL=

# Redis
REDIS_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Claude API
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Meta Ads
META_APP_ID=
META_APP_SECRET=

# TikTok Ads
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=

# Vector DB
PINECONE_API_KEY=
PINECONE_INDEX=
```

## Git Workflow

- Branch naming: `feat/`, `fix/`, `chore/`, `refactor/` prefixes (e.g., `feat/ad-anatomy-ui`)
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- PRs should be scoped to one feature or fix — keep them reviewable
- Never commit `.env` files — use `.env.example` as a template

## Testing

- Unit tests: Vitest for utilities and services
- Component tests: React Testing Library
- API tests: Supertest for endpoint integration tests
- E2E: Playwright for critical user flows (signup → discover → remix → export)
- Run `turbo test` before pushing

## Common Tasks

### Adding a new API endpoint
1. Define the Zod schema in `packages/shared/schemas/`
2. Create the route handler in `apps/api/routes/`
3. Add the service logic in `apps/api/services/`
4. Add auth/plan-gating middleware as needed
5. Add the API client function in `apps/web/lib/api/`

### Adding a new remix type
1. Create the prompt template in `apps/api/integrations/prompts/`
2. Add the generation logic in `apps/api/services/remix.ts`
3. Create the UI tab component in `apps/web/components/remix/`
4. Add the Zod validation schema for the output
5. Update credit tracking to count the new type

### Adding a new ad platform source
1. Create the scraper/API client in `apps/api/integrations/`
2. Add the worker job in `apps/api/workers/`
3. Map the platform's data format to the shared `Ad` type
4. Add platform badge and icon to the UI
5. Update filters to include the new platform

## Do NOT

- Use `any` types — find or create the proper type
- Skip loading/error states on async UI
- Make Claude API calls directly from the frontend — always proxy through the backend
- Store API keys or secrets in code — use environment variables
- Write raw SQL without a clear performance justification
- Commit large mock data files — use seed scripts instead
- Hardcode plan limits — read them from a config object keyed by plan name

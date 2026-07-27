# GCore Architecture Reference

## Project Summary
GCore is a mobile-first golf course operations platform built with Next.js, React, TypeScript, Tailwind CSS, Supabase, Zustand, and next-pwa.

## Core Stack
- Framework: Next.js 16 App Router
- UI: React 19 + TypeScript
- Styling: Tailwind CSS 4 with shadcn/ui-inspired primitives
- Data: Supabase SSR and route handlers
- State: Zustand for local client state
- PWA: next-pwa for installable/offline support

## Primary Directories
- app/ — route pages and route handlers
- app/api/ — backend endpoints such as order submission
- components/ — reusable UI components
- components/ui/ — shared primitive UI elements
- lib/ — shared helpers and client/server integrations
- public/ — static assets and PWA files

## Current Product Surface
- Login experience: app/page.tsx
- Order submission route: app/api/order/route.ts
- Auth integration: lib/supabase.ts
- Client state: lib/store.ts

## Styling Guidelines
- Dark-concrete visual language
- Charcoal and slate backgrounds with subtle green accents
- Touch-friendly spacing and large tap targets
- Progressive enhancement for mobile and field use

## Data Intent
The platform should support operational workflows such as:
- order submission
- resource tracking
- scheduling and assignment workflows
- inventory awareness for field operations

## Agent Boundaries
- Frontend agent: presentation, layout, interaction, and styling
- Backend/data agent: server routes, authentication flow, and data contracts
- PWA/infrastructure agent: installation, caching, offline behavior, and resilience

## Working Rule
Treat this document as the shared source of truth for every agent. Any implementation request should be routed through the orchestrator before changes are made.

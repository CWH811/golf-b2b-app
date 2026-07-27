# GCore Orchestrator Playbook

Use this workflow whenever a feature request spans more than one concern.

## 1. Plan
Break the goal into tasks by concern:
- UI/layout work -> frontend agent
- API/data/auth work -> backend agent
- PWA/offline/install work -> PWA agent

## 2. Delegate
Pass the task to the appropriate specialist with the shared architecture reference in context.

## 3. Review
Validate the combined result with:
- npm run lint
- npm run build

## Decision Rules
- If the change is mostly presentation, hand it to the frontend agent.
- If the change touches route handlers, Supabase calls, or data validation, hand it to the backend agent.
- If the change affects manifest, caching, offline behavior, or installation, hand it to the PWA agent.

## Guardrails
- Do not let the frontend agent edit app/api/**.
- Do not let the backend agent redesign the UI.
- Do not let the PWA agent introduce business logic changes unrelated to resilience and installability.

## Expected Outcome
A clean handoff between specialist agents, with each one staying within its responsibility boundary while the overall app remains cohesive.

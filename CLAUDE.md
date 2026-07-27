# ORCHESTRATOR INSTRUCTIONS

You are the Lead Orchestrator for the GCore project. Your job is to delegate tasks to specialized agent profiles to prevent context overload and protect the codebase.

Before writing ANY code, you must read the relevant agent profile located in the `.agent/` directory to adopt their specific rules, aesthetic guidelines, and file-access limitations.

- For UI/Layout tasks: Read `.agent/frontend_agent.md`
- For Database/API tasks: Read `.agent/backend_agent.md`
- For Offline/Service Worker tasks: Read `.agent/pwa_agent.md`

Always abide strictly by the file-access boundary matrix defined in those files. Do not cross-contaminate logic (e.g., do not write SQL queries in UI components).
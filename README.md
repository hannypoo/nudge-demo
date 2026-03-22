# Nudge — AI Chat Demo Code

This repository contains the conversational AI chatbot code for **Nudge**, an adaptive scheduling assistant for neurodivergent users. This is the demo subset of the project, focused on the AI chat integration and demo scenario system.

Built for MSIS 522, Winter 2026 — Foster School of Business.

## What's here

- **Chat interface** — `ChatBubble.tsx` with voice input (Web Speech API) and text-to-speech
- **Demo scenario system** — Three pre-validated scenarios that show Nudge's capabilities:
  1. **Grocery insertion** — "I need to stop by the grocery store" → clarifying follow-up → schedule update
  2. **Energy crash adaptation** — "My energy just tanked" → hard tasks swap to easier ones, blocks compress, recovery break added
  3. **Time crunch mode** — "I lost track of time and I have class tonight" → clears non-essential plans, builds streamlined prep sequence
- **AI integration** — Claude API via Supabase Edge Functions for live (non-demo) chat
- **Speech recognition** — Browser-native voice input with tap-to-talk mic

## Stack

- React 19 + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Edge Functions)
- Claude API (Anthropic) for conversational AI
- Web Speech API for voice input/output
- TanStack React Query for state management

## Architecture

```
User speaks/types → ChatBubble → useChat hook
  → Demo path: demoResponses.ts matches intent → demoActions.ts mutates schedule
  → Live path: Supabase Edge Function → Claude API → structured JSON → aiActions.ts
```

## Team

- **Hannah** — Lead developer, architecture, AI integration, demo implementation
- **Osman** — Slide deck design, product strategy
- **Joanne** — Original slide deck, documentation review
- **Casey** — Project ideation and planning

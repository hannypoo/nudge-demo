import type { ChatResponse } from '../types';

// Tracks multi-turn demo conversations (e.g., grocery follow-up)
let pendingScenario: string | null = null;

export function resetDemoConversation() {
  pendingScenario = null;
}

/**
 * Checks if a message matches a pre-seeded demo scenario.
 * Returns a ChatResponse if matched, or null to fall through to the real AI.
 */
export function getDemoResponse(
  message: string,
  _blocks?: unknown
): ChatResponse | null {
  const msg = message.toLowerCase().trim();

  // ─── Follow-up to grocery scenario ────────────────────────────
  if (pendingScenario === 'grocery') {
    pendingScenario = null;

    if (msg.includes('quick') || msg.includes('safeway') || msg.includes('small')) {
      return {
        message: "Got it — quick Safeway run! I've rerouted you from the dentist straight to Safeway, then home. Everything else shifted down. In and out! 🛒",
        actions: [{ type: 'grocery_insert', data: { store: 'Safeway', shopDuration: 30, driveTo: 10, driveHome: 15 } }],
        suggestions: [
          { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
          { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
        ],
      };
    }

    if (msg.includes('big') || msg.includes('costco') || msg.includes('large')) {
      return {
        message: "Big Costco run it is! I've rerouted you from the dentist straight to Costco, then home. Everything else shifted down to make room. Don't forget your list! 📋",
        actions: [{ type: 'grocery_insert', data: { store: 'Costco', shopDuration: 60, driveTo: 15, driveHome: 20 } }],
        suggestions: [
          { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
          { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
        ],
      };
    }

    // Unmatched grocery follow-up — default to quick trip
    return {
      message: "I'll reroute you from the dentist to the store, then home. Everything else shifted down! 🛒",
      actions: [{ type: 'grocery_insert', data: { store: 'Grocery store', shopDuration: 30, driveTo: 10, driveHome: 15 } }],
      suggestions: [
        { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
        { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
      ],
    };
  }

  // ─── Scenario 1: Grocery / store ──────────────────────────────
  if (msg.includes('grocery') || msg.includes('store') || msg.includes('shopping')) {
    pendingScenario = 'grocery';
    return {
      message: "On it! Quick trip or big haul? That changes how much time I block out.",
      suggestions: [
        { id: 'g1', label: 'Quick Safeway trip', action: { type: 'send_message', message: 'Quick Safeway' } },
        { id: 'g2', label: 'Big Costco run', action: { type: 'send_message', message: 'Big Costco run' } },
      ],
    };
  }

  // ─── Scenario 2: Energy crash ─────────────────────────────────
  if ((msg.includes('energy') && (msg.includes('crash') || msg.includes('tank') || msg.includes('low') || msg.includes('tired') || msg.includes('exhausted') || msg.includes('drained'))) || msg.includes('energy tanked') || msg.includes('so tired') || msg.includes('no energy') || msg.includes('wiped') || msg.includes('burned out') || msg.includes('burnt out') || msg.includes('hitting a wall')) {
    return {
      message: "Done. I swapped your hard tasks for easier versions, shortened your blocks, and added a break. The heavy stuff moved to tomorrow. Take it easy. 💛",
      actions: [
        { type: 'energy_crash', data: {} },
      ],
      suggestions: [
        { id: 'e1', label: "What's left today?", action: { type: 'send_message', message: "What do I still have today?" } },
        { id: 'e2', label: 'I feel better now', action: { type: 'send_message', message: 'My energy is back up' } },
      ],
    };
  }

  // ─── Scenario 3: Time crunch / reprioritization ───────────────
  if (msg.includes('lost track') || msg.includes('class in') || msg.includes('class tonight') || msg.includes('dentist in') || msg.includes('appointment in') || msg.includes('have to leave') || msg.includes('running late') || msg.includes('behind') || msg.includes('have to be') || msg.includes('need to go') || msg.includes('presentation')) {
    return {
      message: "Okay, here's your plan:\n\n1. **Shower** — just hair and body, skip the extras. 20 minutes.\n2. **Get ready** — grab something clean, keep it simple. 20 minutes.\n3. **Skip cooking** — protein bar or banana on the way out.\n4. **One pass through your presentation** — 15 minutes, you know this stuff.\n\nI cleared dinner and the other blocks. You've got time if you start now. 💪",
      actions: [
        { type: 'time_crunch', data: {} },
      ],
      suggestions: [
        { id: 'r1', label: "What time do I need to leave?", action: { type: 'send_message', message: "When should I leave?" } },
        { id: 'r2', label: "I'm ready, what's next?", action: { type: 'send_message', message: "I'm ready to go, what now?" } },
      ],
    };
  }

  // ─── No match — fall through to real AI or fallback ───────────
  return null;
}

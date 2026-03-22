import type { ChatResponse } from '../types';

// Tracks multi-turn demo conversations (e.g., grocery follow-up)
let pendingScenario: string | null = null;
let pendingStore: string | null = null;

export function resetDemoConversation() {
  pendingScenario = null;
  pendingStore = null;
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

  // ─── Grocery: user asks "what changed?" after apply ──
  if (pendingScenario === 'grocery_changes') {
    const store = pendingStore;
    const isCostco = store === 'Costco';

    if (msg.includes('what') || msg.includes('change') || msg.includes('show') || msg.includes('detail')) {
      pendingScenario = 'grocery_adjust';
      pendingStore = null;
      return {
        message: isCostco
          ? "Here's what I changed:\n\n• **Added** Drive to Costco → 1hr shopping → Drive home\n• **Shifted** all afternoon blocks down\n• **Compressed** study, kitchen, group project, call mom, beardies, and budget to fit before dinner\n• **Evening stays untouched** — dinner, shower, class all in place"
          : "Here's what I changed:\n\n• **Added** Drive to Safeway → 30min shopping → Drive home\n• **Shifted** all afternoon blocks down\n• **Slightly compressed** a few blocks to fit before dinner\n• **Evening stays untouched** — dinner, shower, class all in place",
        suggestions: [
          { id: 's1', label: 'Looks good', action: { type: 'send_message', message: 'Looks good' } },
          { id: 's2', label: 'Actually, make it a long trip', action: { type: 'send_message', message: 'Actually make it a big Costco run' } },
        ],
      };
    }

    // "Looks good" or anything else — done
    pendingScenario = 'grocery_adjust';
    pendingStore = null;
    return {
      message: "You're all set! Your schedule is updated. 👍",
      suggestions: [
        { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
        { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
      ],
    };
  }

  // ─── Grocery: user confirms "you handle it" → show changes and apply ──
  if (pendingScenario === 'grocery_confirm') {
    const store = pendingStore;
    pendingStore = null;

    if (msg.includes('you') || msg.includes('handle') || msg.includes('go ahead') || msg.includes('sure') || msg.includes('yeah') || msg.includes('yes') || msg.includes('do it') || msg.includes('sounds good') || msg.includes('ok')) {
      const isCostco = store === 'Costco';
      const shopMin = isCostco ? 40 : 30;
      const shiftMin = isCostco ? 65 : 35;

      pendingScenario = 'grocery_changes';
      pendingStore = store;
      return {
        message: isCostco
          ? "On it! Adding your Costco trip after the dentist and compressing your afternoon to fit. Your evening stays locked. 📋"
          : "On it! Adding your Safeway stop after the dentist and adjusting your afternoon. Your evening stays locked. 🛒",
        actions: [{ type: 'grocery_insert', data: { store, shopDuration: shopMin, driveTo: 10, driveHome: 15 } }],
        suggestions: [
          { id: 's1', label: 'What changed?', action: { type: 'send_message', message: 'What changed?' } },
          { id: 's2', label: 'Looks good', action: { type: 'send_message', message: 'Looks good' } },
        ],
      };
    }

    // User wants to specify preferences — for now, treat as "you handle it"
    pendingScenario = 'grocery_adjust';
    return {
      message: `On it! Adding your ${store} trip after the dentist and adjusting your afternoon. Your evening stays locked.`,
      actions: [{ type: 'grocery_insert', data: { store: store || 'Grocery store', shopDuration: store === 'Costco' ? 40 : 30, driveTo: 10, driveHome: 15 } }],
      suggestions: [
        { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
        { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
      ],
    };
  }

  // ─── Grocery correction — user changed their mind after applying ──
  if (pendingScenario === 'grocery_adjust') {
    if (msg.includes('big') || msg.includes('costco') || msg.includes('large') || msg.includes('long') || msg.includes('haul')) {
      pendingScenario = 'grocery_adjust';
      return {
        message: "Switching to a big Costco run! Reshuffling everything to make room. 📋",
        actions: [{ type: 'grocery_insert', data: { store: 'Costco', shopDuration: 60, driveTo: 10, driveHome: 15 } }],
        suggestions: [
          { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
          { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
        ],
      };
    }

    if (msg.includes('quick') || msg.includes('safeway') || msg.includes('small') || msg.includes('short') || msg.includes('fast')) {
      pendingScenario = 'grocery_adjust';
      return {
        message: "Scaled it back to a quick Safeway run. Everything shifted back — you've got more time now! 🛒",
        actions: [{ type: 'grocery_insert', data: { store: 'Safeway', shopDuration: 30, driveTo: 10, driveHome: 15 } }],
        suggestions: [
          { id: 's1', label: 'Add something else', action: { type: 'send_message', message: 'I need to add another task' } },
          { id: 's2', label: "What's next?", action: { type: 'send_message', message: "What's my next task?" } },
        ],
      };
    }

    // Didn't match a grocery correction — clear and fall through
    pendingScenario = null;
  }

  // ─── Follow-up to grocery scenario — pick store, then ask for confirmation ──
  if (pendingScenario === 'grocery') {
    if (msg.includes('quick') || msg.includes('safeway') || msg.includes('small') || msg.includes('short') || msg.includes('fast')) {
      pendingScenario = 'grocery_confirm';
      pendingStore = 'Safeway';
      return {
        message: "Quick Safeway run! That adds about 40 minutes to your day. Want me to handle it, or do you have specific changes in mind?",
        suggestions: [
          { id: 'c1', label: 'You handle it', action: { type: 'send_message', message: 'You handle it' } },
          { id: 'c2', label: 'I have preferences', action: { type: 'send_message', message: 'I have preferences' } },
        ],
      };
    }

    if (msg.includes('big') || msg.includes('costco') || msg.includes('large') || msg.includes('long') || msg.includes('haul')) {
      pendingScenario = 'grocery_confirm';
      pendingStore = 'Costco';
      return {
        message: "Big Costco run! That adds about 70 minutes to your day. Want me to handle it, or do you have specific changes in mind?",
        suggestions: [
          { id: 'c1', label: 'You handle it', action: { type: 'send_message', message: 'You handle it' } },
          { id: 'c2', label: 'I have preferences', action: { type: 'send_message', message: 'I have preferences' } },
        ],
      };
    }

    // Unmatched — default to quick trip
    pendingScenario = 'grocery_confirm';
    pendingStore = 'Grocery store';
    return {
      message: "Got it! That adds about 40 minutes to your day. Want me to handle it, or do you have specific changes in mind?",
      suggestions: [
        { id: 'c1', label: 'You handle it', action: { type: 'send_message', message: 'You handle it' } },
        { id: 'c2', label: 'I have preferences', action: { type: 'send_message', message: 'I have preferences' } },
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

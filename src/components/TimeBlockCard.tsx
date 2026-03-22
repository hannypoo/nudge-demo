import { useState } from 'react';
import { Check, SkipForward, ChevronDown, ChevronUp, MapPin, Clock, MessageSquare, Heart, Flame, Sparkles, Pencil, ListChecks, Plus, Layers, UtensilsCrossed } from 'lucide-react';
import type { ScheduleBlock, Task } from '../types/database';
import type { Category } from '../types';
import { getCategoryColors, formatTimeOfDay, formatTime } from '../lib/utils';
import CategoryPill from './CategoryPill';

interface TimeBlockCardProps {
  block: ScheduleBlock;
  category?: Category;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onOverrideTravel?: (id: string, minutes: number) => void;
  multitaskableTasks?: Task[];
}

export default function TimeBlockCard({
  block, category, onComplete, onSkip, onAddNote,
  onOverrideTravel, multitaskableTasks,
}: TimeBlockCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(block.notes || '');
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideMinutes, setOverrideMinutes] = useState(String(block.duration_minutes));
  const [choreItems, setChoreItems] = useState<{ text: string; done: boolean }[]>(() => {
    if (block.is_chore_block && block.notes) {
      try {
        return JSON.parse(block.notes);
      } catch { /* not JSON */ }
    }
    return [];
  });
  const [newChore, setNewChore] = useState('');

  const colors = getCategoryColors(category?.color || 'gray');

  const isCompleted = block.status === 'completed';
  const isSkipped = block.status === 'skipped' || block.status === 'rescheduled';
  const isActive = block.status === 'active';
  const isPast = isCompleted || isSkipped;

  // ─── Buffer/transition blocks — thin subtle bar ────────────────
  if (block.is_buffer || block.is_transition) {
    return (
      <div className="flex items-center gap-2 py-0.5 px-2">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[9px] text-white/15 shrink-0">{block.title} · {block.duration_minutes}min</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
    );
  }

  // ─── Travel blocks — with override + multi-task ───────────────
  if (block.is_travel) {
    return (
      <div className={`rounded-xl border border-dashed ${colors.border}/30 ${colors.bgLight}/30 overflow-hidden`}>
        <div className="flex items-center gap-2 px-3 py-2">
          <MapPin size={14} className={colors.text} />
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-medium ${colors.text}/70`}>{block.title}</span>
            <span className="text-[10px] text-white/30 ml-2">{block.duration_minutes}min</span>
          </div>
          <span className="text-[10px] text-white/30">{formatTimeOfDay(block.start_time)} — {formatTimeOfDay(block.end_time)}</span>
          {!isPast && onOverrideTravel && (
            <button
              onClick={() => setOverrideMode(!overrideMode)}
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Override travel time"
            >
              <Pencil size={12} className="text-white/30" />
            </button>
          )}
        </div>

        {overrideMode && onOverrideTravel && (
          <div className="px-3 pb-2 flex items-center gap-2 animate-fade-in-up">
            <input
              type="number"
              value={overrideMinutes}
              onChange={(e) => setOverrideMinutes(e.target.value)}
              className="w-16 h-8 bg-white/5 rounded-lg px-2 text-xs text-white border border-white/10 outline-none text-center"
              min={1}
              max={180}
            />
            <span className="text-[10px] text-white/30">min</span>
            <button
              onClick={() => {
                const mins = parseInt(overrideMinutes, 10);
                if (mins > 0) {
                  onOverrideTravel(block.id, mins);
                  setOverrideMode(false);
                }
              }}
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-medium transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {/* While you travel — multitaskable tasks */}
        {multitaskableTasks && multitaskableTasks.length > 0 && block.duration_minutes >= 10 && (
          <div className="border-t border-white/5 px-3 py-2">
            <div className="flex items-center gap-1 mb-1.5">
              <Layers size={10} className="text-white/20" />
              <span className="text-[10px] text-white/25 font-medium">While you travel</span>
            </div>
            <div className="space-y-1">
              {multitaskableTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-white/15" />
                  <span className="text-[10px] text-white/30 truncate">{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Prep blocks ───────────────────────────────────────────────
  if (block.is_prep) {
    return (
      <div className={`rounded-xl border border-dashed ${colors.border}/30 ${colors.bgLight}/30 flex items-center gap-2 px-3 py-2`}>
        <Clock size={14} className={colors.text} />
        <span className={`text-xs ${colors.text}/70`}>{block.title} — {block.duration_minutes}min</span>
        <span className="text-[10px] text-white/30 ml-auto">{formatTimeOfDay(block.start_time)} — {formatTimeOfDay(block.end_time)}</span>
      </div>
    );
  }

  // ─── Meal blocks — distinct styling ────────────────────────────
  if (block.is_meal) {
    return (
      <div className={`rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center gap-2 px-3 py-3 ${isPast ? 'opacity-50' : ''}`}>
        <UtensilsCrossed size={16} className="text-amber-400" />
        <div className="flex-1">
          <span className="text-sm font-medium text-amber-300">{block.title}</span>
          <span className="text-[11px] text-amber-400/50 ml-2">{formatTimeOfDay(block.start_time)} — {formatTimeOfDay(block.end_time)}</span>
        </div>
        {!isPast && (
          <button onClick={() => onComplete(block.id)} className="p-1.5 rounded-lg hover:bg-amber-500/20">
            <Check size={16} className="text-amber-400" />
          </button>
        )}
      </div>
    );
  }

  // ─── Self-care blocks — distinct styling ───────────────────────
  if (block.is_self_care) {
    return (
      <div className={`rounded-xl border border-teal-500/20 bg-teal-500/10 flex items-center gap-2 px-3 py-3 ${isPast ? 'opacity-50' : ''}`}>
        {block.block_type === 'self_care' ? <Heart size={16} className="text-teal-400" /> : <Sparkles size={16} className="text-teal-400" />}
        <div className="flex-1">
          <span className="text-sm font-medium text-teal-300">{block.title}</span>
          <span className="text-[11px] text-teal-400/50 ml-2">{formatTimeOfDay(block.start_time)} — {formatTimeOfDay(block.end_time)}</span>
        </div>
        {!isPast && (
          <button onClick={() => onComplete(block.id)} className="p-1.5 rounded-lg hover:bg-teal-500/20">
            <Check size={16} className="text-teal-400" />
          </button>
        )}
      </div>
    );
  }

  // ─── Chore block — checklist sub-items ────────────────────────
  if (block.is_chore_block) {
    const allDone = choreItems.length > 0 && choreItems.every((c) => c.done);

    const toggleChore = (index: number) => {
      const updated = choreItems.map((c, i) => i === index ? { ...c, done: !c.done } : c);
      setChoreItems(updated);
      onAddNote(block.id, JSON.stringify(updated));
    };

    const addChore = () => {
      if (!newChore.trim()) return;
      const updated = [...choreItems, { text: newChore.trim(), done: false }];
      setChoreItems(updated);
      setNewChore('');
      onAddNote(block.id, JSON.stringify(updated));
    };

    return (
      <div className={`rounded-xl border border-violet-500/20 bg-violet-500/10 overflow-hidden ${isPast ? 'opacity-50' : ''}`}>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-left"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <ListChecks size={16} className="text-violet-400" />
          <div className="flex-1">
            <span className="text-sm font-medium text-violet-300">{block.title}</span>
            <span className="text-[11px] text-violet-400/50 ml-2">
              {choreItems.filter((c) => c.done).length}/{choreItems.length} done
            </span>
          </div>
          <span className="text-[11px] text-violet-400/40">{formatTimeOfDay(block.start_time)} — {formatTimeOfDay(block.end_time)}</span>
          {expanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
        </button>

        {expanded && (
          <div className="px-3 pb-3 space-y-1.5 animate-fade-in-up">
            {choreItems.map((chore, i) => (
              <button
                key={i}
                onClick={() => toggleChore(i)}
                className="w-full flex items-center gap-2 text-left py-1"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  chore.done ? 'bg-violet-500/30 border-violet-400/50' : 'border-white/15'
                }`}>
                  {chore.done && <Check size={10} className="text-violet-300" />}
                </div>
                <span className={`text-xs ${chore.done ? 'line-through text-white/30' : 'text-white/60'}`}>
                  {chore.text}
                </span>
              </button>
            ))}

            {!isPast && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newChore}
                  onChange={(e) => setNewChore(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChore()}
                  placeholder="Add chore..."
                  className="flex-1 h-8 bg-white/5 rounded-lg px-2 text-xs text-white placeholder:text-white/20 border border-white/5 outline-none"
                />
                <button onClick={addChore} disabled={!newChore.trim()}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-violet-500/20 hover:bg-violet-500/30 disabled:opacity-30 transition-colors">
                  <Plus size={14} className="text-violet-400" />
                </button>
              </div>
            )}

            {!isPast && choreItems.length > 0 && (
              <button
                onClick={() => allDone ? onComplete(block.id) : undefined}
                disabled={!allDone}
                className="w-full h-10 mt-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 disabled:opacity-30 text-violet-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> Done with chores
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Difficulty badge ──────────────────────────────────────────
  const DiffBadge = () => {
    if (!block.difficulty) return null;
    const cfg = {
      easy: { dot: 'bg-green-400', label: 'Easy' },
      medium: { dot: 'bg-yellow-400', label: 'Med' },
      hard: { dot: 'bg-red-400', label: 'Hard' },
    }[block.difficulty];
    return (
      <span className="flex items-center gap-1 text-[10px] text-white/50">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  };

  // ─── Regular task blocks ───────────────────────────────────────
  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden
        ${isCompleted ? `${colors.bgLight}/40 ${colors.border}/20 opacity-50` : ''}
        ${isSkipped ? 'bg-white/3 border-white/5 opacity-40' : ''}
        ${isActive ? `${colors.bgLight} ${colors.border} ring-2 ${colors.ring} animate-pulse-soft` : ''}
        ${!isPast && !isActive ? `${colors.bgLight}/60 ${colors.border}/40 hover:${colors.bgLight} hover:${colors.border}/60` : ''}
      `}
    >
      <button
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className={`w-1 self-stretch rounded-full ${colors.bg} shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isCompleted ? 'line-through text-white/40' : 'text-white'}`}>
              {block.title}
            </span>
            {block.difficulty === 'hard' && <Flame size={12} className="text-red-400 shrink-0" />}
            {category && <CategoryPill name={category.name} color={category.color} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-white/40">
              {formatTimeOfDay(block.start_time)} — {formatTimeOfDay(block.end_time)}
            </span>
            <span className="text-[11px] text-white/30">{formatTime(block.duration_minutes)}</span>
            <DiffBadge />
          </div>
          {block.ai_reason && !expanded && (
            <p className="text-[10px] text-white/25 mt-0.5 truncate">{block.ai_reason}</p>
          )}
        </div>

        {!isPast && (
          <div className="shrink-0 mt-1">
            {expanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in-up">
          {block.ai_reason && (
            <p className="text-xs text-white/40 bg-white/5 rounded-lg px-3 py-2">{block.ai_reason}</p>
          )}

          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-white/30 mt-1.5 shrink-0" />
            <input
              type="text" value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => { if (note !== block.notes) onAddNote(block.id, note); }}
              placeholder="Add a note..."
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 border border-white/5 focus:border-white/15 outline-none"
            />
          </div>

          {!isPast && (
            <div className="flex gap-2">
              <button onClick={() => onComplete(block.id)}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium text-sm transition-colors">
                <Check size={18} /> Done
              </button>
              <button onClick={() => onSkip(block.id)}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-medium text-sm transition-colors">
                <SkipForward size={18} /> Skip
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

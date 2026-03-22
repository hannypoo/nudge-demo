import type { Suggestion } from '../types';

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}

export default function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-1 py-2">
      {suggestions.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-colors"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

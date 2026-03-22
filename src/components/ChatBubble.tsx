import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Mic, MicOff, VolumeX, Minus, ChevronUp } from 'lucide-react';
import { useChat, useChatHistory } from '../hooks/useChat';
import { useScheduleBlocks } from '../hooks/useScheduleBlocks';
import { useCategories } from '../hooks/useCategories';
import { useGoals } from '../hooks/useGoals';
import { useProfile } from '../hooks/useProfile';
import { useRewards } from '../hooks/useRewards';
import { getToday } from '../lib/utils';
import SuggestionChips from './SuggestionChips';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { Suggestion } from '../types';

/** Strip emojis and markdown formatting so TTS reads cleanly */
function cleanForSpeech(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}\u{200D}\u{20E3}\u{2702}-\u{27B0}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Speak text aloud using browser TTS. Returns a promise that resolves when done. */
function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [muted, setMuted] = useState(false); // persistent mute — survives minimize/reopen
  const { sendMessage, isLoading, suggestions, setSuggestions } = useChat();
  const { data: chatHistory } = useChatHistory();
  const { data: blocks } = useScheduleBlocks(getToday());
  const { data: categories } = useCategories();
  const { data: goals } = useGoals();
  const { data: profile } = useProfile();
  const { data: rewards } = useRewards(getToday());
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<(msg?: string) => void>(() => {});

  // Voice input — auto-send when speech finishes
  const handleVoiceResult = useCallback((transcript: string) => {
    setOpen(true);
    setMinimized(false);
    handleSendRef.current(transcript);
  }, []);
  const { listening, interim, supported: micSupported, toggle: toggleMic, startManual } = useSpeechRecognition(handleVoiceResult);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, open, minimized]);

  const handleSend = async (message?: string) => {
    const text = message || input.trim();
    if (!text || isLoading) return;
    setInput('');
    setSuggestions([]);

    const context = {
      today: getToday(),
      blocks: blocks?.map((b) => ({
        title: b.title, time: `${b.start_time}-${b.end_time}`, status: b.status,
        category: b.category_id, difficulty: b.difficulty, block_type: b.block_type,
      })),
      categories: categories?.map((c) => ({ id: c.id, name: c.name })),
      goals: goals?.map((g) => ({ title: g.title, progress: `${g.current_count}/${g.target_count}` })),
      rewards_earned: rewards?.length || 0,
      treats: profile?.treats || [],
      productivity_zones: profile?.productivity_zones || [],
      streak: profile?.streak || 0,
    };
    const history = (chatHistory || []).slice(-6).map((m) => ({ role: m.role, content: m.content }));
    const response = await sendMessage(text, context, history, blocks || []);

    // If in voice mode and not muted: speak the response, then auto-listen
    if (voiceMode && !muted && response?.message) {
      await speak(response.message);
      startManual();
    }
  };

  handleSendRef.current = handleSend;

  const handleSuggestion = (suggestion: Suggestion) => {
    if (suggestion.action.type === 'send_message') {
      handleSend((suggestion.action as { message: string }).message);
    }
  };

  // Tap mic inside chat → toggle voice mode
  const handleMicTap = () => {
    if (listening) {
      toggleMic();
    } else if (voiceMode) {
      startManual();
    } else {
      setVoiceMode(true);
      startManual();
    }
  };

  // Exit voice mode entirely
  const handleStopVoice = () => {
    setVoiceMode(false);
    window.speechSynthesis?.cancel();
    if (listening) toggleMic();
  };

  // Toggle mute (persists across minimize/reopen)
  const handleToggleMute = () => {
    if (!muted) {
      window.speechSynthesis?.cancel(); // stop current speech when muting
    }
    setMuted(!muted);
  };

  // Minimize — keep state, just collapse the panel
  const handleMinimize = () => {
    setMinimized(true);
  };

  // Floating bubble — chat closed entirely
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open Nudge"
      >
        <Bot size={24} className="text-white" />
      </button>
    );
  }

  // Minimized — small bar at bottom-right, preserves all state
  if (minimized) {
    return (
      <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2">
        {/* Mute toggle — always visible when chat is active */}
        <button
          onClick={handleToggleMute}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            muted
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-white/10 text-white/40 hover:text-white/70'
          }`}
          aria-label={muted ? 'Unmute' : 'Mute'}
          title={muted ? 'Unmute Nudge' : 'Mute Nudge'}
        >
          <VolumeX size={16} />
        </button>
        {/* Mic off — visible when in voice mode */}
        {voiceMode && (
          <button
            onClick={handleStopVoice}
            className="w-10 h-10 rounded-full bg-white/10 text-white/40 hover:text-red-400 flex items-center justify-center transition-all"
            aria-label="Exit voice mode"
            title="Exit voice mode"
          >
            <MicOff size={16} />
          </button>
        )}
        {/* Expand button */}
        <button
          onClick={() => setMinimized(false)}
          className="h-10 px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          aria-label="Expand Nudge"
        >
          <Bot size={18} className="text-white" />
          <ChevronUp size={14} className="text-white/70" />
          {listening && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  // Expanded panel
  return (
    <>
      <div className="fixed inset-0 z-50 sm:inset-auto sm:top-0 sm:right-0 sm:w-80 sm:h-full flex flex-col bg-slate-950/98 sm:bg-slate-950 backdrop-blur-lg sm:border-l sm:border-white/5">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Nudge</h2>
            {listening && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                listening
              </span>
            )}
            {voiceMode && !listening && !isLoading && (
              <span className="flex items-center gap-1 text-[10px] text-indigo-400/70">
                <Mic size={8} />
                voice
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Mute toggle — always available */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl transition-colors ${
                muted
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'hover:bg-white/10 text-white/40 hover:text-amber-400'
              }`}
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Unmute Nudge' : 'Mute Nudge'}
            >
              <VolumeX size={16} />
            </button>
            {/* Exit voice mode — only when in voice mode */}
            {voiceMode && (
              <button
                onClick={handleStopVoice}
                className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                aria-label="Exit voice mode"
                title="Exit voice mode"
              >
                <MicOff size={16} />
              </button>
            )}
            {/* Minimize */}
            <button
              onClick={handleMinimize}
              className="p-2 rounded-xl hover:bg-white/10 text-white/40 transition-colors"
              aria-label="Minimize chat"
              title="Minimize"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {(!chatHistory || chatHistory.length === 0) && (
            <div className="text-center py-8">
              <Bot size={40} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Hey! I'm Nudge, your schedule sidekick.</p>
              <p className="text-white/20 text-xs mt-1">Tap the mic or type to get started.</p>
            </div>
          )}

          {chatHistory?.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={12} className="text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/80 border border-white/5'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-white/50" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot size={12} className="text-indigo-400" />
              </div>
              <div className="bg-white/5 rounded-2xl px-3 py-2.5 border border-white/5">
                <div className="flex gap-1.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-400/40 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}

          <SuggestionChips suggestions={suggestions} onSelect={handleSuggestion} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 px-3 py-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={listening ? (interim || 'Listening...') : input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={listening ? 'Listening...' : 'Type or tap mic...'}
              className={`flex-1 h-10 bg-white/5 rounded-xl px-3 text-sm text-white placeholder:text-white/20 border outline-none transition-colors ${
                listening ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 focus:border-indigo-500/40'
              }`}
              readOnly={listening}
              autoFocus
            />
            {micSupported && (
              <button
                onClick={handleMicTap}
                disabled={isLoading}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
                  listening
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white animate-pulse'
                    : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70'
                }`}
                aria-label={listening ? 'Stop listening' : 'Voice input'}
              >
                <Mic size={16} />
              </button>
            )}
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !listening) || isLoading}
              className="h-10 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

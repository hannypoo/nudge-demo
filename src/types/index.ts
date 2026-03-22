// ─── Re-export DB types ────────────────────────────────────────────
export type {
  TaskType,
  TaskPriority,
  TaskStatus,
  HomeworkType,
  RecurrenceFrequency,
  BlockStatus,
  EnergyLevel,
  ChatRole,
  TaskDifficulty,
  ProductivityZone,
  MealConfig,
  MealTimes,
  Profile,
  DbCategory,
  Location,
  TravelTime,
  RecurringTask,
  Task,
  Goal,
  ScheduleBlock,
  TaskHistory,
  ChatMessage,
  WeeklyCheckin,
  DailyCheckin,
  Reward,
  DailySummary,
} from './database';

// ─── Category (client-side, compatible with v1) ────────────────────
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  priority: number;
  defaultBlockMinutes: number;
  weeklyMinMinutes: number | null;
  isProtected: boolean;
  isFixed: boolean;
  enabled: boolean;
}

// ─── Category Stats (for neglect tracking) ─────────────────────────
export interface CategoryStats {
  categoryId: string;
  weeklyMinutesCompleted: number;
  weeklyMinutesTarget: number | null;
  consecutiveDaysSkipped: number;
  neglectScore: number;
  lastCompletedDate: string | null;
  twoWeekHistory: DayRecord[];
}

export interface DayRecord {
  date: string;
  minutesCompleted: number;
  minutesPlanned: number;
  blocksCompleted: number;
  blocksPlanned: number;
}

// ─── Schedule Action (from AI chat) ────────────────────────────────
export type ScheduleActionType = 'create_block' | 'move_block' | 'delete_block' | 'create_task' | 'complete_task' | 'update_task';

export interface ScheduleAction {
  type: ScheduleActionType;
  blockId?: string;
  taskId?: string;
  data?: Record<string, unknown>;
}

// ─── AI Suggestion (rendered as chips) ─────────────────────────────
export interface Suggestion {
  id: string;
  label: string;
  action: ScheduleAction | { type: 'send_message'; message: string };
}

// ─── AI Chat Response ──────────────────────────────────────────────
export interface ChatResponse {
  message: string;
  actions?: ScheduleAction[];
  suggestions?: Suggestion[];
}

// ─── Homework Estimate (from AI) ───────────────────────────────────
export interface HomeworkEstimate {
  title: string;
  type: string;
  difficulty: number;
  neurotypicalMinutes: number;
  adhdAdjustedMinutes: number;
  sessions: { title: string; minutes: number }[];
  milestones: string[];
}

// ─── Reschedule Option (from AI) ───────────────────────────────────
export interface RescheduleOption {
  label: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  reason: string;
}

// ─── Neglect Info (for display) ────────────────────────────────────
export interface NeglectInfo {
  categoryId: string;
  categoryName: string;
  color: string;
  score: number;
  weeklyMinutes: number;
  weeklyTarget: number | null;
  consecutiveDaysSkipped: number;
}

// ─── v1 types kept for scheduler compatibility ─────────────────────
export interface TimeBlock {
  id: string;
  categoryId: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'interrupted' | 'rescheduled';
  isFixed: boolean;
  isProtected: boolean;
  isTransition: boolean;
  completedAt?: string;
  notes?: string;
  extendCount: number;
}

export interface DayPlan {
  date: string;
  blocks: TimeBlock[];
  energyLevel: 'low' | 'medium' | 'high';
  wakeTime: string;
  windDownTime: string;
  generatedAt: string;
  interruptions: Interruption[];
}

export type InterruptionType = 'phone_call' | 'errand' | 'emergency' | 'break' | 'other';

export interface Interruption {
  id: string;
  type: InterruptionType;
  startedAt: string;
  durationMinutes: number;
  endedAt?: string;
  note?: string;
}

export interface FixedEvent {
  id: string;
  categoryId: string;
  title: string;
  dayOfWeek: number[];
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface Preferences {
  defaultWakeTime: string;
  defaultWindDownTime: string;
  transitionMinutes: number;
  enableConfetti: boolean;
  enableSound: boolean;
  enableHaptics: boolean;
  enableNotifications: boolean;
  theme: 'dark';
  hyperfocusAlertMinutes: number;
}

export interface AppState {
  categories: Category[];
  fixedEvents: FixedEvent[];
  todos: Todo[];
  dayPlans: DayPlan[];
  preferences: Preferences;
  streak: number;
  lastActiveDate: string | null;
  onboardingComplete: boolean;
}

export interface Todo {
  id: string;
  title: string;
  categoryId: string;
  estimateMinutes: number;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  scheduledDate?: string;
}

export type AppAction =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'UPDATE_CATEGORIES'; payload: Category[] }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'SET_DAY_PLAN'; payload: DayPlan }
  | { type: 'UPDATE_BLOCK'; payload: { date: string; blockId: string; updates: Partial<TimeBlock> } }
  | { type: 'COMPLETE_BLOCK'; payload: { date: string; blockId: string } }
  | { type: 'SKIP_BLOCK'; payload: { date: string; blockId: string } }
  | { type: 'ADD_INTERRUPTION'; payload: { date: string; interruption: Interruption } }
  | { type: 'END_INTERRUPTION'; payload: { date: string; interruptionId: string } }
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'UPDATE_TODO'; payload: Todo }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'ADD_FIXED_EVENT'; payload: FixedEvent }
  | { type: 'UPDATE_FIXED_EVENT'; payload: FixedEvent }
  | { type: 'DELETE_FIXED_EVENT'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'SET_ENERGY_LEVEL'; payload: { date: string; level: 'low' | 'medium' | 'high' } }
  | { type: 'UPDATE_STREAK'; payload: number }
  | { type: 'REPLACE_BLOCKS'; payload: { date: string; blocks: TimeBlock[] } }
  | { type: 'PRUNE_OLD_DATA' };

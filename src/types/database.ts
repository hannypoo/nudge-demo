// Types matching the Supabase schema
// Update when schema changes

export type TaskType = 'task' | 'appointment' | 'homework' | 'errand' | 'self_care';
export type TaskPriority = 'immediately' | 'soon' | 'whenever';
export type TaskStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled';
export type HomeworkType = 'essay' | 'reading' | 'problem_set' | 'project' | 'quiz_prep';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type BlockStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'interrupted' | 'rescheduled';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type ChatRole = 'user' | 'assistant';
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

// ─── JSONB sub-types ──────────────────────────────────────────────
export interface ProductivityZone {
  start_time: string;
  end_time: string;
  zone_type: 'peak' | 'low' | 'dead';
}

export interface MealConfig {
  time: string;
  enabled: boolean;
}

export interface MealTimes {
  breakfast: MealConfig;
  lunch: MealConfig;
  dinner: MealConfig;
}

// ─── Row types ──────────────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string;
  default_wake_time: string;
  default_wind_down_time: string;
  transition_minutes: number;
  adhd_buffer_minutes: number;
  enable_confetti: boolean;
  enable_sound: boolean;
  streak: number;
  last_active_date: string | null;
  // v2 enhancements
  productivity_zones: ProductivityZone[];
  meal_times: MealTimes;
  water_reminders: boolean;
  meal_reminders: boolean;
  wake_buffer_minutes: number;
  wind_down_buffer_minutes: number;
  chore_block_minutes: number;
  chore_block_time: string | null;
  treats: string[];
  multitask_enabled: boolean;
  self_care_auto: boolean;
  onboarding_version: number;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  profile_id: string;
  name: string;
  icon: string;
  color: string;
  priority: number;
  default_block_minutes: number;
  weekly_min_minutes: number | null;
  is_protected: boolean;
  is_fixed: boolean;
  enabled: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  profile_id: string;
  name: string;
  address: string | null;
  is_home: boolean;
  created_at: string;
}

export interface TravelTime {
  id: string;
  profile_id: string;
  from_location_id: string;
  to_location_id: string;
  duration_minutes: number;
  entry_count: number;
  total_minutes: number;
}

export interface RecurringTask {
  id: string;
  profile_id: string;
  title: string;
  task_type: TaskType;
  category_id: string | null;
  frequency: RecurrenceFrequency;
  days_of_week: number[] | null;
  times_per_week: number | null;
  estimated_minutes: number;
  location_id: string | null;
  start_time: string | null;
  end_time: string | null;
  enabled: boolean;
  not_before: string | null;
  not_after: string | null;
  is_flexible: boolean;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  category_id: string | null;
  estimated_minutes: number | null;
  ai_estimated_minutes: number | null;
  actual_minutes: number | null;
  due_date: string | null;
  due_time: string | null;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  location_id: string | null;
  needs_travel: boolean;
  prep_minutes: number;
  homework_type: HomeworkType | null;
  course_name: string | null;
  syllabus_text: string | null;
  difficulty_score: number | null;
  // v2 enhancements
  difficulty: TaskDifficulty | null;
  is_multitaskable: boolean;
  is_recurring: boolean;
  recurring_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  profile_id: string;
  category_id: string | null;
  title: string;
  target_count: number | null;
  target_minutes: number | null;
  current_count: number;
  current_minutes: number;
  week_start: string;
  is_active: boolean;
  created_at: string;
}

export interface ScheduleBlock {
  id: string;
  profile_id: string;
  task_id: string | null;
  category_id: string | null;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: BlockStatus;
  is_fixed: boolean;
  is_protected: boolean;
  is_transition: boolean;
  is_travel: boolean;
  is_prep: boolean;
  // v2 enhancements
  block_type: string;
  is_meal: boolean;
  is_self_care: boolean;
  is_buffer: boolean;
  is_chore_block: boolean;
  difficulty: TaskDifficulty | null;
  ai_reason: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: string;
  profile_id: string;
  task_id: string | null;
  category_id: string | null;
  title: string;
  task_type: TaskType | null;
  homework_type: HomeworkType | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  energy_level: EnergyLevel | null;
  day_of_week: number | null;
  time_of_day: string | null;
  completed_at: string;
}

export interface ChatMessage {
  id: string;
  profile_id: string;
  role: ChatRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WeeklyCheckin {
  id: string;
  profile_id: string;
  week_start: string;
  energy_rating: number | null;
  upcoming_events: string | null;
  changes_noted: string | null;
  ai_schedule_notes: string | null;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  profile_id: string;
  date: string;
  energy_level: EnergyLevel;
  wake_time: string | null;
  wind_down_time: string | null;
  notes: string | null;
  created_at: string;
}

// ─── v2 New Tables ────────────────────────────────────────────────

export interface Reward {
  id: string;
  profile_id: string;
  date: string;
  type: string;
  label: string;
  treat_suggestion: string | null;
  earned_at: string;
}

export interface DailySummary {
  id: string;
  profile_id: string;
  date: string;
  blocks_completed: number;
  blocks_missed: number;
  blocks_skipped: number;
  total_productive_minutes: number;
  hard_tasks_completed: number;
  ai_summary: string | null;
  mood_rating: number | null;
  user_notes: string | null;
  created_at: string;
}

// ─── Supabase Database type (simplified) ────────────────────────────
// The generic Database type is needed for createClient<Database>
// but we use the simpler row types above for actual data access

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      categories: { Row: DbCategory; Insert: Partial<DbCategory> & { id: string; profile_id: string; name: string; icon: string; color: string; priority: number }; Update: Partial<DbCategory> };
      locations: { Row: Location; Insert: Partial<Location> & { profile_id: string; name: string }; Update: Partial<Location> };
      travel_times: { Row: TravelTime; Insert: Partial<TravelTime> & { profile_id: string; from_location_id: string; to_location_id: string; duration_minutes: number; total_minutes: number }; Update: Partial<TravelTime> };
      recurring_tasks: { Row: RecurringTask; Insert: Partial<RecurringTask> & { profile_id: string; title: string }; Update: Partial<RecurringTask> };
      tasks: { Row: Task; Insert: Partial<Task> & { profile_id: string; title: string }; Update: Partial<Task> };
      goals: { Row: Goal; Insert: Partial<Goal> & { profile_id: string; title: string; week_start: string }; Update: Partial<Goal> };
      schedule_blocks: { Row: ScheduleBlock; Insert: Partial<ScheduleBlock> & { profile_id: string; title: string; date: string; start_time: string; end_time: string; duration_minutes: number }; Update: Partial<ScheduleBlock> };
      task_history: { Row: TaskHistory; Insert: Partial<TaskHistory> & { profile_id: string; title: string }; Update: Partial<TaskHistory> };
      chat_messages: { Row: ChatMessage; Insert: Partial<ChatMessage> & { profile_id: string; role: ChatRole; content: string }; Update: Partial<ChatMessage> };
      weekly_checkins: { Row: WeeklyCheckin; Insert: Partial<WeeklyCheckin> & { profile_id: string; week_start: string }; Update: Partial<WeeklyCheckin> };
      daily_checkins: { Row: DailyCheckin; Insert: Partial<DailyCheckin> & { profile_id: string; date: string; energy_level: EnergyLevel }; Update: Partial<DailyCheckin> };
      rewards: { Row: Reward; Insert: Partial<Reward> & { profile_id: string; label: string }; Update: Partial<Reward> };
      daily_summaries: { Row: DailySummary; Insert: Partial<DailySummary> & { profile_id: string; date: string }; Update: Partial<DailySummary> };
    };
  };
}

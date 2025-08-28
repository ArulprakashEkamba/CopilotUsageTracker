export interface UsageRecord {
  id?: number;
  date: string;
  hour: number;
  suggestionsShown: number;
  suggestionsAccepted: number;
  chatPrompts: number;
  inlineChats: number;
  timestamp: number;
  promptText?: string; // Optional: actual prompt content
  promptType?: 'chat' | 'inline' | 'suggestion'; // Type of interaction
}

export interface MonthlyStats {
  month: string;
  totalSuggestions: number;
  acceptedSuggestions: number;
  totalPrompts: number;
  acceptanceRate: number;
}

export interface DashboardData {
  monthlyStats: MonthlyStats[];
  currentMonth: UsageRecord[];
  totalStats: {
    totalSuggestions: number;
    totalAccepted: number;
    totalPrompts: number;
    averageDaily: number;
  };
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}

export interface IDataManager {
  recordUsage(type: 'suggestion_shown' | 'suggestion_accepted' | 'chat_prompt' | 'inline_chat', promptText?: string): Promise<void>;
  getMonthlyStats(): Promise<MonthlyStats[]>;
  getDailyStats(days?: number): Promise<UsageRecord[]>;
  getTotalStats(): Promise<any>;
  exportData(): Promise<UsageRecord[]>;
  clearAllData(): Promise<void>;
  dispose(): void;
  getPromptHistory(days?: number): Promise<UsageRecord[]>; // New method for prompt history
}

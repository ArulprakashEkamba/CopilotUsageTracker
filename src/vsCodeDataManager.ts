import * as vscode from 'vscode';
import { UsageRecord, MonthlyStats, IDataManager } from './types';

export class VSCodeDataManager implements IDataManager {
    private context: vscode.ExtensionContext;
    private storageKey = 'copilotUsageData';
    private promptStorageKey = 'copilotPromptHistory'; // Separate storage for prompt text

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.cleanOldData();
    }

    public async recordUsage(type: 'suggestion_shown' | 'suggestion_accepted' | 'chat_prompt' | 'inline_chat', promptText?: string): Promise<void> {
        try {
            const now = new Date();
            const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const hour = now.getHours();
            const timestamp = now.getTime();

            const existingData = await this.getAllRecords();
            
            // Find existing record for this date/hour or create new one
            let record = existingData.find(r => r.date === date && r.hour === hour);
            
            if (!record) {
                record = {
                    date,
                    hour,
                    suggestionsShown: 0,
                    suggestionsAccepted: 0,
                    chatPrompts: 0,
                    inlineChats: 0,
                    timestamp
                };
                existingData.push(record);
            }

            // Update the record based on the type
            switch (type) {
                case 'suggestion_shown':
                    record.suggestionsShown++;
                    break;
                case 'suggestion_accepted':
                    record.suggestionsAccepted++;
                    break;
                case 'chat_prompt':
                    record.chatPrompts++;
                    break;
                case 'inline_chat':
                    record.inlineChats++;
                    break;
            }

            record.timestamp = timestamp;

            // Save back to storage
            await this.context.globalState.update(this.storageKey, existingData);

            // If there's prompt text, save it separately for detailed logging
            if (promptText && (type === 'chat_prompt' || type === 'inline_chat')) {
                await this.savePromptText(promptText, type, timestamp);
            }
        } catch (error) {
            console.error('Error recording usage:', error);
        }
    }

    public async getMonthlyStats(): Promise<MonthlyStats[]> {
        try {
            const records = await this.getAllRecords();
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            // Filter records from last 3 months
            const recentRecords = records.filter(record => 
                new Date(record.date) >= threeMonthsAgo
            );

            // Group by month
            const monthlyData: { [month: string]: MonthlyStats } = {};

            recentRecords.forEach(record => {
                const monthKey = record.date.substring(0, 7); // YYYY-MM
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        totalSuggestions: 0,
                        acceptedSuggestions: 0,
                        totalPrompts: 0,
                        acceptanceRate: 0
                    };
                }

                monthlyData[monthKey].totalSuggestions += record.suggestionsShown;
                monthlyData[monthKey].acceptedSuggestions += record.suggestionsAccepted;
                monthlyData[monthKey].totalPrompts += record.chatPrompts + record.inlineChats;
            });

            // Calculate acceptance rates and convert to array
            const result = Object.values(monthlyData).map(stat => ({
                ...stat,
                acceptanceRate: stat.totalSuggestions > 0 ? 
                    Math.round((stat.acceptedSuggestions / stat.totalSuggestions) * 100) : 0
            }));

            return result.sort((a, b) => a.month.localeCompare(b.month));
        } catch (error) {
            console.error('Error getting monthly stats:', error);
            return [];
        }
    }

    public async getDailyStats(days: number = 30): Promise<UsageRecord[]> {
        try {
            const records = await this.getAllRecords();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Filter records from last N days and group by date
            const recentRecords = records.filter(record => 
                new Date(record.date) >= cutoffDate
            );

            const dailyData: { [date: string]: UsageRecord } = {};

            recentRecords.forEach(record => {
                if (!dailyData[record.date]) {
                    dailyData[record.date] = {
                        date: record.date,
                        hour: 0,
                        suggestionsShown: 0,
                        suggestionsAccepted: 0,
                        chatPrompts: 0,
                        inlineChats: 0,
                        timestamp: new Date(record.date).getTime()
                    };
                }

                dailyData[record.date].suggestionsShown += record.suggestionsShown;
                dailyData[record.date].suggestionsAccepted += record.suggestionsAccepted;
                dailyData[record.date].chatPrompts += record.chatPrompts;
                dailyData[record.date].inlineChats += record.inlineChats;
            });

            return Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date));
        } catch (error) {
            console.error('Error getting daily stats:', error);
            return [];
        }
    }

    public async getTotalStats(): Promise<any> {
        try {
            const records = await this.getAllRecords();
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const recentRecords = records.filter(record => 
                new Date(record.date) >= threeMonthsAgo
            );

            const totalSuggestions = recentRecords.reduce((sum, r) => sum + r.suggestionsShown, 0);
            const totalAccepted = recentRecords.reduce((sum, r) => sum + r.suggestionsAccepted, 0);
            const totalPrompts = recentRecords.reduce((sum, r) => sum + r.chatPrompts + r.inlineChats, 0);
            
            const uniqueDates = new Set(recentRecords.map(r => r.date));
            const activeDays = uniqueDates.size;

            return {
                totalSuggestions,
                totalAccepted,
                totalPrompts,
                averageDaily: activeDays > 0 ? Math.round(totalPrompts / activeDays) : 0
            };
        } catch (error) {
            console.error('Error getting total stats:', error);
            return {
                totalSuggestions: 0,
                totalAccepted: 0,
                totalPrompts: 0,
                averageDaily: 0
            };
        }
    }

    public async exportData(): Promise<UsageRecord[]> {
        return await this.getAllRecords();
    }

    public async clearAllData(): Promise<void> {
        try {
            // Clear both statistics and prompt history
            await this.context.globalState.update(this.storageKey, []);
            await this.context.globalState.update(this.promptStorageKey, []);
            
            // Also clear any other potential storage keys
            await this.context.globalState.update('copilotUsageData', []);
            await this.context.globalState.update('copilotPromptHistory', []);
            
            console.log('All data cleared successfully');
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    private async getAllRecords(): Promise<UsageRecord[]> {
        try {
            const data = this.context.globalState.get<UsageRecord[]>(this.storageKey, []);
            return data;
        } catch (error) {
            console.error('Error getting all records:', error);
            return [];
        }
    }

    private async cleanOldData(): Promise<void> {
        try {
            const records = await this.getAllRecords();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Changed to 3 days

            const filteredRecords = records.filter(record => 
                new Date(record.date) >= threeDaysAgo
            );

            if (filteredRecords.length !== records.length) {
                await this.context.globalState.update(this.storageKey, filteredRecords);
                console.log('Old data cleaned successfully');
            }

            // Also clean prompt history
            await this.cleanOldPrompts();
        } catch (error) {
            console.error('Error cleaning old data:', error);
        }
    }

    private async savePromptText(promptText: string, type: 'chat_prompt' | 'inline_chat', timestamp: number): Promise<void> {
        try {
            const promptHistory = await this.getPromptHistory();
            const promptRecord: UsageRecord = {
                date: new Date(timestamp).toISOString().split('T')[0],
                hour: new Date(timestamp).getHours(),
                suggestionsShown: 0,
                suggestionsAccepted: 0,
                chatPrompts: type === 'chat_prompt' ? 1 : 0,
                inlineChats: type === 'inline_chat' ? 1 : 0,
                timestamp,
                promptText: promptText.substring(0, 500), // Limit prompt length to 500 chars
                promptType: type === 'chat_prompt' ? 'chat' : 'inline'
            };

            promptHistory.push(promptRecord);
            await this.context.globalState.update(this.promptStorageKey, promptHistory);
            
            // Auto-append to log file if one exists
            await this.appendToLogFile(promptRecord);
            
        } catch (error) {
            console.error('Error saving prompt text:', error);
        }
    }
    
    private async appendToLogFile(promptRecord: UsageRecord): Promise<void> {
        try {
            const logFilePath = this.context.globalState.get<string>('promptLogFilePath');
            if (logFilePath) {
                const uri = vscode.Uri.file(logFilePath);
                
                // Check if file still exists
                try {
                    await vscode.workspace.fs.stat(uri);
                    
                    // Append new prompt to file
                    const timestamp = new Date(promptRecord.timestamp).toLocaleString();
                    const newLine = `[${timestamp}] ${promptRecord.promptType?.toUpperCase()}: ${promptRecord.promptText}\n`;
                    
                    // Read current content and append
                    const currentContent = await vscode.workspace.fs.readFile(uri);
                    const updatedContent = Buffer.concat([currentContent, Buffer.from(newLine)]);
                    
                    await vscode.workspace.fs.writeFile(uri, updatedContent);
                    
                } catch (fileError) {
                    // File doesn't exist anymore, clear the path
                    await this.context.globalState.update('promptLogFilePath', undefined);
                    console.log('Prompt log file no longer exists, auto-logging disabled');
                }
            }
        } catch (error) {
            console.error('Error appending to log file:', error);
        }
    }

    private async cleanOldPrompts(): Promise<void> {
        try {
            const promptHistory = await this.getPromptHistory();
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); // Changed to 3 days
            
            const filteredPrompts = promptHistory.filter(record => 
                new Date(record.date) >= threeDaysAgo
            );

            if (filteredPrompts.length !== promptHistory.length) {
                await this.context.globalState.update(this.promptStorageKey, filteredPrompts);
            }
        } catch (error) {
            console.error('Error cleaning old prompts:', error);
        }
    }

    public async getPromptHistory(days: number = 3): Promise<UsageRecord[]> { // Changed default to 3 days
        try {
            const promptHistory = this.context.globalState.get<UsageRecord[]>(this.promptStorageKey) || [];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            return promptHistory
                .filter(record => new Date(record.date) >= cutoffDate && record.promptText)
                .sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error getting prompt history:', error);
            return [];
        }
    }

    public dispose(): void {
        // No cleanup needed for VS Code storage
        console.log('VS Code DataManager disposed');
    }
}

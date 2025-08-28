import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { UsageRecord, MonthlyStats, IDataManager } from './types';

export class DataManager implements IDataManager {
    private db: sqlite3.Database;
    private dbPath: string;

    constructor(context: vscode.ExtensionContext) {
        // Ensure the global storage directory exists
        const storageUri = context.globalStorageUri;
        if (!fs.existsSync(storageUri.fsPath)) {
            fs.mkdirSync(storageUri.fsPath, { recursive: true });
        }
        
        this.dbPath = path.join(storageUri.fsPath, 'copilot-usage.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.initDatabase();
    }

    private initDatabase(): void {
        const createTable = `
            CREATE TABLE IF NOT EXISTS usage_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                hour INTEGER NOT NULL,
                suggestions_shown INTEGER DEFAULT 0,
                suggestions_accepted INTEGER DEFAULT 0,
                chat_prompts INTEGER DEFAULT 0,
                inline_chats INTEGER DEFAULT 0,
                timestamp INTEGER NOT NULL,
                UNIQUE(date, hour)
            )
        `;

        this.db.run(createTable, (err) => {
            if (err) {
                console.error('Error creating table:', err);
                vscode.window.showErrorMessage('Failed to initialize usage database');
            } else {
                console.log('Database initialized successfully');
                this.cleanOldData();
            }
        });
    }

    public async recordUsage(type: 'suggestion_shown' | 'suggestion_accepted' | 'chat_prompt' | 'inline_chat', promptText?: string): Promise<void> {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const hour = now.getHours();
        const timestamp = now.getTime();

        const updateQuery = `
            INSERT OR REPLACE INTO usage_records 
            (date, hour, suggestions_shown, suggestions_accepted, chat_prompts, inline_chats, timestamp)
            VALUES (?, ?, 
                COALESCE((SELECT suggestions_shown FROM usage_records WHERE date = ? AND hour = ?), 0) + ?,
                COALESCE((SELECT suggestions_accepted FROM usage_records WHERE date = ? AND hour = ?), 0) + ?,
                COALESCE((SELECT chat_prompts FROM usage_records WHERE date = ? AND hour = ?), 0) + ?,
                COALESCE((SELECT inline_chats FROM usage_records WHERE date = ? AND hour = ?), 0) + ?,
                ?
            )
        `;

        const increments = {
            suggestion_shown: [1, 0, 0, 0],
            suggestion_accepted: [0, 1, 0, 0],
            chat_prompt: [0, 0, 1, 0],
            inline_chat: [0, 0, 0, 1]
        };

        const [suggestionInc, acceptedInc, chatInc, inlineInc] = increments[type];

        return new Promise((resolve, reject) => {
            this.db.run(updateQuery, [
                date, hour, 
                date, hour, suggestionInc,
                date, hour, acceptedInc,
                date, hour, chatInc,
                date, hour, inlineInc,
                timestamp
            ], (err) => {
                if (err) {
                    console.error('Error recording usage:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public async getMonthlyStats(): Promise<MonthlyStats[]> {
        const query = `
            SELECT 
                strftime('%Y-%m', date) as month,
                SUM(suggestions_shown) as totalSuggestions,
                SUM(suggestions_accepted) as acceptedSuggestions,
                SUM(chat_prompts + inline_chats) as totalPrompts
            FROM usage_records 
            WHERE date >= date('now', '-3 months')
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows: any[]) => {
                if (err) {
                    console.error('Error getting monthly stats:', err);
                    reject(err);
                } else {
                    const stats = rows.map(row => ({
                        month: row.month,
                        totalSuggestions: row.totalSuggestions || 0,
                        acceptedSuggestions: row.acceptedSuggestions || 0,
                        totalPrompts: row.totalPrompts || 0,
                        acceptanceRate: row.totalSuggestions > 0 ? 
                            Math.round((row.acceptedSuggestions / row.totalSuggestions) * 100) : 0
                    }));
                    resolve(stats);
                }
            });
        });
    }

    public async getDailyStats(days: number = 30): Promise<UsageRecord[]> {
        const query = `
            SELECT 
                date,
                SUM(suggestions_shown) as suggestionsShown,
                SUM(suggestions_accepted) as suggestionsAccepted,
                SUM(chat_prompts) as chatPrompts,
                SUM(inline_chats) as inlineChats
            FROM usage_records 
            WHERE date >= date('now', '-${days} days')
            GROUP BY date
            ORDER BY date DESC
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows: any[]) => {
                if (err) {
                    console.error('Error getting daily stats:', err);
                    reject(err);
                } else {
                    const records = rows.map(row => ({
                        date: row.date,
                        hour: 0,
                        suggestionsShown: row.suggestionsShown || 0,
                        suggestionsAccepted: row.suggestionsAccepted || 0,
                        chatPrompts: row.chatPrompts || 0,
                        inlineChats: row.inlineChats || 0,
                        timestamp: new Date(row.date).getTime()
                    }));
                    resolve(records);
                }
            });
        });
    }

    public async getTotalStats(): Promise<any> {
        const query = `
            SELECT 
                SUM(suggestions_shown) as totalSuggestions,
                SUM(suggestions_accepted) as totalAccepted,
                SUM(chat_prompts + inline_chats) as totalPrompts,
                COUNT(DISTINCT date) as activeDays
            FROM usage_records 
            WHERE date >= date('now', '-3 months')
        `;

        return new Promise((resolve, reject) => {
            this.db.get(query, [], (err, row: any) => {
                if (err) {
                    console.error('Error getting total stats:', err);
                    reject(err);
                } else {
                    resolve({
                        totalSuggestions: row?.totalSuggestions || 0,
                        totalAccepted: row?.totalAccepted || 0,
                        totalPrompts: row?.totalPrompts || 0,
                        averageDaily: row?.activeDays > 0 ? 
                            Math.round((row.totalPrompts || 0) / row.activeDays) : 0
                    });
                }
            });
        });
    }

    private cleanOldData(): void {
        const deleteQuery = "DELETE FROM usage_records WHERE date < date('now', '-3 months')";
        this.db.run(deleteQuery, (err) => {
            if (err) {
                console.error('Error cleaning old data:', err);
            } else {
                console.log('Old data cleaned successfully');
            }
        });
    }

    public async exportData(): Promise<UsageRecord[]> {
        const query = "SELECT * FROM usage_records ORDER BY date DESC, hour DESC";
        
        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows: any[]) => {
                if (err) {
                    console.error('Error exporting data:', err);
                    reject(err);
                } else {
                    const records = rows.map(row => ({
                        id: row.id,
                        date: row.date,
                        hour: row.hour,
                        suggestionsShown: row.suggestions_shown,
                        suggestionsAccepted: row.suggestions_accepted,
                        chatPrompts: row.chat_prompts,
                        inlineChats: row.inline_chats,
                        timestamp: row.timestamp
                    }));
                    resolve(records);
                }
            });
        });
    }

    public async clearAllData(): Promise<void> {
        const deleteQuery = "DELETE FROM usage_records";
        
        return new Promise((resolve, reject) => {
            this.db.run(deleteQuery, (err) => {
                if (err) {
                    console.error('Error clearing data:', err);
                    reject(err);
                } else {
                    console.log('All data cleared successfully');
                    resolve();
                }
            });
        });
    }

    public async getPromptHistory(days: number = 7): Promise<UsageRecord[]> {
        // SQLite version doesn't store prompt text, return empty array
        console.log('Prompt history not available in SQLite version');
        return [];
    }

    public dispose(): void {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

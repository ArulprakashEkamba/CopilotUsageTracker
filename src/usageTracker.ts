import * as vscode from 'vscode';
import { IDataManager } from './types';

export class UsageTracker {
    private dataManager: IDataManager;
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];
    private lastSelectionChange: number = 0;

    constructor(context: vscode.ExtensionContext, dataManager: IDataManager) {
        this.dataManager = dataManager;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'copilotUsageTracker.showDashboard';
        this.statusBarItem.tooltip = 'View Copilot Usage Statistics';
        
        this.initializeTracking();
        this.updateStatusBar();
        
        context.subscriptions.push(this.statusBarItem);
        context.subscriptions.push(...this.disposables);
    }

    private initializeTracking(): void {
        // Manual logging system for accurate Copilot tracking across all VS Code instances
        
        // Show welcome message with clear instructions
        vscode.window.showInformationMessage(
            '🎯 Copilot Usage Tracker Active!\n\nTo track your Copilot interactions:\n1. Use Copilot (Chat, Ctrl+I, or code suggestions)\n2. Run "Log Copilot Prompt Manually"\n3. Enter what you asked Copilot\n\nThis captures ALL instances across VS Code!',
            'Quick Log',
            'Got It'
        ).then(selection => {
            if (selection === 'Quick Log') {
                vscode.commands.executeCommand('copilotUsageTracker.logManualPrompt');
            }
        });
    }

    private async recordUsage(type: 'suggestion_shown' | 'suggestion_accepted' | 'chat_prompt' | 'inline_chat', promptText?: string): Promise<void> {
        try {
            await this.dataManager.recordUsage(type, promptText);
            this.updateStatusBar();
        } catch (error) {
            console.error('Error recording usage:', error);
        }
    }

    private async updateStatusBar(): Promise<void> {
        try {
            const totalStats = await this.dataManager.getTotalStats();
            this.statusBarItem.text = `$(copilot) ${totalStats.totalPrompts} Copilot interactions`;
            this.statusBarItem.show();
        } catch (error) {
            console.error('Error updating status bar:', error);
            this.statusBarItem.text = '$(copilot) Copilot Tracker - Click to log';
            this.statusBarItem.show();
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.statusBarItem.dispose();
    }
}

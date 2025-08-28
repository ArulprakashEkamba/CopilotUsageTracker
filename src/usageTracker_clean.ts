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
        // DISABLED: Automatic tracking creates noise and doesn't capture real Copilot interactions
        // Only manual logging will be used for accurate prompt tracking
        
        // Show message about manual logging
        vscode.window.showInformationMessage(
            '🎯 Copilot Usage Tracker: Manual logging only! Use "Log Copilot Prompt Manually" to record your real Copilot interactions.',
            'How to Log',
            'Log Now'
        ).then(selection => {
            if (selection === 'How to Log') {
                vscode.window.showInformationMessage(
                    '📝 After using Copilot:\n1. Press Ctrl+Shift+P\n2. Run "Log Copilot Prompt Manually"\n3. Enter exactly what you asked Copilot\n4. Select interaction type\n\nThis ensures 100% accurate tracking!'
                );
            } else if (selection === 'Log Now') {
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
            this.statusBarItem.text = `$(copilot) ${totalStats.totalPrompts} prompts (manual)`;
            this.statusBarItem.show();
        } catch (error) {
            console.error('Error updating status bar:', error);
            this.statusBarItem.text = '$(copilot) Copilot Usage (manual)';
            this.statusBarItem.show();
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.statusBarItem.dispose();
    }
}

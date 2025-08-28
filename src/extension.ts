import * as vscode from 'vscode';
import { VSCodeDataManager } from './vsCodeDataManager';
import { UsageTracker } from './usageTracker';
import { WebviewProvider } from './webviewProvider';

let dataManager: VSCodeDataManager;
let usageTracker: UsageTracker;
let webviewProvider: WebviewProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Copilot Usage Tracker is now active!');

    // Initialize the data manager
    dataManager = new VSCodeDataManager(context);
    
    // Force clear all old data to remove any fake/sample data
    console.log('Clearing all existing data...');
    await dataManager.clearAllData();
    
    // Initialize usage tracker
    usageTracker = new UsageTracker(context, dataManager);

    // Initialize webview provider
    webviewProvider = new WebviewProvider(dataManager);

    // Register the dashboard command
    const showDashboardCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.showDashboard',
        async () => await webviewProvider.showDashboard(context)
    );

    // Register the export command
    const exportDataCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.exportData',
        async () => {
            try {
                // First, check if we have any data
                const data = await dataManager.exportData();
                const prompts = await dataManager.getPromptHistory();
                
                console.log('Export data:', data.length, 'records');
                console.log('Prompt history:', prompts.length, 'prompts');
                
                if (data.length === 0 && prompts.length === 0) {
                    const result = await vscode.window.showWarningMessage(
                        'No usage data found. Would you like to generate some test data to verify export functionality?',
                        'Generate Test Data',
                        'Export Empty Data',
                        'Cancel'
                    );
                    
                    if (result === 'Generate Test Data') {
                        // Generate test data
                        await dataManager.recordUsage('chat_prompt', 'Test prompt: Create a hello world function');
                        await dataManager.recordUsage('suggestion_shown', 'Test suggestion shown');
                        await dataManager.recordUsage('suggestion_accepted', 'Test suggestion accepted');
                        await dataManager.recordUsage('inline_chat', 'Test inline chat: Fix this code');
                        
                        vscode.window.showInformationMessage('Test data generated! Try export again.');
                        return;
                    } else if (result === 'Cancel') {
                        return;
                    }
                    // Continue with empty data export if user chose "Export Empty Data"
                }

                const includePrompts = await vscode.window.showQuickPick(
                    ['Export Statistics Only', 'Export with Prompt History'],
                    { placeHolder: 'What would you like to export?' }
                );

                if (!includePrompts) {
                    return;
                }

                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file('copilot-usage-export'),
                    filters: {
                        'CSV Files': ['csv'],
                        'JSON Files': ['json']
                    }
                });

                if (uri) {
                    const finalData = await dataManager.exportData();
                    const finalPrompts = includePrompts === 'Export with Prompt History' 
                        ? await dataManager.getPromptHistory() 
                        : [];

                    const exportData = {
                        exportDate: new Date().toISOString(),
                        retentionPeriod: '3 days',
                        totalRecords: finalData.length,
                        totalPrompts: finalPrompts.length,
                        statistics: finalData,
                        promptHistory: finalPrompts
                    };

                    let content: string;
                    if (uri.fsPath.endsWith('.csv')) {
                        if (includePrompts === 'Export with Prompt History' && finalPrompts.length > 0) {
                            // CSV with both stats and prompts
                            const headers = 'Date,Hour,Suggestions Shown,Suggestions Accepted,Chat Prompts,Inline Chats,Timestamp\n';
                            const statsRows = finalData.map((row: any) => 
                                `${row.date},${row.hour},${row.suggestionsShown || 0},${row.suggestionsAccepted || 0},${row.chatPrompts || 0},${row.inlineChats || 0},${row.timestamp}`
                            );
                            
                            const promptHeaders = '\n\nPrompt History:\nTimestamp,Type,Text\n';
                            const promptCsvRows = finalPrompts.map(row =>
                                `${new Date(row.timestamp).toISOString()},${row.promptType || 'unknown'},"${(row.promptText || '').replace(/"/g, '""')}"`
                            );
                            content = headers + statsRows.join('\n') + promptHeaders + promptCsvRows.join('\n');
                        } else {
                            // CSV statistics only
                            const headers = 'Date,Hour,Suggestions Shown,Suggestions Accepted,Chat Prompts,Inline Chats,Timestamp\n';
                            if (finalData.length === 0) {
                                content = headers + 'No data available,0,0,0,0,0,' + new Date().getTime();
                            } else {
                                const rows = finalData.map((row: any) => 
                                    `${row.date},${row.hour},${row.suggestionsShown || 0},${row.suggestionsAccepted || 0},${row.chatPrompts || 0},${row.inlineChats || 0},${row.timestamp}`
                                );
                                content = headers + rows.join('\n');
                            }
                        }
                    } else {
                        content = JSON.stringify(exportData, null, 2);
                    }
                    
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
                    
                    const fileSize = Buffer.from(content).length;
                    vscode.window.showInformationMessage(
                        `Usage data exported successfully!\nFile: ${uri.fsPath}\nSize: ${fileSize} bytes\nRecords: ${finalData.length} stats, ${finalPrompts.length} prompts`,
                        'Open File'
                    ).then(selection => {
                        if (selection === 'Open File') {
                            vscode.commands.executeCommand('vscode.open', uri);
                        }
                    });
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export data: ${error}`);
            }
        }
    );

    // Register the clear data command
    const clearDataCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.clearData',
        async () => {
            const result = await vscode.window.showWarningMessage(
                'Are you sure you want to clear all usage data? This action cannot be undone.',
                'Clear Data',
                'Cancel'
            );

            if (result === 'Clear Data') {
                try {
                    await dataManager.clearAllData();
                    vscode.window.showInformationMessage('All Copilot usage data has been cleared.');
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to clear data: ${error}`);
                }
            }
        }
    );

    // Register the prompt history command
    const showPromptHistoryCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.showPromptHistory',
        async () => {
            try {
                const prompts = await dataManager.getPromptHistory();
                if (prompts.length === 0) {
                    vscode.window.showInformationMessage('No prompt history available. Start using Copilot to see your prompts here!');
                    return;
                }

                // Create a quick pick to show prompt history
                const items = prompts.map(record => ({
                    label: `${record.promptType?.toUpperCase()} - ${new Date(record.timestamp).toLocaleString()}`,
                    description: record.promptText?.substring(0, 100) + (record.promptText && record.promptText.length > 100 ? '...' : ''),
                    detail: `Full prompt: ${record.promptText}`
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a prompt to view details (last 3 days)',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    await vscode.window.showInformationMessage(selected.detail || 'No details available');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show prompt history: ${error}`);
            }
        }
    );

    // Register the write prompts to file command
    const writePromptsToFileCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.writePromptsToFile',
        async () => {
            try {
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file('copilot-prompts.txt'),
                    filters: {
                        'Text Files': ['txt'],
                        'All Files': ['*']
                    },
                    saveLabel: 'Create Prompt Log File'
                });

                if (uri) {
                    // Get all current prompts
                    const prompts = await dataManager.getPromptHistory();
                    
                    // Create initial file content
                    let content = `=== COPILOT PROMPTS LOG ===\n`;
                    content += `Created: ${new Date().toISOString()}\n`;
                    content += `Auto-updated with new prompts (last 3 days)\n`;
                    content += `==========================================\n\n`;
                    
                    if (prompts.length > 0) {
                        prompts.forEach(prompt => {
                            const timestamp = new Date(prompt.timestamp).toLocaleString();
                            content += `[${timestamp}] ${prompt.promptType?.toUpperCase()}: ${prompt.promptText}\n`;
                        });
                    } else {
                        content += `No prompts yet. Start using Copilot and prompts will appear here automatically!\n`;
                    }
                    
                    // Write initial file
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
                    
                    // Store the file path for continuous updates
                    await context.globalState.update('promptLogFilePath', uri.fsPath);
                    
                    // Show success message with options
                    const result = await vscode.window.showInformationMessage(
                        `Prompt log file created at: ${uri.fsPath}\n\nNew prompts will be automatically added to this file!`,
                        'Open File',
                        'View Location',
                        'Stop Auto-Logging'
                    );
                    
                    if (result === 'Open File') {
                        await vscode.commands.executeCommand('vscode.open', uri);
                    } else if (result === 'View Location') {
                        await vscode.commands.executeCommand('revealFileInOS', uri);
                    } else if (result === 'Stop Auto-Logging') {
                        await context.globalState.update('promptLogFilePath', undefined);
                        vscode.window.showInformationMessage('Auto-logging to file stopped.');
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create prompt log file: ${error}`);
            }
        }
    );

    // Register the manual prompt logging command
    const logManualPromptCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.logManualPrompt',
        async () => {
            try {
                const promptText = await vscode.window.showInputBox({
                    prompt: 'Enter the prompt you just used with Copilot',
                    placeHolder: 'Example: Create a login function with validation',
                    ignoreFocusOut: true
                });

                if (promptText && promptText.trim().length > 0) {
                    const promptType = await vscode.window.showQuickPick(
                        [
                            { label: '💬 Chat Prompt', value: 'chat_prompt', description: 'Used Copilot Chat panel' },
                            { label: '⚡ Inline Chat', value: 'inline_chat', description: 'Used Ctrl+I inline chat' },
                            { label: '💡 Code Suggestion', value: 'suggestion_shown', description: 'Got code suggestions while typing' }
                        ],
                        {
                            placeHolder: 'What type of Copilot interaction was this?',
                            matchOnDescription: true
                        }
                    );

                    if (promptType) {
                        await dataManager.recordUsage(
                            promptType.value as 'suggestion_shown' | 'suggestion_accepted' | 'chat_prompt' | 'inline_chat',
                            `MANUAL: ${promptText.trim()}`
                        );

                        vscode.window.showInformationMessage(
                            `✅ Prompt logged successfully!\n"${promptText.substring(0, 50)}${promptText.length > 50 ? '...' : ''}"`,
                            'Log Another',
                            'View History'
                        ).then(selection => {
                            if (selection === 'Log Another') {
                                vscode.commands.executeCommand('copilotUsageTracker.logManualPrompt');
                            } else if (selection === 'View History') {
                                vscode.commands.executeCommand('copilotUsageTracker.showPromptHistory');
                            }
                        });
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to log prompt: ${error}`);
            }
        }
    );

    // Register the clipboard monitoring command (ENHANCED FEATURE)
    const monitorClipboardCommand = vscode.commands.registerCommand(
        'copilotUsageTracker.monitorClipboard',
        async () => {
            try {
                // Start clipboard monitoring
                const interval = setInterval(async () => {
                    try {
                        const clipboardText = await vscode.env.clipboard.readText();
                        if (clipboardText && clipboardText.length > 10 && clipboardText.length < 1000) {
                            // Check if it looks like a Copilot prompt/response
                            const looksLikeCopilotContent = 
                                clipboardText.includes('function') ||
                                clipboardText.includes('const ') ||
                                clipboardText.includes('let ') ||
                                clipboardText.includes('import ') ||
                                clipboardText.includes('export ') ||
                                clipboardText.toLowerCase().includes('create') ||
                                clipboardText.toLowerCase().includes('generate') ||
                                clipboardText.toLowerCase().includes('fix') ||
                                clipboardText.toLowerCase().includes('help');
                            
                            if (looksLikeCopilotContent) {
                                const result = await vscode.window.showInformationMessage(
                                    `🤖 Copilot content detected in clipboard!\n"${clipboardText.substring(0, 100)}${clipboardText.length > 100 ? '...' : ''}"\n\nWould you like to log this?`,
                                    'Log as Chat Prompt',
                                    'Log as Code Suggestion',
                                    'Ignore'
                                );
                                
                                if (result === 'Log as Chat Prompt') {
                                    await dataManager.recordUsage('chat_prompt', `CLIPBOARD: ${clipboardText}`);
                                    vscode.window.showInformationMessage('✅ Logged as chat prompt!');
                                } else if (result === 'Log as Code Suggestion') {
                                    await dataManager.recordUsage('suggestion_shown', `CLIPBOARD: ${clipboardText}`);
                                    vscode.window.showInformationMessage('✅ Logged as code suggestion!');
                                }
                            }
                        }
                    } catch (clipError) {
                        // Ignore clipboard errors
                    }
                }, 3000); // Check every 3 seconds
                
                // Store interval for cleanup
                context.globalState.update('clipboardInterval', interval);
                
                vscode.window.showInformationMessage(
                    '📋 Clipboard monitoring started! Copy Copilot prompts/responses and I\'ll auto-detect them.',
                    'Stop Monitoring'
                ).then(selection => {
                    if (selection === 'Stop Monitoring') {
                        clearInterval(interval);
                        context.globalState.update('clipboardInterval', undefined);
                        vscode.window.showInformationMessage('📋 Clipboard monitoring stopped.');
                    }
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start clipboard monitoring: ${error}`);
            }
        }
    );

    context.subscriptions.push(
        showDashboardCommand,
        exportDataCommand,
        clearDataCommand,
        showPromptHistoryCommand,
        writePromptsToFileCommand,
        logManualPromptCommand,
        monitorClipboardCommand
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        'Copilot Usage Tracker: All data cleared! Now tracking only your real Copilot usage (3-day retention).',
        'View Dashboard'
    ).then(selection => {
        if (selection === 'View Dashboard') {
            vscode.commands.executeCommand('copilotUsageTracker.showDashboard');
        }
    });
}

export function deactivate() {
    console.log('Copilot Usage Tracker extension is being deactivated');
    
    if (dataManager) {
        dataManager.dispose();
    }
    
    if (usageTracker) {
        usageTracker.dispose();
    }
}
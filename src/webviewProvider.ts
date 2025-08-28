import * as vscode from 'vscode';
import { IDataManager, DashboardData } from './types';

export class WebviewProvider {
    private dataManager: IDataManager;
    private panel: vscode.WebviewPanel | undefined;

    constructor(dataManager: IDataManager) {
        this.dataManager = dataManager;
    }

    public async showDashboard(context: vscode.ExtensionContext): Promise<void> {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'copilotUsageDashboard',
            'Copilot Usage Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
            }
        );

        this.panel.webview.html = await this.getWebviewContent();

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        this.panel!.webview.html = await this.getWebviewContent();
                        break;
                    case 'export':
                        await this.exportData();
                        break;
                    case 'clear':
                        await this.clearData();
                        break;
                }
            },
            undefined,
            []
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private async getWebviewContent(): Promise<string> {
        try {
            const monthlyStats = await this.dataManager.getMonthlyStats();
            const dailyStats = await this.dataManager.getDailyStats(30);
            const totalStats = await this.dataManager.getTotalStats();

            const dashboardData: DashboardData = {
                monthlyStats,
                currentMonth: dailyStats,
                totalStats
            };

            return this.generateHTML(dashboardData);
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return this.generateErrorHTML();
        }
    }

    private generateHTML(data: DashboardData): string {
        const monthlyLabels = data.monthlyStats.map(stat => {
            const [year, month] = stat.month.split('-');
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
        });

        const suggestionData = data.monthlyStats.map(stat => stat.totalSuggestions);
        const promptData = data.monthlyStats.map(stat => stat.totalPrompts);
        const acceptanceData = data.monthlyStats.map(stat => stat.acceptanceRate);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Usage Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .stat-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        .info-section {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .info-section h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
        }
        .info-section ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .info-section li {
            margin: 8px 0;
            color: var(--vscode-foreground);
        }
        .chart-container {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            font-size: 1.2em;
            font-weight: bold;
        }
        .chart-canvas {
            max-height: 400px;
        }
        .button-group {
            text-align: center;
            margin-top: 30px;
        }
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            margin: 0 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Copilot Usage Dashboard</h1>
            <p>Track your real GitHub Copilot interactions across all VS Code instances</p>
            <div style="background-color: var(--vscode-inputValidation-infoBackground); border: 1px solid var(--vscode-inputValidation-infoBorder); padding: 10px; border-radius: 4px; margin: 10px 0;">
                <strong>✨ How to Use:</strong> Use "Log Copilot Prompt Manually" command after each Copilot interaction to track your actual usage.
            </div>
        </div>

        <div class="info-section">
            <h3>📊 What These Metrics Mean:</h3>
            <ul>
                <li><strong>💬 Chat Prompts:</strong> Questions/requests you typed in Copilot Chat panel</li>
                <li><strong>⚡ Inline Chats:</strong> Quick prompts using Ctrl+I while coding</li>
                <li><strong>💡 Code Suggestions:</strong> Copilot code completions that appeared while typing</li>
                <li><strong>✅ Accepted Suggestions:</strong> Code suggestions you actually used (Tab to accept)</li>
                <li><strong>📈 Acceptance Rate:</strong> Percentage of suggestions you found useful and kept</li>
            </ul>
            <p style="color: var(--vscode-descriptionForeground); font-style: italic; margin-top: 10px;">
                🎯 <strong>Goal:</strong> Capture every Copilot interaction across all VS Code instances
            </p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${data.totalStats.totalPrompts}</div>
                <div class="stat-label">💬 Chat Prompts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.totalStats.totalSuggestions}</div>
                <div class="stat-label">💡 Code Suggestions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.totalStats.totalAccepted}</div>
                <div class="stat-label">✅ Accepted Suggestions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.totalStats.averageDaily}</div>
                <div class="stat-label">📅 Daily Average</div>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart-title">� Copilot Usage Bar Chart</div>
            <p style="text-align: center; color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-bottom: 15px;">
                Simple bar chart showing your Copilot activity by month
            </p>
            <canvas id="monthlyChart" class="chart-canvas"></canvas>
        </div>

        <div class="button-group">
            <button class="btn" onclick="refreshData()">Refresh</button>
            <button class="btn btn-secondary" onclick="exportData()">Export Data</button>
            <button class="btn btn-secondary" onclick="clearData()" style="background-color: var(--vscode-errorForeground);">Clear Data</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Monthly Usage Chart (Bar Chart Only)
        const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(monthlyLabels)},
                datasets: [
                    {
                        label: '💬 Chat Prompts',
                        data: ${JSON.stringify(promptData)},
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    },
                    {
                        label: '💡 Code Suggestions',
                        data: ${JSON.stringify(suggestionData)},
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Copilot Usage by Month',
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        title: {
                            display: true,
                            text: 'Number of Interactions',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        title: {
                            display: true,
                            text: 'Month',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }
                    }
                }
            }
        });

        function refreshData() {
            vscode.postMessage({ command: 'refresh' });
        }

        function exportData() {
            vscode.postMessage({ command: 'export' });
        }

        function clearData() {
            if (confirm('Are you sure you want to clear all usage data? This action cannot be undone.')) {
                vscode.postMessage({ command: 'clear' });
            }
        }
    </script>
</body>
</html>`;
    }

    private generateErrorHTML(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Copilot Usage Dashboard - Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            text-align: center;
        }
        .error {
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Copilot Usage Dashboard</h1>
    <div class="error">
        <h2>Error Loading Dashboard</h2>
        <p>There was an error loading your usage data. Please check the console for more details.</p>
        <button onclick="location.reload()">Retry</button>
    </div>
</body>
</html>`;
    }

    private async exportData(): Promise<void> {
        try {
            const data = await this.dataManager.exportData();
            const csvContent = this.convertToCSV(data);
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('copilot-usage-data.csv'),
                filters: {
                    'CSV files': ['csv'],
                    'JSON files': ['json']
                }
            });

            if (uri) {
                const content = uri.fsPath.endsWith('.json') ? 
                    JSON.stringify(data, null, 2) : csvContent;
                
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
                vscode.window.showInformationMessage(`Usage data exported to ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export data: ${error}`);
        }
    }

    private convertToCSV(data: any[]): string {
        if (data.length === 0) {
            return '';
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        return [headers, ...rows].join('\n');
    }

    private async clearData(): Promise<void> {
        try {
            await this.dataManager.clearAllData();
            vscode.window.showInformationMessage('All usage data has been cleared');
            if (this.panel) {
                this.panel.webview.html = await this.getWebviewContent();
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear data: ${error}`);
        }
    }
}

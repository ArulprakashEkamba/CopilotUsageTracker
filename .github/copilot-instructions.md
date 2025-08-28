<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
	<!-- Creating a VS Code extension for tracking GitHub Copilot usage with TypeScript, SQLite database, and webview dashboard -->

- [x] Scaffold the Project
	<!-- Set up VS Code extension project structure with TypeScript configuration -->

- [x] Customize the Project
	<!-- Implement Copilot usage tracking functionality, SQLite database, and dashboard UI -->

- [x] Install Required Extensions
	<!-- Install any required VS Code extensions for development -->

- [x] Compile the Project
	<!-- Build TypeScript and resolve dependencies -->

- [x] Create and Run Task
	<!-- Create build and watch tasks for development -->

- [x] Launch the Project
	<!-- Set up debugging configuration -->

**🎉 VS Code Extension Project Complete! 🎉**

## Quick Start
1. **Test the Extension**: Press `F5` to launch Extension Development Host
2. **View Dashboard**: In the new VS Code window, open Command Palette (`Ctrl+Shift+P`) and run "Copilot Usage: Show Copilot Usage Dashboard"
3. **Check Status Bar**: Look for the Copilot usage counter in the bottom status bar
4. **Export Data**: Use "Copilot Usage: Export Usage Data" command

## Project Structure Created
- ✅ **DataManager**: SQLite database with 3-month data retention
- ✅ **UsageTracker**: Real-time Copilot usage detection
- ✅ **WebviewProvider**: Interactive dashboard with Chart.js
- ✅ **Commands**: Show dashboard, export data, clear data
- ✅ **Status Bar**: Live usage counter
- ✅ **Background Compilation**: Watch mode active

## Features Implemented
- 📊 **Bar Charts**: Monthly usage visualization
- 📈 **Line Charts**: Acceptance rate trends  
- 💾 **SQLite Storage**: Efficient local database
- 📤 **Data Export**: CSV/JSON export options
- 🔄 **Auto-cleanup**: 3-month data retention
- 🎯 **Privacy-first**: No external data transmission

**🆕 Enhanced Features Added:**
- ✅ **Prompt Text Logging**: Captures actual prompt content (up to 500 chars)
- ✅ **7-Day Data Retention**: Changed from 3 months to 7 days for prompt data
- ✅ **Prompt History Viewer**: New command to browse your recent prompts
- ✅ **Enhanced Export**: Option to export with or without prompt text
- ✅ **Sample Prompt Data**: Realistic examples for demonstration

## Available Commands:
- `Copilot Usage: Show Copilot Usage Dashboard` - Interactive charts and stats
- `Copilot Usage: Export Usage Data` - Export statistics with optional prompt history
- `Copilot Usage: Show Prompt History` - Browse your recent prompts (last 7 days)
- `Copilot Usage: Clear Usage Data` - Reset all stored data

## What Gets Logged:
- ✅ **Usage Statistics**: Suggestion counts, acceptance rates, prompt counts
- ✅ **Prompt Text**: Actual text of chat and inline prompts (truncated to 500 chars)
- ✅ **Timestamps**: When each interaction occurred
- ✅ **Prompt Types**: Chat vs inline chat classification

**Privacy Note**: All data stored locally in VS Code storage, automatically cleaned after 7 days.

- [x] Ensure Documentation is Complete
	<!-- Create comprehensive README and clean up instructions -->

## Project Details
- **Type**: VS Code Extension
- **Language**: TypeScript
- **Database**: SQLite
- **Features**: Copilot usage tracking, monthly statistics, bar charts, data export
- **Storage**: Local SQLite database with 3-month data retention

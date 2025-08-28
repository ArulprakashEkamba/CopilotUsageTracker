# Copilot Usage Tracker

A TypeScript-based Visual Studio extension to help users track their AI adoption. It provides a simple dashboard showing AI usage across all VS instances linked to the same user. It also logs prompts in a text file to help users review and improve their prompt engineering skills.

## Features

- **Real-time Usage Tracking**: Monitor Copilot suggestions, acceptances, and chat interactions
- **Monthly Statistics**: View usage trends over the past 3 months
- **Interactive Dashboard**: Beautiful bar charts and line graphs showing your usage patterns
- **Data Export**: Export your usage data to CSV or JSON format
- **Status Bar Integration**: Quick access to usage stats in VS Code status bar
- **Privacy-First**: All data stored locally using SQLite

## Installation

1. Install the extension from the VS Code Marketplace
2. Reload VS Code
3. The extension will automatically start tracking your Copilot usage

## Usage

### View Dashboard
- Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
- Run command: `Copilot Usage: Show Copilot Usage Dashboard`
- Or click on the Copilot usage counter in the status bar

### Export Data
- Open Command Palette
- Run command: `Copilot Usage: Export Usage Data`
- Choose CSV or JSON format and save location

### Clear Data
- Open Command Palette
- Run command: `Copilot Usage: Clear Usage Data`
- Confirm to permanently delete all usage history

## Dashboard Features

### Statistics Cards
- **Total Suggestions**: Number of Copilot suggestions received
- **Accepted Suggestions**: Number of suggestions you accepted
- **Total Prompts**: Chat and inline prompts sent to Copilot
- **Average Daily Prompts**: Your daily usage average

### Charts
- **Monthly Usage**: Bar chart showing suggestions and prompts by month
- **Acceptance Rate**: Line chart showing your suggestion acceptance rate over time

### Controls
- **Refresh**: Update dashboard with latest data
- **Export Data**: Quick export from dashboard
- **Clear Data**: Remove all stored usage data

## Data Storage

- Uses SQLite for efficient local storage
- Automatically retains 3 months of data
- Database stored in VS Code's global storage directory
- No data sent to external servers

## Privacy

- All usage data is stored locally on your machine
- No telemetry or external data transmission
- You have full control over your data with export and clear options

## Development

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd copilot-usage-tracker

# Install dependencies
npm install

# Compile the extension
npm run compile

# Start watch mode for development
npm run watch
```

### Testing

```bash
# Run tests
npm test

# Watch tests during development
npm run watch-tests
```

### Debugging

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new VS Code window

## Requirements

- VS Code 1.103.0 or higher
- GitHub Copilot extension installed and active

## Extension Settings

Currently, this extension contributes no additional settings. All functionality works out of the box.

## Known Issues

- Initial tracking may take a few minutes to show meaningful data
- Suggestion detection uses heuristics and may not capture 100% of interactions
- Large code changes might be incorrectly identified as Copilot suggestions

## Release Notes

### 0.0.1

- Initial release
- Basic usage tracking for suggestions and prompts
- SQLite database integration
- Interactive dashboard with Chart.js
- Data export functionality
- Status bar integration

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have feature requests, please file an issue on the GitHub repository.

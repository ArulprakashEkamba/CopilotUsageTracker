# 📊 Copilot Usage Metrics - Simple Guide

## What Each Metric Means

### 💬 Chat Prompts
- **What it is:** Questions/requests you type in the Copilot Chat panel
- **Example:** "Create a login function with validation"
- **How to capture:** Use "Log Copilot Prompt Manually" after chatting with Copilot

### ⚡ Inline Chats  
- **What it is:** Quick prompts using Ctrl+I while coding
- **Example:** "Fix this bug" or "Add error handling"
- **How to capture:** Log manually after using Ctrl+I with Copilot

### 💡 Code Suggestions
- **What it is:** Copilot code completions that appeared while typing
- **Example:** Auto-completed functions, variable names, code blocks
- **How to capture:** Log when you see grey suggestion text appear

### ✅ Accepted Suggestions
- **What it is:** Code suggestions you actually used (pressed Tab to accept)
- **Example:** You saw a suggestion and pressed Tab to use it
- **How to capture:** Log when you accept a suggestion with Tab

### 📈 Acceptance Rate
- **What it is:** Percentage of suggestions you found useful and kept
- **Calculation:** (Accepted Suggestions ÷ Total Suggestions) × 100
- **Good rate:** 70%+ means Copilot is very helpful for you

## 🎯 Goal: Capture Everything Across All VS Code Instances

This extension aims to track **every single Copilot interaction** you have, regardless of which VS Code window or instance you're using.

## 📊 The Bar Chart Shows:
- **Blue bars:** Your chat prompts and inline chats per month
- **Red bars:** Code suggestions Copilot showed you per month
- **Simple view:** Easy to see your usage trends over time

## 🚀 Quick Logging Workflow:
1. **Use Copilot** (Chat, Ctrl+I, or see a code suggestion)
2. **Press Ctrl+Shift+P**
3. **Type "Log Copilot"** and select "Log Copilot Prompt Manually"
4. **Enter what you asked** or describe the suggestion
5. **Select the type** (Chat, Inline, or Suggestion)
6. **Done!** Your data is tracked and will appear in the bar chart

## 💾 Data Storage:
- All data stored locally in VS Code
- Automatically cleaned after 3 days (keeps recent data only)
- Export to text file with each prompt on a new line
- No data sent anywhere - completely private

---
**Remember:** The more accurately you log, the better insights you'll get about your Copilot usage patterns! 📈

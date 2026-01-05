# 🚀 Quick Start Guide

This guide will help you get the Fund Bot up and running quickly.

## ✅ What's Already Done

The project is fully set up with:
- ✅ Complete project structure
- ✅ All TypeScript types defined
- ✅ Google Sheets integration
- ✅ Slack integration with event handlers
- ✅ Claude AI integration with conversation memory
- ✅ Daily report generators (morning & EOD)
- ✅ Vercel configuration with cron schedules
- ✅ Git repository initialized and pushed to GitHub

## 📝 Next Steps

### 1. Install Dependencies (5 minutes)

```bash
cd /Users/duke/development/fund-bot
pnpm install
```

### 2. Set Up Services (30-45 minutes)

You need to configure these three services:

#### A. Slack App Configuration
1. Go to https://api.slack.com/apps
2. Create a new app called "FundBot"
3. Add Bot Token Scopes (see README.md for full list)
4. Install app to workspace
5. Get your Bot Token and Signing Secret

#### B. Google Cloud Service Account
1. Go to https://console.cloud.google.com/
2. Create/select a project
3. Enable Google Sheets API
4. Create a Service Account with "Viewer" role
5. Download the JSON key file
6. Share your Google Sheets with the service account email

#### C. Anthropic API
1. Go to https://console.anthropic.com/
2. Create an account if needed
3. Generate an API key

### 3. Configure Environment Variables (10 minutes)

Create a `.env` file by copying the template:

```bash
cp env.template .env
```

Then edit `.env` with your actual credentials:

```env
# Slack (from step 2A)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Google Sheets (from step 2B)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PORTFOLIO_SHEET_ID=...
BTCTC_SHEET_ID=...

# Anthropic (from step 2C)
ANTHROPIC_API_KEY=sk-ant-...

# Slack Channels (right-click channel → View details → get ID)
DAILY_REPORTS_CHANNEL_ID=C...
ASK_FUNDBOT_CHANNEL_ID=C...

# Generate a random string for security
CRON_SECRET=your-random-secret-here
```

### 4. Test Locally (10 minutes)

```bash
# Type check
pnpm type-check

# Run dev server
pnpm dev
```

The local server will start at `http://localhost:3000`

### 5. Deploy to Vercel (10 minutes)

```bash
# Install Vercel CLI (if not already installed)
pnpm add -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

After deployment:
1. Copy your Vercel URL
2. Go back to Slack App settings
3. Update Event Subscriptions Request URL to: `https://your-app.vercel.app/api/slack/events`

### 6. Add Environment Variables to Vercel (5 minutes)

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all variables from your `.env` file
4. Redeploy: `vercel --prod`

### 7. Test in Slack (5 minutes)

1. Invite the bot to a channel: `/invite @FundBot`
2. Test a mention: `@FundBot What's our current AUM?`
3. Test a DM: Send a direct message to FundBot

## 🎯 Customization Points

Before going live, you may want to customize:

### Sheet Structure
- **File**: `config/sheets.ts`
- **What**: Cell references and range names
- **Why**: Your sheet structure might differ from the spec

### Report Format
- **Files**: `api/cron/morning-report.ts` and `api/cron/eod-report.ts`
- **What**: Message formatting and content
- **Why**: Adjust to your team's preferences

### Cron Schedule
- **File**: `vercel.json`
- **What**: Schedule times (currently 9 AM and 4:30 PM ET)
- **Why**: Change report times if needed

### Claude System Prompt
- **File**: `lib/claude/prompts.ts`
- **What**: Bot personality and instructions
- **Why**: Adjust tone and behavior

### Slack Channels
- **File**: `config/channels.ts`
- **What**: Which channels the bot monitors
- **Why**: Add or remove channels

## 🔍 Verification Checklist

Before considering the bot "production ready":

- [ ] Bot responds to @mentions in channels
- [ ] Bot responds to DMs
- [ ] Bot responds in #ask-fundbot without mentions
- [ ] Thread conversations maintain context
- [ ] Data is fetched correctly from Google Sheets
- [ ] Morning report posts at 9 AM ET
- [ ] EOD report posts at 4:30 PM ET
- [ ] Error handling works (try breaking things!)
- [ ] Health endpoint returns 200: `curl https://your-app.vercel.app/api/health`

## 🐛 Common Issues

### "Invalid signature" error
- Double-check `SLACK_SIGNING_SECRET` matches your app
- Verify Vercel environment variables are set

### Sheet data not loading
- Confirm service account email is correct
- Verify sheets are shared with service account
- Check `GOOGLE_PRIVATE_KEY` formatting (needs `\n` newlines)

### Bot doesn't respond
- Verify bot is invited to the channel
- Check Vercel logs for errors
- Confirm Event Subscriptions Request URL is correct

### Cron jobs not running
- Ensure you're on a Vercel plan that supports crons (Pro or higher)
- Verify `CRON_SECRET` is set in Vercel
- Check Vercel → Project → Cron Jobs to see execution logs

## 📚 Additional Resources

- [Full README](./README.md) - Complete documentation
- [Slack API Docs](https://api.slack.com/) - Slack integration details
- [Vercel Docs](https://vercel.com/docs) - Deployment and cron jobs
- [Anthropic Docs](https://docs.anthropic.com/) - Claude API reference
- [Google Sheets API](https://developers.google.com/sheets/api) - Sheets integration

## 🎉 You're Done!

Once everything is working, you have:
- ✅ A fully functional AI fund bot
- ✅ Automated daily reports
- ✅ Natural language querying of fund data
- ✅ Conversation memory in threads
- ✅ Real-time data from Google Sheets

Now you can focus on refining the prompts, adjusting the reports, and adding any custom features your team needs!

## 💡 Future Enhancements

Consider these features for later:

1. **Historical tracking**: Store daily snapshots for trend analysis
2. **Alerts**: Threshold-based notifications
3. **Charts**: Generate and post performance charts
4. **Slash commands**: Quick lookups like `/aum`, `/btc`, `/mnav`
5. **Trade logging**: Log trades via bot commands
6. **What-if analysis**: Scenario modeling
7. **PDF reports**: Generate formatted reports on demand

---

**Need help?** Check the troubleshooting section in the main README or review Vercel logs for error details.


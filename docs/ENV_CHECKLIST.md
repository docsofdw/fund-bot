# Vercel Environment Variables Configuration Checklist

Use this checklist to verify your Vercel environment variables are correctly scoped.

## Access Vercel Settings

1. Go to https://vercel.com/dashboard
2. Select your `fund-bot` project
3. Click **Settings** → **Environment Variables**

---

## ✅ Production Environment Variables

These should have **ONLY "Production" checked**:

- [ ] `SLACK_BOT_TOKEN` → Production only
- [ ] `SLACK_SIGNING_SECRET` → Production only  
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` → Production only
- [ ] `GOOGLE_PRIVATE_KEY` → Production only
- [ ] `ANTHROPIC_API_KEY` → Production only
- [ ] `PORTFOLIO_SHEET_ID` → Production only
- [ ] `BTCTC_SHEET_ID` → Production only
- [ ] `CRON_SECRET` → Production only
- [ ] `DAILY_REPORTS_CHANNEL_ID` → Production only (your production channel)
- [ ] `ASK_FUNDBOT_CHANNEL_ID` → Production only (your production channel)

---

## ✅ Preview Environment Variables

These should have **ONLY "Preview" checked**:

- [ ] `DAILY_REPORTS_CHANNEL_ID` → Preview only (your test channel)
- [ ] `ASK_FUNDBOT_CHANNEL_ID` → Preview only (your test channel)

**Note**: All other variables (tokens, API keys, etc.) will be inherited from Production by default. You only need to override the channel IDs for Preview.

---

## ✅ Development Environment Variables (Optional)

For local development only, these should have **ONLY "Development" checked**:

- [ ] `NODE_ENV=development` → Development only

---

## Configuration Summary

Your setup should look like this in Vercel:

```
Variable: DAILY_REPORTS_CHANNEL_ID
├─ Production:  C01PROD123  ✅ Production
└─ Preview:     C01TEST123  ✅ Preview

Variable: ASK_FUNDBOT_CHANNEL_ID
├─ Production:  C01PROD456  ✅ Production
└─ Preview:     C01TEST456  ✅ Preview

Variable: SLACK_BOT_TOKEN
└─ Production:  xoxb-...    ✅ Production

(All other variables similar - Production only)
```

---

## How to Add/Edit Variables

### Adding a New Variable

1. Click **Add New** button
2. Enter the **Name** (e.g., `DAILY_REPORTS_CHANNEL_ID`)
3. Enter the **Value** (your channel ID)
4. Select **Environment**: Check only the ones you want
5. Click **Save**

### Editing Existing Variable

1. Find the variable in the list
2. Click the **⋯** menu on the right
3. Select **Edit**
4. Modify the value or environment scope
5. Click **Save**

### Removing Old Variables

If you have duplicate variables or old test variables:

1. Find the variable to remove
2. Click the **⋯** menu
3. Select **Delete**
4. Confirm deletion

---

## After Configuration

### Force Redeploy

After changing environment variables, you may need to redeploy:

```bash
# For preview branches:
git commit --allow-empty -m "trigger redeploy"
git push

# For production:
git push origin main
```

Or use Vercel UI:
1. Go to **Deployments** tab
2. Find the deployment
3. Click **⋯** → **Redeploy**

---

## Verify Configuration

Test your configuration:

```bash
# 1. Create test branch
git checkout -b test/verify-env

# 2. Push to trigger preview
git push origin test/verify-env

# 3. Check preview deployment logs in Vercel
# 4. Verify message posts to TEST channel
```

---

## Common Issues

### ❌ Preview uses production channels

**Fix**: Check that Preview variables are set correctly and have **only** Preview checked.

### ❌ Multiple values for same variable

**Fix**: Edit each entry to ensure proper environment scoping - you should have one entry per environment.

### ❌ Environment variable not taking effect

**Fix**: 
1. Save the variable in Vercel
2. Trigger a new deployment (force push or redeploy)
3. Check deployment logs to verify the value

---

## Security Notes

- ✅ Never commit `.env` files to git (already in `.gitignore`)
- ✅ Tokens and keys should be Production-scoped only
- ✅ Only channel IDs should differ between environments
- ✅ Use same bot token for all environments (one Slack app)
- ✅ Consider rotating `CRON_SECRET` periodically

---

## Quick Reference

| Environment | Branch | When Deployed |
|------------|--------|---------------|
| Production | `main` | On push to main |
| Preview | Any other | On push to any branch |
| Development | Local | Manual `npm run` |

---

Last updated: 2026-01-07


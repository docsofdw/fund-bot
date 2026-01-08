// Environment configuration and validation

interface Config {
  slack: {
    botToken: string;
    signingSecret: string;
    appToken?: string;
  };
  google: {
    serviceAccountEmail: string;
    privateKey: string;
  };
  anthropic: {
    apiKey: string;
  };
  sheets: {
    portfolioSheetId: string;
    btctcSheetId: string;
  };
  channels: {
    dailyReportsId: string;
    askFundBotId: string;
    testDailyReportsId?: string;
  };
  env: 'development' | 'production';
}

function validateEnv(): Config {
  const required = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'ANTHROPIC_API_KEY',
    'PORTFOLIO_SHEET_ID',
    'BTCTC_SHEET_ID',
    'DAILY_REPORTS_CHANNEL_ID',
    'ASK_FUNDBOT_CHANNEL_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or Vercel environment variables.'
    );
  }

  return {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN!,
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      appToken: process.env.SLACK_APP_TOKEN,
    },
    google: {
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
    sheets: {
      portfolioSheetId: process.env.PORTFOLIO_SHEET_ID!,
      btctcSheetId: process.env.BTCTC_SHEET_ID!,
    },
    channels: {
      dailyReportsId: process.env.DAILY_REPORTS_CHANNEL_ID!,
      askFundBotId: process.env.ASK_FUNDBOT_CHANNEL_ID!,
      testDailyReportsId: process.env.TEST_DAILY_REPORTS_CHANNEL_ID,
    },
    env: (process.env.NODE_ENV as 'development' | 'production') || 'development',
  };
}

export const config = validateEnv();


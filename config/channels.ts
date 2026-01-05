// Slack channel configuration

export const SLACK_CHANNELS = {
  dailyReports: process.env.DAILY_REPORTS_CHANNEL_ID || '',
  askFundBot: process.env.ASK_FUNDBOT_CHANNEL_ID || '',
} as const;

export const BOT_NAME = 'FundBot';
export const BOT_EMOJI = ':robot_face:';

// Channels where bot responds to all messages (not just mentions)
export const LISTEN_ALL_CHANNELS = [
  SLACK_CHANNELS.askFundBot,
];


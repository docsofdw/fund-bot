// Slack event and message types

export interface SlackMessage {
  user: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
}

export interface ThreadContext {
  threadTs: string;
  messages: ThreadMessage[];
  lastUpdated: number;
}

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SlackEventPayload {
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  type: 'event_callback' | 'url_verification';
  event_id: string;
  event_time: number;
}

export interface SlackEvent {
  type: 'app_mention' | 'message';
  user: string;
  text: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  channel_type?: 'channel' | 'group' | 'im';
}

export interface SlackBlockMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: unknown;
}


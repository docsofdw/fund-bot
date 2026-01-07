#!/usr/bin/env ts-node

/**
 * Cleanup script to delete bot messages from channels
 * Usage: npx ts-node cleanup-channels.ts
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { getSlackClient } from './lib/slack/client';
import { config } from './lib/config';

interface MessageToDelete {
  channel: string;
  ts: string;
  text?: string;
}

async function getBotUserId(): Promise<string> {
  const client = getSlackClient();
  const authTest = await client.auth.test();
  
  if (!authTest.user_id) {
    throw new Error('Could not determine bot user ID');
  }
  
  return authTest.user_id;
}

async function getChannelMessages(
  channelId: string, 
  botUserId: string,
  skipLatest: boolean = false
): Promise<MessageToDelete[]> {
  const client = getSlackClient();
  const messages: MessageToDelete[] = [];
  let cursor: string | undefined;
  let latestMessageTs: string | undefined;
  
  console.log(`\n📥 Fetching messages from channel ${channelId}...`);
  
  do {
    const result = await client.conversations.history({
      channel: channelId,
      limit: 100,
      cursor,
    });
    
    if (result.messages) {
      // Filter for bot messages only
      const botMessages = result.messages.filter(msg => msg.user === botUserId);
      
      // Track the latest message timestamp (first message in first batch)
      if (!cursor && botMessages.length > 0 && botMessages[0].ts) {
        latestMessageTs = botMessages[0].ts;
      }
      
      botMessages.forEach(msg => {
        if (msg.ts) {
          messages.push({
            channel: channelId,
            ts: msg.ts,
            text: msg.text,
          });
        }
      });
      
      console.log(`   Found ${botMessages.length} bot messages in this batch (${messages.length} total)`);
    }
    
    cursor = result.response_metadata?.next_cursor;
  } while (cursor);
  
  // If skipLatest is true, remove the most recent message
  if (skipLatest && latestMessageTs) {
    const filteredMessages = messages.filter(msg => msg.ts !== latestMessageTs);
    console.log(`   ⏭️  Skipping latest message (today's report)`);
    console.log(`   📊 Will delete ${filteredMessages.length} older messages`);
    return filteredMessages;
  }
  
  return messages;
}

async function deleteMessages(messages: MessageToDelete[]): Promise<void> {
  const client = getSlackClient();
  let deleted = 0;
  let failed = 0;
  
  console.log(`\n🗑️  Starting deletion of ${messages.length} messages...\n`);
  
  for (const message of messages) {
    try {
      await client.chat.delete({
        channel: message.channel,
        ts: message.ts,
      });
      
      deleted++;
      
      // Show progress every 10 messages
      if (deleted % 10 === 0) {
        console.log(`   ✅ Deleted ${deleted}/${messages.length} messages...`);
      }
      
      // Rate limiting: wait 1 second between deletions to avoid hitting Slack API limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      failed++;
      console.error(`   ❌ Failed to delete message ${message.ts}:`, error.message);
    }
  }
  
  console.log(`\n📊 Deletion complete:`);
  console.log(`   ✅ Successfully deleted: ${deleted}`);
  console.log(`   ❌ Failed: ${failed}`);
}

async function cleanupChannels() {
  try {
    console.log('🧹 Starting channel cleanup...\n');
    console.log('Channels to clean:');
    console.log(`  - ask-fundbot (${config.channels.askFundBotId})`);
    console.log(`  - daily-reports (${config.channels.dailyReportsId})`);
    
    // Get bot user ID
    const botUserId = await getBotUserId();
    console.log(`\n🤖 Bot User ID: ${botUserId}`);
    
    // Collect messages from both channels
    // For daily-reports: skip the latest message (today's report)
    // For ask-fundbot: delete everything
    const [askFundBotMessages, dailyReportsMessages] = await Promise.all([
      getChannelMessages(config.channels.askFundBotId, botUserId, false),
      getChannelMessages(config.channels.dailyReportsId, botUserId, true),
    ]);
    
    const allMessages = [...askFundBotMessages, ...dailyReportsMessages];
    
    console.log(`\n📊 Summary:`);
    console.log(`   ask-fundbot: ${askFundBotMessages.length} messages (all messages)`);
    console.log(`   daily-reports: ${dailyReportsMessages.length} messages (keeping today's report)`);
    console.log(`   Total: ${allMessages.length} messages to delete`);
    
    if (allMessages.length === 0) {
      console.log('\n✨ No messages to delete!');
      return;
    }
    
    // Confirm before deletion
    console.log('\n⚠️  This will:');
    console.log('   - Delete ALL messages from #ask-fundbot');
    console.log('   - Delete OLD messages from #daily-reports (keeping today\'s report)');
    console.log('\nPress Ctrl+C now to cancel, or wait 5 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete all messages
    await deleteMessages(allMessages);
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

cleanupChannels();


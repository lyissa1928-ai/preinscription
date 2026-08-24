const chatStore = require('../database/chatStore');

function chatRetentionConfig() {
  const days = parseInt(process.env.CHAT_RETENTION_DAYS || '365', 10);
  const maxPerConv = parseInt(process.env.CHAT_MAX_MESSAGES_PER_CONVERSATION || '2000', 10);
  const maxTotal = parseInt(process.env.CHAT_MAX_TOTAL_MESSAGES || '50000', 10);
  const maxConvList = parseInt(process.env.CHAT_MAX_CONVERSATIONS_LIST || '500', 10);
  return {
    retentionDays: Number.isFinite(days) && days > 0 ? days : 365,
    maxPerConversation: Number.isFinite(maxPerConv) && maxPerConv > 0 ? maxPerConv : 2000,
    maxTotalMessages: Number.isFinite(maxTotal) && maxTotal > 0 ? maxTotal : 50000,
    maxConversationsList: Number.isFinite(maxConvList) && maxConvList > 0 ? maxConvList : 500,
  };
}

function runChatRetentionPrune() {
  const cfg = chatRetentionConfig();
  return chatStore.pruneChatData(cfg);
}

module.exports = { chatRetentionConfig, runChatRetentionPrune };

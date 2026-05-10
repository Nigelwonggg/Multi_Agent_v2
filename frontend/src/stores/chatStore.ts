import { getChats, createNewChat, deleteChat, getMessages, postMessage, updateChatTitle } from '../api/chatApi';
import type { Chat, Message } from '../api/chatApi';

const LAST_ACTIVE_CHAT_KEY = 'lastActiveChatId';
const CHAT_LIST_CACHE_KEY = 'cachedChats';
const PENDING_CHAT_PREFIX = 'pending-chat-';
const DEFAULT_CHAT_TITLE = "New Question";

type Listener = () => void;

interface MessageState {
  messages: Message[];
  loading: boolean;
  pendingCount: number;
  pendingSince: number | null;
  lastPendingText: string;
}

const chatListeners = new Set<Listener>();
const progressListeners = new Set<Listener>();
const messageListeners = new Map<string, Set<Listener>>();
const messageStates = new Map<string, MessageState>();

let chats: Chat[] = readCachedChats();
let chatsLoading = chats.length === 0;

function readCachedChats(): Chat[] {
  try {
    const cached = localStorage.getItem(CHAT_LIST_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function writeCachedChats(nextChats: Chat[]) {
  localStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify(nextChats));
}

function notifyChats() {
  chatListeners.forEach(listener => listener());
}

function notifyProgress() {
  progressListeners.forEach(listener => listener());
}

function notifyMessages(chatId: string) {
  messageListeners.get(chatId)?.forEach(listener => listener());
}

function getMessageState(chatId: string): MessageState {
  const existingState = messageStates.get(chatId);

  if (existingState) {
    return existingState;
  }

  const initialState: MessageState = {
    messages: [],
    loading: false,
    pendingCount: 0,
    pendingSince: null,
    lastPendingText: "",
  };
  messageStates.set(chatId, initialState);
  return initialState;
}

function setChats(nextChats: Chat[]) {
  chats = nextChats;
  chatsLoading = false;
  writeCachedChats(nextChats);
  notifyChats();
}

function upsertChat(chat: Chat) {
  setChats([chat, ...chats.filter(existingChat => existingChat.id !== chat.id)]);
}

function updateChatTitleInCache(chatId: string, title: string) {
  setChats(chats.map(chat => chat.id === chatId ? { ...chat, title } : chat));
  notifyProgress();
}

function removeChatFromCache(chatId: string) {
  setChats(chats.filter(chat => chat.id !== chatId));
  messageStates.delete(chatId);
  messageListeners.delete(chatId);
  notifyProgress();
}

function replaceChatInCache(temporaryChatId: string, confirmedChat: Chat) {
  const temporaryState = messageStates.get(temporaryChatId);
  const temporaryListeners = messageListeners.get(temporaryChatId);
  const hasTemporaryChat = chats.some(chat => chat.id === temporaryChatId);
  const deduplicatedChats = chats.filter(chat => chat.id !== confirmedChat.id);
  const nextChats = hasTemporaryChat
    ? deduplicatedChats.map(chat => chat.id === temporaryChatId ? confirmedChat : chat)
    : [confirmedChat, ...deduplicatedChats];

  if (temporaryState && !messageStates.has(confirmedChat.id)) {
    messageStates.set(confirmedChat.id, temporaryState);
  }

  if (temporaryListeners && !messageListeners.has(confirmedChat.id)) {
    messageListeners.set(confirmedChat.id, temporaryListeners);
  }

  messageStates.delete(temporaryChatId);
  messageListeners.delete(temporaryChatId);
  setChats(nextChats);
  notifyMessages(temporaryChatId);
  notifyMessages(confirmedChat.id);
  notifyProgress();
}

function mergeFetchedMessages(currentMessages: Message[], fetchedMessages: Message[]) {
  const fetchedUserTexts = new Set(
    fetchedMessages
      .filter(message => message.sender === 'user')
      .map(message => message.text)
  );
  const optimisticMessages = currentMessages.filter(message => (
    message.id.startsWith('pending-') && !fetchedUserTexts.has(message.text)
  ));

  return [...fetchedMessages, ...optimisticMessages];
}

function toTitleCase(text: string) {
  return text
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function generateChatTitleFromMessage(text: string) {
  const cleanedText = text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const withoutPromptPhrases = cleanedText
    .replace(/^(please\s+)?(can|could|would|will|should)\s+you\s+/i, "")
    .replace(/^(please\s+)?(tell\s+me\s+about|explain|describe|define|summarize)\s+/i, "")
    .replace(/^(what|when|where|why|how)\s+(is|are|was|were|do|does|did|can|could|should|would|will)\s+/i, "");

  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "i", "in", "is", "it", "me", "my", "of", "on", "or", "the", "to",
    "with", "you", "your"
  ]);
  const words = withoutPromptPhrases
    .split(" ")
    .filter(word => word && !stopWords.has(word.toLowerCase()));
  const titleWords = words.length > 0 ? words.slice(0, 5) : cleanedText.split(" ").slice(0, 5);
  const title = toTitleCase(titleWords.join(" ")).slice(0, 48).trim();

  return title || DEFAULT_CHAT_TITLE;
}

function maybeTitleChatFromFirstMessage(chatId: string, text: string, existingMessageCount: number) {
  const chat = chats.find(existingChat => existingChat.id === chatId);
  const untitledNames = new Set(["New Chat", DEFAULT_CHAT_TITLE, "Untitled"]);
  const shouldRename = chat && existingMessageCount === 0 && (!chat.title || untitledNames.has(chat.title));

  if (!shouldRename) {
    return;
  }

  const title = generateChatTitleFromMessage(text);
  updateChatTitleInCache(chatId, title);
  updateChatTitle(chatId, title).then(updatedChat => {
    updateChatTitleInCache(updatedChat.id, updatedChat.title);
  }).catch(error => {
    console.error("Failed to update chat title:", error);
  });
}

export function getLastActiveChatId() {
  return localStorage.getItem(LAST_ACTIVE_CHAT_KEY);
}

export function rememberActiveChat(chatId: string | null) {
  if (chatId) {
    localStorage.setItem(LAST_ACTIVE_CHAT_KEY, chatId);
  } else {
    localStorage.removeItem(LAST_ACTIVE_CHAT_KEY);
  }
}

export function isPendingChatId(chatId: string | null | undefined) {
  return Boolean(chatId?.startsWith(PENDING_CHAT_PREFIX));
}

export function getChatsSnapshot() {
  return {
    chats,
    loading: chatsLoading,
  };
}

export function subscribeChats(listener: Listener) {
  chatListeners.add(listener);
  return () => {
    chatListeners.delete(listener);
  };
}

export interface ChatProgressSnapshot {
  chatId: string | null;
  title: string;
  prompt: string;
  pendingCount: number;
  totalPendingChats: number;
  startedAt: number | null;
}

export function getChatProgressSnapshot(): ChatProgressSnapshot {
  const pendingEntries = Array.from(messageStates.entries())
    .filter(([, state]) => state.pendingCount > 0)
    .sort(([, firstState], [, secondState]) => (
      (secondState.pendingSince ?? 0) - (firstState.pendingSince ?? 0)
    ));
  const activeEntry = pendingEntries[0];

  if (!activeEntry) {
    return {
      chatId: null,
      title: "",
      prompt: "",
      pendingCount: 0,
      totalPendingChats: 0,
      startedAt: null,
    };
  }

  const [chatId, state] = activeEntry;
  const chat = chats.find(existingChat => existingChat.id === chatId);

  return {
    chatId,
    title: chat?.title || DEFAULT_CHAT_TITLE,
    prompt: state.lastPendingText,
    pendingCount: state.pendingCount,
    totalPendingChats: pendingEntries.length,
    startedAt: state.pendingSince,
  };
}

export function subscribeChatProgress(listener: Listener) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

export async function refreshChats() {
  chatsLoading = chats.length === 0;
  notifyChats();

  try {
    const fetchedChats = await getChats();
    const pendingChats = chats.filter(chat => isPendingChatId(chat.id));
    const mergedChats = [
      ...pendingChats,
      ...fetchedChats.filter(chat => !pendingChats.some(pendingChat => pendingChat.id === chat.id)),
    ];
    setChats(mergedChats);
    return mergedChats;
  } catch (error) {
    chatsLoading = false;
    notifyChats();
    throw error;
  }
}

export function createChatInStore() {
  const optimisticChat: Chat = {
    id: `${PENDING_CHAT_PREFIX}${Date.now()}`,
    title: DEFAULT_CHAT_TITLE,
  };

  upsertChat(optimisticChat);

  const confirmedChat = createNewChat()
    .then(newChat => {
      replaceChatInCache(optimisticChat.id, newChat);
      return newChat;
    })
    .catch(error => {
      removeChatFromCache(optimisticChat.id);
      throw error;
    });

  return {
    optimisticChat,
    confirmedChat,
  };
}

export async function deleteChatInStore(chatId: string) {
  const previousChats = chats;
  removeChatFromCache(chatId);

  try {
    await deleteChat(chatId);
  } catch (error) {
    setChats(previousChats);
    throw error;
  }
}

export function getChatMessagesSnapshot(chatId: string | null) {
  if (!chatId) {
    return {
      messages: [],
      loading: false,
      isThinking: false,
    };
  }

  const state = getMessageState(chatId);
  return {
    messages: state.messages,
    loading: state.loading,
    isThinking: state.pendingCount > 0,
  };
}

export function subscribeChatMessages(chatId: string, listener: Listener) {
  const listeners = messageListeners.get(chatId) ?? new Set<Listener>();
  listeners.add(listener);
  messageListeners.set(chatId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      messageListeners.delete(chatId);
    }
  };
}

export async function refreshChatMessages(chatId: string) {
  const state = getMessageState(chatId);
  state.loading = state.messages.length === 0;
  notifyMessages(chatId);

  try {
    const fetchedMessages = await getMessages(chatId);
    state.messages = mergeFetchedMessages(state.messages, fetchedMessages);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
  } finally {
    state.loading = false;
    notifyMessages(chatId);
  }
}

export function replaceChatMessages(chatId: string, messages: Message[]) {
  const state = getMessageState(chatId);
  state.messages = messages;
  state.loading = false;
  notifyMessages(chatId);
}

export async function sendChatMessage(chatId: string, text: string) {
  const state = getMessageState(chatId);
  const existingMessageCount = state.messages.length;
  const userMessage: Message = {
    id: `pending-user-${Date.now()}`,
    text,
    sender: 'user',
    timestamp: new Date().toISOString(),
  };

  maybeTitleChatFromFirstMessage(chatId, text, existingMessageCount);
  state.messages = [...state.messages, userMessage];
  state.pendingCount += 1;
  state.pendingSince = state.pendingSince ?? Date.now();
  state.lastPendingText = text;
  notifyMessages(chatId);
  notifyProgress();

  try {
    const replyMessage = await postMessage(chatId, text);
    state.messages = [
      ...state.messages.filter(message => message.id !== replyMessage.id),
      replyMessage,
    ];
    return replyMessage;
  } catch (error) {
    console.error("Failed to post message:", error);
    throw error;
  } finally {
    state.pendingCount = Math.max(0, state.pendingCount - 1);
    if (state.pendingCount === 0) {
      state.pendingSince = null;
      state.lastPendingText = "";
    }
    notifyMessages(chatId);
    notifyProgress();
  }
}

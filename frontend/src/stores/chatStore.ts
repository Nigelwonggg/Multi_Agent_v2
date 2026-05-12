import { getChats, createNewChat, deleteChat, getMessages, postMessage, updateChatTitle } from '../api/chatApi';
import type { Chat, Message } from '../api/chatApi';

const LAST_ACTIVE_CHAT_KEY = 'lastActiveChatId';
const CHAT_LIST_CACHE_KEY = 'cachedChats';
const CHAT_MESSAGE_CACHE_KEY = 'cachedChatMessages';
const PENDING_CHAT_PREFIX = 'pending-chat-';
const DEFAULT_CHAT_TITLE = "New Question";
const PENDING_MESSAGE_TTL_MS = 10 * 60 * 1000;
const PENDING_POLL_INTERVAL_MS = 3500;

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
const pendingPollTimers = new Map<string, number>();

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

function readCachedMessageStates(): Record<string, Partial<MessageState>> {
  try {
    const cached = sessionStorage.getItem(CHAT_MESSAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function sanitizeMessageForCache(message: Message): Message {
  if (!message.imageUrl?.startsWith('data:')) {
    return message;
  }

  return {
    ...message,
    imageUrl: undefined,
  };
}

function isPendingFresh(pendingSince: number | null | undefined) {
  return Boolean(pendingSince && Date.now() - pendingSince < PENDING_MESSAGE_TTL_MS);
}

function normalizeCachedMessageState(cachedState?: Partial<MessageState>): MessageState {
  const pendingSince = cachedState?.pendingSince ?? null;
  const hasFreshPending = isPendingFresh(pendingSince);

  return {
    messages: Array.isArray(cachedState?.messages) ? cachedState.messages : [],
    loading: false,
    pendingCount: hasFreshPending ? Math.max(1, cachedState?.pendingCount ?? 1) : 0,
    pendingSince: hasFreshPending ? pendingSince : null,
    lastPendingText: hasFreshPending ? cachedState?.lastPendingText ?? "" : "",
  };
}

function persistMessageState(chatId: string, state: MessageState) {
  try {
    const cachedStates = readCachedMessageStates();
    cachedStates[chatId] = {
      messages: state.messages.slice(-80).map(sanitizeMessageForCache),
      pendingCount: state.pendingCount,
      pendingSince: state.pendingSince,
      lastPendingText: state.lastPendingText,
    };
    sessionStorage.setItem(CHAT_MESSAGE_CACHE_KEY, JSON.stringify(cachedStates));
  } catch (error) {
    console.warn("Failed to cache chat messages:", error);
  }
}

function removePersistedMessageState(chatId: string) {
  try {
    const cachedStates = readCachedMessageStates();
    delete cachedStates[chatId];
    sessionStorage.setItem(CHAT_MESSAGE_CACHE_KEY, JSON.stringify(cachedStates));
  } catch {
    // Cache cleanup is best effort.
  }
}

function replacePersistedMessageState(temporaryChatId: string, confirmedChatId: string) {
  try {
    const cachedStates = readCachedMessageStates();
    if (cachedStates[temporaryChatId] && !cachedStates[confirmedChatId]) {
      cachedStates[confirmedChatId] = cachedStates[temporaryChatId];
    }
    delete cachedStates[temporaryChatId];
    sessionStorage.setItem(CHAT_MESSAGE_CACHE_KEY, JSON.stringify(cachedStates));
  } catch {
    // Cache migration is best effort.
  }
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

  const initialState = normalizeCachedMessageState(readCachedMessageStates()[chatId]);
  messageStates.set(chatId, initialState);
  schedulePendingRefresh(chatId);
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
  removePersistedMessageState(chatId);
  clearPendingPoll(chatId);
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
    persistMessageState(confirmedChat.id, temporaryState);
  }

  if (temporaryListeners && !messageListeners.has(confirmedChat.id)) {
    messageListeners.set(confirmedChat.id, temporaryListeners);
  }

  messageStates.delete(temporaryChatId);
  messageListeners.delete(temporaryChatId);
  replacePersistedMessageState(temporaryChatId, confirmedChat.id);
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

function clearPendingPoll(chatId: string) {
  const existingTimer = pendingPollTimers.get(chatId);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
    pendingPollTimers.delete(chatId);
  }
}

function clearPendingState(chatId: string, state: MessageState) {
  state.pendingCount = 0;
  state.pendingSince = null;
  state.lastPendingText = "";
  clearPendingPoll(chatId);
  persistMessageState(chatId, state);
  notifyProgress();
}

function hasFetchedResponseForPending(state: MessageState, fetchedMessages: Message[]) {
  if (!state.pendingSince) {
    return false;
  }

  return fetchedMessages.some(message => {
    if (message.sender !== 'bot') {
      return false;
    }

    if (!message.timestamp) {
      return true;
    }

    return new Date(message.timestamp).getTime() >= state.pendingSince!;
  });
}

function schedulePendingRefresh(chatId: string) {
  const state = messageStates.get(chatId);
  if (!state || state.pendingCount === 0) {
    return;
  }

  if (!isPendingFresh(state.pendingSince)) {
    clearPendingState(chatId, state);
    notifyMessages(chatId);
    return;
  }

  if (pendingPollTimers.has(chatId)) {
    return;
  }

  const timer = window.setTimeout(() => {
    pendingPollTimers.delete(chatId);
    refreshChatMessages(chatId);
  }, PENDING_POLL_INTERVAL_MS);

  pendingPollTimers.set(chatId, timer);
}

function hydrateCachedPendingStates() {
  const cachedStates = readCachedMessageStates();

  Object.entries(cachedStates).forEach(([chatId, cachedState]) => {
    if (messageStates.has(chatId) || !isPendingFresh(cachedState.pendingSince)) {
      return;
    }

    const state = normalizeCachedMessageState(cachedState);
    if (state.pendingCount > 0) {
      messageStates.set(chatId, state);
      schedulePendingRefresh(chatId);
    }
  });
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
  hydrateCachedPendingStates();

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
  state.loading = state.messages.length === 0 && state.pendingCount === 0;
  notifyMessages(chatId);

  try {
    const fetchedMessages = await getMessages(chatId);
    state.messages = mergeFetchedMessages(state.messages, fetchedMessages);
    if (hasFetchedResponseForPending(state, fetchedMessages)) {
      clearPendingState(chatId, state);
    } else {
      persistMessageState(chatId, state);
    }
  } catch (error) {
    console.error("Failed to fetch messages:", error);
  } finally {
    state.loading = false;
    persistMessageState(chatId, state);
    notifyMessages(chatId);
    schedulePendingRefresh(chatId);
  }
}

export function replaceChatMessages(chatId: string, messages: Message[]) {
  const state = getMessageState(chatId);
  state.messages = messages;
  state.loading = false;
  persistMessageState(chatId, state);
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
  persistMessageState(chatId, state);
  notifyMessages(chatId);
  notifyProgress();

  try {
    const replyMessage = await postMessage(chatId, text);
    state.messages = [
      ...state.messages.filter(message => message.id !== replyMessage.id),
      replyMessage,
    ];
    persistMessageState(chatId, state);
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
    persistMessageState(chatId, state);
    notifyMessages(chatId);
    notifyProgress();
  }
}

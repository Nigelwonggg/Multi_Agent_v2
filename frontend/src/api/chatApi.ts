// src/api/chatApi.ts
// This file contains dummy API functions for chat interactions.
// It simulates network requests with delays to mimic a real backend.

import testData from "./test_data.json";
import newTestData from "./test_data_new.json";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const DEFAULT_CHAT_TITLE = "New Question";

// Helper to process JSON responses and throw errors when requests fail.
async function handleResponse(response: Response) {
  // Throw an error if the request failed.
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  // 204 No Content responses do not include a body, so attempting to
  // parse JSON would raise a SyntaxError. Return null instead.
  if (response.status === 204 || response.status === 205) {
    return null;
  }
  // Otherwise, parse and return the JSON payload.
  return response.json();
}

/**
 * Interface representing a single chat conversation in the history.
 */
export interface Chat {
  id: string;
  title: string;
}

/**
 * Interface for domain-aware document references
 */
export interface DomainDocReference {
  doc_id: string;
  domain: string;
}

/**
 * Helper function to extract document IDs from docs array (supports both legacy and new format)
 */
export const extractDocIds = (docs: string[] | DomainDocReference[]): string[] => {
  if (!docs || docs.length === 0) return [];
  
  // Check if it's the new domain-aware format
  if (typeof docs[0] === "object" && "doc_id" in docs[0]) {
    return (docs as DomainDocReference[]).map(doc => doc.doc_id);
  }
  
  // Legacy format - just return as is
  return docs as string[];
}

/**
 * Helper function to get documents grouped by domain
 */
export const getDocsByDomain = (docs: string[] | DomainDocReference[]): Record<string, string[]> => {
  if (!docs || docs.length === 0) return {};
  
  // Check if it's the new domain-aware format
  if (typeof docs[0] === "object" && "doc_id" in docs[0]) {
    const domainAwareDocs = docs as DomainDocReference[];
    const result: Record<string, string[]> = {};
    
    domainAwareDocs.forEach(doc => {
      if (!result[doc.domain]) {
        result[doc.domain] = [];
      }
      result[doc.domain].push(doc.doc_id);
    });
    
    return result;
  }
  
  // Legacy format - assume all docs belong to data_science domain
  return {
    "data_science": docs as string[]
  };
}

/**
 * Interface representing a single message within a chat.
 */
export interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  imageUrl?: string;
  timestamp?: string;
  metadata?: {
    routes: string;
    is_rag_used: boolean;
    processing_time: number;
    docs?: string[] | DomainDocReference[];  // Support both legacy and new format
    image_docs?: string[] | DomainDocReference[];  // Support both legacy and new format
  };
}

interface BackendChat {
  id: string | number;
  title?: string | null;
}

interface BackendMessage {
  thread_id: string | number;
  final_answer?: string | null;
  role: string;
  timestamp?: string;
  image_url?: string | null;
  routes?: string[] | string | null;
  is_rag_used?: boolean | null;
  processing_time?: number | null;
  docs?: string[] | DomainDocReference[] | null;
  image_docs?: string[] | DomainDocReference[] | null;
}

// --- IN-MEMORY DATABASE ---
// Load initial data from the JSON file.
// In a real app, you'd fetch this from a server.
let chats: Chat[] = testData.chats;
const messages: Record<string, Message[]> = testData.messages as Record<
  string,
  Message[]
>;
// --- END IN-MEMORY DATABASE ---

/**
 * Simulates a network delay.
 * @param ms - The number of milliseconds to wait.
 */
const simulateDelay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Fetches the list of all chat conversations.
 * @returns A promise that resolves to an array of Chat objects.
 */
export const getChats = async (): Promise<Chat[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/chats`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await handleResponse(response);

    // Extract chats from the nested response structure
    // The response has: { result: { chats: [...] } }
    const chatList: BackendChat[] = data?.result?.chats || data?.chats || [];

    // Map the backend response to match the frontend Chat interface
    const chatMapped = chatList.map((chat: BackendChat) => ({
      id: String(chat.id), // Convert to string as expected by frontend
      title: chat.title || DEFAULT_CHAT_TITLE,
    }));

    return chatMapped;
  } catch (error) {
    console.error("Error fetching chats:", error);
    // Fallback to local test data if API fails
    return [...chats];
  }
};

/**
 * Fetches all messages for a specific chat.
 * @param chatId - The ID of the chat to get messages for.
 * @returns A promise that resolves to an array of Message objects.
 */
export const getMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/chat/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        thread_id: chatId,
      }),
    });

    const data = await handleResponse(response);
    const messageList: BackendMessage[] = data?.messages || [];

    const convertedMessages: Message[] = messageList.map(
      (msg: BackendMessage, index: number) => {
        // Base message structure
        const baseMessage = {
          id: `${msg.thread_id}-${index}`,
          text: msg.final_answer || "",
          sender: msg.role === "user" ? "user" : "bot",
          timestamp: msg.timestamp,
        } as Message;

        // Only add bot-specific properties for non-user messages
        if (msg.role !== "user") {
          baseMessage.imageUrl = msg.image_url
            ? `data:image/jpeg;base64,${msg.image_url}`
            : undefined;
          baseMessage.metadata = {
            routes: Array.isArray(msg.routes)
              ? msg.routes.join(", ")
              : msg.routes || "",
            is_rag_used: msg.is_rag_used || false,
            processing_time: msg.processing_time || 0,
            docs: Array.isArray(msg.docs) ? msg.docs : [], // 🆕 Domain-aware text document references
            image_docs: Array.isArray(msg.image_docs) ? msg.image_docs : [], // 🆕 Domain-aware image document references
          };
        }

        return baseMessage;
      }
    );

    // Sort by timestamp to ensure chronological order
    const sortedMessages = convertedMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });

    messages[chatId] = sortedMessages;
    return sortedMessages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return messages[chatId] || [];
  }
};

/**
 * Creates a new, empty chat conversation.
 * @returns A promise that resolves to the newly created Chat object.
 */
export const createNewChat = async (): Promise<Chat> => {
  try {
    // Call the actual backend API
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      // No body needed for creating a new chat
    });

    const data = await handleResponse(response);

    // Convert backend response to frontend Chat interface
    const newChat: Chat = {
      id: String(data.id), // Convert backend number to frontend string
      title: data.title || DEFAULT_CHAT_TITLE,
    };

    // Add to local chats cache (prepend to start)
    chats = [newChat, ...chats];

    // Initialize empty messages array for this chat
    messages[newChat.id] = [];

    return newChat;
  } catch (error) {
    console.error("Error creating new chat:", error);

    // Fallback to local creation if API fails
    const fallbackId = String(Date.now());
    const fallbackChat: Chat = {
      id: fallbackId,
      title: DEFAULT_CHAT_TITLE,
    };

    // Add to local state
    chats = [fallbackChat, ...chats];
    messages[fallbackChat.id] = [];

    return fallbackChat;
  }
};

/**
 * Deletes a chat conversation and all its messages.
 * @param chatId - The ID of the chat to delete.
 * @returns A promise that resolves when the chat is deleted.
 */
export const deleteChat = async (
  chatId: string
): Promise<{ success: true }> => {
  try {
    // Call the actual backend API
    const response = await fetch(`${API_BASE}/api/chat/${chatId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      }
    });

    // Handle the response (204 No Content expected)
    await handleResponse(response);

    // Remove from local cache
    chats = chats.filter((chat) => chat.id !== chatId);
    delete messages[chatId];

    return { success: true };
  } catch (error) {
    console.error("Error deleting chat:", error);
    throw error; // Re-throw to let components handle the error
  }
};

/**
 * Updates the title of a chat conversation.
 * @param chatId - The ID of the chat to rename.
 * @param title - The new title for the chat.
 * @returns A promise that resolves to the updated chat object.
 */
export const updateChatTitle = async (
  chatId: string,
  title: string
): Promise<Chat> => {
  try {
    const response = await fetch(`${API_BASE}/api/chat/${chatId}/title`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ title }),
    });

    const data = await handleResponse(response);
    const updatedChat: Chat = {
      id: String(data.id),
      title: data.title || title,
    };

    chats = chats.map(chat => chat.id === chatId ? updatedChat : chat);
    return updatedChat;
  } catch (error) {
    console.error("Error updating chat title:", error);
    throw error;
  }
};

/**
 * Posts a new message to a chat and gets the bot response from the backend.
 * @param chatId - The ID of the chat to post the message to.
 * @param text - The text of the user's message.
 * @returns A promise that resolves to the bot's response Message object.
 */
export const postMessage = async (
  chatId: string,
  text: string
): Promise<Message> => {
  try {
    // Call the actual backend API
    const response = await fetch(`${API_BASE}/api/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        message: text,
        thread_id: chatId,
      }),
    });

    const data = await handleResponse(response);

    // Convert backend response to frontend Message interface
    const botMessage: Message = {
      id: String(Date.now()), // Generate unique ID for frontend
      text: data.final_answer || "No response received",
      sender: "bot",
      // Fix: Only add imageUrl if there's actually an image
      imageUrl: data.image_url
        ? `data:image/jpeg;base64,${data.image_url}`
        : undefined,
      timestamp: data.timestamp || new Date().toISOString(), // Use backend timestamp if available
      metadata: {
        routes: Array.isArray(data.routes)
          ? data.routes.join(", ")
          : data.routes || "",
        is_rag_used: data.is_rag_used || false,
        processing_time: data.processing_time || 0,
        docs: Array.isArray(data.docs) ? data.docs : [], // 🆕 Domain-aware text document references
        image_docs: Array.isArray(data.image_docs) ? data.image_docs : [], // 🆕 Domain-aware image document references
      },
    };

    // Also store the user message in local state
    const userMessage: Message = {
      id: String(Date.now() - 1), // Ensure unique ID
      text: text,
      sender: "user",
      timestamp: new Date().toISOString(), // Add current timestamp
    };

    // Update local messages cache with proper ordering
    if (messages[chatId]) {
      messages[chatId].push(userMessage, botMessage);
    } else {
      messages[chatId] = [userMessage, botMessage];
    }

    return botMessage;
  } catch (error) {
    console.error("Error posting message:", error);

    // Fallback to mock response if API fails
    const fallbackMessage: Message = {
      id: String(Date.now()),
      text: "Sorry, I encountered an error. Please try again.",
      sender: "bot",
      timestamp: new Date().toISOString(),
      // No imageUrl for error messages
    };

    if (messages[chatId]) {
      messages[chatId].push(fallbackMessage);
    } else {
      messages[chatId] = [fallbackMessage];
    }

    return fallbackMessage;
  }
};

/**
 * Fetches the test data from the new JSON file.
 * @returns A promise that resolves to the test data.
 */
export const getTestData = async (): Promise<Message> => {
  await simulateDelay(100);
  return {
    id: String(Date.now()),
    text: newTestData.text_answer,
    sender: "bot",
    imageUrl: `data:image/jpeg;base64,${newTestData.image_url}`,
    metadata: {
      routes: newTestData.routes,
      is_rag_used: newTestData.is_rag_used,
      processing_time: newTestData.processing_time,
    },
  };
};

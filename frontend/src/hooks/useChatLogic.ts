import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createChatInStore,
  deleteChatInStore,
  getChatsSnapshot,
  getLastActiveChatId,
  refreshChats,
  rememberActiveChat,
  subscribeChats,
} from '../stores/chatStore';

export const useChatLogic = () => {
  const [chatSnapshot, setChatSnapshot] = useState(() => getChatsSnapshot());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => getLastActiveChatId());
  const [loading, setLoading] = useState(() => getChatsSnapshot().loading);
  const navigate = useNavigate();
  const { chatId: chatIdFromUrl } = useParams<{ chatId: string }>();
  const { chats } = chatSnapshot;

  useEffect(() => {
    return subscribeChats(() => {
      const nextSnapshot = getChatsSnapshot();
      setChatSnapshot(nextSnapshot);
      setLoading(nextSnapshot.loading);
    });
  }, []);

  useEffect(() => {
    const fetchAndSyncChats = async () => {
      try {
        const fetchedChats = await refreshChats();

        const chatExists = (id: string | null | undefined): id is string =>
          Boolean(id && fetchedChats.some(chat => chat.id === id));

        const storedChatId = getLastActiveChatId();
        const nextActiveChatId = chatExists(chatIdFromUrl)
          ? chatIdFromUrl
          : chatExists(storedChatId)
            ? storedChatId
            : fetchedChats[0]?.id ?? null;

        setActiveChatId(nextActiveChatId);
        rememberActiveChat(nextActiveChatId);

        if (nextActiveChatId && chatIdFromUrl !== nextActiveChatId) {
          // Use replace to avoid cluttering browser history with the initial redirect.
          navigate(`/chat/${nextActiveChatId}`, { replace: true });
        }
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      } finally {
        setLoading(getChatsSnapshot().loading);
      }
    };
    fetchAndSyncChats();
    // This effect should only run once on initial mount to fetch the chat list.
    // Subsequent navigation is handled by the user.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // This effect syncs the active chat ID when the URL changes (e.g., back/forward buttons)
  useEffect(() => {
    if (chatIdFromUrl) {
      setActiveChatId(chatIdFromUrl);
      rememberActiveChat(chatIdFromUrl);
    }
  }, [chatIdFromUrl]);

  useEffect(() => {
    if (!loading && !chatIdFromUrl && activeChatId) {
      navigate(`/chat/${activeChatId}`, { replace: true });
    }
  }, [activeChatId, chatIdFromUrl, loading, navigate]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    rememberActiveChat(chatId);
    navigate(`/chat/${chatId}`);
  };

  const handleNewChat = useCallback(() => {
    const { optimisticChat, confirmedChat } = createChatInStore();
    setActiveChatId(optimisticChat.id);
    rememberActiveChat(optimisticChat.id);
    navigate(`/chat/${optimisticChat.id}`);

    confirmedChat
      .then(newChat => {
        if (getLastActiveChatId() === optimisticChat.id) {
          rememberActiveChat(newChat.id);
        }

        if (window.location.pathname === `/chat/${optimisticChat.id}` || window.location.pathname === '/chat') {
          setActiveChatId(newChat.id);
          navigate(`/chat/${newChat.id}`, { replace: true });
        }
      })
      .catch(error => {
        console.error("Failed to create new chat:", error);

        if (getLastActiveChatId() !== optimisticChat.id) {
          return;
        }

        const fallbackChatId = getChatsSnapshot().chats[0]?.id ?? null;
        setActiveChatId(fallbackChatId);
        rememberActiveChat(fallbackChatId);

        if (window.location.pathname === `/chat/${optimisticChat.id}`) {
          navigate(fallbackChatId ? `/chat/${fallbackChatId}` : '/chat', { replace: true });
        }
      });
  }, [navigate]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    const previousActiveId = activeChatId;
    const newChats = chats.filter(chat => chat.id !== chatId);

    // Optimistically update the selected chat while the store removes it from the sidebar.
    if (activeChatId === chatId) {
      const newActiveId = newChats.length > 0 ? newChats[0].id : null;
      setActiveChatId(newActiveId);
      rememberActiveChat(newActiveId);
      if (newActiveId) {
        navigate(`/chat/${newActiveId}`);
      } else {
        navigate('/chat');
      }
    }

    try {
      await deleteChatInStore(chatId);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      // Revert selected chat on failure. The store restores the sidebar list.
      setActiveChatId(previousActiveId);
      rememberActiveChat(previousActiveId);
      if (previousActiveId) {
        navigate(`/chat/${previousActiveId}`);
      } else {
        navigate('/chat');
      }
    }
  }, [activeChatId, chats, navigate]);

  return {
    chats,
    activeChatId,
    loading,
    handleSelectChat,
    handleNewChat,
    handleDeleteChat,
  };
};

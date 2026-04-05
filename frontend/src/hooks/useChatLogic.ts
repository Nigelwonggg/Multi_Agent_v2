import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getChats, createNewChat, deleteChat } from '../api/chatApi';
import type { Chat } from '../api/chatApi';

export const useChatLogic = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { chatId: chatIdFromUrl } = useParams<{ chatId: string }>();

  useEffect(() => {
    const fetchAndSyncChats = async () => {
      setLoading(true);
      try {
        const fetchedChats = await getChats();
        setChats(fetchedChats);

        // If the URL has a valid chat ID, make it the active one.
        if (chatIdFromUrl && fetchedChats.some(c => c.id === chatIdFromUrl)) {
          setActiveChatId(chatIdFromUrl);
        } 
        // Otherwise, if there's no active chat but we have chats, default to the first one.
        else if (fetchedChats.length > 0) {
          const defaultChatId = fetchedChats[0].id;
          setActiveChatId(defaultChatId);
          // Use replace to avoid cluttering browser history with the initial redirect.
          navigate(`/chat/${defaultChatId}`, { replace: true });
        }
      } catch (error) {
        console.error("Failed to fetch chats:", error);
      } finally {
        setLoading(false);
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
    }
  }, [chatIdFromUrl]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    navigate(`/chat/${chatId}`);
  };

  const handleNewChat = useCallback(async () => {
    try {
      const newChat = await createNewChat();
      setChats(prevChats => [newChat, ...prevChats]);
      setActiveChatId(newChat.id);
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  }, [navigate]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    const previousChats = chats;
    const previousActiveId = activeChatId;

    // Optimistically update UI
    const newChats = chats.filter(chat => chat.id !== chatId);
    setChats(newChats);

    if (activeChatId === chatId) {
      const newActiveId = newChats.length > 0 ? newChats[0].id : null;
      setActiveChatId(newActiveId);
      if (newActiveId) {
        navigate(`/chat/${newActiveId}`);
      } else {
        navigate('/chat');
      }
    }

    try {
      await deleteChat(chatId);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      // Revert UI on failure
      setChats(previousChats);
      setActiveChatId(previousActiveId);
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

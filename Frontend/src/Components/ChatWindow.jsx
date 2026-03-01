import { useState, useRef, useEffect, useCallback } from "react";
import API from "../service/api";
import { getSocket } from "../service/socket";
import MessageBubble from "./MessageBubble";
import EmojiPicker from "emoji-picker-react";
import {
    getCachedMessages,
    setCachedMessages,
    appendCachedMessage,
    markCachedMessagesRead,
    clearExpiredCache
} from "../service/messageCache";

function ChatWindow({ activeChat, currentUser, onMessageSent, onOpenUserProfile, backendUrl, onlineUsers, onCloseChat, typingUsers }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const initialLoadRef = useRef(true);
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    };

    useEffect(() => {
        clearExpiredCache();
    }, []);

    // Fetch messages when active chat changes
    useEffect(() => {
        if (!activeChat?.username) return;

        initialLoadRef.current = true;

        const cached = getCachedMessages(activeChat.username);
        if (cached?.messages?.length) {
            setMessages(cached.messages);
            setHasMore(true);
        } else {
            setMessages([]);
        }

        const fetchMessages = async () => {
            setLoading(!cached?.messages?.length);
            try {
                const res = await API.get(`/messages/${activeChat.username}?limit=50`);
                const { messages: freshMessages, hasMore: more } = res.data;
                setMessages(freshMessages);
                setHasMore(more);
                setCachedMessages(activeChat.username, freshMessages);
            } catch {
                if (!cached?.messages?.length) setMessages([]);
            } finally {
                setLoading(false);
                initialLoadRef.current = false;
            }
        };

        fetchMessages();

        const socket = getSocket();
        if (socket) {
            socket.emit('message_read', { senderUsername: activeChat.username });
        }
    }, [activeChat?.username]);

    // Load older messages
    const loadMoreMessages = useCallback(async () => {
        if (loadingMore || !hasMore || !messages.length || !activeChat?.username) return;

        setLoadingMore(true);
        const container = messagesContainerRef.current;
        const prevScrollHeight = container?.scrollHeight || 0;

        try {
            const oldestId = messages[0]._id;
            const res = await API.get(`/messages/${activeChat.username}?before=${oldestId}&limit=50`);
            const { messages: olderMessages, hasMore: more } = res.data;

            setMessages(prev => [...olderMessages, ...prev]);
            setHasMore(more);

            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight - prevScrollHeight;
                }
            });
        } catch {
            // silently fail
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, messages, activeChat?.username]);

    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container || loadingMore || !hasMore) return;

        if (container.scrollTop < 50) {
            loadMoreMessages();
        }
    }, [loadMoreMessages, loadingMore, hasMore]);

    // Socket.IO listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeChat?.username) return;

        const handleReceiveMessage = (message) => {
            const senderUsername = message.sender?.username;
            if (senderUsername === activeChat.username) {
                setMessages(prev => [...prev, message]);
                appendCachedMessage(activeChat.username, message);
                socket.emit('message_read', { senderUsername: activeChat.username });
            }
        };

        const handleDelivered = ({ messageId }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, status: 'delivered' } : msg
            ));
        };

        const handleMessagesRead = ({ readerUsername }) => {
            if (readerUsername === activeChat.username) {
                setMessages(prev => prev.map(msg => {
                    const isMine = msg.sender?._id === currentUser?._id || msg.sender?.username === currentUser?.username;
                    if (isMine && msg.status !== 'read') {
                        return { ...msg, status: 'read' };
                    }
                    return msg;
                }));
                markCachedMessagesRead(activeChat.username, activeChat.username);
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('message_delivered', handleDelivered);
        socket.on('messages_read', handleMessagesRead);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_delivered', handleDelivered);
            socket.off('messages_read', handleMessagesRead);
        };
    }, [activeChat?.username, currentUser]);

    // Auto-scroll
    useEffect(() => {
        if (initialLoadRef.current || !messagesContainerRef.current) {
            scrollToBottom(false);
            return;
        }

        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
            scrollToBottom();
        }
    }, [messages]);

    // ESC key
    useEffect(() => {
        if (!activeChat) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showEmojiPicker) {
                    setShowEmojiPicker(false);
                } else {
                    onCloseChat?.();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChat, onCloseChat, showEmojiPicker]);

    // Close emoji on outside click
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    useEffect(() => {
        setShowEmojiPicker(false);
    }, [activeChat?.username]);

    // Stop typing when chat changes or component unmounts
    useEffect(() => {
        return () => {
            if (isTypingRef.current && activeChat?.username) {
                const socket = getSocket();
                socket?.emit('typing_stop', { receiverUsername: activeChat.username });
                isTypingRef.current = false;
            }
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
            }
        };
    }, [activeChat?.username]);

    const handleEmojiClick = (emojiData) => {
        setNewMessage(prev => prev + emojiData.emoji);
        inputRef.current?.focus();
    };

    // Typing indicator logic
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        if (!activeChat?.username) return;
        const socket = getSocket();
        if (!socket) return;

        // Emit typing_start if not already typing
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit('typing_start', { receiverUsername: activeChat.username });
        }

        // Reset the stop timer (stop typing after 2s of inactivity)
        if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
        }
        typingTimerRef.current = setTimeout(() => {
            isTypingRef.current = false;
            socket.emit('typing_stop', { receiverUsername: activeChat.username });
        }, 2000);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const socket = getSocket();
        if (!socket) return;

        // Stop typing immediately on send
        if (isTypingRef.current) {
            isTypingRef.current = false;
            socket.emit('typing_stop', { receiverUsername: activeChat.username });
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
            }
        }

        setSending(true);
        setShowEmojiPicker(false);

        socket.emit('send_message', {
            receiverUsername: activeChat.username,
            content: newMessage.trim()
        }, (response) => {
            if (response?.error) {
                console.error('Send error:', response.error);
            } else if (response?.message) {
                setMessages(prev => [...prev, response.message]);
                appendCachedMessage(activeChat.username, response.message);
                onMessageSent?.();
            }
            setSending(false);
        });

        setNewMessage("");
    };

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : "?";

    const getPhotoUrl = (photoPath) => {
        if (!photoPath) return null;
        const base = backendUrl?.replace(/\/api\/?$/, "") || "";
        return `${base}${photoPath}`;
    };

    const isOnline = activeChat && onlineUsers?.has(activeChat._id);
    const isTyping = activeChat && typingUsers?.has(activeChat.username);

    // Empty state
    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f0faf0] text-center px-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-emerald-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">ChatNow</h3>
                <p className="text-sm text-neutral-400 max-w-xs">
                    Select a conversation or search for a user to start chatting
                </p>
            </div>
        );
    }

    const chatPhoto = getPhotoUrl(activeChat.profilePhoto);

    return (
        <div className="flex-1 flex flex-col bg-[#f0faf0] h-full min-h-0">
            {/* Chat Header */}
            <div className="px-3 md:px-6 py-3 md:py-4 bg-white border-b border-neutral-200 flex items-center gap-2 md:gap-3 flex-shrink-0">
                <button
                    onClick={onCloseChat}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors cursor-pointer flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-neutral-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>

                <button
                    onClick={() => onOpenUserProfile?.(activeChat)}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:bg-neutral-50 rounded-xl px-1 py-1 -mx-1 transition-colors cursor-pointer text-left"
                >
                    <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                            {chatPhoto ? (
                                <img src={chatPhoto} alt={activeChat.name} className="w-full h-full object-cover" />
                            ) : (
                                getInitial(activeChat.name)
                            )}
                        </div>
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-900 truncate">{activeChat.name}</h3>
                        <p className="text-xs text-neutral-400">
                            {isTyping ? (
                                <span className="text-emerald-600 animate-pulse">typing...</span>
                            ) : isOnline ? (
                                <span className="text-emerald-600">Online</span>
                            ) : (
                                `@${activeChat.username}`
                            )}
                        </p>
                    </div>
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 md:px-6 py-4 min-h-0"
            >
                {loadingMore && (
                    <div className="flex items-center justify-center py-3">
                        <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                )}
                {hasMore && !loadingMore && messages.length > 0 && (
                    <button
                        onClick={loadMoreMessages}
                        className="w-full text-center text-xs text-emerald-600 py-2 hover:underline cursor-pointer"
                    >
                        Load older messages
                    </button>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="relative flex items-center justify-center">
                            {/* Outer rotating ring */}
                            <div className="absolute w-28 h-28 rounded-full animate-[spin_2.5s_linear_infinite]"
                                style={{
                                    background: 'conic-gradient(from 0deg, transparent 0%, #10b98115 25%, #10b98140 50%, #10b98115 75%, transparent 100%)',
                                }}
                            />
                            {/* Second rotating ring */}
                            <div className="absolute w-36 h-36 rounded-full animate-[spin_4s_linear_infinite_reverse]"
                                style={{
                                    background: 'conic-gradient(from 180deg, transparent 0%, #10b98108 25%, #10b98120 50%, #10b98108 75%, transparent 100%)',
                                }}
                            />
                            {/* Pulsing glow */}
                            <div className="absolute w-24 h-24 rounded-full bg-emerald-500/5 animate-[pulse_2s_ease-in-out_infinite]" />
                            {/* Static ring borders */}
                            <div className="absolute w-26 h-26 rounded-full border border-emerald-500/10" />
                            {/* Logo */}
                            <div className="relative z-10 animate-[scaleIn_0.6s_ease-out_forwards]">
                                <img
                                    src="/chatnow new logo png.png"
                                    alt="Loading"
                                    className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                />
                            </div>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-sm text-neutral-400">No messages yet</p>
                        <p className="text-xs text-neutral-300 mt-1">Say hello to {activeChat.name}!</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg._id}
                                message={msg}
                                isOwn={msg.sender._id === currentUser?._id || msg.sender.username === currentUser?.username}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Message Input */}
            <div className="px-3 md:px-4 py-2 md:py-3 bg-white border-t border-neutral-200 flex-shrink-0 relative">
                {showEmojiPicker && (
                    <div
                        ref={emojiPickerRef}
                        className="absolute bottom-full left-0 right-0 md:left-auto md:right-auto mb-2 mx-2 md:mx-0 z-50"
                    >
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width="100%"
                            height={350}
                            searchPlaceholder="Search emojis..."
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled
                            lazyLoadEmojis
                        />
                    </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-1.5 md:gap-2">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer flex-shrink-0
                            ${showEmojiPicker
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                        </svg>
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onFocus={() => setShowEmojiPicker(false)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm
                            text-neutral-900 placeholder-neutral-300
                            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />

                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-10 h-10 md:w-11 md:h-11 bg-emerald-500 text-white rounded-xl flex items-center justify-center
                            hover:bg-emerald-600 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
                            transition-all cursor-pointer flex-shrink-0"
                    >
                        {sending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ChatWindow;

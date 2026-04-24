import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../service/api';
import { getSocket } from '../service/socket';
import EmojiPicker from 'emoji-picker-react';
import MessageBubble from './MessageBubble';

const TYPING_DEBOUNCE = 1000;

function ChatWindow({ activeChat, currentUser, onMessageSent, onOpenUserProfile, backendUrl, onlineUsers, onCloseChat, typingUsers }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [securityAlert, setSecurityAlert] = useState(null);
    const [securityWarning, setSecurityWarning] = useState(null);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);
    const oldestMessageIdRef = useRef(null);
    const initialLoadRef = useRef(true);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    };

    const getPhotoUrl = (p) => {
        if (!p) return null;
        const base = backendUrl?.replace(/\/api\/?$/, '') || '';
        return `${base}${p}`;
    };

    const getInitial = (name) => name?.charAt(0).toUpperCase() || '?';

    // Load messages
    const loadMessages = useCallback(async (before = null) => {
        if (!activeChat?.username) return;
        try {
            const params = { limit: 50 };
            if (before) params.before = before;
            const res = await API.get(`/messages/${activeChat.username}`, { params });
            const { messages: fetched, hasMore: more } = res.data;

            if (!before) {
                setMessages(fetched);
                setHasMore(more);
                if (fetched.length > 0) oldestMessageIdRef.current = fetched[0]._id;
                initialLoadRef.current = true;
            } else {
                setMessages(prev => [...fetched, ...prev]);
                setHasMore(more);
                if (fetched.length > 0) oldestMessageIdRef.current = fetched[0]._id;
            }
        } catch { }
    }, [activeChat?.username]);

    useEffect(() => {
        if (!activeChat?.username) return;
        setMessages([]);
        setHasMore(false);
        setShowEmojiPicker(false);
        initialLoadRef.current = true;
        loadMessages();
    }, [activeChat?.username, loadMessages]);

    // Scroll after initial load
    useEffect(() => {
        if (initialLoadRef.current && messages.length > 0) {
            scrollToBottom(false);
            initialLoadRef.current = false;
        }
    }, [messages]);

    // Socket events
    useEffect(() => {
        if (!activeChat?.username) return;
        const socket = getSocket();
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            if (message.sender?.username !== activeChat.username) return;

            setMessages(prev => {
                if (prev.find(m => m._id?.toString() === message._id?.toString())) return prev;
                return [...prev, message];
            });
            scrollToBottom();

            // Mark as read immediately
            socket.emit('message_read', { senderUsername: activeChat.username });
        };

        const handleMessageDelivered = ({ messageId }) => {
            setMessages(prev => prev.map(m =>
                m._id?.toString() === messageId?.toString() ? { ...m, status: 'delivered' } : m
            ));
        };

        const handleMessagesRead = ({ senderUsername }) => {
            if (senderUsername === currentUser?.username) {
                setMessages(prev => prev.map(m =>
                    m.sender?.username === currentUser?.username ? { ...m, status: 'read' } : m
                ));
            }
        };

        const handleSecurityWarning = (data) => {
            // Keep receiver logic clean
            if (data.senderUsername && data.senderUsername !== activeChat.username && data.senderUsername !== currentUser?.username) return;
            setSecurityWarning(data);
            setTimeout(() => setSecurityWarning(null), 6000);
        };

        const handleAccountBanned = (data) => {
            alert(data.message || 'Your account has been suspended.');
            localStorage.clear();
            window.location.href = '/';
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('message_delivered', handleMessageDelivered);
        socket.on('messages_read', handleMessagesRead);
        socket.on('security_warning', handleSecurityWarning);
        socket.on('account_banned', handleAccountBanned);

        // Mark read on open
        socket.emit('message_read', { senderUsername: activeChat.username });

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_delivered', handleMessageDelivered);
            socket.off('messages_read', handleMessagesRead);
            socket.off('security_warning', handleSecurityWarning);
            socket.off('account_banned', handleAccountBanned);
        };
    }, [activeChat?.username, currentUser?.username]);

    // Emoji picker click-outside
    useEffect(() => {
        const handleClick = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Infinite scroll
    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        if (container.scrollTop === 0 && hasMore && !loadingMore) {
            const prevScrollHeight = container.scrollHeight;
            setLoadingMore(true);
            loadMessages(oldestMessageIdRef.current).then(() => {
                setLoadingMore(false);
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight - prevScrollHeight;
                });
            });
        }
    };

    const stopTyping = useCallback(() => {
        if (!isTypingRef.current) return;
        isTypingRef.current = false;
        const socket = getSocket();
        if (socket) socket.emit('typing_stop', { receiverUsername: activeChat.username });
    }, [activeChat?.username]);

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        const socket = getSocket();
        if (!socket) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit('typing_start', { receiverUsername: activeChat.username });
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(stopTyping, TYPING_DEBOUNCE);
    };

    const handleEmojiClick = (emojiData) => {
        setNewMessage(prev => prev + emojiData.emoji);
        inputRef.current?.focus();
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || sending) return;

        stopTyping();
        setSending(true);
        setNewMessage('');
        setSecurityAlert(null);

        const socket = getSocket();
        if (!socket) { setSending(false); return; }

        socket.emit('send_message', {
            receiverUsername: activeChat.username,
            content
        }, (response) => {
            if (response?.blocked) {
                // Message was blocked — show alert, restore text for editing
                setSecurityAlert({
                    riskLevel: response.riskLevel,
                    reasons: response.reasons,
                    message: response.message
                });
                setNewMessage(content);
            } else if (response?.message) {
                setMessages(prev => {
                    if (prev.find(m => m._id?.toString() === response.message._id?.toString())) return prev;
                    return [...prev, response.message];
                });
                scrollToBottom();
                onMessageSent?.();
            }
            setSending(false);
        });
    };

    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f7f8fa] h-full">
                <div className="text-center px-6 animate-fade-in">
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-6 mx-auto shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-[#5288c1]/40">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[#2c3e50] mb-2">Select a chat to start messaging</h3>
                    <p className="text-sm text-[#707579] max-w-xs mx-auto">
                        Choose a conversation from the sidebar or search for someone new
                    </p>
                </div>
            </div>
        );
    }

    const isDeleted = activeChat.isDeleted;
    const isBanned = activeChat.isBanned;
    const displayName = isDeleted ? "Deleted User" : activeChat.name;
    const chatPhoto = !isDeleted ? getPhotoUrl(activeChat.profilePhoto) : null;
    const isOnline = !isDeleted && !isBanned && onlineUsers?.has(activeChat._id?.toString?.() || activeChat._id);
    const isUserTyping = typingUsers?.has(activeChat.username);

    return (
        <div className="flex-1 flex flex-col bg-[#f7f8fa] h-full min-h-0">
            {/* Header */}
            <div className="px-4 md:px-6 py-3 md:py-4 bg-white border-b border-[#dfe4ea] flex items-center gap-3 flex-shrink-0 animate-header-in shadow-sm">
                <button onClick={onCloseChat}
                    className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[#707579]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>

                <button onClick={() => !isDeleted && !isBanned && onOpenUserProfile(activeChat)}
                    disabled={isDeleted || isBanned}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:bg-[#f7f8fa] rounded-xl px-2 py-1.5 -mx-2 transition-colors cursor-pointer text-left disabled:cursor-default disabled:hover:bg-transparent">
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden shadow-sm"
                            style={{ background: isDeleted ? '#a0a5ab' : isBanned ? '#7f1d1d' : 'linear-gradient(135deg, #5288c1 0%, #3d6fa3 100%)' }}>
                            {isDeleted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                                </svg>
                            ) : isBanned ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: '#fca5a5' }}>
                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                                </svg>
                            ) : chatPhoto ? (
                                <img src={chatPhoto} alt={displayName} className="w-full h-full object-cover" />
                            ) : getInitial(activeChat.name)}
                        </div>
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white online-dot"
                                style={{ background: '#4caf50' }} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate"
                            style={{ color: isDeleted ? '#a0a5ab' : isBanned ? '#e97c7c' : '#2c3e50' }}>
                            {displayName}
                            {isBanned && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="inline w-3.5 h-3.5 ml-1.5 mb-0.5" style={{ color: '#ef4444' }}>
                                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM3.47 3.47a.75.75 0 0 1 1.06 0l8 8a.75.75 0 1 1-1.06 1.06l-8-8a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                </svg>
                            )}
                        </h3>
                        <p className="text-xs" style={{ color: isBanned ? '#e97c7c' : '#707579' }}>
                            {isDeleted ? 'Account deleted' :
                                isBanned ? 'Account suspended' :
                                    isUserTyping ? <span className="text-[#5288c1]">typing…</span> :
                                        isOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </button>

                {/* Header actions */}
                <div className="flex items-center gap-1">
                    <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#707579]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#707579]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 md:px-6 py-4 min-h-0 scrollbar-thin chat-bg">
                {loadingMore && (
                    <div className="flex justify-center py-2 animate-fade-in">
                        <div className="w-5 h-5 border-2 border-[#5288c1]/20 border-t-[#5288c1] rounded-full animate-spin" />
                    </div>
                )}
                {messages.length === 0 && !loadingMore && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-[#5288c1]/50">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                            </svg>
                        </div>
                        <p className="text-base font-medium text-[#2c3e50]">No messages yet</p>
                        <p className="text-sm text-[#707579] mt-1">Say hello to {displayName}!</p>
                    </div>
                )}

                <div className="space-y-2">
                    {messages.map((msg, idx) => (
                        <div key={msg._id} className="animate-msg-in" style={{ animationDelay: `${Math.min(idx * 0.02, 0.3)}s` }}>
                            <MessageBubble
                                message={msg}
                                isOwn={msg.sender?.username === currentUser?.username}
                            />
                        </div>
                    ))}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 md:px-6 py-3 md:py-4 bg-white border-t border-[#dfe4ea] flex-shrink-0 relative shadow-sm">
                {/* Security Warning Toast */}
                {securityWarning && (
                    <div className="absolute bottom-full left-2 right-2 mb-2 z-50 animate-slide-up">
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-orange-500">⚠️</span>
                                    <span className="text-sm text-orange-700 font-medium">{securityWarning.message}</span>
                                </div>
                                <button onClick={() => setSecurityWarning(null)} className="text-orange-400 hover:text-orange-600 text-lg cursor-pointer">×</button>
                            </div>
                            {securityWarning.reasons?.length > 0 && (
                                <p className="text-xs text-orange-600 mt-1.5 ml-7">{securityWarning.reasons.join(' • ')}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Security Alert (Blocked Message) */}
                {securityAlert && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-pop-in">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-red-500">🚨</span>
                                    <span className="text-sm text-red-700 font-semibold">Message Blocked</span>
                                </div>
                                <p className="text-xs text-red-600 mt-1.5 ml-7">{securityAlert.message}</p>
                                {securityAlert.reasons?.length > 0 && (
                                    <ul className="text-xs text-red-600 mt-1 ml-7 list-disc list-inside">
                                        {securityAlert.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                )}
                                <p className="text-xs text-[#707579] mt-2 ml-7">Modify your message and try again.</p>
                            </div>
                            <button onClick={() => setSecurityAlert(null)} className="text-red-400 hover:text-red-600 text-lg cursor-pointer flex-shrink-0">×</button>
                        </div>
                    </div>
                )}

                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-0 right-0 md:left-auto md:right-auto mb-2 mx-2 md:mx-0 z-50 animate-pop-in">
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width="100%" height={350}
                            searchPlaceholder="Search emojis..."
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled lazyLoadEmojis theme="light"
                        />
                    </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer flex-shrink-0
                            ${showEmojiPicker ? 'bg-[#e8f0fe] text-[#5288c1]' : 'text-[#707579] hover:bg-[#f0f2f5]'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                        </svg>
                    </button>
                    <button type="button" className="w-10 h-10 flex items-center justify-center rounded-full text-[#707579] hover:bg-[#f0f2f5] transition-all cursor-pointer flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                        </svg>
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onFocus={() => setShowEmojiPicker(false)}
                        placeholder={isDeleted ? "Cannot message deleted user" : isBanned ? "Cannot message banned account" : "Your message"}
                        disabled={isDeleted || isBanned}
                        className={`flex-1 px-4 py-2.5 bg-[#f7f8fa] border rounded-full text-sm placeholder-[#a0a5ab] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all
                            ${securityAlert
                                ? 'border-red-300 focus:border-red-400 focus:bg-white'
                                : 'border-[#dfe4ea] focus:border-[#5288c1] focus:bg-white'
                            }`}
                        style={{ color: '#2c3e50' }}
                    />
                    <button type="submit" disabled={!newMessage.trim() || sending || isDeleted || isBanned}
                        className="w-10 h-10 bg-[#5288c1] text-white rounded-full flex items-center justify-center hover:bg-[#3d6fa3] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0 shadow-md">
                        {sending
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                            </svg>}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ChatWindow;

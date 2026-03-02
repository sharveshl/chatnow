import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../service/api';
import { getSocket } from '../service/socket';
import EmojiPicker from 'emoji-picker-react';
import GroupInfoPanel from './GroupInfoPanel';

const TYPING_DEBOUNCE = 1000;

function GroupChatWindow({ group, currentUser, onGroupUpdated, onLeaveGroup, onDeleteGroup, onCloseChat, backendUrl }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [typingUsers, setTypingUsers] = useState(new Set());

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const typingTimerRef = useRef(null);
    const isTypingRef = useRef(false);
    const oldestMessageIdRef = useRef(null);
    const initialLoadRef = useRef(true);
    const typingTimeoutsRef = useRef({});

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    };

    const getPhotoUrl = (p) => {
        if (!p) return null;
        const base = backendUrl?.replace(/\/api\/?$/, '') || '';
        return `${base}${p}`;
    };
    const getInitial = (name) => name?.charAt(0).toUpperCase() || '?';

    const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Load messages
    const loadMessages = useCallback(async (before = null) => {
        if (!group?._id) return;
        try {
            const params = { limit: 50 };
            if (before) params.before = before;
            const res = await API.get(`/groups/${group._id}/messages`, { params });
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
    }, [group?._id]);

    useEffect(() => {
        if (!group?._id) return;
        setMessages([]);
        setHasMore(false);
        setShowEmojiPicker(false);
        initialLoadRef.current = true;
        loadMessages();
    }, [group?._id, loadMessages]);

    // Scroll after initial load
    useEffect(() => {
        if (initialLoadRef.current && messages.length > 0) {
            scrollToBottom(false);
            initialLoadRef.current = false;
        }
    }, [messages]);

    // Socket events for this group
    useEffect(() => {
        if (!group?._id) return;
        const socket = getSocket();
        if (!socket) return;

        const handleGroupMessage = (message) => {
            if (message.group?.toString() !== group._id?.toString() &&
                message.group !== group._id) return;

            setMessages(prev => {
                if (prev.find(m => m._id?.toString() === message._id?.toString())) return prev;
                return [...prev, message];
            });
            scrollToBottom();

            // Mark as read immediately
            socket.emit('group_message_read', { groupId: group._id });
        };

        const handleGroupTyping = ({ groupId, username }) => {
            if (groupId !== group._id?.toString() && groupId !== group._id) return;
            if (username === currentUser?.username) return;
            setTypingUsers(prev => new Set([...prev, username]));

            if (typingTimeoutsRef.current[username]) clearTimeout(typingTimeoutsRef.current[username]);
            typingTimeoutsRef.current[username] = setTimeout(() => {
                setTypingUsers(prev => { const next = new Set(prev); next.delete(username); return next; });
            }, 3000);
        };

        const handleGroupStopTyping = ({ groupId, username }) => {
            if (groupId !== group._id?.toString() && groupId !== group._id) return;
            setTypingUsers(prev => { const next = new Set(prev); next.delete(username); return next; });
            if (typingTimeoutsRef.current[username]) {
                clearTimeout(typingTimeoutsRef.current[username]);
                delete typingTimeoutsRef.current[username];
            }
        };

        socket.on('group_receive_message', handleGroupMessage);
        socket.on('group_user_typing', handleGroupTyping);
        socket.on('group_user_stopped_typing', handleGroupStopTyping);

        // Mark read on open
        socket.emit('group_message_read', { groupId: group._id });

        return () => {
            socket.off('group_receive_message', handleGroupMessage);
            socket.off('group_user_typing', handleGroupTyping);
            socket.off('group_user_stopped_typing', handleGroupStopTyping);
            Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
            typingTimeoutsRef.current = {};
        };
    }, [group?._id, currentUser?.username]);

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
        if (socket) socket.emit('group_typing_stop', { groupId: group._id });
    }, [group?._id]);

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        const socket = getSocket();
        if (!socket) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit('group_typing_start', { groupId: group._id });
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

        const socket = getSocket();
        if (!socket) { setSending(false); return; }

        socket.emit('group_send_message', { groupId: group._id, content }, (response) => {
            if (response?.message) {
                setMessages(prev => {
                    if (prev.find(m => m._id?.toString() === response.message._id?.toString())) return prev;
                    return [...prev, response.message];
                });
                scrollToBottom();
            }
            setSending(false);
        });
    };

    const typingList = Array.from(typingUsers);
    const typingText = typingList.length === 1
        ? `${typingList[0]} is typing…`
        : typingList.length === 2
            ? `${typingList[0]} and ${typingList[1]} are typing…`
            : typingList.length > 2
                ? `${typingList[0]} and ${typingList.length - 1} others are typing…`
                : null;

    const groupPhoto = getPhotoUrl(group?.photo);
    const memberCount = group?.members?.length || 0;

    return (
        <div className="flex-1 flex flex-col bg-[#0a0a12] h-full min-h-0">
            {/* Header */}
            <div className="px-3 md:px-6 py-3 md:py-4 bg-[#111118] border-b border-[#1e1e2a] flex items-center gap-2 md:gap-3 flex-shrink-0">
                <button onClick={onCloseChat}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-neutral-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>

                <button onClick={() => setShowInfo(true)}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:bg-[#1a1a25] rounded-xl px-1 py-1 -mx-1 transition-colors cursor-pointer text-left">
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-[#0055CC] rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden flex-shrink-0">
                        {groupPhoto
                            ? <img src={groupPhoto} alt={group?.name} className="w-full h-full object-cover" />
                            : getInitial(group?.name)}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-neutral-100 truncate">{group?.name}</h3>
                        <p className="text-xs text-neutral-500">
                            {typingText
                                ? <span className="text-blue-400 animate-pulse">{typingText}</span>
                                : `${memberCount} member${memberCount !== 1 ? 's' : ''}`
                            }
                        </p>
                    </div>
                </button>

                {/* Info button */}
                <button onClick={() => setShowInfo(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                </button>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-1 min-h-0">
                {loadingMore && (
                    <div className="flex justify-center py-2">
                        <div className="w-5 h-5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
                    </div>
                )}
                {messages.length === 0 && !loadingMore && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 bg-[#1a1a25] rounded-full flex items-center justify-center mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-blue-400/50">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                            </svg>
                        </div>
                        <p className="text-sm text-neutral-500">No messages yet</p>
                        <p className="text-xs text-neutral-600 mt-1">Say hello to the group!</p>
                    </div>
                )}

                {renderMessages(messages, currentUser, getInitial, getPhotoUrl, formatTime)}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-3 md:px-4 py-2 md:py-3 bg-[#111118] border-t border-[#1e1e2a] flex-shrink-0 relative">
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-0 right-0 md:left-auto md:right-auto mb-2 mx-2 md:mx-0 z-50">
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width="100%" height={350}
                            searchPlaceholder="Search emojis..."
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled lazyLoadEmojis theme="dark"
                        />
                    </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-1.5 md:gap-2">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer flex-shrink-0
                            ${showEmojiPicker ? 'bg-[#0084FF]/20 text-blue-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a25]'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                        </svg>
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onFocus={() => setShowEmojiPicker(false)}
                        placeholder="Type a message…"
                        className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-[#1a1a25] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent"
                    />
                    <button type="submit" disabled={!newMessage.trim() || sending}
                        className="w-10 h-10 md:w-11 md:h-11 bg-[#0084FF] text-white rounded-xl flex items-center justify-center hover:bg-[#0070DD] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0">
                        {sending
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>}
                    </button>
                </form>
            </div>

            {/* Group Info Panel */}
            {showInfo && (
                <GroupInfoPanel
                    group={group}
                    currentUser={currentUser}
                    backendUrl={backendUrl}
                    onClose={() => setShowInfo(false)}
                    onGroupUpdated={(updatedGroup) => {
                        onGroupUpdated(updatedGroup);
                    }}
                    onLeaveGroup={(groupId) => {
                        setShowInfo(false);
                        onLeaveGroup(groupId);
                    }}
                    onDeleteGroup={(groupId) => {
                        setShowInfo(false);
                        onDeleteGroup(groupId);
                    }}
                />
            )}
        </div>
    );
}

// Render messages with sender name for non-own messages in groups
function renderMessages(messages, currentUser, getInitial, getPhotoUrl, formatTime) {
    return messages.map((msg, idx) => {
        const isOwn = msg.sender?._id?.toString() === currentUser?._id?.toString() ||
            msg.sender?.username === currentUser?.username;

        const senderPhoto = getPhotoUrl(msg.sender?.profilePhoto);
        const showSenderName = !isOwn;

        // Group consecutive same-sender messages
        const prevMsg = messages[idx - 1];
        const isSameSender = prevMsg && prevMsg.sender?.username === msg.sender?.username;

        return (
            <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isSameSender ? 'mt-0.5' : 'mt-2'}`}>
                {/* Avatar (non-own, first in chain) */}
                {!isOwn && (
                    <div className="flex-shrink-0 w-7 h-7 mr-2 self-end">
                        {!isSameSender && (
                            <div className="w-7 h-7 rounded-full bg-[#0055CC] overflow-hidden flex items-center justify-center text-xs text-blue-200 font-semibold">
                                {senderPhoto
                                    ? <img src={senderPhoto} alt={msg.sender?.name} className="w-full h-full object-cover" />
                                    : getInitial(msg.sender?.name)}
                            </div>
                        )}
                    </div>
                )}

                <div className={`max-w-[72%] ${isOwn ? '' : ''}`}>
                    {/* Sender name above bubble (first in chain, non-own) */}
                    {showSenderName && !isSameSender && (
                        <p className="text-[11px] text-blue-400 font-medium mb-0.5 px-1">{msg.sender?.name}</p>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                        ${isOwn
                            ? 'bg-[#0084FF] text-white rounded-br-md'
                            : 'bg-[#2a2a35] text-neutral-100 rounded-bl-md'}`}>
                        <p className="break-words">{msg.content}</p>
                        <div className={`flex items-center justify-end mt-1 ${isOwn ? 'text-blue-200/70' : 'text-neutral-500'}`}>
                            <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    });
}

export default GroupChatWindow;

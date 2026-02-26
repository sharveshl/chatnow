import { useState, useRef, useEffect } from "react";
import API from "../service/api";
import { getSocket } from "../service/socket";
import MessageBubble from "./MessageBubble";

function ChatWindow({ activeChat, currentUser, onMessageSent, onOpenUserProfile, backendUrl, onlineUsers, onCloseChat }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Fetch messages when active chat changes
    useEffect(() => {
        if (!activeChat?.username) return;

        const fetchMessages = async () => {
            setLoading(true);
            try {
                const res = await API.get(`/messages/${activeChat.username}`);
                setMessages(res.data);
            } catch {
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        // Emit read receipt for this conversation
        const socket = getSocket();
        if (socket) {
            socket.emit('message_read', { senderUsername: activeChat.username });
        }
    }, [activeChat?.username]);

    // ─── Socket.IO listeners ────────────────────────────────────
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeChat?.username) return;

        // Receive a new message
        const handleReceiveMessage = (message) => {
            const senderUsername = message.sender?.username;
            if (senderUsername === activeChat.username) {
                setMessages(prev => [...prev, message]);
                // Auto-send read receipt since this chat is open
                socket.emit('message_read', { senderUsername: activeChat.username });
            }
        };

        // A message we sent was delivered
        const handleDelivered = ({ messageId }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, status: 'delivered' } : msg
            ));
        };

        // Our messages were read by the chat partner
        const handleMessagesRead = ({ readerUsername }) => {
            if (readerUsername === activeChat.username) {
                setMessages(prev => prev.map(msg => {
                    const isMine = msg.sender?._id === currentUser?._id || msg.sender?.username === currentUser?.username;
                    if (isMine && msg.status !== 'read') {
                        return { ...msg, status: 'read' };
                    }
                    return msg;
                }));
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

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ESC key to close chat
    useEffect(() => {
        if (!activeChat) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCloseChat?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeChat, onCloseChat]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const socket = getSocket();
        if (!socket) return;

        setSending(true);

        socket.emit('send_message', {
            receiverUsername: activeChat.username,
            content: newMessage.trim()
        }, (response) => {
            if (response?.error) {
                console.error('Send error:', response.error);
            } else if (response?.message) {
                // ACK — message saved, add to UI
                setMessages(prev => [...prev, response.message]);
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

    // Check if the active chat user is online
    const isOnline = activeChat && onlineUsers?.has(activeChat._id);

    // Empty state
    if (!activeChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#fafafa] text-center px-6">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-neutral-300">
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
        <div className="flex-1 flex flex-col bg-[#fafafa] h-full">
            {/* Chat Header — clickable to open profile */}
            <button
                onClick={() => onOpenUserProfile?.(activeChat)}
                className="px-6 py-4 bg-white border-b border-neutral-200 flex items-center gap-3 hover:bg-neutral-50 transition-colors cursor-pointer text-left w-full"
            >
                <div className="relative">
                    <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                        {chatPhoto ? (
                            <img src={chatPhoto} alt={activeChat.name} className="w-full h-full object-cover" />
                        ) : (
                            getInitial(activeChat.name)
                        )}
                    </div>
                    {/* Online indicator */}
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{activeChat.name}</h3>
                    <p className="text-xs text-neutral-400">
                        {isOnline ? (
                            <span className="text-green-600">Online</span>
                        ) : (
                            `@${activeChat.username}`
                        )}
                    </p>
                </div>
            </button>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
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
            <div className="px-4 py-3 bg-white border-t border-neutral-200">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm
                            text-neutral-900 placeholder-neutral-300
                            focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-11 h-11 bg-neutral-900 text-white rounded-xl flex items-center justify-center
                            hover:bg-neutral-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
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

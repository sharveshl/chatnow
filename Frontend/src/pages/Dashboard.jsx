import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../service/api";
import { connectSocket, disconnectSocket, getSocket } from "../service/socket";
import ChatSidebar from "../Components/ChatSidebar";
import ChatWindow from "../Components/ChatWindow";
import ProfilePanel from "../Components/ProfilePanel";

function Dashboard() {
    const [currentUser, setCurrentUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const navigate = useNavigate();
    const activeChatRef = useRef(null);

    const backendUrl = import.meta.env.VITE_backendurl;

    // Keep ref in sync with state so socket callbacks see latest value
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await API.get("/users/me");
                setCurrentUser(res.data);
            } catch {
                localStorage.removeItem("token");
                navigate("/login");
            }
        };
        fetchUser();
    }, [navigate]);

    // Fetch conversations (initial load)
    const fetchConversations = useCallback(async () => {
        try {
            const res = await API.get("/messages/conversations/list");
            setConversations(res.data);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // ─── Socket.IO Setup ────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = connectSocket(token);

        // Online users list (received on connection)
        socket.on('online_users', (userIds) => {
            setOnlineUsers(new Set(userIds));
        });

        socket.on('user_online', ({ userId }) => {
            setOnlineUsers(prev => new Set([...prev, userId]));
        });

        socket.on('user_offline', ({ userId }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        // Receive a new message from someone
        socket.on('receive_message', (message) => {
            const senderUsername = message.sender.username;
            const current = activeChatRef.current;

            // If the chat with this sender is currently open, add the message
            // and emit a read receipt
            if (current && current.username === senderUsername) {
                // Will be handled by ChatWindow's listener
            }

            // Update conversations list
            fetchConversations();
        });

        // Message delivered notification
        socket.on('message_delivered', ({ messageId }) => {
            // ChatWindow handles this directly
        });

        // Messages read notification
        socket.on('messages_read', ({ readerUsername }) => {
            // ChatWindow handles this directly
        });

        return () => {
            socket.off('online_users');
            socket.off('user_online');
            socket.off('user_offline');
            socket.off('receive_message');
            socket.off('message_delivered');
            socket.off('messages_read');
            disconnectSocket();
        };
    }, [currentUser, fetchConversations]);

    const handleSelectChat = (user) => {
        setActiveChat(user);
    };

    const handleNewChat = (user) => {
        const exists = conversations.find((c) => c.user.username === user.username);
        if (!exists) {
            setConversations((prev) => [
                {
                    user,
                    lastMessage: "",
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0
                },
                ...prev
            ]);
        }
        setActiveChat(user);
    };

    const handleLogout = () => {
        disconnectSocket();
        localStorage.removeItem("token");
        navigate("/login");
    };

    // Profile handlers
    const handleOpenOwnProfile = () => {
        setProfileUser(currentUser);
        setIsOwnProfile(true);
    };

    const handleOpenUserProfile = (user) => {
        setProfileUser(user);
        setIsOwnProfile(user.username === currentUser?.username);
    };

    const handleCloseProfile = () => {
        setProfileUser(null);
        setIsOwnProfile(false);
    };

    const handleProfileUpdated = (updatedUser) => {
        if (isOwnProfile) {
            setCurrentUser(updatedUser);
        }
    };

    if (loading && !currentUser) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#fafafa]">
            {/* Top bar */}
            <div className="h-12 bg-neutral-900 flex items-center justify-between px-5 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-neutral-900 text-xs font-bold">C</span>
                    </div>
                    <span className="text-white text-sm font-semibold tracking-tight">ChatNow</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-neutral-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                    Log out
                </button>
            </div>

            {/* Main content — two column layout */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left column — sidebar */}
                <div className="w-[360px] flex-shrink-0">
                    <ChatSidebar
                        conversations={conversations}
                        activeChat={activeChat}
                        onSelectChat={handleSelectChat}
                        currentUser={currentUser}
                        onNewChat={handleNewChat}
                        onOpenOwnProfile={handleOpenOwnProfile}
                        backendUrl={backendUrl}
                        onlineUsers={onlineUsers}
                    />
                </div>

                {/* Right column — chat window */}
                <ChatWindow
                    activeChat={activeChat}
                    currentUser={currentUser}
                    onMessageSent={fetchConversations}
                    onOpenUserProfile={handleOpenUserProfile}
                    backendUrl={backendUrl}
                    onlineUsers={onlineUsers}
                />

                {/* Profile Panel Overlay */}
                {profileUser && (
                    <ProfilePanel
                        user={profileUser}
                        isOwnProfile={isOwnProfile}
                        onClose={handleCloseProfile}
                        onProfileUpdated={handleProfileUpdated}
                        backendUrl={backendUrl}
                    />
                )}
            </div>
        </div>
    );
}

export default Dashboard;
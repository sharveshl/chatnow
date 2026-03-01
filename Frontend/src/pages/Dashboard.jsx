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
    const [typingUsers, setTypingUsers] = useState(new Set());
    const navigate = useNavigate();
    const activeChatRef = useRef(null);
    const typingTimeoutRef = useRef({});

    const backendUrl = import.meta.env.VITE_backendurl;

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

    // Fetch conversations
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

    // Socket.IO Setup
    useEffect(() => {
        if (!currentUser) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = connectSocket(token);

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

        socket.on('receive_message', () => {
            fetchConversations();
        });

        socket.on('message_delivered', () => { });
        socket.on('messages_read', () => { });

        // Typing indicator events
        socket.on('user_typing', ({ username }) => {
            setTypingUsers(prev => new Set([...prev, username]));

            // Auto-clear after 3s if no typing_stop received
            if (typingTimeoutRef.current[username]) {
                clearTimeout(typingTimeoutRef.current[username]);
            }
            typingTimeoutRef.current[username] = setTimeout(() => {
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(username);
                    return next;
                });
            }, 3000);
        });

        socket.on('user_stopped_typing', ({ username }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                next.delete(username);
                return next;
            });
            if (typingTimeoutRef.current[username]) {
                clearTimeout(typingTimeoutRef.current[username]);
                delete typingTimeoutRef.current[username];
            }
        });

        return () => {
            socket.off('online_users');
            socket.off('user_online');
            socket.off('user_offline');
            socket.off('receive_message');
            socket.off('message_delivered');
            socket.off('messages_read');
            socket.off('user_typing');
            socket.off('user_stopped_typing');
            disconnectSocket();

            // Clear all typing timeouts
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
            typingTimeoutRef.current = {};
        };
    }, [currentUser, fetchConversations]);

    const handleSelectChat = (user) => {
        setActiveChat(user);
        const socket = getSocket();
        if (socket && user?.username) {
            socket.emit('message_read', { senderUsername: user.username });
        }
    };

    const handleCloseChat = () => {
        setActiveChat(null);
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

    const handleDeleteChat = (username) => {
        // Remove from conversations list
        setConversations(prev => prev.filter(c => c.user.username !== username));
        // Close the active chat if it's the deleted one
        if (activeChat?.username === username) {
            setActiveChat(null);
        }
        // Close profile panel
        setProfileUser(null);
        setIsOwnProfile(false);
    };

    if (loading && !currentUser) {
        return (
            <div className="min-h-screen bg-[#f0faf0] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#f0faf0] overflow-hidden">
            {/* Top bar */}
            <div className="h-14 bg-emerald-500 flex items-center justify-between px-4 md:px-5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/chatnow new logo svg.svg"
                        alt="ChatNow"
                        className="w-8 h-8 md:w-9 md:h-9 rounded-lg object-contain bg-white p-0.5"
                    />
                    <span className="text-white text-sm font-bold tracking-tight">ChatNow</span>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden relative min-h-0">
                <div className={`
                    flex-shrink-0 flex flex-col min-h-0
                    w-full md:w-[360px]
                    ${activeChat ? 'hidden md:flex' : 'flex'}
                `}>
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

                <div className={`
                    flex-1 flex flex-col min-h-0 min-w-0
                    ${activeChat ? 'flex' : 'hidden md:flex'}
                `}>
                    <ChatWindow
                        activeChat={activeChat}
                        currentUser={currentUser}
                        onMessageSent={fetchConversations}
                        onOpenUserProfile={handleOpenUserProfile}
                        backendUrl={backendUrl}
                        onlineUsers={onlineUsers}
                        onCloseChat={handleCloseChat}
                        typingUsers={typingUsers}
                    />
                </div>

                {/* Profile Panel Overlay */}
                {profileUser && (
                    <ProfilePanel
                        user={profileUser}
                        isOwnProfile={isOwnProfile}
                        onClose={handleCloseProfile}
                        onProfileUpdated={handleProfileUpdated}
                        backendUrl={backendUrl}
                        onLogout={isOwnProfile ? handleLogout : null}
                        onDeleteChat={!isOwnProfile ? handleDeleteChat : null}
                    />
                )}
            </div>
        </div>
    );
}

export default Dashboard;
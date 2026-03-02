import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../service/api";
import { connectSocket, disconnectSocket, getSocket } from "../service/socket";
import ChatSidebar from "../Components/ChatSidebar";
import ChatWindow from "../Components/ChatWindow";
import GroupChatWindow from "../Components/GroupChatWindow";
import ProfilePanel from "../Components/ProfilePanel";

function Dashboard() {
    const [currentUser, setCurrentUser] = useState(null);
    // Unified conversation list: DMs and groups, sorted by lastMessageTime
    const [conversations, setConversations] = useState([]);
    // activeChat = a user object (DM) or group object with type:'group'
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

    // Merge DMs and groups into unified sorted list
    const mergeConversations = useCallback((dms, groups) => {
        const allGroups = groups.map(g => ({ ...g, type: 'group' }));
        const combined = [...dms, ...allGroups];
        combined.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        return combined;
    }, []);

    // Fetch DMs + Groups and merge
    const fetchConversations = useCallback(async () => {
        try {
            const [dmsRes, groupsRes] = await Promise.all([
                API.get("/messages/conversations/list"),
                API.get("/groups")
            ]);
            setConversations(mergeConversations(dmsRes.data, groupsRes.data));
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [mergeConversations]);

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
            setOnlineUsers(new Set(userIds.map(String)));
        });
        socket.on('user_online', ({ userId }) => {
            setOnlineUsers(prev => new Set([...prev, String(userId)]));
        });
        socket.on('user_offline', ({ userId }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(String(userId));
                return next;
            });
        });

        // ─── DM receive ──────────────────────────────────────────────
        socket.on('receive_message', (message) => {
            const senderUsername = message?.sender?.username;
            const senderId = message?.sender?._id?.toString?.() || message?.sender?._id;
            if (senderUsername) {
                setConversations(prev => {
                    const exists = prev.find(c => c.type !== 'group' && c.user?.username === senderUsername);
                    if (exists) {
                        return prev.map(c =>
                            (c.type !== 'group' && c.user?.username === senderUsername)
                                ? {
                                    ...c,
                                    lastMessage: message.content || '',
                                    lastMessageTime: message.createdAt || new Date().toISOString(),
                                    lastMessageSender: senderId,
                                    unreadCount: (activeChatRef.current?.username === senderUsername) ? 0 : (c.unreadCount || 0) + 1
                                }
                                : c
                        ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
                    } else {
                        return [{
                            user: message.sender,
                            lastMessage: message.content || '',
                            lastMessageTime: message.createdAt || new Date().toISOString(),
                            lastMessageSender: senderId,
                            unreadCount: (activeChatRef.current?.username === senderUsername) ? 0 : 1
                        }, ...prev];
                    }
                });
            }
            fetchConversations();
        });

        socket.on('message_delivered', () => { });
        socket.on('messages_read', () => { });

        // ─── Group message receive ───────────────────────────────────
        socket.on('group_receive_message', (message) => {
            const groupId = message.group?.toString?.() || message.group;
            setConversations(prev => {
                return prev.map(c => {
                    if (c.type !== 'group' || c._id?.toString() !== groupId) return c;
                    const activeGroupId = activeChatRef.current?._id?.toString();
                    return {
                        ...c,
                        lastMessage: message.content || '',
                        lastMessageTime: message.createdAt || new Date().toISOString(),
                        lastMessageSender: message.sender,
                        unreadCount: (activeGroupId === groupId) ? 0 : (c.unreadCount || 0) + 1
                    };
                }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            });
        });

        // ─── Group updated (name/photo/members) ─────────────────────
        socket.on('group_updated', (updatedGroup) => {
            setConversations(prev => prev.map(c =>
                (c.type === 'group' && c._id?.toString() === updatedGroup._id?.toString())
                    ? { ...c, ...updatedGroup, type: 'group' }
                    : c
            ));
            // If we're viewing this group, update activeChat too
            setActiveChat(prev => {
                if (prev?.type === 'group' && prev._id?.toString() === updatedGroup._id?.toString()) {
                    return { ...updatedGroup, type: 'group' };
                }
                return prev;
            });
        });

        // ─── Group member removed / group deleted ────────────────────
        socket.on('group_member_removed', ({ groupId }) => {
            // Remove from conversations list if we were removed
            setConversations(prev => prev.filter(c => !(c.type === 'group' && c._id?.toString() === groupId)));
            setActiveChat(prev => {
                if (prev?.type === 'group' && prev._id?.toString() === groupId) return null;
                return prev;
            });
        });

        // ─── DM Typing indicators ────────────────────────────────────
        socket.on('user_typing', ({ username }) => {
            setTypingUsers(prev => new Set([...prev, username]));
            if (typingTimeoutRef.current[username]) clearTimeout(typingTimeoutRef.current[username]);
            typingTimeoutRef.current[username] = setTimeout(() => {
                setTypingUsers(prev => { const next = new Set(prev); next.delete(username); return next; });
            }, 3000);
        });
        socket.on('user_stopped_typing', ({ username }) => {
            setTypingUsers(prev => { const next = new Set(prev); next.delete(username); return next; });
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
            socket.off('group_receive_message');
            socket.off('group_updated');
            socket.off('group_member_removed');
            socket.off('user_typing');
            socket.off('user_stopped_typing');
            disconnectSocket();
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
            typingTimeoutRef.current = {};
        };
    }, [currentUser, fetchConversations]);

    // ─── Handlers ────────────────────────────────────────────────────

    const handleSelectChat = (user) => {
        setActiveChat({ ...user, type: 'dm' });
        setConversations(prev =>
            prev.map(c => (c.type !== 'group' && c.user?.username === user.username) ? { ...c, unreadCount: 0 } : c)
        );
        const socket = getSocket();
        if (socket && user?.username) {
            socket.emit('message_read', { senderUsername: user.username });
        }
    };

    const handleSelectGroup = (group) => {
        setActiveChat({ ...group, type: 'group' });
        setConversations(prev =>
            prev.map(c => (c.type === 'group' && c._id?.toString() === group._id?.toString()) ? { ...c, unreadCount: 0 } : c)
        );
        const socket = getSocket();
        if (socket && group._id) {
            socket.emit('group_message_read', { groupId: group._id });
        }
    };

    const handleCloseChat = () => setActiveChat(null);

    const handleNewChat = (user) => {
        const exists = conversations.find(c => c.type !== 'group' && c.user?.username === user.username);
        if (!exists) {
            setConversations(prev => [{
                user,
                lastMessage: "",
                lastMessageTime: new Date().toISOString(),
                unreadCount: 0
            }, ...prev]);
        }
        setActiveChat({ ...user, type: 'dm' });
    };

    const handleGroupCreated = (group) => {
        const groupWithType = { ...group, type: 'group', lastMessageTime: group.createdAt };
        setConversations(prev => [groupWithType, ...prev]);
        setActiveChat(groupWithType);
        // Join the socket room
        const socket = getSocket();
        if (socket) socket.emit('join_group', { groupId: group._id });
    };

    const handleGroupUpdated = (updatedGroup) => {
        const withType = { ...updatedGroup, type: 'group' };
        setConversations(prev => prev.map(c =>
            (c.type === 'group' && c._id?.toString() === updatedGroup._id?.toString())
                ? { ...c, ...withType }
                : c
        ));
        setActiveChat(prev => {
            if (prev?.type === 'group' && prev._id?.toString() === updatedGroup._id?.toString()) {
                return withType;
            }
            return prev;
        });
    };

    const handleLeaveGroup = (groupId) => {
        setConversations(prev => prev.filter(c => !(c.type === 'group' && c._id?.toString() === groupId?.toString())));
        if (activeChat?._id?.toString() === groupId?.toString()) setActiveChat(null);
    };

    const handleDeleteGroup = (groupId) => {
        setConversations(prev => prev.filter(c => !(c.type === 'group' && c._id?.toString() === groupId?.toString())));
        if (activeChat?._id?.toString() === groupId?.toString()) setActiveChat(null);
    };

    const handleLogout = () => {
        disconnectSocket();
        localStorage.removeItem("token");
        navigate("/login");
    };

    const handleOpenOwnProfile = () => { setProfileUser(currentUser); setIsOwnProfile(true); };
    const handleOpenUserProfile = (user) => { setProfileUser(user); setIsOwnProfile(user.username === currentUser?.username); };
    const handleCloseProfile = () => { setProfileUser(null); setIsOwnProfile(false); };
    const handleProfileUpdated = (updatedUser) => { if (isOwnProfile) setCurrentUser(updatedUser); };

    const handleDeleteChat = (username) => {
        setConversations(prev => prev.filter(c => c.type === 'group' || c.user?.username !== username));
        if (activeChat?.username === username) setActiveChat(null);
        setProfileUser(null);
        setIsOwnProfile(false);
    };

    if (loading && !currentUser) {
        return (
            <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    const isGroupChat = activeChat?.type === 'group';

    return (
        <div className="h-dvh flex flex-col bg-[#0a0a12] overflow-hidden">
            {/* Top bar */}
            <div className="h-14 bg-[#0a0a12] border-b border-[#1e1e2a] flex items-center justify-between px-4 md:px-5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <img src="/chatnow new logo svg.svg" alt="ChatNow" className="w-8 h-8 md:w-9 md:h-9 rounded-lg object-contain" />
                    <span className="text-neutral-100 text-sm font-bold tracking-tight">ChatNow</span>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden relative min-h-0">
                <div className={`flex-shrink-0 flex flex-col min-h-0 w-full md:w-[360px] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <ChatSidebar
                        conversations={conversations}
                        activeChat={activeChat}
                        onSelectChat={handleSelectChat}
                        onSelectGroup={handleSelectGroup}
                        currentUser={currentUser}
                        onNewChat={handleNewChat}
                        onOpenOwnProfile={handleOpenOwnProfile}
                        backendUrl={backendUrl}
                        onlineUsers={onlineUsers}
                        onGroupCreated={handleGroupCreated}
                    />
                </div>

                <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${activeChat ? 'flex' : 'hidden md:flex'}`}>
                    {isGroupChat ? (
                        <GroupChatWindow
                            group={activeChat}
                            currentUser={currentUser}
                            backendUrl={backendUrl}
                            onCloseChat={handleCloseChat}
                            onGroupUpdated={handleGroupUpdated}
                            onLeaveGroup={handleLeaveGroup}
                            onDeleteGroup={handleDeleteGroup}
                        />
                    ) : (
                        <ChatWindow
                            activeChat={activeChat?.type === 'dm' ? activeChat : activeChat}
                            currentUser={currentUser}
                            onMessageSent={fetchConversations}
                            onOpenUserProfile={handleOpenUserProfile}
                            backendUrl={backendUrl}
                            onlineUsers={onlineUsers}
                            onCloseChat={handleCloseChat}
                            typingUsers={typingUsers}
                        />
                    )}
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
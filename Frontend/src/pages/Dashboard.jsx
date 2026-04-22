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
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [bannedReason, setBannedReason] = useState(null);
    const navigate = useNavigate();
    const activeChatRef = useRef(null);
    const typingTimeoutRef = useRef({});
    const backendUrl = import.meta.env.VITE_backendurl;

    useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await API.get("/users/me");
                setCurrentUser(res.data);
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                            try { await API.post("/users/location", { lat: pos.coords.latitude, lng: pos.coords.longitude }); } catch { /* silent */ }
                        },
                        () => {},
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                }
            } catch { navigate("/login"); }
        };
        fetchUser();
    }, [navigate]);

    const mergeConversations = useCallback((dms, groups) => {
        const combined = [...dms, ...groups.map(g => ({ ...g, type: 'group' }))];
        combined.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        return combined;
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const [dmsRes, groupsRes] = await Promise.all([
                API.get("/messages/conversations/list"),
                API.get("/groups")
            ]);
            setConversations(mergeConversations(dmsRes.data, groupsRes.data));
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [mergeConversations]);

    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    useEffect(() => {
        if (!currentUser) return;
        const socket = connectSocket();

        socket.on('online_users', (ids) => setOnlineUsers(new Set(ids.map(String))));
        socket.on('user_online', ({ userId }) => setOnlineUsers(p => new Set([...p, String(userId)])));
        socket.on('user_offline', ({ userId }) => setOnlineUsers(p => { const n = new Set(p); n.delete(String(userId)); return n; }));

        socket.on('receive_message', (message) => {
            const su = message?.sender?.username;
            const sid = message?.sender?._id?.toString?.() || message?.sender?._id;
            if (su) {
                setConversations(prev => {
                    const exists = prev.find(c => c.type !== 'group' && c.user?.username === su);
                    if (exists) {
                        return prev.map(c => c.type !== 'group' && c.user?.username === su
                            ? { ...c, lastMessage: message.content || '', lastMessageTime: message.createdAt || new Date().toISOString(), lastMessageSender: sid, unreadCount: activeChatRef.current?.username === su ? 0 : (c.unreadCount || 0) + 1 }
                            : c
                        ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
                    }
                    return [{ user: message.sender, lastMessage: message.content || '', lastMessageTime: message.createdAt || new Date().toISOString(), lastMessageSender: sid, unreadCount: activeChatRef.current?.username === su ? 0 : 1 }, ...prev];
                });
            }
            fetchConversations();
        });

        socket.on('group_receive_message', (message) => {
            const gid = message.group?.toString?.() || message.group;
            setConversations(prev => prev.map(c => {
                if (c.type !== 'group' || c._id?.toString() !== gid) return c;
                const agid = activeChatRef.current?._id?.toString();
                return { ...c, lastMessage: message.content || '', lastMessageTime: message.createdAt || new Date().toISOString(), lastMessageSender: message.sender, unreadCount: agid === gid ? 0 : (c.unreadCount || 0) + 1 };
            }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)));
        });

        socket.on('group_updated', (g) => {
            setConversations(prev => prev.map(c => c.type === 'group' && c._id?.toString() === g._id?.toString() ? { ...c, ...g, type: 'group' } : c));
            setActiveChat(prev => prev?.type === 'group' && prev._id?.toString() === g._id?.toString() ? { ...g, type: 'group' } : prev);
        });

        socket.on('group_member_removed', ({ groupId }) => {
            setConversations(prev => prev.filter(c => !(c.type === 'group' && c._id?.toString() === groupId)));
            setActiveChat(prev => prev?.type === 'group' && prev._id?.toString() === groupId ? null : prev);
        });

        socket.on('user_typing', ({ username }) => {
            setTypingUsers(p => new Set([...p, username]));
            if (typingTimeoutRef.current[username]) clearTimeout(typingTimeoutRef.current[username]);
            typingTimeoutRef.current[username] = setTimeout(() => {
                setTypingUsers(p => { const n = new Set(p); n.delete(username); return n; });
            }, 3000);
        });
        socket.on('user_stopped_typing', ({ username }) => {
            setTypingUsers(p => { const n = new Set(p); n.delete(username); return n; });
            if (typingTimeoutRef.current[username]) { clearTimeout(typingTimeoutRef.current[username]); delete typingTimeoutRef.current[username]; }
        });

        // ── Real-time ban enforcement ──────────────────────────────────
        socket.on('account_banned', ({ message }) => {
            setBannedReason(message || 'Your account has been banned by the administration.');
        });

        return () => {
            ['online_users','user_online','user_offline','receive_message','message_delivered','messages_read','group_receive_message','group_updated','group_member_removed','user_typing','user_stopped_typing','account_banned'].forEach(e => socket.off(e));
            disconnectSocket();
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
            typingTimeoutRef.current = {};
        };
    }, [currentUser, fetchConversations]);

    const handleSelectChat = (user) => {
        setActiveChat({ ...user, type: 'dm' });
        setConversations(prev => prev.map(c => c.type !== 'group' && c.user?.username === user.username ? { ...c, unreadCount: 0 } : c));
        const s = getSocket();
        if (s && user?.username) s.emit('message_read', { senderUsername: user.username });
    };
    const handleSelectGroup = (group) => {
        setActiveChat({ ...group, type: 'group' });
        setConversations(prev => prev.map(c => c.type === 'group' && c._id?.toString() === group._id?.toString() ? { ...c, unreadCount: 0 } : c));
        const s = getSocket();
        if (s && group._id) s.emit('group_message_read', { groupId: group._id });
    };
    const handleCloseChat = () => setActiveChat(null);
    const handleNewChat = (user) => {
        if (!conversations.find(c => c.type !== 'group' && c.user?.username === user.username))
            setConversations(prev => [{ user, lastMessage: "", lastMessageTime: new Date().toISOString(), unreadCount: 0 }, ...prev]);
        setActiveChat({ ...user, type: 'dm' });
    };
    const handleGroupCreated = (group) => {
        const g = { ...group, type: 'group', lastMessageTime: group.createdAt };
        setConversations(prev => [g, ...prev]);
        setActiveChat(g);
        const s = getSocket();
        if (s) s.emit('join_group', { groupId: group._id });
    };
    const handleGroupUpdated = (updatedGroup) => {
        const w = { ...updatedGroup, type: 'group' };
        setConversations(prev => prev.map(c => c.type === 'group' && c._id?.toString() === updatedGroup._id?.toString() ? { ...c, ...w } : c));
        setActiveChat(prev => prev?.type === 'group' && prev._id?.toString() === updatedGroup._id?.toString() ? w : prev);
    };
    const handleLeaveGroup = (groupId) => {
        setConversations(prev => prev.filter(c => !(c.type === 'group' && c._id?.toString() === groupId?.toString())));
        if (activeChat?._id?.toString() === groupId?.toString()) setActiveChat(null);
    };
    const handleDeleteGroup = (groupId) => {
        setConversations(prev => prev.filter(c => !(c.type === 'group' && c._id?.toString() === groupId?.toString())));
        if (activeChat?._id?.toString() === groupId?.toString()) setActiveChat(null);
    };
    const handleLogout = async () => {
        try { await API.post("/auth/logout"); } catch { /* proceed */ }
        disconnectSocket();
        navigate("/login");
    };
    const handleOpenOwnProfile = () => { setProfileUser(currentUser); setIsOwnProfile(true); };
    const handleOpenUserProfile = (user) => { setProfileUser(user); setIsOwnProfile(user.username === currentUser?.username); };
    const handleCloseProfile = () => { setProfileUser(null); setIsOwnProfile(false); };
    const handleProfileUpdated = (u) => { if (isOwnProfile) setCurrentUser(u); };
    const handleDeleteChat = (username) => {
        setConversations(prev => prev.filter(c => c.type === 'group' || c.user?.username !== username));
        if (activeChat?.username === username) setActiveChat(null);
        setProfileUser(null);
        setIsOwnProfile(false);
    };

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : "?";
    const getPhotoUrl = (p) => { if (!p) return null; const base = backendUrl?.replace(/\/api\/?$/, "") || ""; return `${base}${p}`; };
    const currentUserPhoto = getPhotoUrl(currentUser?.profilePhoto);

    // ── Ban modal handler ─────────────────────────────────────────────
    const handleBanAcknowledge = async () => {
        try { await API.post('/auth/logout'); } catch { /* proceed */ }
        disconnectSocket();
        navigate('/login');
    };

    if (loading && !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-full border-3 border-green-200 border-t-green-500 animate-spin" style={{ borderWidth: 3 }} />
                        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <img src="/chatnow new logo svg.svg" alt="" className="w-6 h-6 object-contain" />
                        </div>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Loading ChatNow…</p>
                </div>
            </div>
        );
    }

    const isGroupChat = activeChat?.type === 'group';
    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

    return (
        <div className="h-dvh flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>

            {/* ── Account Banned Modal ──────────────────────────────── */}
            {bannedReason && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                >
                    <div
                        className="flex flex-col items-center gap-5 rounded-2xl p-8 max-w-sm w-full animate-fade-in"
                        style={{ background: '#111118', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 60px rgba(239,68,68,0.15)' }}
                    >
                        {/* Red shield icon */}
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#ef4444" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                            </svg>
                        </div>

                        <div className="text-center">
                            <h2 className="text-lg font-bold mb-2" style={{ color: '#ef4444' }}>Account Banned</h2>
                            <p className="text-sm leading-relaxed" style={{ color: '#a3a3a3' }}>{bannedReason}</p>
                        </div>

                        <p className="text-xs text-center" style={{ color: '#525252' }}>If you believe this is a mistake, please contact support.</p>

                        <button
                            onClick={handleBanAcknowledge}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        >
                            OK, Log Me Out
                        </button>
                    </div>
                </div>
            )}

            {/* ── Left nav rail ─────────────────────────────────── */}
            <div className="hidden md:flex flex-col items-center py-4 gap-2 flex-shrink-0 animate-nav-in"
                style={{ width: 64, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>

                {/* Logo */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
                    <img src="/chatnow new logo svg.svg" alt="ChatNow" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                </div>

                <div className="flex-1 flex flex-col items-center gap-1 w-full px-2">
                    {/* Chats nav item */}
                    <NavItem icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                    } active badge={totalUnread} label="Chats" />

                    {/* Groups */}
                    <NavItem icon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                    } label="Groups" />

                    {currentUser?.isAdmin && (
                        <NavItem onClick={() => navigate('/admin')} icon={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        } label="Admin" accent />
                    )}
                </div>

                {/* Bottom: profile avatar */}
                <button
                    onClick={handleOpenOwnProfile}
                    className="relative w-9 h-9 rounded-full overflow-hidden hover:ring-2 transition-all cursor-pointer"
                    style={{ '--tw-ring-color': 'var(--accent)' }}
                    title={currentUser?.name}
                >
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
                        {currentUserPhoto
                            ? <img src={currentUserPhoto} alt={currentUser?.name} className="w-full h-full object-cover" />
                            : getInitial(currentUser?.name)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white online-dot"
                        style={{ background: 'var(--accent)' }} />
                </button>
            </div>

            {/* ── Sidebar ───────────────────────────────────────── */}
            <div className={`flex-shrink-0 flex flex-col min-h-0 w-full md:w-[320px] lg:w-[340px] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
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
                    typingUsers={typingUsers}
                />
            </div>

            {/* ── Chat area ─────────────────────────────────────── */}
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
                        activeChat={activeChat}
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

            {/* Profile Panel */}
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
    );
}

function NavItem({ icon, active, badge, label, onClick, accent }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className="relative w-full flex items-center justify-center h-10 rounded-xl transition-all cursor-pointer group"
            style={{
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent-dark)' : accent ? '#7c3aed' : 'var(--text-secondary)',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
            {active && <span className="nav-active-bar" />}
            {icon}
            {badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white unread-badge"
                    style={{ background: 'var(--accent)' }}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    );
}

export default Dashboard;

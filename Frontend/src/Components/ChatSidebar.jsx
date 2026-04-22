import { useState, useRef } from "react";
import API from "../service/api";
import CreateGroupModal from "./CreateGroupModal";

const FILTERS = ["All", "DMs", "Groups", "Unread"];

function ChatSidebar({ conversations, activeChat, onSelectChat, onSelectGroup, currentUser, onNewChat, onOpenOwnProfile, backendUrl, onlineUsers, onGroupCreated, typingUsers }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [filter, setFilter] = useState("All");
    const [searchFocused, setSearchFocused] = useState(false);
    const searchTimerRef = useRef(null);

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : "?";
    const getPhotoUrl = (p) => { if (!p) return null; const base = backendUrl?.replace(/\/api\/?$/, "") || ""; return `${base}${p}`; };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (!query.trim()) { setSearchResults([]); return; }
        setIsSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const res = await API.get(`/users/search?q=${encodeURIComponent(query.trim())}`);
                setSearchResults(res.data);
            } catch { setSearchResults([]); }
            finally { setIsSearching(false); }
        }, 300);
    };

    const handleSelectSearchResult = (user) => {
        onNewChat(user);
        setSearchQuery("");
        setSearchResults([]);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        if (diff < 86400000 && date.getDate() === now.getDate())
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (diff < 604800000) return date.toLocaleDateString([], { weekday: "short" });
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const filteredConversations = conversations.filter((conv) => {
        if (filter === "DMs") return conv.type !== "group";
        if (filter === "Groups") return conv.type === "group";
        if (filter === "Unread") return (conv.unreadCount || 0) > 0;
        return true;
    });

    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
    const isSearchMode = searchQuery.trim().length > 0;

    const avatarColors = ["#25d366","#128c7e","#34b7f1","#7c3aed","#f59e0b","#ef4444","#3b82f6","#ec4899"];
    const getAvatarColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

    return (
        <div className="w-full h-full flex flex-col min-h-0" style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border)" }}>

            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0 animate-header-in" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        Messages
                        {totalUnread > 0 && (
                            <span className="ml-2 text-sm font-semibold" style={{ color: "var(--accent-dark)" }}>
                                ({totalUnread})
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-full transition-all cursor-pointer hover-lift"
                        style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                        title="New Group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: "var(--text-muted)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                        placeholder="Search or start new chat"
                        className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl transition-all outline-none"
                        style={{
                            background: "var(--bg-elevated)",
                            border: "1.5px solid var(--border)",
                            color: "var(--text-primary)",
                            fontFamily: "inherit"
                        }}
                        onFocusCapture={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)"; }}
                        onBlurCapture={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                    />
                    {searchQuery && (
                        <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                            style={{ color: "var(--text-muted)" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Search results */}
                {isSearchMode && (searchFocused || searchResults.length > 0) && (
                    <div className="mt-2 rounded-xl overflow-hidden shadow-lg animate-pop-in"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        {isSearching ? (
                            <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                                <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} />
                                Searching...
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="max-h-52 overflow-y-auto scrollbar-thin">
                                {searchResults.map((user) => (
                                    <button key={user._id} onMouseDown={() => handleSelectSearchResult(user)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                                        style={{ color: "var(--text-primary)" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden"
                                            style={{ background: getAvatarColor(user.name) }}>
                                            {getPhotoUrl(user.profilePhoto)
                                                ? <img src={getPhotoUrl(user.profilePhoto)} alt={user.name} className="w-full h-full object-cover" />
                                                : getInitial(user.name)}
                                        </div>
                                        <div className="text-left min-w-0 flex-1">
                                            <p className="text-sm font-semibold truncate">{user.name}</p>
                                            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{user.username}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                                No users found for &quot;{searchQuery}&quot;
                            </div>
                        )}
                    </div>
                )}

                {/* Filter tabs */}
                {!isSearchMode && (
                    <div className="flex gap-1 mt-3">
                        {FILTERS.map((f) => {
                            const isActive = filter === f;
                            const count = f === "Unread" ? totalUnread : null;
                            return (
                                <button key={f} onClick={() => setFilter(f)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                                    style={{
                                        background: isActive ? "var(--accent)" : "var(--bg-elevated)",
                                        color: isActive ? "white" : "var(--text-secondary)",
                                        border: isActive ? "none" : "1px solid var(--border)"
                                    }}>
                                    {f}
                                    {count > 0 && (
                                        <span className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                                            style={{ background: isActive ? "rgba(255,255,255,0.3)" : "var(--accent)", color: "white" }}>
                                            {count > 99 ? "99+" : count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 text-center py-12 animate-fade-in">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: "var(--accent-bg)" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7" style={{ color: "var(--accent-dark)" }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {filter === "Unread" ? "All caught up!" : filter === "Groups" ? "No groups yet" : filter === "DMs" ? "No direct messages" : "No conversations yet"}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            {filter === "Unread" ? "No unread messages" : "Search for someone to start chatting"}
                        </p>
                    </div>
                ) : (
                    <div className="py-1">
                        {filteredConversations.map((conv, idx) => {
                            const isGroup = conv.type === "group";

                            if (isGroup) {
                                const group = conv;
                                const isActive = activeChat?._id?.toString() === group._id?.toString() && activeChat?.type === "group";
                                const groupPhoto = getPhotoUrl(group.photo);
                                const lastSenderName = group.lastMessageSender?.username === currentUser?.username ? "You" : group.lastMessageSender?.name;
                                const lastMsgPreview = group.lastMessage ? (lastSenderName ? `${lastSenderName}: ${group.lastMessage}` : group.lastMessage) : "No messages yet";

                                return (
                                    <button key={`group-${group._id}`} onClick={() => onSelectGroup(group)}
                                        className="sidebar-item w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer relative"
                                        style={{
                                            background: isActive ? "var(--bg-active)" : "transparent",
                                            borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                                            animationDelay: `${idx * 0.03}s`
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                                        <div className="relative flex-shrink-0">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden shadow-sm"
                                                style={{ background: getAvatarColor(group.name) }}>
                                                {groupPhoto ? <img src={groupPhoto} alt={group.name} className="w-full h-full object-cover" /> : getInitial(group.name)}
                                            </div>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                                                style={{ background: "var(--accent)" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-white">
                                                    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                                                </svg>
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{group.name}</p>
                                                <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{formatTime(group.lastMessageTime)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs truncate pr-2" style={{ color: "var(--text-secondary)" }}>{lastMsgPreview}</p>
                                                {group.unreadCount > 0 && (
                                                    <span className="min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 px-1 unread-badge"
                                                        style={{ background: "var(--accent)" }}>
                                                        {group.unreadCount > 99 ? "99+" : group.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            }

                            const isActive = activeChat?.username === conv.user?.username && activeChat?.type !== "group";
                            const isDeleted = conv.user?.isDeleted;
                            const displayName = isDeleted ? "Deleted User" : conv.user?.name;
                            const convPhoto = !isDeleted ? getPhotoUrl(conv.user?.profilePhoto) : null;
                            const isOnline = !isDeleted && onlineUsers?.has(conv.user?._id?.toString?.() || conv.user?._id);
                            const isTyping = !isDeleted && typingUsers?.has(conv.user?.username);

                            return (
                                <button key={`dm-${conv.user?._id}`} onClick={() => onSelectChat(conv.user)}
                                    className="sidebar-item w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer relative"
                                    style={{
                                        background: isActive ? "var(--bg-active)" : "transparent",
                                        borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                                        animationDelay: `${idx * 0.03}s`
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                                    <div className="relative flex-shrink-0">
                                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden shadow-sm"
                                            style={{ background: isDeleted ? "#d1d5db" : getAvatarColor(conv.user?.name) }}>
                                            {isDeleted ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                                                </svg>
                                            ) : convPhoto ? (
                                                <img src={convPhoto} alt={displayName} className="w-full h-full object-cover" />
                                            ) : getInitial(conv.user?.name)}
                                        </div>
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white online-dot"
                                                style={{ background: "var(--accent)" }} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="text-sm font-semibold truncate" style={{ color: isDeleted ? "var(--text-muted)" : "var(--text-primary)" }}>
                                                {displayName}
                                            </p>
                                            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>{formatTime(conv.lastMessageTime)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            {isTyping ? (
                                                <p className="text-xs truncate pr-2 flex items-center gap-1" style={{ color: "var(--accent-dark)" }}>
                                                    <span>typing</span>
                                                    <span className="flex items-end gap-px h-3">
                                                        <span className="w-1 h-1 rounded-full animate-bounce" style={{ background: "var(--accent-dark)", animationDelay: "0ms" }} />
                                                        <span className="w-1 h-1 rounded-full animate-bounce" style={{ background: "var(--accent-dark)", animationDelay: "150ms" }} />
                                                        <span className="w-1 h-1 rounded-full animate-bounce" style={{ background: "var(--accent-dark)", animationDelay: "300ms" }} />
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="text-xs truncate pr-2" style={{ color: conv.unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: conv.unreadCount > 0 ? 500 : 400 }}>
                                                    {conv.lastMessage || (isDeleted ? "Account deleted" : "No messages yet")}
                                                </p>
                                            )}
                                            {conv.unreadCount > 0 && (
                                                <span className="min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 px-1 unread-badge"
                                                    style={{ background: "var(--accent)" }}>
                                                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onCreate={(group) => { onGroupCreated(group); setShowCreateGroup(false); }}
                    currentUser={currentUser}
                    backendUrl={backendUrl}
                />
            )}
        </div>
    );
}

export default ChatSidebar;

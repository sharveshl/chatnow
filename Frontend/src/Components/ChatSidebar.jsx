import { useState, useRef } from "react";
import API from "../service/api";
import CreateGroupModal from "./CreateGroupModal";

function ChatSidebar({ conversations, activeChat, onSelectChat, onSelectGroup, currentUser, onNewChat, onOpenOwnProfile, backendUrl, onlineUsers, onGroupCreated }) {
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const searchTimerRef = useRef(null);

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : "?";

    const getPhotoUrl = (photoPath) => {
        if (!photoPath) return null;
        const base = backendUrl?.replace(/\/api\/?$/, "") || "";
        return `${base}${photoPath}`;
    };

    const currentUserPhoto = getPhotoUrl(currentUser?.profilePhoto);

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
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        if (diff < 86400000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const handleGroupCreated = (group) => {
        onGroupCreated(group);
        setShowCreateGroup(false);
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#111118] border-r border-[#1e1e2a] min-h-0">
            {/* Header */}
            <div className="p-4 border-b border-[#1e1e2a] flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onOpenOwnProfile}
                        className="flex items-center gap-3 hover:bg-[#1a1a25] rounded-xl px-2 py-1.5 -ml-2 transition-colors cursor-pointer"
                        title="View your profile"
                    >
                        <div className="w-9 h-9 bg-[#0066FF] rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                            {currentUserPhoto ? (
                                <img src={currentUserPhoto} alt={currentUser?.name} className="w-full h-full object-cover" />
                            ) : (
                                getInitial(currentUser?.name)
                            )}
                        </div>
                        <span className="text-sm font-semibold text-neutral-100">{currentUser?.name || "You"}</span>
                    </button>
                    <div className="flex items-center gap-1">
                        {/* New Group button */}
                        <button
                            onClick={() => setShowCreateGroup(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer"
                            title="New Group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                            </svg>
                        </button>
                        {/* Search button */}
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Search */}
                {showSearch && (
                    <div className="animate-fade-in">
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search users by username..."
                                className="w-full pl-9 pr-4 py-2.5 bg-[#1a1a25] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent"
                                autoFocus
                            />
                        </div>
                        {searchQuery.trim() && (
                            <div className="mt-2 max-h-48 overflow-y-auto">
                                {isSearching ? (
                                    <p className="text-xs text-neutral-500 text-center py-3">Searching...</p>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((user) => (
                                        <button
                                            key={user._id}
                                            onClick={() => handleSelectSearchResult(user)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a25] rounded-xl transition-colors cursor-pointer"
                                        >
                                            <div className="w-8 h-8 bg-[#0055CC] rounded-full flex items-center justify-center text-blue-200 text-xs font-semibold flex-shrink-0 overflow-hidden">
                                                {getPhotoUrl(user.profilePhoto) ? (
                                                    <img src={getPhotoUrl(user.profilePhoto)} alt={user.name} className="w-full h-full object-cover" />
                                                ) : getInitial(user.name)}
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-sm font-medium text-neutral-100 truncate">{user.name}</p>
                                                <p className="text-xs text-neutral-500 truncate">@{user.username}</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-xs text-neutral-500 text-center py-3">No users found</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Unified Conversations + Groups List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                        <div className="w-12 h-12 bg-[#1a1a25] rounded-full flex items-center justify-center mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                        </div>
                        <p className="text-sm text-neutral-400 font-medium">No conversations yet</p>
                        <p className="text-xs text-neutral-500 mt-1">Search for a user or create a group</p>
                    </div>
                ) : (
                    conversations.map((conv) => {
                        const isGroup = conv.type === 'group';

                        if (isGroup) {
                            // ─── GROUP entry ───────────────────────────────
                            const group = conv;
                            const isActive = activeChat?._id?.toString() === group._id?.toString() && activeChat?.type === 'group';
                            const groupPhoto = getPhotoUrl(group.photo);
                            const lastSenderName = group.lastMessageSender?.username === currentUser?.username
                                ? 'You' : group.lastMessageSender?.name;
                            const lastMsgPreview = group.lastMessage
                                ? (lastSenderName ? `${lastSenderName}: ${group.lastMessage}` : group.lastMessage)
                                : 'No messages yet';

                            return (
                                <button
                                    key={`group-${group._id}`}
                                    onClick={() => onSelectGroup(group)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer
                                        ${isActive ? 'bg-[#0084FF]/15' : 'hover:bg-[#1a1a25]'}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden
                                            ${isActive ? 'bg-[#005599] text-white' : 'bg-[#0044AA] text-blue-200'}`}>
                                            {groupPhoto
                                                ? <img src={groupPhoto} alt={group.name} className="w-full h-full object-cover" />
                                                : getInitial(group.name)}
                                        </div>
                                        {/* Group indicator dot */}
                                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#0084FF] border-2 border-[#111118] rounded-full flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-white">
                                                <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                                            </svg>
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-neutral-100 truncate">{group.name}</p>
                                            <span className="text-[10px] text-neutral-500 flex-shrink-0 ml-2">{formatTime(group.lastMessageTime)}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-xs text-neutral-500 truncate pr-2">{lastMsgPreview}</p>
                                            {group.unreadCount > 0 && (
                                                <span className="min-w-[18px] h-[18px] bg-[#0084FF] text-white text-[10px] font-medium rounded-full flex items-center justify-center flex-shrink-0 px-1">
                                                    {group.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        }

                        // ─── DM entry ─────────────────────────────────────
                        const isActive = activeChat?.username === conv.user?.username && activeChat?.type !== 'group';
                        const isDeleted = conv.user?.isDeleted;
                        const displayName = isDeleted ? 'Deleted User' : conv.user?.name;
                        const convPhoto = !isDeleted ? getPhotoUrl(conv.user?.profilePhoto) : null;

                        return (
                            <button
                                key={`dm-${conv.user?._id}`}
                                onClick={() => onSelectChat(conv.user)}
                                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer
                                    ${isActive ? 'bg-[#0084FF]/15' : 'hover:bg-[#1a1a25]'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden
                                        ${isDeleted ? 'bg-[#2a2a35] text-neutral-600' : isActive ? 'bg-[#0066FF] text-white' : 'bg-[#0055CC] text-blue-200'}`}>
                                        {isDeleted ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                                            </svg>
                                        ) : convPhoto ? (
                                            <img src={convPhoto} alt={displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitial(conv.user?.name)
                                        )}
                                    </div>
                                    {!isDeleted && onlineUsers?.has(conv.user?._id?.toString?.() || conv.user?._id) && (
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#111118] rounded-full"></span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium truncate ${isDeleted ? 'text-neutral-500 italic' : 'text-neutral-100'}`}>{displayName}</p>
                                        <span className="text-[10px] text-neutral-500 flex-shrink-0 ml-2">{formatTime(conv.lastMessageTime)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-xs text-neutral-500 truncate pr-2">{conv.lastMessage}</p>
                                        {conv.unreadCount > 0 && (
                                            <span className="min-w-[18px] h-[18px] bg-[#0084FF] text-white text-[10px] font-medium rounded-full flex items-center justify-center flex-shrink-0 px-1">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroup(false)}
                    onCreate={handleGroupCreated}
                    currentUser={currentUser}
                    backendUrl={backendUrl}
                />
            )}
        </div>
    );
}

export default ChatSidebar;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../service/api";
import ChatSidebar from "../Components/ChatSidebar";
import ChatWindow from "../Components/ChatWindow";
import ProfilePanel from "../Components/ProfilePanel";

function Dashboard() {
    const [currentUser, setCurrentUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState(null); // user whose profile is open
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const navigate = useNavigate();

    const backendUrl = import.meta.env.VITE_backendurl;

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await API.get("/users/me");
                setCurrentUser(res.data);
            } catch {
                // Token invalid — redirect to login
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

        // Poll conversations every 5 seconds
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    const handleSelectChat = (user) => {
        setActiveChat(user);
    };

    const handleNewChat = (user) => {
        // Check if conversation already exists
        const exists = conversations.find((c) => c.user.username === user.username);
        if (!exists) {
            // Add temporary conversation entry
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
                    />
                </div>

                {/* Right column — chat window */}
                <ChatWindow
                    activeChat={activeChat}
                    currentUser={currentUser}
                    onMessageSent={fetchConversations}
                    onOpenUserProfile={handleOpenUserProfile}
                    backendUrl={backendUrl}
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
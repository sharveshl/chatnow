import { useState, useRef, useEffect } from "react";
import API from "../service/api";

function ProfilePanel({ user, isOwnProfile, onClose, onProfileUpdated, backendUrl, onLogout, onDeleteChat }) {
    const [about, setAbout] = useState(user?.about || "");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileData, setProfileData] = useState(user);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user?.username) {
            API.get(`/users/profile/${user.username}`)
                .then(res => {
                    setProfileData(res.data);
                    setAbout(res.data.about || "");
                })
                .catch(() => { });
        }
    }, [user?.username]);

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : "?";

    const getPhotoUrl = (photoPath) => {
        if (!photoPath) return null;
        const base = backendUrl?.replace(/\/api\/?$/, "") || "";
        return `${base}${photoPath}`;
    };

    const handleSaveAbout = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await API.put("/users/profile", { about });
            setProfileData(res.data);
            setSaved(true);
            onProfileUpdated?.(res.data);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("photo", file);

            const res = await API.post("/users/profile/photo", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setProfileData(res.data);
            onProfileUpdated?.(res.data);
        } catch {
            // silently fail
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteChat = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }

        setDeleting(true);
        try {
            await API.delete(`/messages/conversation/${profileData?.username}`);
            try {
                localStorage.removeItem(`chatnow_msgs_${profileData?.username}`);
            } catch { }
            onDeleteChat?.(profileData?.username);
        } catch { } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirmDeleteAccount) {
            setConfirmDeleteAccount(true);
            return;
        }
        setDeletingAccount(true);
        try {
            await API.delete('/users/account');
            localStorage.removeItem('token');
            onLogout?.();
        } catch {
            // silently fail
        } finally {
            setDeletingAccount(false);
            setConfirmDeleteAccount(false);
        }
    };

    const photoUrl = getPhotoUrl(profileData?.profilePhoto);
    const joinDate = profileData?.createdAt
        ? new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "";

    return (
        <div className="profile-panel-overlay" onClick={onClose}>
            <div
                className="profile-panel animate-slide-in-right"
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#111118', borderLeft: '1px solid #1e1e2a' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2a]">
                    <h2 className="text-base font-semibold text-neutral-100">
                        {isOwnProfile ? "My Profile" : "Profile"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden bg-[#0066FF] text-white">
                                {photoUrl ? (
                                    <img src={photoUrl} alt={profileData?.name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitial(profileData?.name)
                                )}
                            </div>

                            {isOwnProfile && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute inset-0 w-24 h-24 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                        className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                                    </svg>
                                </button>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 w-24 h-24 rounded-full bg-black/60 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                        </div>

                        <h3 className="text-lg font-semibold text-neutral-100 mt-4">{profileData?.name}</h3>
                        <p className="text-sm text-neutral-500">@{profileData?.username}</p>
                    </div>

                    {/* Info Cards */}
                    <div className="space-y-4">
                        {/* Email */}
                        <div className="bg-[#1a1a25] rounded-xl px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-1">Email</p>
                            <p className="text-sm text-neutral-200">{profileData?.email}</p>
                        </div>

                        {/* About */}
                        <div className="bg-[#1a1a25] rounded-xl px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-1">About</p>
                            {isOwnProfile ? (
                                <div>
                                    <textarea
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Write something about yourself..."
                                        maxLength={200}
                                        rows={3}
                                        className="w-full text-sm text-neutral-100 bg-[#0a0a12] border border-[#2a2a35] rounded-lg px-3 py-2 resize-none
                                            focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent
                                            placeholder-neutral-600"
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-neutral-600">{about.length}/200</span>
                                        <button
                                            onClick={handleSaveAbout}
                                            disabled={saving}
                                            className="px-4 py-1.5 bg-[#0084FF] text-white text-xs font-medium rounded-lg
                                                hover:bg-[#0070DD] active:scale-95 disabled:opacity-50
                                                transition-all cursor-pointer"
                                        >
                                            {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-200">
                                    {profileData?.about || "No about info"}
                                </p>
                            )}
                        </div>

                        {/* Joined */}
                        {joinDate && (
                            <div className="bg-[#1a1a25] rounded-xl px-4 py-3">
                                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-1">Joined</p>
                                <p className="text-sm text-neutral-200">{joinDate}</p>
                            </div>
                        )}

                        {/* Delete Chat */}
                        {!isOwnProfile && onDeleteChat && (
                            <button
                                onClick={handleDeleteChat}
                                disabled={deleting}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl text-sm font-medium
                                    transition-all cursor-pointer border
                                    ${confirmDelete
                                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                    }
                                    active:scale-[0.98] disabled:opacity-50`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete Chat" : "Delete Entire Chat"}
                            </button>
                        )}

                        {/* Logout */}
                        {isOwnProfile && onLogout && (
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-4 bg-red-500/10 text-red-400 rounded-xl text-sm font-medium
                                    hover:bg-red-500/20 active:scale-[0.98] transition-all cursor-pointer border border-red-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                </svg>
                                Log Out
                            </button>
                        )}

                        {/* Delete Account */}
                        {isOwnProfile && (
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deletingAccount}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl text-sm font-medium
                                    transition-all cursor-pointer border active:scale-[0.98] disabled:opacity-50
                                    ${confirmDeleteAccount
                                        ? 'bg-red-700 text-white border-red-700 hover:bg-red-800'
                                        : 'bg-transparent text-red-600 border-red-600/30 hover:bg-red-600/10'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                                </svg>
                                {deletingAccount ? 'Deleting...' : confirmDeleteAccount ? '⚠ Confirm — this cannot be undone' : 'Delete Account'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePanel;

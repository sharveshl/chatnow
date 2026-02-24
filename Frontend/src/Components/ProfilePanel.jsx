import { useState, useRef, useEffect } from "react";
import API from "../service/api";

function ProfilePanel({ user, isOwnProfile, onClose, onProfileUpdated, backendUrl }) {
    const [about, setAbout] = useState(user?.about || "");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileData, setProfileData] = useState(user);
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch latest profile data
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
        // backendUrl is like http://localhost:5000/api — strip /api
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

    const photoUrl = getPhotoUrl(profileData?.profilePhoto);
    const joinDate = profileData?.createdAt
        ? new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "";

    return (
        <div className="profile-panel-overlay" onClick={onClose}>
            <div
                className="profile-panel animate-slide-in-right"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                    <h2 className="text-base font-semibold text-neutral-900">
                        {isOwnProfile ? "My Profile" : "Profile"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
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
                            <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden bg-neutral-900 text-white">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={profileData?.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    getInitial(profileData?.name)
                                )}
                            </div>

                            {/* Camera overlay — own profile only */}
                            {isOwnProfile && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute inset-0 w-24 h-24 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                        className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                                    </svg>
                                </button>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center">
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

                        {/* Name & Username */}
                        <h3 className="text-lg font-semibold text-neutral-900 mt-4">{profileData?.name}</h3>
                        <p className="text-sm text-neutral-400">@{profileData?.username}</p>
                    </div>

                    {/* Info Cards */}
                    <div className="space-y-4">
                        {/* Email */}
                        <div className="bg-neutral-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-1">Email</p>
                            <p className="text-sm text-neutral-900">{profileData?.email}</p>
                        </div>

                        {/* About */}
                        <div className="bg-neutral-50 rounded-xl px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-1">About</p>
                            {isOwnProfile ? (
                                <div>
                                    <textarea
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Write something about yourself..."
                                        maxLength={200}
                                        rows={3}
                                        className="w-full text-sm text-neutral-900 bg-white border border-neutral-200 rounded-lg px-3 py-2 resize-none
                                            focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent
                                            placeholder-neutral-300"
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-neutral-300">{about.length}/200</span>
                                        <button
                                            onClick={handleSaveAbout}
                                            disabled={saving}
                                            className="px-4 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg
                                                hover:bg-neutral-800 active:scale-95 disabled:opacity-50
                                                transition-all cursor-pointer"
                                        >
                                            {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-900">
                                    {profileData?.about || "No about info"}
                                </p>
                            )}
                        </div>

                        {/* Joined */}
                        {joinDate && (
                            <div className="bg-neutral-50 rounded-xl px-4 py-3">
                                <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium mb-1">Joined</p>
                                <p className="text-sm text-neutral-900">{joinDate}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePanel;

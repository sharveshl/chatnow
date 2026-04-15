import { useState, useEffect, useRef } from 'react';
import API from '../service/api';

function GroupInfoPanel({ group, currentUser, onClose, onGroupUpdated, onLeaveGroup, onDeleteGroup, backendUrl }) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(group?.name || '');
    const [editDesc, setEditDesc] = useState(group?.description || '');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addResults, setAddResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(null); // username to remove
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef(null);
    const fileInputRef = useRef(null);

    const isAdmin = group?.admin?._id?.toString() === currentUser?._id?.toString() ||
        group?.admin?.username === currentUser?.username;

    const getPhotoUrl = (p) => {
        if (!p) return null;
        const base = backendUrl?.replace(/\/api\/?$/, '') || '';
        return `${base}${p}`;
    };
    const getInitial = (name) => name?.charAt(0).toUpperCase() || '?';

    useEffect(() => {
        if (!addSearch.trim()) { setAddResults([]); return; }
        setIsSearching(true);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await API.get(`/users/search?q=${encodeURIComponent(addSearch.trim())}`);
                const memberUsernames = group.members.map(m => m.username);
                setAddResults(res.data.filter(u => !memberUsernames.includes(u.username)));
            } catch { setAddResults([]); }
            finally { setIsSearching(false); }
        }, 300);
    }, [addSearch]);

    const handleSaveInfo = async () => {
        setSaving(true);
        try {
            const res = await API.put(`/groups/${group._id}`, { name: editName, description: editDesc });
            onGroupUpdated(res.data);
            setEditing(false);
        } catch { } finally { setSaving(false); }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const res = await API.post(`/groups/${group._id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            onGroupUpdated(res.data);
        } catch { } finally { setUploading(false); }
    };

    const handleAddMember = async (user) => {
        try {
            const res = await API.post(`/groups/${group._id}/members`, { usernames: [user.username] });
            onGroupUpdated(res.data);
            setAddSearch('');
            setAddResults([]);
        } catch { }
    };

    const handleRemoveMember = async (username) => {
        if (confirmRemove !== username) { setConfirmRemove(username); return; }
        setLoading(true);
        try {
            const res = await API.delete(`/groups/${group._id}/members/${username}`);
            onGroupUpdated(res.data);
            setConfirmRemove(null);
        } catch { } finally { setLoading(false); }
    };

    const handleMakeAdmin = async (username) => {
        try {
            const res = await API.put(`/groups/${group._id}/admin/${username}`);
            onGroupUpdated(res.data);
        } catch { }
    };

    const handleLeave = async () => {
        if (!confirmLeave) { setConfirmLeave(true); return; }
        setLoading(true);
        try {
            await API.delete(`/groups/${group._id}/members/${currentUser.username}`);
            onLeaveGroup(group._id);
        } catch (err) {
            alert(err.response?.data?.message || 'Cannot leave group');
            setConfirmLeave(false);
        } finally { setLoading(false); }
    };

    const handleDeleteGroup = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setLoading(true);
        try {
            await API.delete(`/groups/${group._id}`);
            onDeleteGroup(group._id);
        } catch { } finally { setLoading(false); }
    };

    const groupPhoto = getPhotoUrl(group?.photo);
    const memberCount = group?.members?.length || 0;

    return (
        <div className="profile-panel-overlay" onClick={onClose}>
            <div
                className="profile-panel animate-slide-in-right"
                onClick={e => e.stopPropagation()}
                style={{ background: '#111118', borderLeft: '1px solid #1e1e2a' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2a]">
                    <h2 className="text-base font-semibold text-neutral-100">Group Info</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {/* Group Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-[#0055CC] flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                                {groupPhoto
                                    ? <img src={groupPhoto} alt={group.name} className="w-full h-full object-cover" />
                                    : getInitial(group?.name)}
                            </div>
                            {isAdmin && (
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                    className="absolute inset-0 w-24 h-24 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all cursor-pointer">
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
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePhotoUpload} className="hidden" />
                        </div>

                        {/* Name + description */}
                        {editing ? (
                            <div className="mt-4 w-full space-y-2">
                                <input value={editName} onChange={e => setEditName(e.target.value)}
                                    className="w-full text-center px-4 py-2 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#0084FF]" />
                                <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                    placeholder="Group description…"
                                    className="w-full text-center px-4 py-2 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#0084FF] placeholder-neutral-600" />
                                <div className="flex gap-2">
                                    <button onClick={() => setEditing(false)} className="flex-1 px-4 py-2 bg-[#1a1a25] text-neutral-400 rounded-xl text-xs font-medium hover:bg-[#222230] cursor-pointer">Cancel</button>
                                    <button onClick={handleSaveInfo} disabled={saving}
                                        className="flex-1 px-4 py-2 bg-[#0084FF] text-white rounded-xl text-xs font-medium hover:bg-[#0070DD] disabled:opacity-50 cursor-pointer">
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-center">
                                <h3 className="text-lg font-semibold text-neutral-100">{group?.name}</h3>
                                {group?.description && <p className="text-sm text-neutral-500 mt-1">{group.description}</p>}
                                <p className="text-xs text-neutral-600 mt-1">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                                {isAdmin && (
                                    <button onClick={() => setEditing(true)}
                                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 cursor-pointer">Edit group info</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Admin info */}
                    <div className="bg-[#1a1a25] rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-1">Admin</p>
                        <p className="text-sm text-neutral-200">{group?.admin?.name} <span className="text-neutral-500">@{group?.admin?.username}</span></p>
                    </div>

                    {/* Members list */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">{memberCount} Members</p>
                        <div className="space-y-1">
                            {group?.members?.map(member => {
                                const memberPhoto = getPhotoUrl(member.profilePhoto);
                                const isGroupAdmin = member._id?.toString() === group?.admin?._id?.toString() ||
                                    member.username === group?.admin?.username;
                                const isSelf = member.username === currentUser?.username;

                                return (
                                    <div key={member._id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#1a1a25] transition-colors">
                                        <div className="w-9 h-9 rounded-full bg-[#0055CC] flex items-center justify-center text-sm font-semibold text-blue-200 flex-shrink-0 overflow-hidden">
                                            {memberPhoto ? <img src={memberPhoto} alt={member.name} className="w-full h-full object-cover" /> : getInitial(member.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-neutral-100 truncate">
                                                {member.name} {isSelf && <span className="text-neutral-500 text-xs">(you)</span>}
                                            </p>
                                            <p className="text-xs text-neutral-500">@{member.username}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {isGroupAdmin && (
                                                <span className="text-[10px] font-medium bg-[#0084FF]/20 text-blue-400 px-2 py-0.5 rounded-full">Admin</span>
                                            )}
                                            {isAdmin && !isSelf && !isGroupAdmin && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleMakeAdmin(member.username)}
                                                        title="Make Admin"
                                                        className="text-[10px] text-neutral-500 hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-[#0084FF]/10 transition-colors cursor-pointer">
                                                        ★
                                                    </button>
                                                    <button onClick={() => handleRemoveMember(member.username)}
                                                        disabled={loading}
                                                        className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer
                                                            ${confirmRemove === member.username
                                                                ? 'bg-red-600 text-white text-[10px]'
                                                                : 'text-red-400 hover:bg-red-500/10'}`}>
                                                        {confirmRemove === member.username ? 'Confirm' : '✕'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Add member (admin only) */}
                    {isAdmin && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-2">Add Members</p>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                                <input type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                                    placeholder="Search to add…"
                                    className="w-full pl-9 pr-4 py-2.5 bg-[#1a1a25] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent" />
                            </div>
                            {addSearch.trim() && (
                                <div className="mt-2 max-h-36 overflow-y-auto bg-[#0a0a12] border border-[#2a2a35] rounded-xl divide-y divide-[#1e1e2a]">
                                    {isSearching ? <p className="text-xs text-neutral-500 text-center py-2">Searching…</p>
                                        : addResults.length === 0 ? <p className="text-xs text-neutral-500 text-center py-2">No users found</p>
                                            : addResults.map(user => (
                                                <button key={user._id} onClick={() => handleAddMember(user)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a25] transition-colors cursor-pointer text-left">
                                                    <div className="w-7 h-7 rounded-full bg-[#0055CC] flex items-center justify-center text-xs font-semibold text-blue-200 flex-shrink-0">
                                                        {getInitial(user.name)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-neutral-100">{user.name}</p>
                                                        <p className="text-xs text-neutral-500">@{user.username}</p>
                                                    </div>
                                                </button>
                                            ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2 pt-2">
                        {/* Leave Group */}
                        {!isAdmin && (
                            <button onClick={handleLeave} disabled={loading}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border active:scale-[0.98] disabled:opacity-50
                                    ${confirmLeave ? 'bg-red-600 text-white border-red-600' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                                {loading ? '…' : confirmLeave ? '⚠ Confirm Leave' : 'Leave Group'}
                            </button>
                        )}

                        {/* Delete Group (admin) */}
                        {isAdmin && (
                            <button onClick={handleDeleteGroup} disabled={loading}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border active:scale-[0.98] disabled:opacity-50
                                    ${confirmDelete ? 'bg-red-700 text-white border-red-700' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                                {loading ? '…' : confirmDelete ? '⚠ Confirm Delete Group' : 'Delete Group'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GroupInfoPanel;

import { useState, useRef, useEffect } from 'react';
import API from '../service/api';

function CreateGroupModal({ onClose, onCreate, currentUser, backendUrl }) {
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const searchTimerRef = useRef(null);

    const getPhotoUrl = (p) => {
        if (!p) return null;
        const base = backendUrl?.replace(/\/api\/?$/, '') || '';
        return `${base}${p}`;
    };

    const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?';

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        setIsSearching(true);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const res = await API.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
                // Exclude already-selected members
                const filtered = res.data.filter(u =>
                    !selectedMembers.find(m => m._id === u._id) &&
                    u.username !== currentUser?.username
                );
                setSearchResults(filtered);
            } catch { setSearchResults([]); }
            finally { setIsSearching(false); }
        }, 300);
    }, [searchQuery]);

    const toggleMember = (user) => {
        setSelectedMembers(prev => {
            const exists = prev.find(m => m._id === user._id);
            return exists ? prev.filter(m => m._id !== user._id) : [...prev, user];
        });
        setSearchResults(prev => prev.filter(u => u._id !== user._id));
        setSearchQuery('');
    };

    const removeMember = (userId) => {
        setSelectedMembers(prev => prev.filter(m => m._id !== userId));
    };

    const handleCreate = async () => {
        if (!groupName.trim()) { setError('Group name is required'); return; }
        if (selectedMembers.length < 1) { setError('Add at least 1 member'); return; }
        setCreating(true);
        setError('');
        try {
            const res = await API.post('/groups', {
                name: groupName.trim(),
                description: description.trim(),
                memberUsernames: selectedMembers.map(m => m.username)
            });
            onCreate(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#111118] border border-[#1e1e2a] rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2a]">
                    <h2 className="text-base font-semibold text-neutral-100">New Group</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1a1a25] transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
                    )}

                    {/* Group name */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Group Name *</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => { setGroupName(e.target.value); setError(''); }}
                            placeholder="e.g. Team Alpha"
                            className="w-full px-4 py-3 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Description (optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What's this group about?"
                            className="w-full px-4 py-3 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent"
                        />
                    </div>

                    {/* Add members */}
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Add Members *</label>

                        {/* Selected chips */}
                        {selectedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedMembers.map(m => (
                                    <span key={m._id} className="flex items-center gap-1.5 bg-[#0084FF]/20 text-blue-300 text-xs px-3 py-1.5 rounded-full">
                                        {m.name}
                                        <button onClick={() => removeMember(m._id)} className="hover:text-white transition-colors cursor-pointer">×</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search users..."
                                className="w-full pl-9 pr-4 py-3 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent"
                            />
                        </div>

                        {/* Search results dropdown */}
                        {searchQuery.trim() && (
                            <div className="mt-2 max-h-40 overflow-y-auto bg-[#0a0a12] border border-[#2a2a35] rounded-xl divide-y divide-[#1e1e2a]">
                                {isSearching ? (
                                    <p className="text-xs text-neutral-500 text-center py-3">Searching…</p>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-xs text-neutral-500 text-center py-3">No users found</p>
                                ) : (
                                    searchResults.map(user => {
                                        const photo = getPhotoUrl(user.profilePhoto);
                                        return (
                                            <button key={user._id} onClick={() => toggleMember(user)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a25] transition-colors cursor-pointer text-left">
                                                <div className="w-8 h-8 rounded-full bg-[#0055CC] flex items-center justify-center text-xs font-semibold text-blue-200 flex-shrink-0 overflow-hidden">
                                                    {photo ? <img src={photo} alt={user.name} className="w-full h-full object-cover" /> : getInitial(user.name)}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-neutral-100">{user.name}</p>
                                                    <p className="text-xs text-neutral-500">@{user.username}</p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Member count */}
                    <p className="text-xs text-neutral-600">
                        {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected (you will be added as admin)
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-[#1a1a25] text-neutral-400 rounded-xl text-sm font-medium hover:bg-[#222230] transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button onClick={handleCreate} disabled={creating || !groupName.trim() || selectedMembers.length === 0}
                        className="flex-1 px-4 py-2.5 bg-[#0084FF] text-white rounded-xl text-sm font-medium hover:bg-[#0070DD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
                        {creating ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
                        ) : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateGroupModal;

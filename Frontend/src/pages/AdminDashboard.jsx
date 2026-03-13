import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../service/api';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

    const checkAdminAndFetch = async () => {
        try {
            const checkRes = await API.get('/admin/check');
            if (!checkRes.data.isAdmin) {
                navigate('/dashboard');
                return;
            }
            const res = await API.get('/admin/flagged-users');
            setUsers(res.data);
        } catch (err) {
            if (err.response?.status === 403) {
                navigate('/dashboard');
            } else {
                setError(err.response?.data?.message || 'Failed to load data');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBan = async (userId) => {
        setActionLoading(userId);
        try {
            const res = await API.post(`/admin/ban-user/${userId}`);
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: true, ...res.data.user } : u));
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnban = async (userId) => {
        setActionLoading(userId);
        try {
            const res = await API.post(`/admin/unban-user/${userId}`);
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: false, riskScore: 0, ...res.data.user } : u));
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    const bannedUsers = users.filter(u => u.isBanned);
    const flaggedUsers = users.filter(u => !u.isBanned && u.riskScore > 0);

    return (
        <div className="min-h-screen bg-[#0a0a12] text-neutral-100">
            {/* Header */}
            <div className="bg-[#111118] border-b border-[#1e1e2a] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Admin Dashboard</h1>
                        <p className="text-xs text-neutral-500">Security & Moderation</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-[#1a1a25] hover:bg-[#22222f] text-neutral-300 text-sm rounded-lg transition-colors cursor-pointer"
                    >
                        ← Back to Chat
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-colors cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Banned Accounts</p>
                        <p className="text-3xl font-bold text-red-400">{bannedUsers.length}</p>
                    </div>
                    <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Flagged Accounts</p>
                        <p className="text-3xl font-bold text-orange-400">{flaggedUsers.length}</p>
                    </div>
                    <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Monitored</p>
                        <p className="text-3xl font-bold text-blue-400">{users.length}</p>
                    </div>
                </div>

                {/* Banned Users */}
                <div className="mb-8">
                    <h2 className="text-base font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Banned / Inappropriate Accounts
                    </h2>
                    {bannedUsers.length === 0 ? (
                        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-8 text-center">
                            <p className="text-sm text-neutral-500">No banned accounts</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bannedUsers.map(user => (
                                <UserCard
                                    key={user._id}
                                    user={user}
                                    onBan={handleBan}
                                    onUnban={handleUnban}
                                    actionLoading={actionLoading}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Flagged Users */}
                <div>
                    <h2 className="text-base font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Flagged Accounts (Risk Score &gt; 0)
                    </h2>
                    {flaggedUsers.length === 0 ? (
                        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-8 text-center">
                            <p className="text-sm text-neutral-500">No flagged accounts</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {flaggedUsers.map(user => (
                                <UserCard
                                    key={user._id}
                                    user={user}
                                    onBan={handleBan}
                                    onUnban={handleUnban}
                                    actionLoading={actionLoading}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function UserCard({ user, onBan, onUnban, actionLoading }) {
    const loc = user.lastKnownLocation;
    const hasLocation = loc?.lat != null && loc?.lng != null;
    const isLoading = actionLoading === user._id;

    return (
        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5 hover:border-[#2a2a3a] transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-neutral-100">{user.name}</h3>
                        {user.isBanned && (
                            <span className="px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] font-semibold uppercase rounded-full">
                                Banned
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-neutral-500 mb-2">@{user.username} • {user.email}</p>

                    <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="text-neutral-500">Risk Score:</span>
                            <span className={`font-semibold ${user.riskScore >= 80 ? 'text-red-400' :
                                    user.riskScore >= 40 ? 'text-orange-400' : 'text-yellow-400'
                                }`}>
                                {user.riskScore}
                            </span>
                        </div>

                        {hasLocation && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-neutral-500">📍 Location:</span>
                                <a
                                    href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline font-medium"
                                >
                                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                </a>
                                {loc.capturedAt && (
                                    <span className="text-neutral-600">
                                        ({new Date(loc.capturedAt).toLocaleDateString()})
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-1.5">
                            <span className="text-neutral-500">Joined:</span>
                            <span className="text-neutral-400">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    {user.isBanned ? (
                        <button
                            onClick={() => onUnban(user._id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? 'Processing...' : 'Unban'}
                        </button>
                    ) : (
                        <button
                            onClick={() => onBan(user._id)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? 'Processing...' : 'Ban User'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;

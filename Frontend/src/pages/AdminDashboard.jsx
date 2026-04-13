import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../service/api';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        checkAdminAndFetch(true);
    }, []);

    const checkAdminAndFetch = async (initial = false) => {
        if (!initial) setRefreshing(true);
        setError('');
        try {
            const checkRes = await API.get('/admin/check');
            if (!checkRes.data.isAdmin) {
                navigate('/dashboard');
                return;
            }
            const res = await API.get('/admin/all-users');
            // exclude the current admin from the list maybe, or show all
            setUsers(res.data);
        } catch (err) {
            if (err.response?.status === 403 || err.response?.status === 401) {
                navigate('/dashboard');
            } else if (err.response?.status === 404) {
                setError('Backend endpoint not found - Please wait for Render to finish deploying the new backend update.');
            } else {
                setError(err.response?.data?.message || 'Network error: Failed to connect to server');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    const handleLogout = async () => {
        try {
            await API.post('/auth/logout');
        } catch {
            // Proceed to login even if logout fails
        }
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
    const normalUsers = users.filter(u => !u.isBanned && u.riskScore === 0);

    return (
        <div className="h-screen overflow-y-auto bg-[#0a0a12] text-neutral-100">
            {/* Header */}
            <div className="bg-[#0a0a12]/80 backdrop-blur-md border-b border-[#1e1e2a] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl flex items-center justify-center border border-red-500/10 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-white drop-shadow-sm">Admin Dashboard</h1>
                        <p className="text-xs text-neutral-400 font-medium">Security & Moderation</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={() => checkAdminAndFetch(false)}
                        disabled={refreshing}
                        className="px-3 md:px-4 py-2 bg-[#1a1a25] hover:bg-[#252535] text-neutral-300 text-sm rounded-lg transition-all cursor-pointer flex items-center gap-2 border border-[#2a2a35] shadow-sm disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span className="hidden md:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-3 md:px-4 py-2 bg-[#1a1a25] hover:bg-[#252535] text-neutral-300 text-sm rounded-lg transition-all cursor-pointer border border-[#2a2a35] shadow-sm hidden sm:block"
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-3 md:px-4 py-2 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 shadow-sm text-red-500 text-sm rounded-lg transition-all cursor-pointer border border-red-500/20"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-[#111118] to-[#151520] border border-[#1e1e2a] rounded-2xl p-6 shadow-md hover:shadow-red-500/10 hover:border-red-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Banned Accounts</p>
                            <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            </div>
                        </div>
                        <p className="text-4xl font-extrabold text-white">{bannedUsers.length}</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#111118] to-[#151520] border border-[#1e1e2a] rounded-2xl p-6 shadow-md hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Flagged Accounts</p>
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                        </div>
                        <p className="text-4xl font-extrabold text-white">{flaggedUsers.length}</p>
                    </div>

                    <div className="bg-gradient-to-br from-[#111118] to-[#151520] border border-[#1e1e2a] rounded-2xl p-6 shadow-md hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Total Monitored</p>
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                            </div>
                        </div>
                        <p className="text-4xl font-extrabold text-white">{users.length}</p>
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

                {/* Normal Users */}
                <div className="mt-8">
                    <h2 className="text-base font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Normal Accounts
                    </h2>
                    {normalUsers.length === 0 ? (
                        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-8 text-center">
                            <p className="text-sm text-neutral-500">No normal accounts found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {normalUsers.map(user => (
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
    const [isExpanded, setIsExpanded] = useState(false);
    const loc = user.lastKnownLocation;
    const hasLocation = loc?.lat != null && loc?.lng != null;
    const isLoading = actionLoading === user._id;

    return (
        <div className="bg-[#111118] border border-[#1e1e2a] rounded-xl p-5 hover:border-[#2a2a3a] transition-colors">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div 
                        className="flex items-center gap-2 mb-1 cursor-pointer w-fit group" 
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-blue-400 transition-colors">{user.name}</h3>
                        {user.isBanned && (
                            <span className="px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] font-semibold uppercase rounded-full">
                                Banned
                            </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                    <p className="text-xs text-neutral-500 mb-2">@{user.username}</p>

                    {isExpanded && (
                        <div className="mt-4 flex flex-col gap-3 text-xs bg-[#0a0a12] p-4 rounded-lg border border-[#1e1e2a]">
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-500 w-20">Email:</span>
                                <span className="text-neutral-300">{user.email}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-neutral-500 w-20">Risk Score:</span>
                                <span className={`font-semibold ${user.riskScore >= 80 ? 'text-red-400' :
                                        user.riskScore >= 40 ? 'text-orange-400' : 'text-yellow-400'
                                    }`}>
                                    {user.riskScore}
                                </span>
                            </div>

                            {hasLocation && (
                                <div className="flex items-center gap-2">
                                    <span className="text-neutral-500 w-20">Last Location:</span>
                                    <div className="flex items-center gap-1.5">
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
                                                (Captured: {new Date(loc.capturedAt).toLocaleString()})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="text-neutral-500 w-20">Joined:</span>
                                <span className="text-neutral-400">{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 flex-shrink-0 mt-2 md:mt-0">
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

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../service/api';

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || '';

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortField, setSortField] = useState('joined');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await API.get('/users/me');
                if (!res.data.isAdmin) {
                    navigate('/dashboard');
                    return;
                }
                fetchData();
            } catch {
                navigate('/login');
            }
        };
        checkAdmin();
    }, [navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, usersRes] = await Promise.all([
                API.get('/admin/stats'),
                API.get('/admin/users')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (userId) => {
        if (!confirm('Are you sure you want to ban this user?')) return;
        setActionLoading(userId);
        try {
            await API.post(`/admin/users/${userId}/ban`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to ban user');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnbanUser = async (userId) => {
        setActionLoading(userId);
        try {
            await API.post(`/admin/users/${userId}/unban`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to unban user');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter((user) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = user.name?.toLowerCase().includes(query) || 
                              user.username?.toLowerCase().includes(query) ||
                              user.email?.toLowerCase().includes(query);
        
        let matchesStatus = true;
        if (statusFilter === 'Active') matchesStatus = !user.isBanned && !user.isAdmin;
        if (statusFilter === 'Banned') matchesStatus = user.isBanned;
        if (statusFilter === 'Admin') matchesStatus = user.isAdmin;

        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        let valA, valB;
        if (sortField === 'joined') {
            valA = new Date(a.createdAt).getTime();
            valB = new Date(b.createdAt).getTime();
        } else if (sortField === 'lastLogin') {
            valA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
            valB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        } else if (sortField === 'integrity') {
            valA = 100 - (a.riskScore || 0);
            valB = 100 - (b.riskScore || 0);
        }
        return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a12] text-neutral-100">
            {/* Header */}
            <div className="bg-[#111118] border-b border-[#1e1e2a] px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-neutral-500 hover:text-neutral-300 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold">Admin Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchData} className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Refresh
                        </button>
                        <button onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 bg-[#1a1a25] hover:bg-[#222230] rounded-xl text-sm font-medium transition-colors">
                            Back to Chat
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <StatCard
                        title="Total Users"
                        value={stats?.totalUsers || 0}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                            </svg>
                        }
                        color="blue"
                    />
                    <StatCard
                        title="Total Messages"
                        value={stats?.totalMessages || 0}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                        }
                        color="green"
                    />
                    <StatCard
                        title="Total Groups"
                        value={stats?.totalGroups || 0}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                            </svg>
                        }
                        color="purple"
                    />
                </div>

                {/* Users Table */}
                <div className="bg-[#111118] border border-[#1e1e2a] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between border-b border-[#1e1e2a] gap-4">
                        <h2 className="text-lg font-semibold whitespace-nowrap">User Management</h2>
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <input 
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-[#1a1a25] border border-[#2a2a35] text-neutral-200 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500/50 w-full md:w-64"
                            />
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-[#1a1a25] border border-[#2a2a35] text-neutral-200 text-sm rounded-xl px-4 py-2 focus:outline-none cursor-pointer w-full md:w-auto"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Banned">Banned</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <select 
                                    value={sortField}
                                    onChange={(e) => setSortField(e.target.value)}
                                    className="bg-[#1a1a25] border border-[#2a2a35] text-neutral-200 text-sm rounded-xl px-4 py-2 focus:outline-none cursor-pointer w-full md:w-auto"
                                >
                                    <option value="joined">Date Joined</option>
                                    <option value="lastLogin">Last Login</option>
                                    <option value="integrity">Integrity Score</option>
                                </select>
                                <button 
                                    onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                                    className="bg-[#1a1a25] border border-[#2a2a35] hover:bg-[#222230] text-neutral-200 p-2.5 rounded-xl transition-colors shrink-0"
                                    title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" 
                                            d={sortOrder === 'desc' ? "M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" : "M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25"} 
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0a0a12]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Integrity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e1e2a]">
                                {filteredUsers.map((user) => {
                                    const integrity = 100 - (user.riskScore || 0);
                                    let locationText = "Unknown";
                                    if (user.lastKnownLocation?.lat && user.lastKnownLocation?.lng) {
                                        locationText = `${user.lastKnownLocation.lat.toFixed(4)}, ${user.lastKnownLocation.lng.toFixed(4)}`;
                                    }

                                    return (
                                    <tr key={user._id} onClick={() => setSelectedUser(user)} className="hover:bg-[#1a1a25] transition-colors cursor-pointer">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-neutral-100">{user.name}</div>
                                                    <div className="text-xs text-neutral-500">@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isBanned ? (
                                                <span className="px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                                                    Banned
                                                </span>
                                            ) : user.isAdmin ? (
                                                <span className="px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${integrity >= 80 ? 'bg-green-500' : integrity >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                        style={{ width: `${Math.max(0, Math.min(100, integrity))}%` }} 
                                                    />
                                                </div>
                                                <span className={`text-xs font-medium ${integrity >= 80 ? 'text-green-400' : integrity >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {integrity}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">
                                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {user.lastKnownLocation?.lat && user.lastKnownLocation?.lng ? (
                                                <a
                                                    href={`https://www.google.com/maps?q=${user.lastKnownLocation.lat},${user.lastKnownLocation.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors group"
                                                    title="Open in Google Maps"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform">
                                                        <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-2.013 3.5-4.697 3.5-8.327a8 8 0 1 0-16 0c0 3.63 1.556 6.314 3.5 8.327a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.144.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="underline underline-offset-2 decoration-blue-400/40">
                                                        {locationText}
                                                    </span>
                                                </a>
                                            ) : (
                                                <span className="text-neutral-600">{locationText}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {!user.isAdmin && (
                                                user.isBanned ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUnbanUser(user._id); }}
                                                        disabled={actionLoading === user._id}
                                                        className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                                                    >
                                                        {actionLoading === user._id ? '...' : 'Unban'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleBanUser(user._id); }}
                                                        disabled={actionLoading === user._id}
                                                        className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                                                    >
                                                        {actionLoading === user._id ? '...' : 'Ban'}
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    backendUrl={BACKEND_URL}
                    actionLoading={actionLoading}
                    onClose={() => setSelectedUser(null)}
                    onBan={async (id) => { await handleBanUser(id); setSelectedUser(u => ({ ...u, isBanned: true })); }}
                    onUnban={async (id) => { await handleUnbanUser(id); setSelectedUser(u => ({ ...u, isBanned: false, riskScore: 0 })); }}
                />
            )}
        </div>
    );
}

function UserDetailModal({ user, backendUrl, actionLoading, onClose, onBan, onUnban }) {
    const integrity = 100 - (user.riskScore || 0);
    const photoUrl = user.profilePhoto ? `${backendUrl}${user.profilePhoto}` : null;
    const hasLocation = user.lastKnownLocation?.lat && user.lastKnownLocation?.lng;
    const mapsUrl = hasLocation
        ? `https://www.google.com/maps?q=${user.lastKnownLocation.lat},${user.lastKnownLocation.lng}`
        : null;

    const fmt = (d) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

    const Row = ({ label, children }) => (
        <div className="flex items-start gap-3 py-2.5 border-b border-[#1e1e2a] last:border-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 w-28 shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-neutral-200 flex-1 break-all">{children}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}>
            <div className="w-full max-w-md bg-[#111118] border border-[#2a2a38] rounded-2xl shadow-2xl overflow-hidden"
                style={{ animation: 'popIn .2s ease' }}
                onClick={e => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2a]">
                    <h2 className="text-base font-semibold text-neutral-100">User Details</h2>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#1e1e2a] hover:bg-[#2a2a38] flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-[#1e1e2a]" style={{ background: '#0d0d14' }}>
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-2xl font-bold"
                        style={{ background: user.isBanned ? '#7f1d1d' : user.isAdmin ? '#3b1d8a' : '#0066FF' }}>
                        {photoUrl
                            ? <img src={photoUrl} alt={user.name} className="w-full h-full object-cover" />
                            : user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg font-bold text-neutral-100 truncate">{user.name}</p>
                        <p className="text-sm text-neutral-500">@{user.username}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {user.isAdmin && <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/15 text-purple-400 rounded-full border border-purple-500/20">Admin</span>}
                            {user.isBanned && <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-400 rounded-full border border-red-500/20">Banned</span>}
                            {user.isDeleted && <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-500/15 text-neutral-400 rounded-full border border-neutral-500/20">Deleted</span>}
                            {!user.isBanned && !user.isAdmin && !user.isDeleted && <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-500/15 text-green-400 rounded-full border border-green-500/20">Active</span>}
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="px-6 py-3 max-h-72 overflow-y-auto scrollbar-thin">
                    <Row label="Email">{user.email}</Row>
                    <Row label="About">{user.about || <span className="text-neutral-600 italic">No bio set</span>}</Row>
                    <Row label="Risk Score">
                        <span className={`font-semibold ${user.riskScore >= 80 ? 'text-red-400' : user.riskScore >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {user.riskScore || 0}
                        </span>
                        <span className="text-neutral-500 ml-1">/ 100 &nbsp;·&nbsp; Integrity: </span>
                        <span className={`font-semibold ${integrity >= 80 ? 'text-green-400' : integrity >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{integrity}%</span>
                    </Row>
                    <Row label="Last Login">{fmt(user.lastLogin)}</Row>
                    <Row label="Joined">{fmt(user.createdAt)}</Row>
                    <Row label="Location">
                        {hasLocation ? (
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
                                {user.lastKnownLocation.lat.toFixed(4)}, {user.lastKnownLocation.lng.toFixed(4)}
                            </a>
                        ) : <span className="text-neutral-600 italic">Unknown</span>}
                    </Row>
                    <Row label="Account">
                        <span className={user.isDeleted ? 'text-neutral-400' : 'text-green-400'}>{user.isDeleted ? 'Deleted' : 'Exists'}</span>
                        <span className="text-neutral-600 mx-2">·</span>
                        <span className={user.isBanned ? 'text-red-400' : 'text-green-400'}>{user.isBanned ? 'Banned' : 'Not Banned'}</span>
                    </Row>
                </div>

                {/* Actions */}
                {!user.isAdmin && (
                    <div className="px-6 py-4 border-t border-[#1e1e2a] flex justify-end gap-3">
                        {user.isBanned ? (
                            <button onClick={() => onUnban(user._id)}
                                disabled={actionLoading === user._id}
                                className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
                                {actionLoading === user._id ? 'Processing…' : '✓ Unban User'}
                            </button>
                        ) : (
                            <button onClick={() => onBan(user._id)}
                                disabled={actionLoading === user._id}
                                className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
                                {actionLoading === user._id ? 'Processing…' : '⊘ Ban User'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };

    return (
        <div className="bg-[#111118] border border-[#1e1e2a] rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-3xl font-bold text-neutral-100">{value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
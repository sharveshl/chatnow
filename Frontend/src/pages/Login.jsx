import { useState, useEffect } from "react";
import API from "../service/api";
import { useNavigate, Link } from "react-router-dom";
import Profile from "../Components/Profile";

const PROFILES_KEY = "chatnow_profiles";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [savedProfiles, setSavedProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await API.get("/users/me");
                if (res.data) {
                    if (res.data.isAdmin) navigate("/admin");
                    else navigate("/dashboard");
                }
            } catch { /* not logged in */ }
        };
        checkAuth();
    }, [navigate]);

    useEffect(() => {
        try {
            const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
            setSavedProfiles(profiles);
        } catch { setSavedProfiles([]); }
    }, []);

    const handleProfileClick = (profile) => {
        if (selectedProfile?.email === profile.email) {
            setSelectedProfile(null);
            setEmail("");
        } else {
            setSelectedProfile(profile);
            setEmail(profile.email);
        }
        setPassword("");
        setError("");
    };

    const handleRemoveProfile = (e, profileEmail) => {
        e.stopPropagation();
        const updated = savedProfiles.filter((p) => p.email !== profileEmail);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
        setSavedProfiles(updated);
        if (selectedProfile?.email === profileEmail) {
            setSelectedProfile(null);
            setEmail("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!email.trim() || !password.trim()) {
            setError("Please fill in all fields");
            return;
        }
        setLoading(true);
        try {
            const res = await API.post("/auth/login", { email, password });
            const { user } = res.data;
            const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
            const existingIndex = profiles.findIndex((p) => p.email === user.email);
            const profileData = { name: user.name, email: user.email, username: user.username };
            if (existingIndex >= 0) profiles[existingIndex] = profileData;
            else profiles.unshift(profileData);
            localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
            if (user.isAdmin) navigate("/admin");
            else navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-slide-up">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 mb-4">
                        <img src="/chatnow new logo svg.svg" alt="ChatNow" className="w-7 h-7 object-contain" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
                    <p className="text-neutral-500 text-sm mt-1">Sign in to continue to ChatNow</p>
                </div>

                {/* Saved Profiles */}
                {savedProfiles.length > 0 && (
                    <div className="mb-5 animate-fade-in">
                        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">
                            Saved profiles
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                            {savedProfiles.map((profile) => (
                                <div key={profile.email} className="relative group flex-shrink-0">
                                    <Profile
                                        name={profile.name}
                                        email={profile.email}
                                        onClick={() => handleProfileClick(profile)}
                                        isSelected={selectedProfile?.email === profile.email}
                                    />
                                    <button
                                        onClick={(e) => handleRemoveProfile(e, profile.email)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#2a2a35] hover:bg-red-500 text-neutral-400 hover:text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                        title="Remove"
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form card */}
                <div className="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-7 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl animate-fade-in">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                    if (selectedProfile && e.target.value !== selectedProfile.email) setSelectedProfile(null);
                                }}
                                placeholder="you@example.com"
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    className="input-field pr-14"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs font-medium cursor-pointer px-1 py-0.5 rounded transition-colors"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : "Sign In"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-neutral-500 mt-5">
                    Don&apos;t have an account?{" "}
                    <Link to="/signup" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;

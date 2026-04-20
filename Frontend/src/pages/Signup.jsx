import { useState, useEffect, useRef } from "react";
import API from "../service/api.js";
import { useNavigate, Link } from "react-router-dom";

const PROFILES_KEY = "chatnow_profiles";

function Signup() {
    const [formData, setFormData] = useState({ username: "", name: "", email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState(null);
    const usernameTimerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const username = formData.username.trim();
        if (!username) { setUsernameStatus(null); return; }
        if (username.length < 3) { setUsernameStatus('short'); return; }
        setUsernameStatus('checking');
        if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
        usernameTimerRef.current = setTimeout(async () => {
            try {
                const res = await API.get(`/users/check-username/${encodeURIComponent(username)}`);
                setUsernameStatus(res.data.available ? 'available' : 'taken');
            } catch { setUsernameStatus(null); }
        }, 500);
        return () => { if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current); };
    }, [formData.username]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await API.get("/users/me");
                if (res.data) navigate("/dashboard");
            } catch { /* not logged in */ }
        };
        checkAuth();
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!formData.username.trim() || !formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
            setError("Please fill in all fields");
            return;
        }
        if (formData.username.length < 3) { setError("Username must be at least 3 characters"); return; }
        if (usernameStatus === 'taken') { setError("That username is already taken."); return; }
        if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }

        setLoading(true);

        const getPosition = () => {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("Geolocation is not supported by your browser."));
                } else {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                }
            });
        };

        try {
            const position = await getPosition();
            const { latitude: lat, longitude: lng } = position.coords;

            const submitData = { ...formData, lat, lng };
            const res = await API.post("/auth/register", submitData);
            const { user } = res.data;
            const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
            profiles.unshift({ name: user.name, email: user.email, username: user.username });
            localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
            navigate("/dashboard");
        } catch (err) {
            if (err.code === 1) { // Geolocation position error code for Permission Denied
                setError("Location access was denied. Location access is required to use this application.");
            } else {
                setError(err.response?.data?.message || err.message || "Signup failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const renderUsernameHint = () => {
        if (!formData.username.trim()) return null;
        if (usernameStatus === 'short') return <p className="text-xs text-neutral-500 mt-1.5">At least 3 characters required</p>;
        if (usernameStatus === 'checking') return (
            <p className="text-xs text-neutral-500 mt-1.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-neutral-500 border-t-transparent rounded-full animate-spin inline-block" />
                Checking availability…
            </p>
        );
        if (usernameStatus === 'available') return (
            <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                Username is available
            </p>
        );
        if (usernameStatus === 'taken') return (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                Username is already taken
            </p>
        );
        return null;
    };

    return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-slide-up">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20 mb-4">
                        <img src="/chatnow new logo svg.svg" alt="ChatNow" className="w-7 h-7 object-contain" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
                    <p className="text-neutral-500 text-sm mt-1">Join ChatNow and start chatting</p>
                </div>

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
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="johndoe"
                                className={`input-field ${usernameStatus === 'available' ? '!border-green-500/50 focus:!shadow-[0_0_0_3px_rgba(34,197,94,0.15)]' : usernameStatus === 'taken' ? '!border-red-500/50 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : ''}`}
                            />
                            {renderUsernameHint()}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Full Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className="input-field" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="input-field" />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Min 6 characters"
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
                            disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </>
                            ) : "Create Account"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-neutral-500 mt-5">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;

import { useState, useEffect, useRef } from "react";
import API from "../service/api.js";
import { useNavigate, Link } from "react-router-dom";

const PROFILES_KEY = "chatnow_profiles";

function Signup() {
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Username availability state
    const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'short'
    const usernameTimerRef = useRef(null);

    const navigate = useNavigate();

    // Check username availability with debounce
    useEffect(() => {
        const username = formData.username.trim();

        if (!username) {
            setUsernameStatus(null);
            return;
        }
        if (username.length < 3) {
            setUsernameStatus('short');
            return;
        }

        setUsernameStatus('checking');

        if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
        usernameTimerRef.current = setTimeout(async () => {
            try {
                const res = await API.get(`/users/check-username/${encodeURIComponent(username)}`);
                setUsernameStatus(res.data.available ? 'available' : 'taken');
            } catch {
                setUsernameStatus(null);
            }
        }, 500);

        return () => {
            if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
        };
    }, [formData.username]);

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

        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters");
            return;
        }

        if (usernameStatus === 'taken') {
            setError("That username is already taken. Please choose another.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const res = await API.post("/auth/register", formData);
            const { token, user } = res.data;

            localStorage.setItem("token", token);

            const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
            profiles.unshift({
                name: user.name,
                email: user.email,
                username: user.username,
            });
            localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Signup failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Username status indicator
    const renderUsernameHint = () => {
        if (!formData.username.trim()) return null;
        if (usernameStatus === 'short') {
            return <p className="text-xs text-neutral-500 mt-1.5">At least 3 characters required</p>;
        }
        if (usernameStatus === 'checking') {
            return (
                <p className="text-xs text-neutral-500 mt-1.5 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-neutral-500 border-t-transparent rounded-full animate-spin inline-block" />
                    Checking availability…
                </p>
            );
        }
        if (usernameStatus === 'available') {
            return <p className="text-xs text-green-400 mt-1.5">✓ Username is available</p>;
        }
        if (usernameStatus === 'taken') {
            return <p className="text-xs text-red-400 mt-1.5">✗ Username is already taken</p>;
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4">
            <div className="w-full max-w-md animate-slide-up">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">
                        Create your account
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Join ChatNow and start chatting
                    </p>
                </div>

                {/* Signup Form */}
                <div className="bg-[#111118] rounded-2xl border border-[#1e1e2a] p-8 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl animate-fade-in">
                                {error}
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="johndoe"
                                className={`w-full px-4 py-3 bg-[#0a0a12] border rounded-xl text-sm
                                    text-neutral-100 placeholder-neutral-600
                                    focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent
                                    transition-all
                                    ${usernameStatus === 'available' ? 'border-green-500/50' :
                                        usernameStatus === 'taken' ? 'border-red-500/50' :
                                            'border-[#2a2a35]'}`}
                            />
                            {renderUsernameHint()}
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full px-4 py-3 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm
                                    text-neutral-100 placeholder-neutral-600
                                    focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent
                                    transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm
                                       text-neutral-100 placeholder-neutral-600
                                    focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent
                                    transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Min 6 characters"
                                    className="w-full px-4 py-3 bg-[#0a0a12] border border-[#2a2a35] rounded-xl text-sm
                                        text-neutral-100 placeholder-neutral-600
                                        focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent
                                        transition-all pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs font-medium cursor-pointer"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
                            className="w-full bg-[#0084FF] text-white py-3 rounded-xl text-sm font-medium
                                hover:bg-[#0070DD] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-neutral-500 mt-6">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="text-[#0084FF] font-medium hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;
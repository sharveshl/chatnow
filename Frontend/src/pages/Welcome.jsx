import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../service/api";
import Profile from "../Components/Profile";

const PROFILES_KEY = "chatnow_profiles";

function Welcome() {
    const [savedProfiles, setSavedProfiles] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await API.get("/users/me");
                if (res.data) navigate("/dashboard");
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

    return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background glow orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                {/* Brand */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 mb-5">
                        <img src="/chatnow new logo svg.svg" alt="ChatNow" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">ChatNow</h1>
                    <p className="text-neutral-500 text-sm leading-relaxed">
                        Real-time messaging, reimagined.
                    </p>
                </div>

                {/* Saved profiles */}
                {savedProfiles.length > 0 && (
                    <div className="mb-6 animate-fade-in">
                        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3 text-center">
                            Continue as
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            {savedProfiles.map((profile) => (
                                <Profile
                                    key={profile.email}
                                    name={profile.name}
                                    email={profile.email}
                                    onClick={() => navigate("/login")}
                                    isSelected={false}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA card */}
                <div className="bg-[#111118] border border-[#1e1e2a] rounded-2xl p-6 shadow-xl">
                    <p className="text-sm text-neutral-400 text-center mb-5">
                        {savedProfiles.length > 0
                            ? "Or sign in with a different account"
                            : "Get started — it only takes a moment"}
                    </p>
                    <div className="flex gap-3">
                        <Link
                            to="/login"
                            className="flex-1 py-3 bg-[#0084FF] hover:bg-[#0070DD] text-white text-sm font-semibold rounded-xl text-center transition-all active:scale-[0.98] shadow-md shadow-blue-500/20"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/signup"
                            className="flex-1 py-3 bg-[#1a1a25] hover:bg-[#252535] border border-[#2a2a35] text-neutral-200 text-sm font-semibold rounded-xl text-center transition-all active:scale-[0.98]"
                        >
                            Create Account
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-neutral-600 mt-6">
                    Secure · End-to-end encrypted · Real-time
                </p>
            </div>
        </div>
    );
}

export default Welcome;

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Profile from "../Components/Profile";

const PROFILES_KEY = "chatnow_profiles";

function Welcome() {
    const [savedProfiles, setSavedProfiles] = useState([]);
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) navigate("/dashboard");
    }, [navigate]);

    // Load saved profiles
    useEffect(() => {
        try {
            const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
            setSavedProfiles(profiles);
        } catch {
            setSavedProfiles([]);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
            <div className="w-full max-w-lg text-center animate-slide-up">
                {/* Logo / Brand */}
                <div className="mb-8">
                    <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-xl font-bold">C</span>
                    </div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
                        ChatNow
                    </h1>
                    <p className="text-neutral-400 text-sm mt-2">
                        Your one-stop solution for seamless communication.
                    </p>
                </div>

                {/* Saved Profiles */}
                {savedProfiles.length > 0 && (
                    <div className="mb-8 animate-fade-in">
                        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
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

                {/* Actions */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                    <p className="text-sm text-neutral-500 mb-4">
                        {savedProfiles.length > 0
                            ? "Or get started with a different account"
                            : "Get started by signing in or creating an account"
                        }
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            to="/login"
                            className="px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium
                                hover:bg-neutral-800 active:scale-[0.98] transition-all"
                        >
                            Log In
                        </Link>
                        <Link
                            to="/signup"
                            className="px-6 py-2.5 border-2 border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium
                                hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.98] transition-all"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Welcome;
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

  const handleProfileClick = (profile) => {
    if (selectedProfile?.email === profile.email) {
      // Deselect
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
      const { token, user } = res.data;

      // Save token
      localStorage.setItem("token", token);

      // Save/update profile in localStorage
      const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
      const existingIndex = profiles.findIndex((p) => p.email === user.email);
      const profileData = {
        name: user.name,
        email: user.email,
        username: user.username,
      };

      if (existingIndex >= 0) {
        profiles[existingIndex] = profileData;
      } else {
        profiles.unshift(profileData);
      }

      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Sign in to continue to ChatNow
          </p>
        </div>

        {/* Saved Profiles */}
        {savedProfiles.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Saved Profiles
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {savedProfiles.map((profile) => (
                <div key={profile.email} className="relative group flex-shrink-0">
                  <Profile
                    name={profile.name}
                    email={profile.email}
                    onClick={() => handleProfileClick(profile)}
                    isSelected={selectedProfile?.email === profile.email}
                  />
                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemoveProfile(e, profile.email)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-200 hover:bg-red-500 hover:text-white
                                            text-neutral-500 rounded-full text-xs flex items-center justify-center
                                            opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Remove profile"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  if (selectedProfile && e.target.value !== selectedProfile.email) {
                    setSelectedProfile(null);
                  }
                }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm
                                    text-neutral-900 placeholder-neutral-300
                                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                                    transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm
                                        text-neutral-900 placeholder-neutral-300
                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs font-medium cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl text-sm font-medium
                                hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-emerald-600 font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

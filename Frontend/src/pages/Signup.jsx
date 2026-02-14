import { useState } from 'react';
import API from '../service/api.js';
import { useNavigate } from 'react-router-dom';

function Signup() {
    const [formData, SetFormData] = useState({
        username: "",
        name: "",
        email: "",
        password: ""
    });


    const navigate = useNavigate();

    const handleChange = (e) => {
        SetFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlesubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/auth/register", formData);
            alert("Signup successful!");
            navigate("/login");
        } catch (error) {
            console.log(error);
            alert(error.response?.data?.message || "Signup failed");
        }
    };


    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <form onSubmit={handlesubmit} className="bg-white p-6 rounded shadow-lg w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>

                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    onChange={handleChange}
                    className="w-full mb-4 p-3 border rounded-lg"
                />
                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    onChange={handleChange}
                    className="w-full mb-4 p-3 border rounded-lg"
                />
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                    className="w-full mb-4 p-3 border rounded-lg"
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={handleChange}
                    className="w-full mb-4 p-3 border rounded-lg"
                />

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
                >
                    Create Account
                </button>
            </form>

        </div>
    );
}

export default Signup;
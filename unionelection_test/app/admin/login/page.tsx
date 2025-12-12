"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
    const { loginAdmin } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock Validation
        if (email && password) {
            loginAdmin();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
                    <p className="text-gray-500 text-sm">Union Election Management</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@college.edu"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        Sign In
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Authorized personnel only. All actions are logged.
                </p>
            </div>
        </div>
    );
}

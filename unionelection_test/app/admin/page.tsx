"use client";

import { useEffect, useState } from "react";
import { Users, Flag, FileText, TrendingUp, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        students: 0,
        posts: 0,
        nominations_pending: 0,
        nominations_total: 0
    });

    const [electionSettings, setElectionSettings] = useState({
        startDate: "",
        endDate: "",
        isOpen: false // Manual override or derived
    });

    useEffect(() => {
        // Safe parser helper
        const safeParse = (key: string, defaultVal: any) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultVal;
            } catch {
                return defaultVal;
            }
        };

        const students = safeParse("nominalRoll_students", []);
        const posts = safeParse("election_posts", []);
        const nominations = safeParse("student_nominations", []);
        const settings = safeParse("election_settings", { startDate: "", endDate: "", isOpen: false });

        setStats({
            students: students.length,
            posts: posts.length,
            nominations_total: nominations.length,
            nominations_pending: nominations.filter((n: any) => n.status === "Pending").length
        });
        setElectionSettings(settings);
    }, []);

    const handleSettingsChange = (field: string, value: any) => {
        const newSettings = { ...electionSettings, [field]: value };
        setElectionSettings(newSettings);
        localStorage.setItem("election_settings", JSON.stringify(newSettings));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Overview of Election Status</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Voters"
                    value={stats.students}
                    icon={Users}
                    color="bg-blue-600"
                    subText="Eligible students"
                />
                <StatCard
                    title="Posts"
                    value={stats.posts}
                    icon={Flag}
                    color="bg-indigo-600"
                    subText="Active positions"
                />
                <StatCard
                    title="Nominations"
                    value={stats.nominations_total}
                    icon={FileText}
                    color="bg-purple-600"
                    subText="Total filed"
                />
                <StatCard
                    title="Pending Review"
                    value={stats.nominations_pending}
                    icon={AlertCircle}
                    color="bg-amber-500"
                    subText="Requires scrutiny"
                />
            </div>

            {/* Election Schedule Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Flag size={20} className="text-indigo-600" /> Election Schedule
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nomination Start</label>
                        <input
                            type="datetime-local"
                            value={electionSettings.startDate}
                            onChange={(e) => handleSettingsChange("startDate", e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nomination End</label>
                        <input
                            type="datetime-local"
                            value={electionSettings.endDate}
                            onChange={(e) => handleSettingsChange("endDate", e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleSettingsChange("isOpen", !electionSettings.isOpen)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${electionSettings.isOpen
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    }`}
                            >
                                {electionSettings.isOpen ? "OPEN FOR NOMINATIONS" : "CLOSED"}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {electionSettings.isOpen
                                ? "Students can currently file nominations."
                                : "Access to nomination form is blocked."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-600" /> Recent Activity
                    </h2>
                    <ul className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <li key={i} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                                <span className="text-gray-600">New nomination filed for Chairperson</span>
                                <span className="text-gray-400 text-xs">2 mins ago</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 transition-colors">
                            Generate Voter List PDF
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 transition-colors">
                            Publish Election Notification
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 transition-colors">
                            Manage Polling Officers
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, subText }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
                    <p className="text-xs text-gray-400 mt-1">{subText}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${color}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

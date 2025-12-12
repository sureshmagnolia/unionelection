"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function StudentPortal() {
    const { loginStudent, studentId, logoutStudent } = useAuth();
    const [inputAdm, setInputAdm] = useState("");

    const handleSearch = () => {
        if (inputAdm) {
            loginStudent(inputAdm);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
                <p className="text-gray-600">Union Election 2025</p>
                {studentId && (
                    <button onClick={logoutStudent} className="text-red-500 text-xs hover:underline mt-2">
                        Exit Session ({studentId})
                    </button>
                )}
            </header>

            <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-6">
                {!studentId ? (
                    <div>
                        <h2 className="text-xl font-semibold mb-6">Find Your Roll</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputAdm}
                                onChange={(e) => setInputAdm(e.target.value)}
                                placeholder="Enter Admission Number"
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm">
                            <strong>Welcome, Student {studentId}</strong><br />
                            Access your election services below.
                        </div>

                        <div className="space-y-4">
                            {/* Draft Roll Link */}
                            <Link
                                href="/student/nominal-roll"
                                className="block w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                            >
                                View Draft Nominal Roll
                            </Link>

                            {/* Nomination Link with Access Control */}
                            <NominationButton />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NominationButton() {
    const [status, setStatus] = useState<"OPEN" | "CLOSED" | "PENDING">("CLOSED");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const settings = JSON.parse(localStorage.getItem("election_settings") || "{}");
        const isOpen = settings.isOpen;
        const now = new Date();
        const start = settings.startDate ? new Date(settings.startDate) : null;
        const end = settings.endDate ? new Date(settings.endDate) : null;

        if (isOpen) {
            setStatus("OPEN");
            return;
        }

        if (start && now < start) {
            setStatus("PENDING");
            setMessage(`Opens on ${start.toLocaleString()}`);
            return;
        }

        if (end && now > end) {
            setStatus("CLOSED");
            setMessage("Nominations Closed");
            return;
        }

        if (start && end && now >= start && now <= end) {
            setStatus("OPEN");
            return;
        }

        setStatus("CLOSED");
        setMessage("Nominations are currently closed.");
    }, []);

    if (status === "OPEN") {
        return (
            <Link
                href="/student/nomination"
                className="block w-full py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
            >
                File Nomination Now
            </Link>
        );
    }

    return (
        <button disabled className="block w-full py-3 bg-gray-100 text-gray-400 rounded-lg font-bold cursor-not-allowed">
            File Nomination ({status === "PENDING" ? "Opening Soon" : "Closed"})
            <div className="text-xs font-normal mt-1">{message}</div>
        </button>
    );
}

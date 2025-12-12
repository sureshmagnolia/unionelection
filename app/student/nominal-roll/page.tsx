"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Lock } from "lucide-react";

interface Student {
    sl: number;
    name: string;
    gender: string;
    dept: string;
    year: string;
    stream: string;
    admNo: string;
}

export default function StudentNominalRoll() {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchText, setSearchText] = useState("");
    const [isLocked, setIsLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchText]);

    useEffect(() => {
        const savedStudents = localStorage.getItem("nominalRoll_students");
        const savedLock = localStorage.getItem("nominalRoll_isLocked");

        if (savedStudents) {
            setStudents(JSON.parse(savedStudents));
        }
        if (savedLock === "true") {
            setIsLocked(true);
        }
        setIsLoading(false);
    }, []);

    const filteredStudents = students.filter(student => {
        const query = searchText.toLowerCase().trim();
        if (!query) return true;

        const nameMatch = (student.name || "").toLowerCase().includes(query);
        const admMatch = (student.admNo || "").toLowerCase().includes(query);

        return nameMatch || admMatch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-full max-w-5xl">
                <header className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/student" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-600">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isLocked ? "Final Nominal Roll" : "Draft Nominal Roll"}
                            </h1>
                            <p className="text-gray-500 text-sm">
                                {isLocked
                                    ? "This is the final list of eligible voters."
                                    : "Subject to correction. Please contact admin for discrepancies."}
                            </p>
                        </div>
                    </div>
                    {isLocked && (
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                            <Lock size={12} /> FINALIZED
                        </div>
                    )}
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Name or Admission No..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-mono text-gray-600">
                            Count: {filteredStudents.length}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">SL</th>
                                    <th className="px-6 py-4">Adm No</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Gender</th>
                                    <th className="px-6 py-4">Dept</th>
                                    <th className="px-6 py-4">Year</th>
                                    <th className="px-6 py-4">Stream</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td>
                                    </tr>
                                ) : paginatedStudents.length > 0 ? (
                                    paginatedStudents.map((student) => (
                                        <tr key={student.admNo} className="hover:bg-blue-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-400 font-mono">{student.sl}</td>
                                            <td className="px-6 py-4 font-bold text-gray-700">{student.admNo}</td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">{student.name}</td>
                                            <td className="px-6 py-4">{student.gender}</td>
                                            <td className="px-6 py-4">{student.dept}</td>
                                            <td className="px-6 py-4">{student.year}</td>
                                            <td className="px-6 py-4">{student.stream}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            No students found in the {isLocked ? "Final Roll" : "Draft"}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page <span className="font-bold">{currentPage}</span> of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

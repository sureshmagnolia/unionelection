"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Upload, FileUp, Trophy, Search, FileSpreadsheet, Download, Lock, CheckCircle, Edit2, X, Printer, Unlock } from "lucide-react";

interface Student {
    sl: number;
    name: string;
    gender: string;
    dept: string;
    year: string;
    stream: string;
    admNo: string;
}

export default function NominalRollPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLocked, setIsLocked] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Load data from localStorage on mount
    useEffect(() => {
        const savedStudents = localStorage.getItem("nominalRoll_students");
        const savedLock = localStorage.getItem("nominalRoll_isLocked");
        if (savedStudents) setStudents(JSON.parse(savedStudents));
        if (savedLock === "true") setIsLocked(true);
    }, []);

    // Save data to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("nominalRoll_students", JSON.stringify(students));
        localStorage.setItem("nominalRoll_isLocked", String(isLocked));
    }, [students, isLocked]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) return;
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const findValue = (row: any, candidates: string[]) => {
                        const rowKeys = Object.keys(row);
                        const normalizedWithKey = rowKeys.map(k => ({
                            original: k,
                            normalized: k.toLowerCase().replace(/[^a-z0-9]/g, "")
                        }));

                        for (const candidate of candidates) {
                            const match = normalizedWithKey.find(nk => nk.normalized === candidate || nk.normalized.includes(candidate));
                            if (match) return row[match.original];
                        }
                        return null;
                    };

                    const parsedData = results.data.map((row: any, index: number) => ({
                        sl: index + 1,
                        name: findValue(row, ["name", "studentname", "candidate", "nameofstudent"]) || "Unknown",
                        gender: findValue(row, ["gender", "sex"]) || "-",
                        dept: findValue(row, ["dept", "department", "course", "branch"]) || "-",
                        year: findValue(row, ["year", "yr", "class", "semester", "sem"]) || "-",
                        stream: findValue(row, ["stream", "degree"]) || "-",
                        admNo: findValue(row, ["admno", "admnno", "admissionno", "admissionnumber", "rollno", "rollnumber", "regno", "enrollment", "id"]) || "0000",
                    }));
                    setStudents(parsedData);
                },
            });
        }
    };

    const handleUpdateStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        setStudents(students.map(s => s.sl === editingStudent.sl ? editingStudent : s));
        setEditingStudent(null);
    };

    const filteredStudents = students.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admNo.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600" /> Nominal Roll
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage eligible voters database</p>
                </div>
                <div className="flex gap-2">
                    {!isLocked && (
                        <>
                            <a
                                href="/nominal_roll_template.csv"
                                download="NominalRoll_Template.csv"
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm text-decoration-none"
                            >
                                <Download size={16} />
                                <span>Template</span>
                            </a>
                            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors font-medium text-sm">
                                <Upload size={16} />
                                <span>Import CSV</span>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </>
                    )}
                    <button
                        onClick={() => window.print()}
                        disabled={students.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm disabled:opacity-50"
                    >
                        <Printer size={16} /> Print
                    </button>
                    <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors ${isLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isLocked ? <><Lock size={16} /> Finalized</> : <><Unlock size={16} /> Finalize List</>}
                    </button>
                </div>
            </header>

            {/* Print Header */}
            <div className="hidden print-block mb-8 text-center border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold uppercase mb-2">Union Election 2025</h1>
                <h2 className="text-xl font-semibold uppercase">Nominal Roll</h2>
                <div className="mt-4 inline-block px-4 py-1 border-2 border-black font-bold uppercase">
                    {isLocked ? "FINAL ROLL" : "DRAFT LIST - SUBJECT TO CORRECTION"}
                </div>
            </div>

            {/* Stats / Controls */}
            <div className="no-print bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center text-sm text-blue-800">
                <div className="flex gap-4">
                    <span><strong>Total Voters:</strong> {students.length}</span>
                    <span><strong>Status:</strong> {isLocked ? "Locked (Ready for Election)" : "Draft (Edits Allowed)"}</span>
                </div>
                {!isLocked && <span className="text-xs bg-white px-2 py-1 rounded border border-blue-200">Tip: Click 'Finalize List' to lock editing before printing final roll.</span>}
            </div>

            {/* Table Section */}
            {students.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print-shadow-none">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 no-print">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Name or Adm No..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="bg-gray-100 text-gray-700 font-semibold uppercase text-xs print-bg-transparent print-text-black">
                                <tr>
                                    <th className="px-6 py-3 border-b border-gray-200">Sl.</th>
                                    <th className="px-6 py-3 border-b border-gray-200">Name</th>
                                    <th className="px-6 py-3 border-b border-gray-200">Adm No</th>
                                    <th className="px-6 py-3 border-b border-gray-200">Dept</th>
                                    <th className="px-6 py-3 border-b border-gray-200">Year</th>
                                    <th className="px-6 py-3 border-b border-gray-200">Stream</th>
                                    <th className="px-6 py-3 border-b border-gray-200">Gender</th>
                                    {!isLocked && <th className="px-6 py-3 border-b border-gray-200 no-print">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.slice(0, isLocked ? undefined : 100).map((student) => (
                                    <tr key={student.sl} className="hover:bg-gray-50/80 transition-colors print-hover-none">
                                        <td className="px-6 py-3 font-medium">{student.sl}</td>
                                        <td className="px-6 py-3 font-semibold text-gray-900">{student.name}</td>
                                        <td className="px-6 py-3 font-mono text-xs">{student.admNo}</td>
                                        <td className="px-6 py-3">{student.dept}</td>
                                        <td className="px-6 py-3">{student.year}</td>
                                        <td className="px-6 py-3">{student.stream}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${student.gender.toLowerCase() === 'female' ? 'text-pink-600' : 'text-blue-600'}`}>
                                                {student.gender}
                                            </span>
                                        </td>
                                        {!isLocked && (
                                            <td className="px-6 py-3 no-print">
                                                <button
                                                    onClick={() => setEditingStudent(student)}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!isLocked && (
                            <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100 no-print">
                                Showing top 100 results. Finalize list to view/print all.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">Edit Student</h3>
                            <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingStudent.name}
                                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Admission No</label>
                                    <input
                                        type="text"
                                        value={editingStudent.admNo}
                                        onChange={e => setEditingStudent({ ...editingStudent, admNo: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                                    <select
                                        value={editingStudent.gender}
                                        onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dept</label>
                                    <input
                                        type="text"
                                        value={editingStudent.dept}
                                        onChange={e => setEditingStudent({ ...editingStudent, dept: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                                    <input
                                        type="text"
                                        value={editingStudent.year}
                                        onChange={e => setEditingStudent({ ...editingStudent, year: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stream</label>
                                    <input
                                        type="text"
                                        value={editingStudent.stream}
                                        onChange={e => setEditingStudent({ ...editingStudent, stream: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingStudent(null)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

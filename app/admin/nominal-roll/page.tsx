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

    const handleAddStudent = () => {
        setEditingStudent({ sl: -1, name: "", admNo: "", gender: "Male", dept: "", year: "", stream: "" });
    };

    const handleUpdateStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;

        if (editingStudent.sl === -1) {
            // Create New
            const newStudent = { ...editingStudent, sl: students.length + 1 };
            setStudents([...students, newStudent]);
        } else {
            // Update Existing
            setStudents(students.map(s => s.sl === editingStudent.sl ? editingStudent : s));
        }
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
                            <button 
                                onClick={handleAddStudent}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                                <Plus size={16} /> Add Student
                            </button>
                            <a
                                href="/nominal_roll_template.csv" ...>...</a>
                            <label ...>...</label>
                        </>
                    )}
                    <button ...>...</button>
                    <button ...>...</button>
                </div >
            </header >

        {/* ... rest of UI ... */ }

    {/* Edit Modal (Updated Title) */ }
    {
        editingStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-900">
                            {editingStudent.sl === -1 ? "Add New Student" : "Edit Student"}
                        </h3>
                        <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    {/* ... form ... */}
                </div>
            </div>
        )
    }
        </div >
    );
}
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
                        </form >
                    </div >
                </div >
            )}
        </div >
    );
}

"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Printer, Filter, Plus, X, AlertCircle } from "lucide-react";

interface Nomination {
    id: string;
    studentId: string; // Candidate AdmNo
    candidateName: string;
    post: string;
    status: "Pending" | "Accepted" | "Rejected";
    proposer?: string;
    seconder?: string;
    submittedAt?: string;
}

export default function ScrutinyPage() {
    const [nominations, setNominations] = useState<Nomination[]>([]);
    const [filter, setFilter] = useState<"Pending" | "Accepted" | "Rejected">("Pending");
    const [posts, setPosts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    // Manual Entry State
    const [isAdding, setIsAdding] = useState(false);
    const [manualForm, setManualForm] = useState({
        candidateAdm: "",
        proposerAdm: "",
        seconderAdm: "",
        postName: ""
    });
    const [formErrors, setFormErrors] = useState<string[]>([]);
    const [validationPreview, setValidationPreview] = useState<any>(null); // To show names if found

    // Load Data
    useEffect(() => {
        const savedNoms = JSON.parse(localStorage.getItem("student_nominations") || "[]");
        const savedPosts = JSON.parse(localStorage.getItem("election_posts") || "[]");
        const savedStudents = JSON.parse(localStorage.getItem("nominalRoll_students") || "[]");

        setNominations(savedNoms);
        setPosts(savedPosts);
        setStudents(savedStudents);
    }, []);

    // Persist Changes
    useEffect(() => {
        if (nominations.length > 0 || localStorage.getItem("student_nominations")) {
            localStorage.setItem("student_nominations", JSON.stringify(nominations));
        }
    }, [nominations]);


    // Validation Helper (Replicated)
    const isEligible = (student: any, post: any, role: string, candidate: any = null) => {
        const issues = [];
        if (!student) return [`${role} not found in Nominal Roll`];

        if (candidate) {
            const rule = role === "Proposer" ? (post.proposerReq || "Any") : (post.seconderReq || "Any");
            if (rule === "Same Dept" && student.dept !== candidate.dept) issues.push(`${role} must be from same Dept as Candidate`);
            if (rule === "Same Year" && student.year !== candidate.year) issues.push(`${role} must be from same Year as Candidate`);
            if (rule === "Same Stream" && student.stream !== candidate.stream) issues.push(`${role} must be from same Stream as Candidate`);
        }

        if (role === "Candidate") {
            if (post.gender !== "Any" && student.gender !== post.gender) issues.push(`${role} must be ${post.gender}`);
            if (post.stream !== "Any" && student.stream !== post.stream) issues.push(`${role} must be ${post.stream}`);
            if (post.year !== "Any" && student.year !== post.year) issues.push(`${role} must be Year ${post.year}`);
            if (post.dept && post.dept !== "Any" && student.dept !== post.dept) issues.push(`${role} must be in ${post.dept}`);
        }
        return issues;
    };

    const handleAddNomination = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors([]);

        const candidate = students.find(s => s.admNo === manualForm.candidateAdm);
        const proposer = students.find(s => s.admNo === manualForm.proposerAdm);
        const seconder = students.find(s => s.admNo === manualForm.seconderAdm);
        const post = posts.find(p => p.name === manualForm.postName);

        const newErrors = [];

        if (!post) { newErrors.push("Please select a post"); setFormErrors(newErrors); return; }
        if (!candidate) newErrors.push("Candidate not found");
        if (!proposer) newErrors.push("Proposer not found");
        if (!seconder) newErrors.push("Seconder not found");

        if (candidate && proposer && seconder) {
            if (candidate.admNo === proposer.admNo) newErrors.push("Candidate cannot be Proposer");
            if (candidate.admNo === seconder.admNo) newErrors.push("Candidate cannot be Seconder");
            if (proposer.admNo === seconder.admNo) newErrors.push("Proposer and Seconder cannot be same");

            newErrors.push(...isEligible(candidate, post, "Candidate"));
            newErrors.push(...isEligible(proposer, post, "Proposer", candidate));
            newErrors.push(...isEligible(seconder, post, "Seconder", candidate));
        }

        if (newErrors.length > 0) {
            setFormErrors(newErrors);
            return;
        }

        // Success - Add
        const newNom: Nomination = {
            id: Date.now().toString(),
            studentId: candidate.admNo,
            candidateName: candidate.name,
            post: post.name,
            status: "Accepted",
            proposer: proposer.name,
            seconder: seconder.name,
            submittedAt: new Date().toISOString()
        };

        setNominations([...nominations, newNom]);
        setIsAdding(false);
        setManualForm({ candidateAdm: "", proposerAdm: "", seconderAdm: "", postName: "" });
        alert("Nomination Added Successfully!");
    };


    const handleStatusChange = (id: string, newStatus: "Accepted" | "Rejected" | "Pending") => {
        setNominations(nominations.map(n => n.id === id ? { ...n, status: newStatus } : n));
    };

    const filteredNominations = nominations.filter(n => n.status === filter);

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nomination Scrutiny</h1>
                    <p className="text-gray-500 text-sm mt-1">Review and approve candidate nominations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} /> Add Nomination
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        onClick={() => window.print()}
                    >
                        <Printer size={18} /> Print Valid List
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                {(["Pending", "Accepted", "Rejected"] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${filter === status
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {status} ({nominations.filter(n => n.status === status).length})
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden no-print-section">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Serial</th>
                            <th className="px-6 py-4">Candidate & Post</th>
                            <th className="px-6 py-4">Proposer / Seconder</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredNominations.map((nom, idx) => (
                            <tr key={nom.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-mono text-gray-500">#{idx + 1}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{nom.candidateName}</div>
                                    <span className="text-xs text-gray-500">ID: {nom.studentId}</span>
                                    <div className="text-xs text-blue-600 font-semibold uppercase mt-1">{nom.post}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs space-y-1">
                                    <div><span className="font-semibold text-gray-700">P:</span> {nom.proposer || "-"}</div>
                                    <div><span className="font-semibold text-gray-700">S:</span> {nom.seconder || "-"}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${nom.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                                        nom.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {nom.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {nom.status === 'Pending' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusChange(nom.id, "Accepted")}
                                                className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
                                                title="Accept"
                                            >
                                                <CheckCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(nom.id, "Rejected")}
                                                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                title="Reject"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </>
                                    )}
                                    {nom.status !== 'Pending' &&
                                        <button onClick={() => handleStatusChange(nom.id, "Pending")} className="text-xs underline text-gray-400 hover:text-blue-600">Reset</button>
                                    }
                                </td>
                            </tr>
                        ))}
                        {filteredNominations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-gray-400">
                                    No {filter.toLowerCase()} nominations found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Print View (Hidden Normally) */}
            <div className="hidden print-block">
                <h1 className="text-center text-xl font-bold uppercase underline mb-6">List of Valid Nominations</h1>
                <table className="w-full border-collapse border border-black text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-2">Post</th>
                            <th className="border border-black p-2">Candidate Name</th>
                            <th className="border border-black p-2">Admission No</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nominations.filter(n => n.status === "Accepted").map(nom => (
                            <tr key={nom.id}>
                                <td className="border border-black p-2">{nom.post}</td>
                                <td className="border border-black p-2 uppercase">{nom.candidateName}</td>
                                <td className="border border-black p-2">{nom.studentId}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Manual Entry Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">Add Manual Nomination</h3>
                            <button onClick={() => setIsAdding(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleAddNomination} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Post</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={manualForm.postName}
                                    onChange={e => setManualForm({ ...manualForm, postName: e.target.value })}
                                    required
                                >
                                    <option value="">Select Post</option>
                                    {posts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Candidate AdmNo</label>
                                    <input
                                        className="w-full p-2 border rounded"
                                        required
                                        value={manualForm.candidateAdm}
                                        onChange={e => setManualForm({ ...manualForm, candidateAdm: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proposer AdmNo</label>
                                    <input
                                        className="w-full p-2 border rounded"
                                        required
                                        value={manualForm.proposerAdm}
                                        onChange={e => setManualForm({ ...manualForm, proposerAdm: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seconder AdmNo</label>
                                    <input
                                        className="w-full p-2 border rounded"
                                        required
                                        value={manualForm.seconderAdm}
                                        onChange={e => setManualForm({ ...manualForm, seconderAdm: e.target.value })}
                                    />
                                </div>
                            </div>

                            {formErrors.length > 0 && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded space-y-1 border border-red-100">
                                    <div className="font-bold flex items-center gap-1"><AlertCircle size={12} /> validation Failed</div>
                                    <ul className="list-disc list-inside">
                                        {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                            )}

                            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
                                Validate & Add
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

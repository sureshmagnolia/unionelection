"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";

export default function NominationForm() {
    const { studentId } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [posts, setPosts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        post: null as any, // Full post object
        dob: "",
        proposerAdm: "",
        seconderAdm: "",
    });

    // Derived State for Validation / UI
    const [proposer, setProposer] = useState<any>(null);
    const [seconder, setSeconder] = useState<any>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (!studentId) {
            router.push("/student");
            return;
        }

        // Load Data
        const allStudents = JSON.parse(localStorage.getItem("nominalRoll_students") || "[]");
        const allPosts = JSON.parse(localStorage.getItem("election_posts") || "[]");

        setStudents(allStudents);
        setPosts(allPosts);

        // Find Current User
        const user = allStudents.find((s: any) => s.admNo === studentId);
        setCurrentUser(user);

        if (!user) {
            alert("Your details not found in the Nominal Roll. Please contact Admin.");
            router.push("/student");
        }
    }, [studentId, router]);

    // Helper: Check Eligibility
    const isEligible = (student: any, post: any, role: string, candidate: any = null) => {
        const issues = [];
        if (!student) return ["Student not found"];

        // Relation Checks (Proposer/Seconder vs Candidate)
        if (candidate) {
            const rule = role === "Proposer" ? (post.proposerReq || "Any") : (post.seconderReq || "Any");

            if (rule === "Same Dept" && student.dept !== candidate.dept) {
                issues.push(`${role} must be from the same Department as the Candidate (${candidate.dept}).`);
            }
            if (rule === "Same Year" && student.year !== candidate.year) {
                issues.push(`${role} must be from the same Year as the Candidate (${candidate.year}).`);
            }
            if (rule === "Same Stream" && student.stream !== candidate.stream) {
                issues.push(`${role} must be from the same Stream as the Candidate (${candidate.stream}).`);
            }
        }

        // Gender
        if (post.gender !== "Any" && student.gender !== post.gender) {
            issues.push(`${role} must be ${post.gender}.`);
        }
        // Stream
        if (post.stream !== "Any" && student.stream !== post.stream) {
            issues.push(`${role} must be in ${post.stream} stream.`);
        }
        // Year
        if (post.year !== "Any" && student.year !== post.year) {
            issues.push(`${role} must be in Year ${post.year}.`);
        }
        // Dept
        if (post.dept && post.dept !== "Any" && student.dept !== post.dept) {
            issues.push(`${role} must be in Department: ${post.dept}.`);
        }

        return issues;
    };

    // Auto-fetch Proposer/Seconder
    useEffect(() => {
        const p = students.find(s => s.admNo === formData.proposerAdm);
        setProposer(p || null);
    }, [formData.proposerAdm, students]);

    useEffect(() => {
        const s = students.find(s => s.admNo === formData.seconderAdm);
        setSeconder(s || null);
    }, [formData.seconderAdm, students]);


    const validateStep2 = () => {
        const newErrors = [];

        if (!formData.dob) newErrors.push("Date of Birth is required.");
        if (!proposer) newErrors.push("Proposer not found in Nominal Roll.");
        if (!seconder) newErrors.push("Seconder not found in Nominal Roll.");

        // Uniqueness
        if (studentId === formData.proposerAdm) newErrors.push("Candidate cannot be Proposer.");
        if (studentId === formData.seconderAdm) newErrors.push("Candidate cannot be Seconder.");
        if (formData.proposerAdm && formData.proposerAdm === formData.seconderAdm) newErrors.push("Proposer and Seconder cannot be the same.");

        // Eligibility Checks
        if (formData.post) {
            newErrors.push(...isEligible(currentUser, formData.post, "Candidate"));
            if (proposer) newErrors.push(...isEligible(proposer, formData.post, "Proposer", currentUser));
            if (seconder) newErrors.push(...isEligible(seconder, formData.post, "Seconder", currentUser));
        }

        setErrors(newErrors);
        return newErrors.length === 0;
    };


    if (!currentUser) return null;

    // Filter Posts for Step 1
    const eligiblePosts = posts.filter(post => isEligible(currentUser, post, "Candidate").length === 0);

    const renderStep1 = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-xl font-bold text-gray-800">Step 1: Choose a Position</h2>
            {eligiblePosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    No posts available for your eligibility criteria.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {eligiblePosts.map((post) => (
                        <button
                            key={post.id}
                            onClick={() => {
                                setFormData({ ...formData, post: post });
                                setStep(2);
                            }}
                            className="p-4 text-left border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="font-semibold text-gray-700 group-hover:text-blue-700">{post.name}</span>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded">Vacancies: {post.vacancy}</span>
                                        {post.dept !== "Any" && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{post.dept}</span>}
                                    </div>
                                </div>
                                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (validateStep2()) setStep(3);
            }}
            className="space-y-6 animate-in slide-in-from-right duration-500"
        >
            <h2 className="text-xl font-bold text-gray-800">Step 2: Nomination Details</h2>
            <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800 mb-6">
                <strong>Contesting for: {formData.post?.name}</strong>
            </div>

            {errors.length > 0 && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                    <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                        <AlertCircle size={18} /> Please fix the following errors:
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                        {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                </div>
            )}

            <div className="space-y-4">
                {/* Candidate (Read-Only) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Candidate Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500">Name</label>
                            <div className="font-medium">{currentUser.name}</div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Admission No</label>
                            <div className="font-medium">{currentUser.admNo}</div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Class/Dept</label>
                            <div className="text-sm">{currentUser.year} Yr {currentUser.stream} / {currentUser.dept}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                {/* Proposer */}
                <div className={`p-4 rounded-lg border ${!proposer && formData.proposerAdm ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <h3 className="font-bold text-gray-900 mb-2">Proposer</h3>
                    <label className="block text-xs font-medium text-gray-600">Admission Number</label>
                    <input
                        type="text"
                        required
                        placeholder="Enter Adm No"
                        value={formData.proposerAdm}
                        onChange={(e) => setFormData({ ...formData, proposerAdm: e.target.value })}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 outline-none"
                    />
                    {proposer ? (
                        <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                            <strong>{proposer.name}</strong><br />
                            {proposer.dept}, {proposer.year} Yr
                        </div>
                    ) : formData.proposerAdm && <div className="mt-2 text-xs text-red-500">Student not found</div>}
                </div>

                {/* Seconder */}
                <div className={`p-4 rounded-lg border ${!seconder && formData.seconderAdm ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <h3 className="font-bold text-gray-900 mb-2">Seconder</h3>
                    <label className="block text-xs font-medium text-gray-600">Admission Number</label>
                    <input
                        type="text"
                        required
                        placeholder="Enter Adm No"
                        value={formData.seconderAdm}
                        onChange={(e) => setFormData({ ...formData, seconderAdm: e.target.value })}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 outline-none"
                    />
                    {seconder ? (
                        <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                            <strong>{seconder.name}</strong><br />
                            {seconder.dept}, {seconder.year} Yr
                        </div>
                    ) : formData.seconderAdm && <div className="mt-2 text-xs text-red-500">Student not found</div>}
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="flex-1 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800"
                >
                    Generate Preview
                </button>
            </div>
        </form>
    );

    const renderStep3 = () => (
        <div className="animate-in slide-in-from-right duration-500">
            {/* Printable Area - Based on Reference Model */}
            <div id="nomination-preview" className="bg-white p-8 border-2 border-black mb-6 text-black font-serif text-sm">

                <div className="flex justify-between mb-4 text-xs font-bold">
                    <p>Government Victoria College, Palakkad</p>
                    <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>

                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-2xl font-bold uppercase underline">Nomination Paper</h1>
                    <p className="mt-2 font-bold">College Union Election {new Date().getFullYear()}</p>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex"><p className="w-2/5 font-bold">Post for which nomination is made:</p><p className="font-bold uppercase">{formData.post?.name}</p></div>
                </div>

                <hr className="border-gray-400 my-4" />

                {/* Candidate */}
                <h3 className="font-bold text-base mb-2 underline">Candidate Details</h3>
                <div className="space-y-1 ml-4">
                    <div className="flex"><p className="w-1/3 font-semibold">Name:</p><p className="uppercase">{currentUser.name}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Class/Year:</p><p>{currentUser.year} Year {currentUser.stream}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Department:</p><p>{currentUser.dept}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Electoral Roll No (Adm):</p><p>{currentUser.admNo}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Date of Birth:</p><p>{new Date(formData.dob).toLocaleDateString('en-GB')}</p></div>
                </div>

                <hr className="border-gray-400 my-4" />

                {/* Proposer */}
                <h3 className="font-bold text-base mb-2 underline">Proposer Details</h3>
                <div className="space-y-1 ml-4">
                    <div className="flex"><p className="w-1/3 font-semibold">Name:</p><p className="uppercase">{proposer?.name}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Class/Year:</p><p>{proposer?.year} Year {proposer?.stream}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Department:</p><p>{proposer?.dept}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Electoral Roll No (Adm):</p><p>{proposer?.admNo}</p></div>
                </div>
                <div className="flex justify-between mt-8 ml-4 mr-12">
                    <p>Date: ______ / ______ / ________</p>
                    <p>Signature: ___________________</p>
                </div>

                <hr className="border-gray-400 my-4" />

                {/* Seconder */}
                <h3 className="font-bold text-base mb-2 underline">Seconder Details</h3>
                <div className="space-y-1 ml-4">
                    <div className="flex"><p className="w-1/3 font-semibold">Name:</p><p className="uppercase">{seconder?.name}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Class/Year:</p><p>{seconder?.year} Year {seconder?.stream}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Department:</p><p>{seconder?.dept}</p></div>
                    <div className="flex"><p className="w-1/3 font-semibold">Electoral Roll No (Adm):</p><p>{seconder?.admNo}</p></div>
                </div>
                <div className="flex justify-between mt-8 ml-4 mr-12">
                    <p>Date: ______ / ______ / ________</p>
                    <p>Signature: ___________________</p>
                </div>

                <hr className="border-gray-400 my-4" />

                <div className="text-center pt-6">
                    <h3 className="font-bold mb-2">Consent of the Candidate</h3>
                    <p className="mb-6 italic">I agree, if elected, to serve on the body to which I am proposed as a candidate.</p>
                    <div className="flex justify-between px-12 mt-12">
                        <p>Date: ______ / ______ / ________</p>
                        <p>Signature: _________________________</p>
                    </div>
                    <p className="text-xs italic mt-4">(To be signed in front of the Returning Officer)</p>
                </div>
            </div>

            <div className="flex gap-3 no-print">
                <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 bg-white"
                >
                    Edit Details
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex-1 py-3 border border-gray-800 text-gray-800 rounded-lg font-bold hover:bg-gray-50"
                >
                    Print
                </button>
                <button
                    onClick={() => {
                        const existing = JSON.parse(localStorage.getItem("student_nominations") || "[]");
                        const newNomination = {
                            id: Date.now().toString(),
                            studentId: currentUser.admNo,
                            candidateName: currentUser.name,
                            post: formData.post?.name || "Unknown",
                            status: "Pending",
                            submittedAt: new Date().toISOString()
                        };
                        localStorage.setItem("student_nominations", JSON.stringify([...existing, newNomination]));

                        alert("Nomination Submitted Successfully!");
                        window.location.href = "/student";
                    }}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg"
                >
                    Confirm & Submit
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #nomination-preview, #nomination-preview * { visibility: visible; }
                    #nomination-preview { position: absolute; left: 0; top: 0; width: 100%; border: none; }
                    .no-print { display: none; }
                }
            `}</style>
            <div className="w-full max-w-2xl">
                <header className="mb-6 flex items-center gap-2 no-print">
                    <Link href="/student" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">File Nomination</h1>
                </header>

                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 no-print-container">
                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8 no-print">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-gray-100'}`} />
                        ))}
                    </div>

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>
            </div>
        </div>
    );
}

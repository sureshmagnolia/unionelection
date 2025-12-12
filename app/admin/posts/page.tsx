"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Lock, Unlock } from "lucide-react";

interface Post {
    id: string;
    name: string;
    vacancy: number;
    gender: string;
    stream: string;
    year: string;
    dept: string;
    proposerReq?: string;
    seconderReq?: string;
}

export default function PostsPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [availableDepts, setAvailableDepts] = useState<string[]>([]);

    const [isLocked, setIsLocked] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Load (including Lock state)
    useEffect(() => {
        const saved = localStorage.getItem("election_posts");
        const savedLock = localStorage.getItem("election_posts_isLocked");

        // Load Students to extract Depts
        const students = JSON.parse(localStorage.getItem("nominalRoll_students") || "[]");
        const depts = new Set<string>();
        students.forEach((s: any) => {
            if (s.dept && s.dept !== "-") depts.add(s.dept);
        });
        const deptList = Array.from(depts).sort();
        console.log(`Debug: Found ${students.length} students. Extracted Depts:`, deptList);
        setAvailableDepts(deptList);

        if (savedLock === "true") setIsLocked(true);

        if (saved) {
            setPosts(JSON.parse(saved));
        } else {
            // Default seed data if empty
            const defaults = [
                { id: "1", name: "The Chairperson", vacancy: 1, gender: "Any", stream: "Any", year: "Any", dept: "Any", proposerReq: "Any", seconderReq: "Any" },
                { id: "2", name: "The Vice Chairperson", vacancy: 1, gender: "Female", stream: "Any", year: "Any", dept: "Any", proposerReq: "Any", seconderReq: "Any" },
                { id: "3", name: "The General Secretary", vacancy: 1, gender: "Any", stream: "Any", year: "Any", dept: "Any", proposerReq: "Any", seconderReq: "Any" },
            ];
            setPosts(defaults);
            localStorage.setItem("election_posts", JSON.stringify(defaults));
        }
        setIsLoaded(true);
    }, []);

    // Persist Changes
    useEffect(() => {
        if (!isLoaded) return;
        if (posts.length > 0) {
            localStorage.setItem("election_posts", JSON.stringify(posts));
        }
        localStorage.setItem("election_posts_isLocked", String(isLocked));
    }, [posts, isLocked, isLoaded]);

    // Form State
    const [newPost, setNewPost] = useState<Partial<Post>>({
        name: "", vacancy: 1, gender: "Any", stream: "Any", year: "Any", dept: "Any", proposerReq: "Any", seconderReq: "Any"
    });

    const handleAddPost = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return; // Prevent adding when locked
        if (!newPost.name) return;
        setPosts([...posts, { ...newPost, id: Date.now().toString() } as Post]);
        setNewPost({ name: "", vacancy: 1, gender: "Any", stream: "Any", year: "Any", dept: "Any", proposerReq: "Any", seconderReq: "Any" });
    };

    const handleDelete = (id: string) => {
        if (isLocked) return;
        setPosts(posts.filter(p => p.id !== id));
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Election Posts</h1>
                    <p className="text-gray-500 text-sm mt-1">Define positions and eligibility logic</p>
                </div>
                <button
                    onClick={() => setIsLocked(!isLocked)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-colors ${isLocked
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                >
                    {isLocked ? <><Lock size={16} /> Locked (Published)</> : <><Unlock size={16} /> Draft Mode</>}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Post Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Add New Post</h2>
                        <form onSubmit={handleAddPost} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Position Name</label>
                                <input
                                    type="text"
                                    value={newPost.name}
                                    onChange={e => setNewPost({ ...newPost, name: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Arts Club Secretary"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Vacancies</label>
                                    <input
                                        type="number"
                                        value={newPost.vacancy}
                                        onChange={e => setNewPost({ ...newPost, vacancy: parseInt(e.target.value) })}
                                        className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Gender</label>
                                    <select
                                        value={newPost.gender}
                                        onChange={e => setNewPost({ ...newPost, gender: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                    >
                                        <option value="Any">Any</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Stream</label>
                                    <select
                                        value={newPost.stream}
                                        onChange={e => setNewPost({ ...newPost, stream: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                    >
                                        <option value="Any">Any</option>
                                        <option value="UG">UG</option>
                                        <option value="PG">PG</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Year</label>
                                    <select
                                        value={newPost.year}
                                        onChange={e => setNewPost({ ...newPost, year: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                    >
                                        <option value="Any">Any</option>
                                        <option value="1">1st</option>
                                        <option value="2">2nd</option>
                                        <option value="3">3rd</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Dept (Optional)</label>
                                <input
                                    type="text"
                                    list="dept-list"
                                    value={newPost.dept}
                                    onChange={e => setNewPost({ ...newPost, dept: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                    placeholder="e.g. Physics"
                                />
                                <datalist id="dept-list">
                                    {availableDepts.map(dept => (
                                        <option key={dept} value={dept} />
                                    ))}
                                </datalist>
                                {availableDepts.length === 0 && (
                                    <p className="text-[10px] text-orange-500 mt-1">
                                        Tip: Upload Nominal Roll to auto-suggest departments.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Proposer Rules</label>
                                    <select
                                        value={newPost.proposerReq}
                                        onChange={e => setNewPost({ ...newPost, proposerReq: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                    >
                                        <option value="Any">Any</option>
                                        <option value="Same Dept">Same Dept</option>
                                        <option value="Same Year">Same Year</option>
                                        <option value="Same Stream">Same Stream</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Seconder Rules</label>
                                    <select
                                        value={newPost.seconderReq}
                                        onChange={e => setNewPost({ ...newPost, seconderReq: e.target.value })}
                                        className="w-full p-2 border border-gray-200 rounded text-sm outline-none"
                                    >
                                        <option value="Any">Any</option>
                                        <option value="Same Dept">Same Dept</option>
                                        <option value="Same Year">Same Year</option>
                                        <option value="Same Stream">Same Stream</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLocked}
                                className={`w-full py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${isLocked ? "bg-gray-300 cursor-not-allowed text-gray-500" : "bg-black text-white hover:bg-gray-800"}`}
                            >
                                <Plus size={18} /> Add Post
                            </button>
                        </form>
                    </div>
                </div>

                {/* Posts List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700">Configured Positions</div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Eligibility Rule</th>
                                    <th className="px-6 py-4">Relations</th>
                                    <th className="px-6 py-4 text-center">Vacancies</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {posts.map(post => (
                                    <tr key={post.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-semibold text-gray-900">{post.name}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            <span className="block">Gender: {post.gender}</span>
                                            <span className="block">Stream: {post.stream}</span>
                                            {post.dept !== "Any" && <span className="block text-blue-600">Dept: {post.dept}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            <span className="block">Prop: <span className="font-medium text-gray-700">{post.proposerReq}</span></span>
                                            <span className="block">Sec: <span className="font-medium text-gray-700">{post.seconderReq}</span></span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono bg-gray-50">{post.vacancy}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                disabled={isLocked}
                                                className={`p-2 rounded-full transition-colors ${isLocked ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:bg-red-50"}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {posts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-400 italic">No posts defined yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

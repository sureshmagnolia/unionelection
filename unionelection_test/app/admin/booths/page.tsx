"use client";

import { useState } from "react";
import { Map, Users, RefreshCw, Trash2, Home } from "lucide-react";

interface Booth {
    id: number;
    voterCount: number;
    room?: string;
    location?: string;
}

export default function BoothsPage() {
    const [booths, setBooths] = useState<Booth[]>([]);
    const [voterCountInput, setVoterCountInput] = useState(15);

    // Mock Rooms Inventory
    const [rooms, setRooms] = useState([
        { no: "101", loc: "Main Block" },
        { no: "102", loc: "Main Block" },
        { no: "201", loc: "New Science Block" },
    ]);

    const generateBooths = () => {
        // Mock logic: Distribute ~3000 students across N booths
        if (voterCountInput <= 0) return;
        const totalStudents = 3000;
        const perBooth = Math.ceil(totalStudents / voterCountInput);

        const newBooths: Booth[] = Array.from({ length: voterCountInput }, (_, i) => ({
            id: i + 1,
            voterCount: perBooth,
        }));
        setBooths(newBooths);
    };

    const assignRoom = (boothId: number, roomNo: string) => {
        const room = rooms.find(r => r.no === roomNo);
        if (!room) return;
        setBooths(booths.map(b => b.id === boothId ? { ...b, room: room.no, location: room.loc } : b));
    };

    return (
        <div className="space-y-6">
            <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="text-blue-600" /> Booth Management
                </h1>
                <p className="text-gray-500 text-sm mt-1">Logistics and Room Allocation</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Generator Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <RefreshCw size={18} /> Generate Booths
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Number of Booths (Scale)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={voterCountInput}
                                    onChange={(e) => setVoterCountInput(parseInt(e.target.value))}
                                    className="flex-1 p-2 border border-gray-200 rounded text-sm outline-none"
                                />
                                <button
                                    onClick={generateBooths}
                                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700"
                                >
                                    Generate
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 italic">
                                Will distribute ~3000 voters across {voterCountInput} booths.
                            </p>
                        </div>

                        <hr className="border-gray-100" />

                        <button
                            onClick={() => setBooths([])}
                            className="w-full text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Reset All Data
                        </button>
                    </div>
                </div>

                {/* Booths Map */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700 flex justify-between items-center">
                            <span>Logistics Map</span>
                            <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded">Total Booths: {booths.length}</span>
                        </div>

                        {booths.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic">
                                No booths generated yet. Use the panel to start.
                            </div>
                        ) : (
                            <div className="max-h-[600px] overflow-y-auto p-4 space-y-3">
                                {booths.map(booth => (
                                    <div key={booth.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors bg-white">
                                        <div className="w-16 h-16 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-blue-700 font-bold border border-blue-100">
                                            <span className="text-xs uppercase text-blue-400">Booth</span>
                                            <span className="text-xl">{booth.id}</span>
                                        </div>

                                        <div className="ml-4 flex-1">
                                            <p className="text-sm font-semibold text-gray-800">
                                                Voters: {booth.voterCount}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Allocated Room: <span className="hidden">...</span>
                                            </p>

                                            <div className="mt-2 flex gap-2">
                                                {rooms.map(room => (
                                                    <button
                                                        key={room.no}
                                                        onClick={() => assignRoom(booth.id, room.no)}
                                                        className={`text-xs px-2 py-1 rounded border ${booth.room === room.no
                                                                ? "bg-gray-800 text-white border-gray-800"
                                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        Room {room.no}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            {booth.room ? (
                                                <div className="text-green-600 flex flex-col items-end">
                                                    <Home size={20} />
                                                    <span className="font-bold text-lg">{booth.room}</span>
                                                    <span className="text-xs text-gray-400">{booth.location}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-red-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

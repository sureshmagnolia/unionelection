"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Vote, Flag, LogOut } from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Nominal Roll", href: "/admin/nominal-roll", icon: Users },
        { label: "Posts", href: "/admin/posts", icon: Flag },
        { label: "Scrutiny", href: "/admin/scrutiny", icon: FileText },
        { label: "Booths", href: "/admin/booths", icon: Vote },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Union Admin
                </h1>
                <p className="text-xs text-gray-500 mt-1">Election Manager</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <Icon size={18} className={isActive ? "text-blue-600" : "text-gray-400"} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </aside>
    );
}

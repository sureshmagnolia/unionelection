"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { isAdmin, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // If loading, do nothing
        if (isLoading) return;

        // If not admin and not on login page, redirect
        if (!isAdmin && pathname !== "/admin/login") {
            router.push("/admin/login");
        }
    }, [isAdmin, isLoading, pathname, router]);

    // If on login page, just show children (the login form)
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // If protected and not admin, show nothing (or loading) while redirecting
    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <main className="ml-64 min-h-screen transition-all duration-300">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

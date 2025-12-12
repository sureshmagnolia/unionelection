"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
    isAdmin: boolean;
    studentId: string | null;
    isLoading: boolean;
    loginAdmin: () => void;
    logoutAdmin: () => void;
    loginStudent: (admNo: string) => void;
    logoutStudent: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAdmin: false,
    studentId: null,
    isLoading: true,
    loginAdmin: () => { },
    logoutAdmin: () => { },
    loginStudent: () => { },
    logoutStudent: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Hydrate state from localStorage
        const savedAdmin = localStorage.getItem("isAdmin") === "true";
        const savedStudent = localStorage.getItem("studentId");
        if (savedAdmin) setIsAdmin(true);
        if (savedStudent) setStudentId(savedStudent);
        setIsLoading(false);
    }, []);

    const loginAdmin = () => {
        localStorage.setItem("isAdmin", "true");
        setIsAdmin(true);
        setTimeout(() => router.push("/admin"), 100);
    };

    const logoutAdmin = () => {
        localStorage.removeItem("isAdmin");
        setIsAdmin(false);
        router.push("/admin/login");
    };

    const loginStudent = (admNo: string) => {
        localStorage.setItem("studentId", admNo);
        setStudentId(admNo);
        router.push("/student");
    };

    const logoutStudent = () => {
        localStorage.removeItem("studentId");
        setStudentId(null);
        router.push("/student");
    };

    return (
        <AuthContext.Provider value={{ isAdmin, studentId, isLoading, loginAdmin, logoutAdmin, loginStudent, logoutStudent }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

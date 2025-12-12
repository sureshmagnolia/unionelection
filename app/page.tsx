import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <main className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
            Union Election 2025
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Secure. Transparent. Efficient.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Link
            href="/student"
            className="group relative p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
              Student Portal
            </h2>
            <p className="text-gray-500">
              Check eligibility, file nominations, and view candidate lists.
            </p>
            <div className="mt-6 flex items-center justify-center text-blue-600 font-semibold">
              Enter Portal <span className="ml-2">→</span>
            </div>
          </Link>

          <Link
            href="/admin"
            className="group relative p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors">
              Admin Dashboard
            </h2>
            <p className="text-gray-500">
              Manage rolls, posts, scrutiny, and polling booth logistics.
            </p>
            <div className="mt-6 flex items-center justify-center text-indigo-600 font-semibold">
              Admin Login <span className="ml-2">→</span>
            </div>
          </Link>
        </div>
      </main>

      <footer className="mt-16 text-gray-400 text-sm">
        &copy; 2025 Union Election Commission
      </footer>
    </div>
  );
}

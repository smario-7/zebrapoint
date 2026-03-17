import Navbar from "./Navbar";

export default function AppShell({ children, fullHeight }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main
        className={`flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 ${
          fullHeight ? "min-h-0 flex flex-col py-0" : "py-8"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

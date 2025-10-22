import { useState } from "react";
import MobileInput from "../MobileInput";
import MobileCard from "../MobileCard";
import { Link } from "react-router-dom";
import { useGovernance } from "@/hooks";

export default function GovernancePolls() {
  const { usePolls } = useGovernance();

  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<"all" | "open" | "closed">("open");
  const { data: polls, isLoading } = usePolls({ status, search });

  //   console.log(JSON.stringify(polls, null, 2));
  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-6 px-4 md:px-6 py-6 max-w-6xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl blur-3xl -z-10" />
          <div className="flex items-center justify-between mb-8 py-8 px-6 bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <span className="text-2xl">🗳️</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse" />
              </div>
              <div className="header-text">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent m-0 leading-tight">
                  Governance
                </h1>
                <p className="text-base text-slate-300 font-medium mt-2 mb-0 leading-relaxed">
                  Shape the future of the ecosystem through community-driven
                  decisions
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-2xl  ${
                  status === "open"
                    ? "to-emerald-500/20 bg-gradient-to-r border border-green-500/30 from-green-500/20"
                    : "to-red-500/20 bg-gradient-to-r border border-red-500/30 from-red-500/20"
                }`}
              >
                <span
                  className={`text-green-400 text-sm font-semibold ${
                    status === "open" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {polls.length} {status === "open" ? "Active" : "Closing"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Controls */}
        <div className="sticky top-4 z-20 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-2xl -z-10" />
            <div className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <MobileInput
                    label="Search polls"
                    placeholder="Find polls by title or description..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                    }}
                    variant="filled"
                    size="large"
                    rightIcon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    }
                    className="transition-all duration-300 focus-within:scale-[1.02] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                  />
                </div>
                <div className="lg:w-64">
                  <MobileInput
                    as="select"
                    label="Filter by status"
                    value={status}
                    onChange={(e) => {
                      if (
                        e.target.value !== "all" &&
                        e.target.value !== "open" &&
                        e.target.value !== "closed"
                      ) {
                        throw new Error("Invalid status");
                      }
                      setStatus(e.target.value);
                    }}
                    variant="filled"
                    size="large"
                    rightIcon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    }
                    className="transition-all duration-300 focus-within:scale-[1.02] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                  >
                    <option value="all">All polls</option>
                    <option value="open">🟢 Open polls</option>
                    <option value="closed">🔴 Closed polls</option>
                  </MobileInput>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Polls Grid */}
        <div className="space-y-6">
          {polls.length === 0 ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-2xl -z-10" />
              <MobileCard
                variant="outlined"
                padding="large"
                className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl shadow-2xl"
              >
                <div className="text-center py-20 px-8">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <span className="text-4xl">🗳️</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full animate-pulse" />
                  </div>
                  <h3 className="m-0 mb-4 text-white text-2xl font-bold">
                    No polls found
                  </h3>
                  <p className="m-0 text-slate-300 text-base leading-relaxed max-w-md mx-auto">
                    Try adjusting your search terms or filters to discover
                    governance polls that match your interests.
                  </p>
                </div>
              </MobileCard>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {polls.map((p, index) => (
                <Link
                  to={`/voting/p/${p.poll}`}
                  key={p.id}
                  className="text-inherit no-underline block group"
                >
                  <div className="relative flex flex-col gap-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative p-4 bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-white/20 overflow-hidden group/card animate-[slideInUp_0.6s_ease-out]">
                      {/* Animated gradient border */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                      {/* Status indicator with glow */}
                      <div className="absolute top-4 right-4 z-20">
                        <div
                          className={`relative px-3 py-2 rounded-2xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-300 ${
                            p.status?.toLowerCase() === "open"
                              ? "bg-gradient-to-br from-green-500/30 to-emerald-500/20 text-green-300 border border-green-400/40 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                              : p.status?.toLowerCase() === "closed"
                              ? "bg-gradient-to-br from-red-500/30 to-rose-500/20 text-red-300 border border-red-400/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                              : "bg-gradient-to-br from-gray-500/30 to-slate-500/20 text-gray-300 border border-gray-400/40"
                          }`}
                        >
                          {p.status || "Unknown"}

                          {p.status?.toLowerCase() === "open" && (
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-2xl animate-pulse" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 pt-2">
                        {/* Title with enhanced typography */}
                        <div className="pr-20">
                          <h3 className="font-bold text-xl leading-tight text-white transition-all duration-300">
                            {p.title}
                          </h3>
                        </div>

                        {/* Enhanced metadata with icons */}
                        <div className="flex flex-wrap gap-6">
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-blue-500/30">
                              <svg
                                className="w-4 h-4 text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold">
                              {p.voteCount} votes
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-purple-500/30">
                              <svg
                                className="w-4 h-4 text-purple-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold">
                              {new Date(p.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

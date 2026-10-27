"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Award,
  ShoppingBag,
  Users,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// 4 navigation destinations per user request:
// Left: Home, Rewards
// Center: Raised (+) Button with smooth curve
// Right: Refer & Earn, Store (Profile not required)
const leftNavItems: NavItem[] = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Rewards", href: "/rewards", icon: Award },
];

const rightNavItems: NavItem[] = [
  { name: "Refer & Earn", href: "/refer", icon: Users },
  { name: "Store", href: "/store", icon: ShoppingBag },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Create Post Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postType, setPostType] = useState<"QUESTION" | "OBSERVATION">("QUESTION");
  const [postCategory, setPostCategory] = useState("Water Quality");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || title.trim(),
          category: postCategory,
          postType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish question/post");
      }

      setFeedback("Your question has been published to the community!");
      setTitle("");
      setContent("");
      setTimeout(() => {
        setFeedback(null);
        setIsModalOpen(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to submit post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Bottom Navigation Bar matching curved center dome aesthetic from reference image */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden pointer-events-none"
      >
        <div className="max-w-[420px] w-full mx-auto px-4 pb-2 pt-6 pointer-events-auto relative">
          {/* Main Floating Rounded Bar */}
          <div className="relative bg-white rounded-[32px] border border-slate-200/90 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.14)] px-3 h-16 flex items-center justify-between">
            {/* The Seamless Architectural SVG Dome rising above the bar */}
            <div className="absolute -top-[29px] left-1/2 -translate-x-1/2 w-[96px] h-[31px] pointer-events-none z-10">
              <svg
                viewBox="0 0 96 31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-[0_-3px_5px_rgba(15,23,42,0.04)]"
              >
                {/* Filled dome body merging seamlessly with white bar */}
                <path
                  d="M 0,30 C 14,30 18,24 24,18 C 32,10 38,1 48,1 C 58,1 64,10 72,18 C 78,24 82,30 96,30 L 96,32 L 0,32 Z"
                  fill="#FFFFFF"
                />
                {/* Delicate matching top border contour */}
                <path
                  d="M 0,30 C 14,30 18,24 24,18 C 32,10 38,1 48,1 C 58,1 64,10 72,18 C 78,24 82,30 96,30"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </div>

            {/* Left Nav Destinations (Home, Rewards) */}
            <div className="flex items-center justify-around flex-1 pr-2">
              {leftNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center flex-1 py-1 min-h-[46px] rounded-2xl transition-all select-none relative",
                      isActive
                        ? "text-brand-purple font-bold"
                        : "text-slate-400 hover:text-slate-600 font-medium"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-transform",
                        isActive ? "scale-110 text-brand-purple" : "text-slate-400"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] mt-0.5 tracking-tight",
                        isActive ? "font-bold text-slate-900" : "font-medium text-slate-500"
                      )}
                    >
                      {item.name}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 w-1 h-1 rounded-full bg-brand-purple" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Center Space for Raised Plus Button */}
            <div className="relative flex items-center justify-center w-14 shrink-0 z-20">
              {/* Circular Gradient Plus Button (coral-rose to purple gradient matching reference image) */}
              <button
                onClick={() => setIsModalOpen(true)}
                type="button"
                aria-label="Ask Question or Post"
                className="absolute -top-[23px] w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-[#FF5722] via-[#E91E63] to-[#4F46E5] text-white shadow-[0_8px_20px_rgba(233,30,99,0.38)] flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 cursor-pointer group"
              >
                {/* White rounded squircle inside matching reference image */}
                <div className="w-[26px] h-[26px] rounded-[7px] bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:bg-white/30 transition-colors shadow-2xs">
                  <Plus className="w-4 h-4 stroke-[3] text-white" />
                </div>
              </button>
            </div>

            {/* Right Nav Destinations (Refer & Earn, Store) */}
            <div className="flex items-center justify-around flex-1 pl-2">
              {rightNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center flex-1 py-1 min-h-[46px] rounded-2xl transition-all select-none relative",
                      isActive
                        ? "text-brand-purple font-bold"
                        : "text-slate-400 hover:text-slate-600 font-medium"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-transform",
                        isActive ? "scale-110 text-brand-purple" : "text-slate-400"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] mt-0.5 tracking-tight",
                        isActive ? "font-bold text-slate-900" : "font-medium text-slate-500"
                      )}
                    >
                      {item.name}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 w-1 h-1 rounded-full bg-brand-purple" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* CONNECTED POPUP: ASK A QUESTION / POST COMMUNITY OBSERVATION              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 border border-slate-200 animate-fade-in max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF5722] via-[#E91E63] to-[#4F46E5] text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ask a Question or Post
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedback ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Published</h4>
                <p className="text-xs text-slate-500">{feedback}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPost} className="space-y-3.5 text-xs">
                {/* Post Type Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostType("QUESTION")}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer",
                      postType === "QUESTION"
                        ? "border-brand-purple bg-purple-50 text-brand-purple"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Question
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostType("OBSERVATION")}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer",
                      postType === "OBSERVATION"
                        ? "border-brand-purple bg-purple-50 text-brand-purple"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Observation
                  </button>
                </div>

                {/* Topic Category */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white text-slate-800"
                  >
                    <option value="Water Quality">Water Quality & Hardness</option>
                    <option value="RO Purifiers">RO Purifiers & Filters</option>
                    <option value="Geysers & Scaling">Geysers & Scaling</option>
                    <option value="Store Trials">Store Trials</option>
                    <option value="General Home Care">General Home Care</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {postType === "QUESTION" ? "Question *" : "Title *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      postType === "QUESTION"
                        ? "e.g. How often to change RO pre-filter with 400 ppm?"
                        : "e.g. High TDS observation in Phase 2"
                    }
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                {/* Description / Content */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Details
                  </label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter details..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <span>Publish</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

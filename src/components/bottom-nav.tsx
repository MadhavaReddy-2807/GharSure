"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Award,
  ShoppingBag,
  User,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  MessageSquare,
  HelpCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const leftNavItems: NavItem[] = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Rewards", href: "/rewards", icon: Award },
];

const rightNavItems: NavItem[] = [
  { name: "Store", href: "/store", icon: ShoppingBag },
  { name: "Profile", href: "/profile", icon: User },
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
      {/* Floating Bottom Navigation Bar matching curved center dome aesthetic */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden pointer-events-none"
      >
        <div className="max-w-md mx-auto px-3 pb-2 pt-4 pointer-events-auto relative">
          {/* Main Bar with Center Raised Dome */}
          <div className="relative bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/10 px-2 h-16 flex items-center justify-between">
            {/* Left Nav Items */}
            <div className="flex items-center justify-around flex-1">
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
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand-purple" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Center Curved Dome Anchor & Raised Glowing (+) Action Button */}
            <div className="relative flex items-center justify-center w-16 shrink-0">
              {/* Curved Architectural Arch under button */}
              <div className="absolute -top-6 w-16 h-12 bg-white/95 backdrop-blur-md rounded-t-full border-t border-x border-slate-200/80 -z-10 shadow-xs" />

              {/* The Raised Curved (+) Button (matching reference image with GharSure brand gradient) */}
              <button
                onClick={() => setIsModalOpen(true)}
                type="button"
                aria-label="Ask Question or Post Observation"
                className="absolute -top-5.5 w-13 h-13 rounded-full bg-gradient-to-tr from-brand-purple via-indigo-600 to-purple-500 text-white shadow-lg shadow-purple-600/35 border-3 border-white flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 cursor-pointer group"
              >
                {/* Rounded square container inside matching reference photo */}
                <div className="w-6 h-6 rounded-md bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Plus className="w-4 h-4 stroke-[3] text-white" />
                </div>
              </button>
            </div>

            {/* Right Nav Items */}
            <div className="flex items-center justify-around flex-1">
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
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand-purple" />
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-purple to-indigo-500 text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Community Post & Question
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Connect with neighbors & water specialists
                  </p>
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
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Post Published!</h4>
                <p className="text-xs text-slate-500">{feedback}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPost} className="space-y-4 text-xs">
                {/* Post Type Selector */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    What would you like to share?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPostType("QUESTION")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2",
                        postType === "QUESTION"
                          ? "border-brand-purple bg-purple-50 text-brand-purple font-bold shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <div>
                        <div className="text-xs">Ask a Question</div>
                        <div className="text-[9px] text-slate-400 font-normal">Get expert advice</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPostType("OBSERVATION")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2",
                        postType === "OBSERVATION"
                          ? "border-brand-purple bg-purple-50 text-brand-purple font-bold shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Eye className="w-4 h-4" />
                      <div>
                        <div className="text-xs">Water Observation</div>
                        <div className="text-[9px] text-slate-400 font-normal">TDS or scaling report</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Topic Category */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Topic Category *
                  </label>
                  <select
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white text-slate-800"
                  >
                    <option value="Water Quality">Water Quality & TDS Hardness</option>
                    <option value="RO Purifiers">RO Purifiers & Filter Cartridges</option>
                    <option value="Geysers & Scaling">Geysers & Limescale Removal</option>
                    <option value="Store Trials">Store Product Trial Feedback</option>
                    <option value="General Home Care">General Household Care</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {postType === "QUESTION" ? "Your Question *" : "Observation Headline *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      postType === "QUESTION"
                        ? "e.g. How often to change RO pre-filter with 450 ppm water?"
                        : "e.g. Noticed high sediment accumulation in Phase 2 pipeline"
                    }
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                {/* Description / Content */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Details & Context
                  </label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide any helpful context, apartment society name, or observations..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
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
                      <span>Publish to Community</span>
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

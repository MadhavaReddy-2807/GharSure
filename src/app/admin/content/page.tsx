"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Eye,
  EyeOff,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  desktop_image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  display_order: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  created_at: string;
}

interface HomeSection {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  is_visible: boolean;
  display_order: number;
}

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"BANNERS" | "SECTIONS">("BANNERS");
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [desktopImageUrl, setDesktopImageUrl] = useState("");
  const [mobileImageUrl, setMobileImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("/store");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [bannerStatus, setBannerStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("PUBLISHED");
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content/home");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load home content");
      setBanners(data.banners || []);
      setSections(data.sections || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleOpenCreateBanner = () => {
    setEditingBannerId(null);
    setBannerTitle("");
    setBannerSubtitle("");
    setDesktopImageUrl("");
    setMobileImageUrl("");
    setLinkUrl("/store");
    setDisplayOrder(banners.length + 1);
    setBannerStatus("PUBLISHED");
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: HomeBanner) => {
    setEditingBannerId(b.id);
    setBannerTitle(b.title);
    setBannerSubtitle(b.subtitle || "");
    setDesktopImageUrl(b.desktop_image_url);
    setMobileImageUrl(b.mobile_image_url || "");
    setLinkUrl(b.link_url || "/store");
    setDisplayOrder(b.display_order || 1);
    setBannerStatus(b.status || "PUBLISHED");
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBanner(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "banner",
          id: editingBannerId || undefined,
          title: bannerTitle.trim(),
          subtitle: bannerSubtitle.trim() || undefined,
          desktopImageUrl: desktopImageUrl.trim(),
          mobileImageUrl: mobileImageUrl.trim() || undefined,
          linkUrl: linkUrl.trim() || "/store",
          displayOrder: Number(displayOrder),
          status: bannerStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save banner");

      setSuccess("Home banner updated successfully!");
      setIsBannerModalOpen(false);
      fetchContent();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this promotional banner?")) return;
    try {
      const res = await fetch(`/api/admin/content/home?bannerId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete banner");

      setSuccess("Banner deleted.");
      fetchContent();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleSectionVisibility = async (sec: HomeSection) => {
    const nextVal = !sec.is_visible;
    try {
      const res = await fetch("/api/admin/content/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "section",
          sectionKey: sec.section_key,
          isVisible: nextVal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update section");

      setSections((prev) =>
        prev.map((s) => (s.section_key === sec.section_key ? { ...s, is_visible: nextVal } : s))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Home Page & Content Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage promotional hero banners, campaign announcements, and home page section visibility dynamically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchContent()}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          {activeTab === "BANNERS" && (
            <button
              onClick={handleOpenCreateBanner}
              className="px-3.5 py-2 rounded-lg bg-brand-purple hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Banner</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("BANNERS")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "BANNERS" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Hero Banners ({banners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SECTIONS")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === "SECTIONS" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Home Sections ({sections.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HERO BANNERS MANAGEMENT                                           */}
      {/* ========================================================================= */}
      {activeTab === "BANNERS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-3"
              >
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={banner.desktop_image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider ${
                        banner.status === "PUBLISHED" ? "bg-emerald-600 text-white" : "bg-slate-600 text-white"
                      }`}
                    >
                      {banner.status}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                      #{banner.display_order}
                    </span>
                  </div>
                </div>

                <div className="p-4 pt-1 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{banner.title}</h3>
                  {banner.subtitle && <p className="text-xs text-slate-500">{banner.subtitle}</p>}
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    Destination: {banner.link_url || "/store"}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEditBanner(banner)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-brand-purple hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HOME SECTIONS CONFIGURATION                                       */}
      {/* ========================================================================= */}
      {activeTab === "SECTIONS" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Section Identifier</th>
                  <th className="py-3 px-3">Display Heading</th>
                  <th className="py-3 px-3">Order</th>
                  <th className="py-3 px-4 text-right">Visibility Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sections.map((sec) => (
                  <tr key={sec.section_key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {sec.section_key}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-900 block">{sec.title}</span>
                      {sec.subtitle && <span className="text-[11px] text-slate-400">{sec.subtitle}</span>}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-700">
                      {sec.display_order}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleSectionVisibility(sec)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          sec.is_visible
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {sec.is_visible ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT BANNER MODAL                                                   */}
      {/* ========================================================================= */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingBannerId ? "Edit Hero Banner" : "Create Hero Promotional Banner"}
              </h3>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Banner Headline *</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Pure Water & Clean Living for Indian Homes"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Subtitle / Supporting Text</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g. Discover lab-verified purifiers and free doorstep trials..."
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Desktop Image URL *</label>
                <input
                  type="url"
                  required
                  value={desktopImageUrl}
                  onChange={(e) => setDesktopImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Destination Link</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/store or /rewards"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status *</label>
                <select
                  value={bannerStatus}
                  onChange={(e: any) => setBannerStatus(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                >
                  <option value="PUBLISHED">Published (Visible on Home)</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBanner}
                  className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingBanner && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Banner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

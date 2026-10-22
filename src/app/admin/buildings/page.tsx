"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Droplets,
  MapPin,
  Check,
  X,
  Layers,
} from "lucide-react";

interface Building {
  id: string;
  name: string;
  pincode: string;
  city: string;
  locality: string;
  total_units: number | null;
  water_source: string | null;
  avg_tds: number | null;
  observations_count: number;
}

interface Observation {
  id: string;
  building_id: string;
  building_name: string;
  locality: string;
  category: string;
  observation_data: Record<string, any>;
  moderation_status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason: string | null;
  created_at: string;
  reporter_id?: string | null;
}

export default function AdminBuildingsPage() {
  const [tab, setTab] = useState<"buildings" | "observations">("buildings");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add Building Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [pincode, setPincode] = useState("560001");
  const [city, setCity] = useState("Bengaluru");
  const [locality, setLocality] = useState("");
  const [units, setUnits] = useState<number>(200);
  const [waterSource, setWaterSource] = useState("Cauvery + Borewell Blend");
  const [avgTds, setAvgTds] = useState<number>(350);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      if (tab === "buildings") {
        const res = await fetch("/api/admin/buildings");
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to load buildings");
        setBuildings(data.buildings);
      } else {
        const res = await fetch("/api/admin/buildings?type=observations");
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to load observations");
        setObservations(data.observations);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pincode,
          city,
          locality,
          totalUnits: Number(units),
          waterSource,
          avgTds: Number(avgTds),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save building");

      setSuccess(`Building hub "${name}" registered successfully.`);
      setIsModalOpen(false);
      setName("");
      setLocality("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModerateObservation = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/admin/buildings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observationId: id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Moderation failed");
      setSuccess(`Observation status updated to ${status}.`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Building Intelligence & Ground Observations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Society water sources, baseline TDS benchmarks, dampness records, and resident report moderation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === "buildings" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Society / Hub</span>
            </button>
          )}
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab("buildings")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            tab === "buildings"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Registered Buildings & Hubs
        </button>
        <button
          onClick={() => setTab("observations")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            tab === "observations"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Resident Observations Review
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {tab === "buildings" ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Building / Society</th>
                  <th className="px-5 py-3.5">Locality & City</th>
                  <th className="px-5 py-3.5">Pincode</th>
                  <th className="px-5 py-3.5">Total Units</th>
                  <th className="px-5 py-3.5">Water Source</th>
                  <th className="px-5 py-3.5">Avg TDS</th>
                  <th className="px-5 py-3.5">Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Loading registered buildings...</span>
                    </td>
                  </tr>
                ) : buildings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No buildings registered yet.
                    </td>
                  </tr>
                ) : (
                  buildings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {b.name}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {b.locality}, {b.city}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-500">
                        {b.pincode}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700">
                        {b.total_units || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {b.water_source || "Unspecified"}
                      </td>
                      <td className="px-5 py-3">
                        {b.avg_tds ? (
                          <span className="font-mono font-bold text-blue-600">
                            {b.avg_tds} ppm
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {b.observations_count} reports
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Building</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Observation Details</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Reported Date</th>
                  <th className="px-5 py-3.5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      <span>Loading observations...</span>
                    </td>
                  </tr>
                ) : observations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No resident observations submitted yet.
                    </td>
                  </tr>
                ) : (
                  observations.map((obs) => (
                    <tr key={obs.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{obs.building_name}</div>
                        <div className="text-[11px] text-slate-400">{obs.locality}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {obs.category}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700 max-w-xs font-mono text-[11px]">
                        {JSON.stringify(obs.observation_data)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            obs.moderation_status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : obs.moderation_status === "REJECTED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {obs.moderation_status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(obs.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {obs.moderation_status !== "APPROVED" && (
                            <button
                              onClick={() => handleModerateObservation(obs.id, "APPROVED")}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-[11px] transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {obs.moderation_status !== "REJECTED" && (
                            <button
                              onClick={() => handleModerateObservation(obs.id, "REJECTED")}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium text-[11px] transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Building Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">
                  Register Apartment Hub
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBuilding} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Society / Complex Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Prestige Lakeside Habitat"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Locality
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="e.g. Varthur / Whitefield"
                    required
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="560087"
                    required
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Residential Units
                  </label>
                  <input
                    type="number"
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    min={1}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Baseline Tap TDS (ppm)
                  </label>
                  <input
                    type="number"
                    value={avgTds}
                    onChange={(e) => setAvgTds(Number(e.target.value))}
                    min={0}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Water Source
                </label>
                <select
                  value={waterSource}
                  onChange={(e) => setWaterSource(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="Cauvery Municipal Water">Cauvery Municipal Water</option>
                  <option value="Borewell + Private Tankers">Borewell + Private Tankers</option>
                  <option value="Cauvery + Borewell Blend">Cauvery + Borewell Blend</option>
                  <option value="100% Private Water Tankers">100% Private Water Tankers</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Register Building</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

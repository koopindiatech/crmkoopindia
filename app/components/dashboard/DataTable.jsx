"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MdClose } from "react-icons/md";
import {
  FaRegClock,
  FaRegCalendarAlt,
  FaRegCommentDots,
  FaCog,
} from "react-icons/fa";

// ── All possible columns ──────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "docId",         label: "Enquiry ID" },
  { key: "createdAt",     label: "Created At" },
  { key: "lastUpdatedAt", label: "Last Updated" },
  { key: "followUpDate",  label: "Next Follow Up" },
  { key: "name",          label: "Name" },
  { key: "email",         label: "Email" },
  { key: "mobile",        label: "Mobile" },
  { key: "company",       label: "Company" },
  { key: "city",          label: "City" },
  { key: "services",      label: "Services" },
  { key: "message",       label: "Message" },
  { key: "source",        label: "Source" },
];

const DEFAULT_VISIBLE = [
  "docId","createdAt","lastUpdatedAt","followUpDate",
  "name","email","mobile","company","city","services",
];

const LS_KEY = "enquiry_table_visible_cols";

// Load from localStorage or fall back to default
function loadVisibleCols() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
  } catch {}
  return new Set(DEFAULT_VISIBLE);
}

export default function DistributorTablePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Column visibility — initialised from localStorage
  const [visibleCols, setVisibleCols] = useState(() => loadVisibleCols());
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Close col picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target))
        setColPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Persist column selection to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...visibleCols]));
    } catch {}
  }, [visibleCols]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "enquiries"));
      const list = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));
      list.sort((a, b) => {
        const numA = parseInt((a.docId || "").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt((b.docId || "").replace(/\D/g, ""), 10) || 0;
        return numB - numA;
      });
      setData(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchValue) return data;
    const lower = searchValue.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(lower)
      )
    );
  }, [searchValue, data]);

  useEffect(() => { setCurrentPage(1); }, [searchValue, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ── Formatters ──────────────────────────────────────────────────────────────
  const formatDate = (val) => {
    if (!val) return "—";
    if (val?.seconds) {
      const d = new Date(val.seconds * 1000);
      return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    }
    if (typeof val === "string") return val;
    return "—";
  };

  const formatDateTime = (val) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return val; }
  };

  // Render a cell value based on column key
  const renderCell = (row, key) => {
    switch (key) {
      case "docId":
        return (
          <span className="text-[#2563eb] font-medium text-xs whitespace-nowrap">
            {row.docId}
          </span>
        );
      case "createdAt":
        return <span className="text-gray-600 text-xs whitespace-nowrap">{formatDate(row.createdAt)}</span>;
      case "lastUpdatedAt":
        return row.lastUpdatedAt ? (
          <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
            {formatDateTime(row.lastUpdatedAt)}
          </span>
        ) : <span className="text-gray-400 text-xs">—</span>;
      case "followUpDate":
        return row.followUpDate ? (
          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
            {row.followUpDate}
          </span>
        ) : <span className="text-gray-400 text-xs">—</span>;
      case "services": {
        const svc = row.services;
        if (!svc || (Array.isArray(svc) && svc.length === 0)) return <span className="text-gray-400 text-xs">—</span>;
        const display = Array.isArray(svc) ? svc.join(", ") : String(svc);
        return (
          <span className="text-gray-700 text-xs" title={display}>
            {display.length > 50 ? display.slice(0, 50) + "…" : display}
          </span>
        );
      }
      case "message":
        return (
          <span className="text-gray-600 text-xs" title={row.message || ""}>
            {row.message ? (row.message.length > 40 ? row.message.slice(0, 40) + "…" : row.message) : "—"}
          </span>
        );
      case "source":
        return row.source ? (
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
            {row.source}
          </span>
        ) : <span className="text-gray-400 text-xs">—</span>;
      default:
        return <span className="text-gray-700 text-xs whitespace-nowrap">{row[key] || "—"}</span>;
    }
  };

  const openEnquiry = (row) => {
    setSelectedEnquiry(row);
    setNewComment("");
    setFollowUpDate(row.followUpDate || "");
  };

  const handleSaveComment = async () => {
    if (!newComment.trim() || !selectedEnquiry?.docId) return;
    setSaving(true);
    try {
      const commentEntry = {
        text: newComment.trim(),
        followUpDate: followUpDate || null,
        addedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, "enquiries", selectedEnquiry.docId), {
        comments: arrayUnion(commentEntry),
        followUpDate: followUpDate || selectedEnquiry.followUpDate || null,
        lastUpdatedAt: new Date().toISOString(),
      });
      const updatedEnquiry = {
        ...selectedEnquiry,
        comments: [...(selectedEnquiry.comments || []), commentEntry],
        followUpDate: followUpDate || selectedEnquiry.followUpDate || null,
        lastUpdatedAt: new Date().toISOString(),
      };
      setSelectedEnquiry(updatedEnquiry);
      setData((prev) =>
        prev.map((e) => e.docId === selectedEnquiry.docId ? updatedEnquiry : e)
      );
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCol = (key) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const resetCols = () => {
    setVisibleCols(new Set(DEFAULT_VISIBLE));
  };

  // Ordered visible columns
  const activeColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  return (
    <>
      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-in { animation: mIn 0.2s cubic-bezier(.16,1,.3,1); }
        @keyframes mIn { from{opacity:0;transform:scale(0.98)} to{opacity:1;transform:scale(1)} }
        .enq-tr:hover { background: #f0f4ff; cursor: pointer; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
        .cog-spin:hover { animation: spin 0.6s linear infinite; }
      `}</style>

      <div className="p-4 bg-white min-h-screen">

        {/* ── Top bar: search + column picker ── */}
        <div className="mb-4 flex items-center gap-3">
          <input
            type="text"
            placeholder="Search enquiries..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border border-gray-400 px-3 py-2 rounded-md text-sm w-72 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
          />

          {/* Column visibility picker — settings icon only */}
          <div ref={colPickerRef} className="relative">
            <button
              onClick={() => setColPickerOpen((v) => !v)}
              title="Manage columns"
              className="flex items-center justify-center w-9 h-9 border border-gray-400 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition cursor-pointer"
            >
              <FaCog size={15} className="cog-spin" />
            </button>

            {colPickerOpen && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-52 py-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-1.5">
                  Toggle Columns
                </p>
                {ALL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols.has(col.key)}
                      onChange={() => toggleCol(col.key)}
                      className="accent-blue-500 w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                  <button
                    onClick={resetCols}
                    className="text-xs text-blue-500 hover:underline cursor-pointer"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-600">
            <div className="w-6 h-6 border-2 border-[#f56219] border-t-transparent rounded-full spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto border border-gray-400 rounded-sm">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    {activeColumns.map((col) => (
                      <th
                        key={col.key}
                        className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={activeColumns.length} className="text-center py-12 text-gray-500 text-xs">
                        No enquiries found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => (
                      <tr
                        key={row.docId || idx}
                        className="enq-tr border-b border-gray-200 transition-colors"
                        onClick={() => openEnquiry(row)}
                      >
                        {activeColumns.map((col) => (
                          <td key={col.key} className="px-4 py-1.5">
                            {renderCell(row, col.key)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION BAR ── */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-800">
                    {filteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-gray-800">
                    {Math.min(currentPage * rowsPerPage, filteredData.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-800">{filteredData.length}</span>{" "}
                  enquiries
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    ‹ Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`e-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-2.5 py-1 text-xs border rounded transition cursor-pointer ${
                            currentPage === p
                              ? "bg-[#f56219] text-white border-[#f56219] font-semibold"
                              : "border-gray-300 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── WIDE SPLIT POPUP ── */}
        {selectedEnquiry && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
            <div className="modal-in bg-white rounded-xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-[92vh] overflow-hidden border border-gray-200">
              {/* Popup Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex-shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">
                    {selectedEnquiry.name || "Enquiry Details"}
                  </h2>
                  <p className="text-xs text-[#f56219] font-semibold mt-0.5">
                    {selectedEnquiry.docId}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                >
                  <MdClose size={20} />
                </button>
              </div>

              {/* Two-column body */}
              <div className="flex flex-1 overflow-hidden">
                {/* LEFT — details + add comment */}
                <div className="w-[45%] flex-shrink-0 border-r border-gray-300 overflow-y-auto px-6 py-5 space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-3">
                      Lead Information
                    </h3>
                    <div className="space-y-2">
                      {[
                        ["Enquiry ID", selectedEnquiry.docId],
                        ["Name", selectedEnquiry.name],
                        ["Email", selectedEnquiry.email],
                        ["Mobile", selectedEnquiry.mobile],
                        ["Company", selectedEnquiry.company],
                        ["City", selectedEnquiry.city],
                        ["Source", selectedEnquiry.source],
                        ["Created At", formatDate(selectedEnquiry.createdAt)],
                        ["Follow Up", selectedEnquiry.followUpDate || "Not set"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className="text-xs text-gray-500 w-24 flex-shrink-0 pt-0.5">{label}</span>
                          <span className="text-sm text-gray-800 font-medium break-all">{value || "—"}</span>
                        </div>
                      ))}

                      {/* Services — special rendering */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 w-50 flex-shrink-0 pt-0.5">Services</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const svc = selectedEnquiry.services;
                            if (!svc || (Array.isArray(svc) && svc.length === 0))
                              return <span className="text-sm text-gray-400">—</span>;
                            const arr = Array.isArray(svc) ? svc : [svc];
                            return arr.map((s, i) => (
                              <span key={i} className="bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                                {s}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Message — full text */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 w-24 flex-shrink-0 pt-0.5">Message</span>
                        <span className="text-sm text-gray-800 font-medium leading-relaxed">
                          {selectedEnquiry.message || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Add Comment */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3">
                      Add Comment
                    </h3>
                    <textarea
                      rows={4}
                      placeholder="Write your follow-up notes here…"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full border border-gray-400 text-gray-600 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#f56219] transition placeholder-gray-300 bg-gray-50"
                    />
                    <div className="mt-2.5">
                      <label className="text-xs font-medium text-gray-900 mb-1.5 flex items-center gap-1.5">
                        <FaRegCalendarAlt size={10} className="text-gray-900" />
                        Follow Up Date
                      </label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full border border-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#f56219] transition bg-gray-50"
                      />
                    </div>
                    <button
                      onClick={handleSaveComment}
                      disabled={saving || !newComment.trim()}
                      className="mt-3 w-full bg-[#f56219] text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full spin" />
                          Saving…
                        </span>
                      ) : "Save Comment"}
                    </button>
                  </div>
                </div>

                {/* RIGHT — comment history */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                      <FaRegCommentDots className="text-gray-400" size={12} />
                      Comment History
                    </h3>
                    {(selectedEnquiry.comments || []).length > 0 && (
                      <span className="bg-gray-100 text-gray-500 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                        {(selectedEnquiry.comments || []).length} note{(selectedEnquiry.comments || []).length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {(selectedEnquiry.comments || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <FaRegCommentDots className="text-gray-400 mb-3" size={40} />
                      <p className="text-sm text-gray-600 font-medium">No comments yet</p>
                      <p className="text-xs text-gray-500 mt-1">Add the first note on the left</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...(selectedEnquiry.comments || [])].reverse().map((c, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-orange-300 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-orange-600">
                                {selectedEnquiry.name?.[0]?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-700">
                              {selectedEnquiry.name || "User"}
                            </span>
                            <span className="text-[10px] text-gray-700 ml-auto flex items-center gap-1">
                              <FaRegClock size={9} />
                              {c.addedAt ? formatDateTime(c.addedAt) : "—"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed pl-8">{c.text}</p>
                          {c.followUpDate && (
                            <div className="pl-8 mt-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full font-semibold">
                                <FaRegCalendarAlt size={9} />
                                Follow up: {c.followUpDate}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
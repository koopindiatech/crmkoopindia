"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  FaSearch,
  FaRegCalendarAlt,
  FaRegCommentDots,
} from "react-icons/fa";

export default function DistributorTablePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "enquiries"));
      const list = snapshot.docs.map((d) => ({ docId: d.id, ...d.data() }));

      // ✅ Sort by Enquiry ID descending (e.g. KI00008 → KI00007 → ...)
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
        String(val ?? "")
          .toLowerCase()
          .includes(lower),
      ),
    );
  }, [searchValue, data]);

  // Reset to page 1 when search or rowsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, rowsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  const formatDate = (val) => {
    if (!val) return "—";
    if (val?.seconds) {
      const d = new Date(val.seconds * 1000);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    if (typeof val === "string") return val;
    return "—";
  };

  const formatDateTime = (val) => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return val;
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
        prev.map((e) =>
          e.docId === selectedEnquiry.docId ? updatedEnquiry : e,
        ),
      );
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

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
      `}</style>

      <div className="p-4 bg-white min-h-screen">
        {/* Search bar */}
        <div className="mb-4">
          <div className="relative inline-block">
            <input
              type="text"
              placeholder="Search enquiries..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border border-gray-500 px-3 py-2 rounded-md text-sm w-72 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            />
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
            <div className="overflow-x-auto border border-gray-500 rounded-sm">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Enquiry ID
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Created At
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Last Updated
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Next Follow Up
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Email
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Mobile
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Company
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      City
                    </th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                      Service
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-12 text-gray-500 text-xs"
                      >
                        No enquiries found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => (
                      <tr
                        key={row.docId || idx}
                        className="enq-tr border-b border-gray-300 transition-colors"
                        onClick={() => openEnquiry(row)}
                      >
                        <td className="px-4 py-1.5 whitespace-nowrap text-[#2563eb] font-medium text-xs">
                          {row.docId}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-gray-600 text-xs">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap">
                          {row.lastUpdatedAt ? (
                            <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                              {formatDateTime(row.lastUpdatedAt)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap">
                          {row.followUpDate ? (
                            <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {row.followUpDate}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-gray-800">
                          {row.name || "—"}
                        </td>
                        <td className="px-4 py-1.5 text-gray-700">
                          {row.email || "—"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-gray-700">
                          {row.mobile || "—"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-gray-700">
                          {row.company || "—"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-gray-700">
                          {row.city || "—"}
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap text-gray-700">
                          {row.service || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── PAGINATION BAR ── */}
            <div className="flex items-center justify-between mt-3 px-1">
              {/* Left: total count + rows per page selector */}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-gray-800">
                    {filteredData.length === 0
                      ? 0
                      : (currentPage - 1) * rowsPerPage + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-gray-800">
                    {Math.min(currentPage * rowsPerPage, filteredData.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-800">
                    {filteredData.length}
                  </span>{" "}
                  enquiries
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>

              {/* Right: prev / page numbers / next */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* Prev */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    ‹ Prev
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1,
                    )
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="px-1.5 text-xs text-gray-400"
                        >
                          …
                        </span>
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
                      ),
                    )}

                  {/* Next */}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
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
                  {/* Info grid */}
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
                        ["Service", selectedEnquiry.service],
                        ["Created At", formatDate(selectedEnquiry.createdAt)],
                        ["Follow Up", selectedEnquiry.followUpDate || "Not set"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className="text-sm text-gray-700 w-24 flex-shrink-0 pt-0.5">
                            {label}
                          </span>
                          <span className="text-sm text-gray-800 font-medium break-all">
                            {value || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
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
                      ) : (
                        "Save Comment"
                      )}
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
                        {(selectedEnquiry.comments || []).length} note
                        {(selectedEnquiry.comments || []).length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {(selectedEnquiry.comments || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <FaRegCommentDots className="text-gray-400 mb-3" size={40} />
                      <p className="text-sm text-gray-600 font-medium">
                        No comments yet
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Add the first note on the left
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...(selectedEnquiry.comments || [])]
                        .reverse()
                        .map((c, i) => (
                          <div
                            key={i}
                            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5"
                          >
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

                            <p className="text-sm text-gray-700 leading-relaxed pl-8">
                              {c.text}
                            </p>

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
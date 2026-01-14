"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CustomTable from "../../utills/customTable";

export default function DistributorTablePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  // 🔹 Fetch enquiries
  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const snapshot = await getDocs(collection(db, "enquiries"));
        const list = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        }));
        setData(list);
      } catch (error) {
        console.error("Error fetching enquiries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, []);

  // 🔹 Search filter
  const filteredData = useMemo(() => {
    if (!searchValue) return data;

    const lower = searchValue.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(lower)
      )
    );
  }, [searchValue, data]);

  // 🔹 Table columns (Firestore fields only)
  const columns = useMemo(
    () => [
      { Header: "Enquiry ID", accessor: "docId" },
      { Header: "Name", accessor: "name" },
      { Header: "Email", accessor: "email" },
      { Header: "Mobile", accessor: "mobile" },
      { Header: "Company", accessor: "company" },
      { Header: "City", accessor: "city" },
      { Header: "Service", accessor: "service" },
      { Header: "Created At", accessor: "createdAt" },
    ],
    []
  );

  return (
    <div className="p-4">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search enquiries..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="border px-3 py-2 rounded-md w-full max-w-sm"
        />
      </div>

      {/* Table */}
      <CustomTable
        uniqueDataKey="docId"
        data={filteredData}
        columns={columns}
        loading={loading}
      />
    </div>
  );
}

"use client";
import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CustomTable from "../utills/customTable";
import { Settings } from "lucide-react";

export default function DistributorTablePage() {
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  //  Fetch Firestore Data
  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "enquiries"));
        const data = querySnapshot.docs.map((doc) => {
          const d = doc.data();

          //  Handle Firestore Timestamp
          const createdAt =
            d.createdAt?.seconds || d.createdAt?.toDate
              ? new Date(
                  d.createdAt?.seconds
                    ? d.createdAt.seconds * 1000
                    : d.createdAt.toDate()
                ).toLocaleDateString()
              : "N/A";

          return {
            id: doc.id,
            ...d,
            createdAt,
          };
        });

        setDistributors(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error fetching distributors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDistributors();
  }, []);

  //  Search & Date Filter
  const handleSearchDistributors = () => {
    const hasText = searchValue.trim() !== "";
    const hasStart = !!startDate;
    const hasEnd = !!endDate;

    if (!hasText && !hasStart && !hasEnd) {
      setFilteredData(distributors);
      return;
    }

    const toMillis = (val) => {
      if (!val) return null;
      if (val.toDate) return val.toDate().getTime();
      const parsed = Date.parse(val);
      return isNaN(parsed) ? null : parsed;
    };

    const startMillis = hasStart
      ? new Date(startDate + "T00:00:00").getTime()
      : null;
    const endMillis = hasEnd
      ? new Date(endDate + "T23:59:59.999").getTime()
      : null;

    const lowerSearch = searchValue.toLowerCase();

    const filtered = distributors.filter((d) => {
      const createdMillis = toMillis(d.createdAt);
      if (hasStart && (!createdMillis || createdMillis < startMillis))
        return false;
      if (hasEnd && (!createdMillis || createdMillis > endMillis)) return false;

      if (hasText) {
        return Object.values(d).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(lowerSearch)
        );
      }
      return true;
    });

    setFilteredData(filtered);
  };

  // Table Columns
  const columns = useMemo(
    () => [
      { Header: "Doc ID", accessor: "id" },
      { Header: "Full Name", accessor: "name" },
      { Header: "Company Name", accessor: "company" },
      { Header: "Email", accessor: "email" },
      { Header: "Phone", accessor: "mobile" },
      { Header: "City", accessor: "city" },
      { Header: "Service", accessor: "service" },
      { Header: "Created", accessor: "createdAt" },
    ],
    []
  );

  //  Load saved column settings
  useEffect(() => {
    const savedVisibility = localStorage.getItem("visibleColumns");
    const savedOrder = localStorage.getItem("columnOrder");

    if (savedVisibility && savedOrder) {
      setVisibleColumns(JSON.parse(savedVisibility));
      setColumnOrder(JSON.parse(savedOrder));
    } else {
      const initialVisibility = {};
      columns.forEach((col) => (initialVisibility[col.accessor] = true));
      setVisibleColumns(initialVisibility);
      setColumnOrder(columns.map((col) => col.accessor));
    }
  }, [columns]);

  // ✅ Save settings to localStorage
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0) {
      localStorage.setItem("visibleColumns", JSON.stringify(visibleColumns));
      localStorage.setItem("columnOrder", JSON.stringify(columnOrder));
    }
  }, [visibleColumns, columnOrder]);

  // ✅ Toggle columns
  const handleToggleColumn = (accessor) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [accessor]: !prev[accessor] };

      setColumnOrder((prevOrder) => {
        if (updated[accessor] && !prevOrder.includes(accessor)) {
          return [...prevOrder, accessor];
        }
        if (!updated[accessor]) {
          return prevOrder.filter((col) => col !== accessor);
        }
        return prevOrder;
      });

      return updated;
    });
  };

  // ✅ Columns to render in order (safe filtering)
  const filteredColumns = useMemo(() => {
    return columnOrder
      .map((accessor) => columns.find((col) => col.accessor === accessor))
      .filter((col) => col && visibleColumns[col.accessor]);
  }, [columnOrder, columns, visibleColumns]);

  // ✅ Loading State
  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">Loading data...</div>
    );
  }

  return (
    <div className="p-1 relative overflow-y-auto">
      {/* Header Section */}
      <div className="flex gap-2 items-center pb-1 flex-wrap">
        <div className="flex gap-2 items-center p-1 rounded bg-gray-200">
          <div className="flex flex-row items-center gap-1">
            <span className="text-[12px] text-gray-600">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-[12px] border border-gray-600 rounded px-2"
            />
          </div>
          <div className="flex flex-row items-center gap-1">
            <span className="text-[12px] text-gray-600">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-[12px] border border-gray-600 rounded px-2"
            />
          </div>
          <div className="flex ml-2">
            <button
              onClick={handleSearchDistributors}
              className="text-white bg-blue-500 px-2 py-1 rounded-md text-xs mt-auto cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border border-gray-300 px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-gray-100 border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-200"
          >
            <Settings className="w-5 h-5 text-gray-700 cursor-pointer" />
          </button>
        </div>
      </div>

      {/* ✅ Table */}
      {filteredColumns.length > 0 ? (
        <CustomTable
          uniqueDataKey="id"
          data={filteredData}
          avoidCols={[]}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          columns={filteredColumns}
          searchValue={searchValue}
        />
      ) : (
        <p className="text-gray-500 text-center mt-10">
          No columns selected. Please select columns from settings ⚙️
        </p>
      )}

      {/* Column Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[90%] sm:w-[500px] relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Select Columns to Display
            </h2>

            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {columns.map((col) => (
                <label
                  key={col.accessor}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.accessor] || false}
                    onChange={() => handleToggleColumn(col.accessor)}
                  />
                  {col.Header}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

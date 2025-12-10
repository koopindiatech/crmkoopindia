"use client";
import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import CustomTable from "../../utills/customTable";
import { Settings, Download } from "lucide-react";
import { getDownloadURL, ref, listAll } from "firebase/storage";
import JSZip from "jszip";
import toast from "react-hot-toast";
import { saveAs } from "file-saver";

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
  const [selectedImage, setSelectedImage] = useState(null);

  const getDistributorImages = async (docId) => {
    try {
      const folderRef = ref(storage, `distributors/${docId}`);
      const result = await listAll(folderRef);
      const urls = await Promise.all(
        result.items.map((item) => getDownloadURL(item))
      );
      return urls.slice(0, 50);
    } catch (error) {
      console.warn(`No images found for ${docId}:`, error);
      return [];
    }
  };

  useEffect(() => {
    const fetchDistributors = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "distributors"));

        const distributorsData = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const distributor = { id: doc.id, ...data };
            const urls = await getDistributorImages(distributor.docId);
            distributor.images = urls;
            return distributor;
          })
        );

        setDistributors(distributorsData);
        setFilteredData(distributorsData);
      } catch (error) {
        console.error("Error fetching distributors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDistributors();
  }, []);

  //  Search filter
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

    let startMillis = hasStart
      ? new Date(startDate + "T00:00:00").getTime()
      : null;
    let endMillis = hasEnd
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
      {
        Header: "Doc ID",
        accessor: "docId",
        Cell: ({ row, value }) => (
          <button className="text-blue-600 font-medium ">{value}</button>
        ),
      },
      {
        Header: "Update",
        accessor: "update",
        Cell: () => (
          <button className="text-blue-600 font-medium">Update</button>
        ),
      },

      { Header: "Full Name", accessor: "fullName" },
      { Header: "Company Name", accessor: "companyName" },
      { Header: "Email", accessor: "email" },
      { Header: "Phone", accessor: "phone" },
      { Header: "Aadhar Number", accessor: "aadharNumber" },
      { Header: "PAN Number", accessor: "panNumber" },
      { Header: "GST Number", accessor: "gstNumber" },
      { Header: "FSSAI License", accessor: "fssaiLicense" },
      { Header: "Shop License", accessor: "shopLicense" },
      { Header: "Business Type", accessor: "businessType" },
      { Header: "Experience (Years)", accessor: "experienceYears" },
      { Header: "Investment Capacity", accessor: "investmentCapacity" },
      {
        Header: "Brands Associated",
        accessor: "brandsAssociated",
        Cell: ({ value }) => (value?.length ? value.join(", ") : "—"),
      },
      {
        Header: "Interested Categories",
        accessor: "interestedCategories",
        Cell: ({ value }) => (value?.length ? value.join(", ") : "—"),
      },
      {
        Header: "Images",
        accessor: "images",
        Cell: ({ row }) => {
          const hasImages =
            row.original.images && row.original.images.length > 0;

          return hasImages ? (
            <button
              onClick={() =>
                setSelectedImage({
                  urls: row.original.images,
                  name: row.original.fullName || row.original.docId,
                  details: row.original,
                })
              }
              className="text-blue-600 hover:underline cursor-pointer"
            >
              View Images
            </button>
          ) : (
            <span className="text-gray-600 text-xs">No images</span>
          );
        },
      },
      { Header: "Product Categories", accessor: "productCategories" },
      { Header: "Retailers Covered", accessor: "retailersCovered" },
      { Header: "Territory Interested", accessor: "territoryInterested" },
      { Header: "Warehouse Details", accessor: "warehouseDetails" },
      { Header: "Delivery Vehicles", accessor: "deliveryVehicles" },
      { Header: "Vehicle Count", accessor: "vehicleCount" },
      { Header: "Address", accessor: "address" },
      { Header: "City", accessor: "city" },
      { Header: "Pincode", accessor: "pincode" },
      { Header: "Payment Reference ID", accessor: "referenceId" },
      {
        Header: "Reference ID At",
        accessor: "referenceIdAt",
        className: "min-w-[130px] max-w-[240px]",
      },
      { Header: "Created At", accessor: "createdAt" },
    ],
    []
  );

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
      setColumnOrder([]);
    }
  }, [columns]);

  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0) {
      localStorage.setItem("visibleColumns", JSON.stringify(visibleColumns));
      localStorage.setItem("columnOrder", JSON.stringify(columnOrder));
    }
  }, [visibleColumns, columnOrder]);

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

  const filteredColumns = useMemo(() => {
    return columnOrder
      .map((accessor) => columns.find((col) => col.accessor === accessor))
      .filter(Boolean);
  }, [columnOrder, columns]);

  return (
    <div className="p-1 relative overflow-y-auto">
      {/* Filter Header */}
      <div className="flex gap-2 items-center pb-1 flex-wrap">
        {/* <div className="flex gap-2 items-center p-1 rounded bg-gray-200">
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
        </div> */}

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border border-gray-400 px-3 py-1 rounded-md "
          />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-gray-100 border border-gray-300 px-3 py-1 rounded-md hover:bg-gray-200"
          >
            <Settings className="w-5 h-5 text-gray-700 cursor-pointer" />
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredColumns.length > 0 ? (
        <CustomTable
          uniqueDataKey="docId"
          data={filteredData}
          columns={filteredColumns}
          searchValue={searchValue}
          loading={loading}
        />
      ) : (
        <p className="text-gray-500 text-center mt-10">
          No columns selected. Please select columns from settings ⚙️
        </p>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 z-50">
          <div className="relative bg-white rounded-lg shadow-lg w-[95%] sm:w-[800px] h-[95vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-center p-3 border-b border-gray-300 bg-white sticky top-0 z-50">
              <h2 className="text-lg font-semibold text-gray-800 text-center">
                {selectedImage.name} - {selectedImage.urls.length} Image
                {selectedImage.urls.length > 1 && "s"}
              </h2>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute right-3 text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer"
              >
                ✖
              </button>
            </div>

            {/* Scrollable Images Section */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedImage.urls.map((url, index) => (
                  <div
                    key={index}
                    className="relative group border border-gray-300 rounded-md overflow-hidden bg-gray-50"
                  >
                    <img
                      src={url}
                      alt={`Distributor ${index + 1}`}
                      className="w-full h-48 object-cover rounded-md cursor-pointer"
                    />

                    {/* Single Image Download */}
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(url, {
                            cache: "no-cache",
                          });
                          const blob = await response.blob();
                          saveAs(
                            blob,
                            `${selectedImage.name}_image_${index + 1}.jpg`
                          );
                        } catch (err) {
                          console.error("Image download failed:", err);
                          toast.error(
                            "Failed to download this image. Please try again."
                          );
                        }
                      }}
                      className="absolute bottom-3 right-3 bg-white text-gray-800 rounded-full p-2 shadow-md 
                 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-400 cursor-pointer"
                      title="Download this image"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Download All Images */}
              {selectedImage.urls.length > 0 && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={async () => {
                      try {
                        const zip = new JSZip();
                        const folder = zip.folder(
                          selectedImage.name || "distributor"
                        );
                        const blobs = await Promise.all(
                          selectedImage.urls.map(async (url, i) => {
                            const response = await fetch(url, {
                              cache: "no-cache",
                            });
                            return response.blob();
                          })
                        );

                        blobs.forEach((blob, i) => {
                          folder.file(`image_${i + 1}.jpg`, blob);
                        });

                        const zipBlob = await zip.generateAsync({
                          type: "blob",
                        });
                        saveAs(
                          zipBlob,
                          `${selectedImage.name || "distributor"}_images.zip`
                        );
                      } catch (err) {
                        console.error("ZIP download failed:", err);
                        toast.error(
                          "Failed to download all images. Please try again."
                        );
                      }
                    }}
                    className="bg-[#f56219] text-white px-5 py-2 rounded-md font-medium 
              hover:bg-[#bd460a] transition-colors cursor-pointer"
                  >
                    Download All Image
                  </button>
                </div>
              )}

              {/* Distributor Info */}
              <div className="text-sm text-gray-700 border-t pt-3 mt-5 space-y-1">
                <p>
                  <strong>Doc ID:</strong> {selectedImage.details.docId}
                </p>
                <p>
                  <strong>Company:</strong> {selectedImage.details.companyName}
                </p>
                <p>
                  <strong>Email:</strong> {selectedImage.details.email}
                </p>
              </div>
            </div>
          </div>
        </div>
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
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
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

"use client";
import React, { useEffect, useMemo } from "react";
import {
  useTable,
  useSortBy,
  usePagination,
  useGlobalFilter,
} from "react-table";
import {
  MdOutlineArrowBackIos,
  MdOutlineArrowForwardIos,
} from "react-icons/md";

const HighlightText = ({ text, highlight }) => {
  if (!highlight) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-orange-400 text-black">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const CustomTable = ({
  columns,
  data,
  searchValue,
  loading,
  selectedRows,
  setSelectedRows,
}) => {
  const tableData = useMemo(() => data || [], [data]);

  const tableInstance = useTable(
    {
      columns,
      data: tableData,
      initialState: { pageIndex: 0, pageSize: 50 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    setGlobalFilter,
    canPreviousPage,
    canNextPage,
    pageOptions,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex },
  } = tableInstance;

  useEffect(() => {
    setGlobalFilter(searchValue || "");
  }, [searchValue]);

  return (
    <div className="w-full h-[calc(100vh-90px)] flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Table wrapper */}
      <div className="flex-1 overflow-auto">
        <table
          {...getTableProps()}
          className="min-w-full border-separate border-spacing-0 text-sm"
        >
          {/* Header */}
          <thead className="bg-gray-100 sticky top-0  shadow-sm z-10">
            {headerGroups.map((headerGroup) => {
              const { key: headerKey, ...headerProps } =
                headerGroup.getHeaderGroupProps();
              return (
                <tr
                  key={headerKey}
                  {...headerProps}
                  className="text-gray-900 gap-2 font-semibold "
                >
                  {headerGroup.headers.map((column) => {
                    const { key: thKey, ...thProps } = column.getHeaderProps(
                      column.getSortByToggleProps()
                    );
                    return (
                      <th
                        key={thKey}
                        {...thProps}
                        className={`${column.className}px-2 py-2 text-left gap-2 border-b border-gray-200 bg-blue-100`}
                      >
                        <div className="flex items-center gap-5">
                          {column.render("Header")}
                          <span className="text-xs">
                            {column.isSorted
                              ? column.isSortedDesc
                                ? "🔽"
                                : "🔼"
                              : ""}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              );
            })}
          </thead>

          <tbody {...getTableBodyProps()}>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center bg-white"
                >
                  <div className="flex flex-col items-center justify-center">
                    <img
                      src="/loader.gif"
                      alt="Loading..."
                      className="w-10 h-10 opacity-80"
                    />
                    <p className="text-gray-500 text-xs mt-2 animate-pulse">
                      Loading data...
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              page.map((row) => {
                prepareRow(row);
                const { key: rowKey, ...rowProps } = row.getRowProps();
                return (
                  <tr
                    key={rowKey}
                    {...rowProps}
                    className="hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    {row.cells.map((cell) => {
                      const { key: cellKey, ...cellProps } =
                        cell.getCellProps();
                      return (
                        <td
                          key={cellKey}
                          {...cellProps}
                          className="p-2 py-1.5 text-gray-900 border border-gray-200 whitespace-nowrap font-inter text-xs"
                        >
                          {cell.column.id === "select" ? (
                            cell.render("Cell")
                          ) : cell.column.id === "createdAt" ? (
                            cell.value?.toDate ? (
                              cell.value.toDate().toLocaleDateString()
                            ) : typeof cell.value === "string" ? (
                              cell.value.split(" ")[0]
                            ) : (
                              ""
                            )
                          ) : cell.column.id === "docId" ||
                            cell.column.id === "images" ||
                            cell.column.id === "serviceStatus" ? (
                            cell.render("Cell")
                          ) : (
                            <HighlightText
                              text={String(cell.value ?? "")}
                              highlight={searchValue}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.length > 0 && (
        <div className="flex gap-4 py-2 justify-between items-center px-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => previousPage()}
              disabled={!canPreviousPage}
              className="p-2 text-gray-500 disabled:opacity-40"
            >
              <MdOutlineArrowBackIos />
            </button>
            <span className="text-gray-600 text-xs">
              Page {pageIndex + 1} of {pageOptions.length}
            </span>
            <button
              onClick={() => nextPage()}
              disabled={!canNextPage}
              className="p-2 text-gray-500 disabled:opacity-40"
            >
              <MdOutlineArrowForwardIos />
            </button>
          </div>

          <select
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border p-1 rounded text-xs"
          >
            {[50, 100, 150, 200].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default CustomTable;

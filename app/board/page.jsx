"use client";
import { useState } from "react";
import ProtectedRoute from "./ProtectedRoute";
import CRMHeader from "../components/ui/Header";
import DataTable from "../components/dashboard/DataTable";
import Blog from "../components/blog/blog";
import ManageUser from "../components/manageusers/manageUsers";

export default function DashboardPage() {
  const [module, setModule] = useState("board");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header with handler */}
        <CRMHeader onModuleChange={setModule} />

        <main className="pt-[45px]">
          {/* defaults dashboard content */}
          {module === "board"}

           {/* distributor MGMT content */}
          {module === "dashboard" && <DataTable />}

          {/* service management content*/}
          {module === "blog" && <Blog />}

          {/* manage users content */}
          {module === "manage-users" && <ManageUser />}
        </main>
      </div>
    </ProtectedRoute>
  );
}

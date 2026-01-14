"use client";
import { useState,useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowForward, IoIosClose } from "react-icons/io";
import { MdDashboard, MdOutlineManageAccounts } from "react-icons/md";
import { FaUserCog, FaTools } from "react-icons/fa";
import { RiFileSettingsLine } from "react-icons/ri";
import { BsGraphUp } from "react-icons/bs";
import { TbSettingsCog } from "react-icons/tb";
import Image from "next/image";
import { Users } from "lucide-react";
import { Network } from "lucide-react";

export default function CRMHeader({ onModuleChange, selected }) {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [role, setRole] = useState("");
    let d6521f = { color: selected ? "#fff" : "#d6521f", fontSize: 22 };


  useEffect(() => {
    const r = localStorage.getItem("role");
    setRole(r);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleLogoClick = () => {
    router.push("/board");
  };

  return (
    <>
      {/* header */}
      <header className="bg-[#d7efff] fixed top-0 left-0 w-full z-50 px-2 py-1 flex justify-between items-center shadow-sm">
        {/* left Side */}
        <div className="flex items-center gap-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1 bg-white/30 rounded-md"
          >
            <IoIosArrowForward
              className={`text-gray-600 cursor-pointer transition-transform duration-300 ${
                showSidebar ? "rotate-180" : ""
              }`}
              fontSize={22}
            />
          </button>

          <button
            onClick={() => {
              onModuleChange("board");
              router.push("/board");
            }}
          >
            <img
              src="/flatlogoa.png"
              alt="logo"
              className="h-[35px] w-auto select-none cursor-pointer"
            />
          </button>
        </div>

        {/* Logout button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-58 bg-white shadow-lg z-40 transform transition-transform duration-300 ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="text-white flex justify-between items-center px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <MdDashboard className="text-xl" />
            <span>Dashboard</span>
          </div>
          <IoIosClose
            className="text-2xl cursor-pointer hover:rotate-90 transition-transform"
            onClick={() => setShowSidebar(false)}
          />
        </div>

        {/* menu items */}
        <ul className=" text-gray-600 font-medium">
          {/* Dashboard */}
          <li
            className="flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-300  transition-all border-b border-gray-300 hover:border-gray-400"
            onClick={() => {
              onModuleChange("board");
              setShowSidebar(false);
            }}
          >
            <img src="/Dashboard.png" alt="distributor icon" className="h-5 w-5"/>
            <span>Dashboard</span>
          </li>

          {/* Distributor Management */}
          <li
            className="flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-300 border-b border-gray-300 hover:border-gray-400 transition-all"
            onClick={() => {
              onModuleChange("dashboard");
              setShowSidebar(false);
            }}
          >
            <img src="/leads.png" alt="Leads icon" className="h-5 w-5"/>
            <span>Enquiries Management</span>
          </li>


          {/* Service Activation Panel */}
          <li
            className="flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-300 border-b border-gray-300 hover:border-gray-400 transition-all"
            onClick={() => {
              onModuleChange("blog");
              setShowSidebar(false);
            }}
          >
            <img src="/blog.png" alt="blog icon" className="h-5 w-5"/>
            <span>Blog Section</span>
          </li>

          {/* Manage Users */}
          {role === "admin" && (
            <li
              className="flex items-center gap-4 p-3  cursor-pointer hover:bg-gray-300 border-b border-gray-300 hover:border-gray-400 transition-all"
              onClick={() => {
                onModuleChange("manage-users");
                setShowSidebar(false);
              }}
            >
            <img src="/hrms.png" alt="service icon" className="h-5 w-5"/>
              <span>Manage Users</span>
            </li>
          )}
        </ul>

        {/* bottom logo */}
        <div className="absolute bottom-4 left-0 w-full flex justify-center">
          <img
            src="/flatlogoa.png"
            alt="iClickDistributor Logo"
            className=" h-40px w-auto"
          />
        </div>
      </aside>
    </>
  );
}

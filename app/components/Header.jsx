// "use client";
// import { useState } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import { IoIosArrowForward } from "react-icons/io";
// import { useRouter } from "next/navigation";

// export default function CRMHeader() {
//   const router = useRouter();
//   const [showSidebar, setShowSidebar] = useState(true);

//   const handleLogout = () => {
//     localStorage.removeItem("user"); 
//     router.push("/login"); 
//   };

//   return (
//     <header className="bg-[#e0f0fb] fixed top-0 left-0 w-full z-50 px-4 py-2 flex justify-between items-center shadow-sm">
//       {/* LEFT: Logo Section */}
//       <div className="flex items-center gap-2">
//         <button className="p-1 bg-white/30 rounded-md">
//           <IoIosArrowForward
//             onClick={() => setShowSidebar(!showSidebar)}
//             className="text-gray-600 cursor-pointer"
//             fontSize={22}
//           />
//         </button>
//         <button>
//           <img
//             src="/flatlogoa.png"
//             alt="logo"
//             className="h-[35px] w-auto select-none cursor-pointer"
//           />
//         </button>
//       </div>

//       {/* RIGHT: Logout Button */}
//       <div className="flex items-center gap-4">
//         <button
//           onClick={handleLogout}
//           className="bg-[#f56219] hover:bg-[#bd460a] text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer"
//         >
//           Logout
//         </button>
//       </div>
//     </header>
//   );
// }

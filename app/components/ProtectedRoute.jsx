"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) return  <div className="w-full min-h-[40vh] flex flex-col items-center justify-center">
        <img src="/loader.gif" className="h-[60px] w-auto" alt="loading" />
        {/* <p className="text-xl font-bold text-gray-500 mt-3">
          Loading... please wait
        </p> */}
      </div>;

  return <>{children}</>;
}

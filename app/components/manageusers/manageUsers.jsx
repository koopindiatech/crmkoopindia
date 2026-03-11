"use client";
import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, setDoc, doc, updateDoc } from "firebase/firestore";
import { MdClose } from "react-icons/md";
import toast from "react-hot-toast";

const ManageUsers = () => {
  const [showForm, setShowForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [role, setRole] = useState("");
  const [users, setUsers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nextUID, setNextUID] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  const selectedUserRef = useRef(null);

  const [updateUID, setUpdateUID] = useState("");
  const [updateName, setUpdateName] = useState("");
  const [updateEmail, setUpdateEmail] = useState("");
  const [updateEmployeeId, setUpdateEmployeeId] = useState("");
  const [updatePhone, setUpdatePhone] = useState("");
  const [updatePassword, setUpdatePassword] = useState("");
  const [updateRole, setUpdateRole] = useState("");

  useEffect(() => {
    const r = localStorage.getItem("role");
    if (r !== "admin") {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/dashboard";
    }
  }, []);

  const loadUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    let usersList = [];
    let maxNumber = 0;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      usersList.push(data);
      const id = data.uid;
      if (id) {
        const num = parseInt(id.replace("UID", ""));
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });

    setUsers(usersList);
    setAllUsers(usersList);
    const nextNumber = (maxNumber + 1).toString().padStart(3, "0");
    setNextUID(`UID${nextNumber}`);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userDocRef = doc(collection(db, "users"), nextUID);
    await setDoc(userDocRef, {
      uid: nextUID,
      name,
      email,
      employeeId,
      phone,
      password,
      role,
      createdAt: new Date(),
    });
    toast.success(`User created successfully! ${nextUID}`);
    setName(""); setEmail(""); setEmployeeId(""); setPhone(""); setPassword(""); setRole("");
    setShowForm(false);
    loadUsers();
  };

  const openUpdateForm = (user) => {
    if (!user || !user.uid) {
      toast.error("Invalid user selected.");
      return;
    }
    selectedUserRef.current = user.uid;

    setUpdateUID(user.uid);
    setUpdateName(user.name || "");
    setUpdateEmail(user.email || "");
    setUpdateEmployeeId(user.employeeId || "");
    setUpdatePhone(user.phone || "");
    setUpdatePassword(user.password || "");
    setUpdateRole(user.role || "");
    setShowUpdateForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const targetUID = updateUID || selectedUserRef.current;

    if (!targetUID) {
      toast.error("User ID not found. Please try again.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", targetUID);
      await updateDoc(userDocRef, {
        name: updateName,
        email: updateEmail,
        employeeId: updateEmployeeId,
        phone: updatePhone,
        password: updatePassword,
        role: updateRole,
        updatedAt: new Date(),
      });
      toast.success(`User ${targetUID} updated successfully!`);
      setShowUpdateForm(false);
      selectedUserRef.current = null;
      loadUsers();
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update user. Please try again.");
    }
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.toString().replace(
      regex,
      `<mark class="bg-yellow-300 text-black">$1</mark>`
    );
  };

  return (
    <div className="p-1">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#f56219] text-white px-2 py-1 rounded-lg cursor-pointer text-sm"
        >
          Add User
        </button>
        <input
          type="text"
          placeholder="Search Users..."
          className="p-1 border border-gray-400 px-3 py-1 rounded-md text-sm"
          onChange={(e) => {
            const value = e.target.value.toLowerCase();
            setSearchValue(value);
            if (!value.trim()) {
              setUsers(allUsers);
              return;
            }
            const filtered = allUsers.filter((user) =>
              Object.values(user).join(" ").toLowerCase().includes(value)
            );
            setUsers(filtered);
          }}
        />
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-blue-50">
              {["UID", "Name", "Email", "Phone", "Employee ID", "Role", "Password", "Action"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-400">No users found</td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr key={user.uid || idx} className="border-b border-gray-300 hover:bg-gray-50">
                  <td className="px-3 py-1 whitespace-nowrap">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.uid, searchValue) }} />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.name, searchValue) }} />
                  </td>
                  <td className="px-3 py-1">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.email, searchValue) }} />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.phone, searchValue) }} />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.employeeId, searchValue) }} />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.role, searchValue) }} />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">
                    <span dangerouslySetInnerHTML={{ __html: highlightText(user.password, searchValue) }} />
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">
                    <button
                      onClick={() => openUpdateForm(user)}
                      className="bg-[#f56219] text-white px-3 py-1 rounded-lg text-sm cursor-pointer hover:opacity-90 transition"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-3">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto p-4">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-600 cursor-pointer"
              onClick={() => setShowForm(false)}
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-2xl text-center text-gray-800 font-semibold mb-3">Create User Account</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Name</label>
                <input type="text" className="w-full p-1 border rounded-lg" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Email</label>
                <input type="email" className="w-full p-1 border rounded-lg" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Employee ID</label>
                <input type="text" className="w-full p-1 border rounded-lg" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Phone Number</label>
                <input type="tel" className="w-full p-1 border rounded-lg" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Password</label>
                <input type="password" className="w-full p-1 border rounded-lg" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Select User Role</label>
                <select className="w-full p-1 border rounded-lg text-gray-700" value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#f56219] text-white py-2 rounded-lg hover:opacity-90 transition cursor-pointer">
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE USER MODAL */}
      {showUpdateForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-3">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto p-4">
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-red-600 cursor-pointer"
              onClick={() => {
                setShowUpdateForm(false);
                selectedUserRef.current = null;
              }}
            >
              <MdClose size={24} />
            </button>
            <h2 className="text-2xl text-center text-gray-800 font-semibold mb-1">Update User Account</h2>
            <p className="text-center text-sm text-gray-500 mb-3">
              UID: <span className="font-semibold text-gray-700">{updateUID}</span>
            </p>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Name</label>
                <input type="text" className="w-full p-1 border rounded-lg" value={updateName} onChange={(e) => setUpdateName(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Email</label>
                <input type="email" className="w-full p-1 border rounded-lg" value={updateEmail} onChange={(e) => setUpdateEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Employee ID</label>
                <input type="text" className="w-full p-1 border rounded-lg" value={updateEmployeeId} onChange={(e) => setUpdateEmployeeId(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Phone Number</label>
                <input type="tel" className="w-full p-1 border rounded-lg" value={updatePhone} onChange={(e) => setUpdatePhone(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Enter Password</label>
                <input type="password" className="w-full p-1 border rounded-lg" value={updatePassword} onChange={(e) => setUpdatePassword(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700">Select User Role</label>
                <select className="w-full p-1 border rounded-lg text-gray-700" value={updateRole} onChange={(e) => setUpdateRole(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#f56219] text-white py-2 rounded-lg hover:opacity-90 transition cursor-pointer">
                Update User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
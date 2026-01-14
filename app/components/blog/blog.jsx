"use client";

import { useState } from "react";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";

import { db, storage } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function BlogForm() {
  const { quill, quillRef } = useQuill({
    theme: "snow",
    placeholder: "Write blog content here...",
  });

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    date: "",
    image: null
  });

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    const title = formData.title.trim();
    const author = formData.author.trim();
    const description = formData.description.trim();
    const date = formData.date;
    const imageFile = formData.image;
    const content = quill?.root.innerHTML;

    if (!title || !content || content === "<p><br></p>") {
      alert("Title & content required");
      setLoading(false);
      return;
    }

    const slug = generateSlug(title);

    try {
      const imageRef = ref(storage, `blogs/${slug}-${Date.now()}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      await setDoc(doc(db, "blogs", slug), {
        title,
        slug,
        author,
        description,
        content,
        imageUrl,
        date,
        createdAt: serverTimestamp(),
      });

      alert(" Blog Published Successfully");

      setFormData({
        title: "",
        author: "",
        description: "",
        date: "",
        image: null
      });
      quill.setText("");
    } catch (error) {
      console.error(error);
      alert("Error publishing blog");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-[#fc8f41] text-center px-8 py-6">
            <h2 className="text-3xl font-bold text-white">Create New Blog Post</h2>
            <p className="text-slate-300 mt-2">Share your thoughts with the world</p>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-6">
            {/* Blog Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Blog Title <span className="text-red-500">*</span>
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a title..."
                required
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200 outline-none"
              />
            </div>

            {/* Author & Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Author Name
                </label>
                <input
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  placeholder="Your name"
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Publication Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200 outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Short Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Write a brief summary of your blog post..."
                className="w-full border border-slate-300 p-3 rounded-lg h-24 resize-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200 outline-none"
              />
            </div>

            {/* Content Editor */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Blog Content <span className="text-red-500">*</span>
              </label>
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                <div ref={quillRef} className="min-h-[300px]" />
              </div>
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Featured Image <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  name="image"
                  onChange={handleInputChange}
                  accept="image/*"
                  required
                  className="w-full border  border-slate-300 p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200 outline-none"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Recommended: 1200x630px (JPG, PNG)</p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    title: "",
                    author: "",
                    description: "",
                    date: "",
                    image: null
                  });
                  quill.setText("");
                }}
                className="px-6 py-3 text-slate-700 cursor-pointer font-medium rounded-lg hover:bg-slate-100 transition duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-[#F97316] cursor-pointer text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Publishing...
                  </span>
                ) : (
                  "Publish Blog"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
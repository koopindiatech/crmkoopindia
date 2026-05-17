"use client";

import { useState } from "react";
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

export default function ProfessionalBlogForm() {
  const [loading, setLoading] = useState(false);
  const [featuredImage, setFeaturedImage] = useState(null);
  
  // Core and SEO States
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    date: "",
    metaTitle: "",
    metaDescription: "",
    focusKeywords: "",
  });

  // Dynamic Blocks Content State (Pure Plain Text - No HTML Strings)
  const [contentBlocks, setContentBlocks] = useState([
    { id: "init-1", type: "heading", value: "" },
    { id: "init-2", type: "paragraph", value: "" }
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Block Management Functions ---
  const addBlock = (type) => {
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: type,
      value: "", 
      previewUrl: ""
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const removeBlock = (id) => {
    if (contentBlocks.length <= 1) {
      alert("At least one content block is required!");
      return;
    }
    setContentBlocks(contentBlocks.filter((block) => block.id !== id));
  };

  const handleBlockChange = (id, value) => {
    setContentBlocks(
      contentBlocks.map((block) =>
        block.id === id ? { ...block, value } : block
      )
    );
  };

  const handleBlockImageChange = (id, file) => {
    if (!file) return;
    setContentBlocks(
      contentBlocks.map((block) =>
        block.id === id
          ? { ...block, value: file, previewUrl: URL.createObjectURL(file) }
          : block
      )
    );
  };

  const moveBlock = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === contentBlocks.length - 1) return;

    const updatedBlocks = [...contentBlocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[targetIndex];
    updatedBlocks[targetIndex] = temp;

    setContentBlocks(updatedBlocks);
  };

  // --- Submit & Upload Logic ---
  const handleSubmit = async () => {
    setLoading(true);

    const title = formData.title.trim();
    const author = formData.author.trim();
    const description = formData.description.trim();
    const date = formData.date;

    if (!title || !featuredImage) {
      alert("Blog Title and Featured Cover Image are strictly required.");
      setLoading(false);
      return;
    }

    const slug = generateSlug(title);

    try {
      // 1. Upload Main Featured Image
      const featuredRef = ref(storage, `blogs/featured/${slug}-${Date.now()}`);
      await uploadBytes(featuredRef, featuredImage);
      const featuredImageUrl = await getDownloadURL(featuredRef);

      // 2. Upload Content Blocks Images
      const finalizedBlocks = [];
      
      for (const block of contentBlocks) {
        if (block.type === "image") {
          if (!block.value) {
            alert("One of your image blocks is empty. Please upload an image or delete the block.");
            setLoading(false);
            return;
          }
          const blockImageRef = ref(storage, `blogs/content-images/${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`);
          await uploadBytes(blockImageRef, block.value);
          const blockImageUrl = await getDownloadURL(blockImageRef);
          
          finalizedBlocks.push({
            id: block.id,
            type: "image",
            value: blockImageUrl 
          });
        } else {
          // Storing clean raw string to Firestore database
          if (block.value.trim() !== "") {
            finalizedBlocks.push({
              id: block.id,
              type: block.type,
              value: block.value.trim()
            });
          }
        }
      }

      if (finalizedBlocks.length === 0) {
        alert("Please add some valid content blocks before publishing.");
        setLoading(false);
        return;
      }

      // 3. Save Structured Pure Data to Firestore
      await setDoc(doc(db, "blogs", slug), {
        title,
        slug,
        author,
        description,
        date,
        imageUrl: featuredImageUrl,
        bodyContentBlocks: finalizedBlocks, 
        seo: {
          metaTitle: formData.metaTitle.trim() || title,
          metaDescription: formData.metaDescription.trim() || description,
          focusKeywords: formData.focusKeywords ? formData.focusKeywords.split(",").map(k => k.trim()) : [],
        },
        createdAt: serverTimestamp(),
      });

      alert("🎉 Blog Post Published Successfully with Raw Text Formats!");

      // Reset Form State
      setFormData({
        title: "",
        author: "",
        description: "",
        date: "",
        metaTitle: "",
        metaDescription: "",
        focusKeywords: "",
      });
      setFeaturedImage(null);
      setContentBlocks([
        { id: "init-1", type: "heading", value: "" },
        { id: "init-2", type: "paragraph", value: "" }
      ]);
      document.getElementById("featured-input").value = "";

    } catch (error) {
      console.error("Publishing Failed:", error);
      alert("Error uploading data.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header Control - Navy Blue and Orange Blend */}
        <div className="bg-[#0f172a] rounded-2xl p-8 text-center shadow-xl border-t-8 border-[#fc8f41]">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Publish Blog Post</h2>
          <p className="text-slate-300 mt-2 text-sm">Fill in the details below to publish your blog post.</p>
        </div>

        {/* Form Body Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 sm:p-8 space-y-8">
          
          {/* SECTION 1: Meta/General Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#0f172a] border-b-2 border-[#fc8f41] pb-2 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#fc8f41] inline-block rounded-sm"></span>
              1. Metadata & General Settings
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Blog Post Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter an eye-catching, SEO-friendly title..."
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Author Name</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  placeholder="e.g., Alex Carter"
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Publish Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Short Description / Excerpt</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Write a catchy 2-line intro summary for feed cards..."
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-slate-900 h-20 resize-none focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* SECTION 2: THE BLOCK BUILDER ENGINE */}
          <div className="space-y-6">
            <div className="border-b-2 border-[#fc8f41] pb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
                <span className="w-2.5 h-5 bg-[#fc8f41] inline-block rounded-sm"></span>
                2. Pure Content Blocks Canvas
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 font-medium">
                 Tip: Use **text** for Bold, *text* for Italic
              </span>
            </div>

            {/* Rendered Live Dynamic Blocks */}
            <div className="space-y-4">
              {contentBlocks.map((block, index) => (
                <div key={block.id} className="group relative bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-4 transition hover:border-slate-300 hover:shadow-sm">
                  
                  {/* Sorting controls */}
                  <div className="flex flex-col space-y-1 pt-2 opacity-50 group-hover:opacity-100 transition">
                    <button type="button" onClick={() => moveBlock(index, "up")} className="p-1 hover:bg-slate-200 text-slate-600 rounded text-xs cursor-pointer">▲</button>
                    <button type="button" onClick={() => moveBlock(index, "down")} className="p-1 hover:bg-slate-200 text-slate-600 rounded text-xs cursor-pointer">▼</button>
                  </div>

                  {/* Standard Text Inputs with NO HTML parsing */}
                  <div className="flex-1">
                    
                    {/* 1. HEADING BLOCK */}
                    {block.type === "heading" && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-amber-600 font-bold block mb-1">Sub-Heading (H2)</span>
                        <input
                          type="text"
                          value={block.value}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          placeholder="Type your heading directly here..."
                          className="w-full bg-white font-bold text-lg text-slate-900 border-l-4 border-amber-500 p-3 outline-none border border-slate-300 focus:border-amber-500 transition rounded-r"
                        />
                      </div>
                    )}

                    {/* 2. PARAGRAPH BLOCK */}
                    {block.type === "paragraph" && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-sky-600 font-bold block mb-1">Paragraph Block</span>
                        <textarea
                          value={block.value}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          placeholder="Type your standard article content text here..."
                          className="w-full bg-white text-slate-800 text-base border-l-4 border-sky-500 p-3 h-28 resize-none outline-none border border-slate-300 focus:border-sky-500 transition rounded-r"
                        />
                      </div>
                    )}

                    {/* 3. BULLET LIST BLOCK */}
                    {block.type === "bullet-list" && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-purple-600 font-bold block mb-1">Bullet Points (Type each item on a new line)</span>
                        <textarea
                          value={block.value}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          placeholder="Item One&#10;Item Two&#10;Item Three"
                          className="w-full bg-white text-slate-800 text-base border-l-4 border-purple-500 p-3 h-28 resize-none outline-none border border-slate-300 focus:border-purple-500 transition rounded-r font-mono"
                        />
                      </div>
                    )}

                    {/* 4. ORDERED LIST BLOCK */}
                    {block.type === "ordered-list" && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-pink-600 font-bold block mb-1">Numbered List (Type each step on a new line)</span>
                        <textarea
                          value={block.value}
                          onChange={(e) => handleBlockChange(block.id, e.target.value)}
                          placeholder="First Step&#10;Second Step&#10;Third Step"
                          className="w-full bg-white text-slate-800 text-base border-l-4 border-pink-500 p-3 h-28 resize-none outline-none border border-slate-300 focus:border-pink-500 transition rounded-r font-mono"
                        />
                      </div>
                    )}

                    {/* 5. IMAGE BLOCK */}
                    {block.type === "image" && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-emerald-600 font-bold block mb-1">Inline Paragraph Image Asset</span>
                        <div className="flex flex-col sm:flex-row items-center gap-4 border-l-4 border-emerald-500 border border-slate-300 bg-white p-3 rounded-r">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBlockImageChange(block.id, e.target.files[0])}
                            className="text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                          />
                          {block.previewUrl && (
                            <img src={block.previewUrl} alt="Inline block preview" className="w-24 h-16 object-cover rounded-lg border border-slate-200" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Trash Bin */}
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="text-slate-400 hover:text-red-500 p-2 mt-2 transition cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* Block Control Inserters Buttons */}
            <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
              <p className="text-xs text-slate-600 font-semibold"> Click below to insert elements dynamically into your blog layout:</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => addBlock("heading")} className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer">➕ Add Heading</button>
                <button type="button" onClick={() => addBlock("paragraph")} className="px-4 py-2 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer">➕ Add Paragraph</button>
                <button type="button" onClick={() => addBlock("bullet-list")} className="px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer">➕ Add Bullets</button>
                <button type="button" onClick={() => addBlock("ordered-list")} className="px-4 py-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer">➕ Add Numbered List</button>
                <button type="button" onClick={() => addBlock("image")} className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer">➕ Add Image</button>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADVANCED GOOGLE SEO PANEL */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
            <h3 className="text-md font-bold text-[#0f172a] border-b border-slate-200 pb-2">
              🔍 3. Google SEO Suite Settings (Highly Recommended)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Meta Title Tag</label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Defaults to standard title if empty"
                  maxLength={65}
                  className="w-full bg-white border border-slate-300 p-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Focus Keywords</label>
                <input
                  type="text"
                  name="focusKeywords"
                  value={formData.focusKeywords}
                  onChange={handleInputChange}
                  placeholder="react, cloud architecture, nodejs"
                  className="w-full bg-white border border-slate-300 p-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Meta Description Tag</label>
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleInputChange}
                placeholder="Provide a 150-character concise meta snippet description for search indexes..."
                maxLength={160}
                className="w-full bg-white border border-slate-300 p-3 rounded-lg text-slate-900 h-16 resize-none focus:ring-2 focus:ring-[#fc8f41] focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          {/* SECTION 4: FEAT COVER IMAGE */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#0f172a] border-b-2 border-[#fc8f41] pb-2 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-[#fc8f41] inline-block rounded-sm"></span>
              4. Core Media Attachments
            </h3>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Main Featured Cover Image Banner <span className="text-red-400">*</span></label>
              <input
                id="featured-input"
                type="file"
                accept="image/*"
                onChange={(e) => setFeaturedImage(e.target.files[0])}
                required
                className="w-full border border-slate-300 p-3 rounded-lg bg-slate-50 text-slate-700 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#0f172a] file:text-white hover:file:bg-slate-800 cursor-pointer outline-none transition"
              />
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-8 py-3.5 bg-gradient-to-r from-[#fc8f41] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-40 disabled:transform-none cursor-pointer"
            >
              {loading ? "Processing Assets & Database Publishing..." : "Publish Clean Post"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
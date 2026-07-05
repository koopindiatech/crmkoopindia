"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { db, storage } from "@/lib/firebase";
import {
  doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
  collection, getDocs, orderBy, query,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateSlug(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const CATEGORIES = [
  "Business", "Startup", "Finance & Taxation",
  "Legal & Compliance", "Technology", "Marketing & Growth",
  "Industry Insights", "Success Stories",
];

const EMPTY_FORM = {
  title: "", slug: "", author: "", description: "", date: "",
  metaTitle: "", metaDescription: "", focusKeywords: "", categories: [],
};

// ─── Keyword Analyzer ────────────────────────────────────────────────────────
function KeywordAnalyzer({ text, focusKeywords }) {
  const keywords = focusKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (!keywords.length) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
          🔍 Keyword Rank Analyzer
        </p>
        <p className="text-sm text-slate-400">
          Add focus keywords in the SEO panel to analyze ranking potential.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          🔍 Keyword Rank Analyzer
        </p>
        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
          {wordCount} words
        </span>
      </div>
      {keywords.map((kw) => {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matches = (text.toLowerCase().match(new RegExp(`\\b${escaped}\\b`, "gi")) || []).length;
        const density = wordCount > 0 ? ((matches / wordCount) * 100).toFixed(2) : 0;
        const score = matches === 0 ? "missing" : density < 0.5 ? "low" : density > 3 ? "stuffed" : "good";
        const s = {
          missing: { cls: "bg-red-50 border-red-200",    badge: "bg-red-500",    label: "Missing",   tip: "Not found in content" },
          low:     { cls: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-500", label: "Low",    tip: "Needs more occurrences" },
          stuffed: { cls: "bg-orange-50 border-orange-200", badge: "bg-orange-500", label: "Stuffed",tip: "Reduce to avoid penalty" },
          good:    { cls: "bg-green-50 border-green-200", badge: "bg-green-500",   label: "Good ✓",  tip: "Optimal density" },
        }[score];
        return (
          <div key={kw} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${s.cls}`}>
            <div>
              <span className="font-semibold text-slate-800">{kw}</span>
              <span className="text-slate-400 text-xs ml-2">{matches}x · {density}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 hidden sm:block">{s.tip}</span>
              <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BlogPanel() {
  const [activeTab, setActiveTab]       = useState("new-post");
  const [loading, setLoading]           = useState(false);
  const [editSlug, setEditSlug]         = useState(null);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [featuredPreview, setFeaturedPreview] = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [slugEdited, setSlugEdited]     = useState(false);
  const [editorText, setEditorText]     = useState("");

  // Modals
  const [showLinkModal, setShowLinkModal]   = useState(false);
  const [linkData, setLinkData]             = useState({ url: "", anchor: "", nofollow: false, newTab: true });
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageFile, setImageFile]           = useState(null);
  const [imageCaption, setImageCaption]     = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [savedRange, setSavedRange]         = useState(null);

  // All Blogs
  const [allBlogs, setAllBlogs]           = useState([]);
  const [blogsLoading, setBlogsLoading]   = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const editorRef = useRef(null);

  // ── Form Handlers ─────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "title" && !slugEdited) updated.slug = generateSlug(value);
      return updated;
    });
  };

  const handleSlugChange = (e) => {
    setSlugEdited(true);
    setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
  };

  const handleCategoryToggle = (cat) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  // ── Editor / Toolbar ──────────────────────────────────────────────────────
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) setSavedRange(sel.getRangeAt(0).cloneRange());
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    if (savedRange) sel?.addRange(savedRange);
    else editorRef.current?.focus();
  };

  const execCmd = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const handleToolbar = (cmd, val) => {
    if (cmd === "custom-link") {
      saveSelection();
      setShowLinkModal(true);
    } else if (cmd === "custom-image") {
      saveSelection();
      setShowImageModal(true);
    } else if (val) {
      execCmd(cmd, val);
    } else {
      execCmd(cmd);
    }
  };

  const insertLink = () => {
    restoreSelection();
    if (!linkData.url) return;
    const anchor = linkData.anchor || linkData.url;
    const rel    = linkData.nofollow ? ' rel="nofollow"' : "";
    const target = linkData.newTab   ? ' target="_blank"' : "";
    document.execCommand(
      "insertHTML", false,
      `<a href="${linkData.url}"${rel}${target} class="blog-link">${anchor}</a>`
    );
    setShowLinkModal(false);
    setLinkData({ url: "", anchor: "", nofollow: false, newTab: true });
    setSavedRange(null);
  };

  const insertImage = async () => {
    if (!imageFile) return;
    setImageUploading(true);
    try {
      const slugKey = formData.slug || `img-${Date.now()}`;
      const imgRef  = ref(storage, `blogs/content-images/${slugKey}-${Date.now()}`);
      await uploadBytes(imgRef, imageFile);
      const url = await getDownloadURL(imgRef);
      restoreSelection();
      const cap = imageCaption
        ? `<figcaption class="blog-figcaption">${imageCaption}</figcaption>`
        : "";
      document.execCommand(
        "insertHTML", false,
        `<figure class="blog-figure"><img src="${url}" alt="${imageCaption || "Blog image"}" class="blog-img" />${cap}</figure><p></p>`
      );
    } catch (err) {
      console.error(err);
      alert("Image upload failed.");
    }
    setImageUploading(false);
    setShowImageModal(false);
    setImageFile(null);
    setImageCaption("");
    setSavedRange(null);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFeaturedImage(null);
    setFeaturedPreview(null);
    setSlugEdited(false);
    setEditSlug(null);
    setEditorText("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    const fi = document.getElementById("featured-input");
    if (fi) fi.value = "";
  };

  // ── Submit / Update ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    const title       = formData.title.trim();
    const slug        = formData.slug.trim() || generateSlug(title);
    const bodyContent = editorRef.current?.innerHTML || "";
    const plainText   = editorRef.current?.innerText?.trim() || "";

    if (!title) { alert("Blog Title is required."); setLoading(false); return; }
    if (!editSlug && !featuredImage) { alert("Featured Cover Image is required."); setLoading(false); return; }
    if (!plainText) { alert("Please write some content in the editor."); setLoading(false); return; }

    try {
      let featuredImageUrl = formData.existingImageUrl || "";
      if (featuredImage) {
        const fRef = ref(storage, `blogs/featured/${slug}-${Date.now()}`);
        await uploadBytes(fRef, featuredImage);
        featuredImageUrl = await getDownloadURL(fRef);
      }

      const payload = {
        title, slug,
        author:      formData.author.trim(),
        description: formData.description.trim(),
        date:        formData.date,
        imageUrl:    featuredImageUrl,
        categories:  formData.categories,
        bodyContent,
        seo: {
          metaTitle:       formData.metaTitle.trim() || title,
          metaDescription: formData.metaDescription.trim() || formData.description.trim(),
          focusKeywords:   formData.focusKeywords
            ? formData.focusKeywords.split(",").map((k) => k.trim()).filter(Boolean)
            : [],
        },
      };

      if (editSlug) {
        await updateDoc(doc(db, "blogs", editSlug), { ...payload, updatedAt: serverTimestamp() });
        alert("Blog Post Updated Successfully!");
      } else {
        await setDoc(doc(db, "blogs", slug), { ...payload, createdAt: serverTimestamp() });
        alert("Blog Post Published Successfully!");
      }

      resetForm();
      setActiveTab("all-blogs");
      fetchBlogs();
    } catch (err) {
      console.error(err);
      alert("Error saving blog. Check console.");
    }
    setLoading(false);
  };

  // ── Fetch All Blogs ───────────────────────────────────────────────────────
  const fetchBlogs = async () => {
    setBlogsLoading(true);
    try {
      const q    = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAllBlogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setBlogsLoading(false);
  };

  useEffect(() => { if (activeTab === "all-blogs") fetchBlogs(); }, [activeTab]);

  // ── Load Blog for Edit ────────────────────────────────────────────────────
  const handleEdit = (blog) => {
    setEditSlug(blog.slug);
    setFormData({
      title:          blog.title || "",
      slug:           blog.slug  || "",
      author:         blog.author || "",
      description:    blog.description || "",
      date:           blog.date || "",
      metaTitle:      blog.seo?.metaTitle || "",
      metaDescription: blog.seo?.metaDescription || "",
      focusKeywords:  (blog.seo?.focusKeywords || []).join(", "),
      categories:     blog.categories || [],
      existingImageUrl: blog.imageUrl || "",
    });
    setFeaturedPreview(blog.imageUrl || null);
    setFeaturedImage(null);
    setSlugEdited(true);
    setTimeout(() => {
      if (!editorRef.current) return;
      if (blog.bodyContent) {
        editorRef.current.innerHTML = blog.bodyContent;
      } else if (blog.bodyContentBlocks) {
        // Convert old block format → HTML
        editorRef.current.innerHTML = blog.bodyContentBlocks.map((b) => {
          switch (b.type) {
            case "h1": return `<h1>${b.value}</h1>`;
            case "h2": return `<h2>${b.value}</h2>`;
            case "h3": return `<h3>${b.value}</h3>`;
            case "bullet-list": return `<ul>${b.value.split("\n").filter(Boolean).map((i) => `<li>${i}</li>`).join("")}</ul>`;
            case "ordered-list": return `<ol>${b.value.split("\n").filter(Boolean).map((i) => `<li>${i}</li>`).join("")}</ol>`;
            case "image": return `<figure class="blog-figure"><img src="${b.value}" alt="${b.caption || ""}" class="blog-img" />${b.caption ? `<figcaption class="blog-figcaption">${b.caption}</figcaption>` : ""}</figure>`;
            case "backlink": return `<p><a href="${b.value}" ${b.nofollow ? 'rel="nofollow"' : ""} ${b.newTab ? 'target="_blank"' : ""} class="blog-link">${b.anchor || b.value}</a></p>`;
            case "quote": return `<blockquote>${b.value}${b.author ? `<cite>— ${b.author}</cite>` : ""}</blockquote>`;
            case "divider": return `<hr />`;
            default: return `<p>${b.value}</p>`;
          }
        }).join("");
      }
      setEditorText(editorRef.current.innerText || "");
    }, 150);
    setActiveTab("new-post");
    window.scrollTo(0, 0);
  };

  // ── Delete Blog ───────────────────────────────────────────────────────────
  const handleDelete = async (slug) => {
    try {
      await deleteDoc(doc(db, "blogs", slug));
      setAllBlogs((prev) => prev.filter((b) => b.slug !== slug));
      setDeleteConfirm(null);
    } catch { alert("Error deleting."); }
  };

  const filteredBlogs = useMemo(() =>
    allBlogs.filter((b) =>
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterCategory === "All" || (b.categories || []).includes(filterCategory))
    ),
    [allBlogs, searchQuery, filterCategory]
  );

  // ── Extra Toolbar Helpers ─────────────────────────────────────────────────
  const handleFormatBlock = (val) => { editorRef.current?.focus(); document.execCommand("formatBlock", false, val); };
  const handleFontColor   = (color) => { editorRef.current?.focus(); document.execCommand("foreColor", false, color); };
  const handleUndo        = () => { editorRef.current?.focus(); document.execCommand("undo"); };
  const handleRedo        = () => { editorRef.current?.focus(); document.execCommand("redo"); };
  const handleRemoveFormat = () => { editorRef.current?.focus(); document.execCommand("removeFormat"); };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* ── Page Header ── */}
      <div className="bg-[#0f172a] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-4 border-[#fc8f41]">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Blog Management Panel
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Publish, edit, and manage all Koop India blog posts
          </p>
        </div>
        <div className="flex bg-[#1e293b] rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("new-post")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${activeTab === "new-post" ? "bg-[#fc8f41] text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            {editSlug ? "Edit Post" : "New Post"}
          </button>
          <button
            onClick={() => setActiveTab("all-blogs")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${activeTab === "all-blogs" ? "bg-[#fc8f41] text-white shadow" : "text-slate-400 hover:text-white"}`}
          >
            All Blogs
            {allBlogs.length > 0 && (
              <span className="ml-1.5 bg-slate-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {allBlogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ══════════ TAB: NEW POST ══════════ */}
      {activeTab === "new-post" && (
        <div className="max-w-7xl mx-auto px-4 py-6">

          {editSlug && (
            <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="text-amber-800 font-semibold text-sm">
                Editing: <span className="font-bold">{formData.title}</span>
              </span>
              <button
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-red-500 underline cursor-pointer"
              >
                Cancel & Create New
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

            {/* ── LEFT: Metadata Panel ── */}
            <aside className="space-y-5">

              <SectionLabel number="1" label="Metadata" />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <Field label="Blog Title *">
                  <input
                    type="text" name="title" value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter SEO-friendly title..."
                    className="field-input"
                  />
                </Field>
                <Field label="URL Slug">
                  <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#fc8f41]">
                    <span className="text-slate-400 text-xs px-2 whitespace-nowrap">/blog/</span>
                    <input
                      type="text" value={formData.slug}
                      onChange={handleSlugChange}
                      placeholder="auto-generated"
                      className="flex-1 bg-transparent p-2 text-sm text-slate-800 outline-none"
                    />
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Author">
                    <input type="text" name="author" value={formData.author} onChange={handleInputChange} placeholder="Author" className="field-input" />
                  </Field>
                  <Field label="Publish Date">
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="field-input" />
                  </Field>
                </div>
                <Field label="Short Excerpt">
                  <textarea
                    name="description" value={formData.description}
                    onChange={handleInputChange}
                    placeholder="2-line blog card summary..."
                    rows={3} className="field-input resize-none"
                  />
                </Field>
              </div>

              <SectionLabel number="2" label="Categories" />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(cat)}
                        onChange={() => handleCategoryToggle(cat)}
                        className="w-4 h-4 accent-[#fc8f41] rounded cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 group-hover:text-[#fc8f41] transition font-medium">
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <SectionLabel number="3" label="Featured Image" />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                {featuredPreview && (
                  <img src={featuredPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-slate-200 mb-3" />
                )}
                <input
                  id="featured-input" type="file" accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { setFeaturedImage(f); setFeaturedPreview(URL.createObjectURL(f)); }
                  }}
                  className="w-full border border-slate-300 p-2 rounded-lg bg-slate-50 text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#0f172a] file:text-white hover:file:bg-slate-700 cursor-pointer outline-none text-sm"
                />
                {editSlug && <p className="text-xs text-slate-400 mt-1">Leave empty to keep existing image.</p>}
              </div>

              <SectionLabel number="4" label="SEO Settings" emoji="🔍" />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <Field label={`Meta Title (${(formData.metaTitle || "").length}/65)`}>
                  <input type="text" name="metaTitle" value={formData.metaTitle} onChange={handleInputChange} maxLength={65} placeholder="Defaults to blog title" className="field-input" />
                  <CharBar value={formData.metaTitle.length} max={65} warnAt={50} dangerAt={60} />
                </Field>
                <Field label={`Meta Description (${(formData.metaDescription || "").length}/160)`}>
                  <textarea name="metaDescription" value={formData.metaDescription} onChange={handleInputChange} maxLength={160} placeholder="160-char search snippet..." rows={3} className="field-input resize-none" />
                  <CharBar value={formData.metaDescription.length} max={160} warnAt={130} dangerAt={155} />
                </Field>
                <Field label="Focus Keywords">
                  <input type="text" name="focusKeywords" value={formData.focusKeywords} onChange={handleInputChange} placeholder="company registration, startup, gst" className="field-input" />
                  <p className="text-[10px] text-slate-400 mt-1">Comma separated — feeds Keyword Analyzer</p>
                </Field>
              </div>

              {/* Publish button */}
              <button
                type="button" disabled={loading} onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-[#fc8f41] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition disabled:opacity-40 disabled:transform-none cursor-pointer"
              >
                {loading ? "Saving..." : editSlug ? "Update Blog Post" : "Publish Blog Post"}
              </button>
              {editSlug && (
                <button
                  type="button" onClick={resetForm}
                  className="w-full py-3 border border-slate-300 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </aside>

            {/* ── RIGHT: WYSIWYG Editor ── */}
            <main className="space-y-4">
              <SectionLabel number="5" label="Blog Content Editor" />

              {/* Editor Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* ── WordPress-Style 2-Row Toolbar ── */}
                <div className="sticky top-[46px] z-20 bg-white">

                  {/* ROW 1: Main Formatting */}
                  <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[#e0e0e0] bg-[#f7f7f7]">

                    {/* Paragraph/Heading Format Dropdown */}
                    <select
                      onChange={(e) => { if (e.target.value) { handleFormatBlock(e.target.value); } e.target.value = ""; }}
                      defaultValue=""
                      className="h-7 px-1.5 pr-5 text-[12px] text-slate-700 bg-white border border-[#ccc] rounded cursor-pointer outline-none hover:border-slate-400 mr-1 appearance-none"
                      title="Paragraph format"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", paddingRight: "20px" }}
                    >
                      <option value="" disabled>Paragraph</option>
                      <option value="p">Paragraph</option>
                      <option value="h1">Heading 1</option>
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                      <option value="h4">Heading 4</option>
                      <option value="h5">Heading 5</option>
                      <option value="h6">Heading 6</option>
                      <option value="pre">Preformatted</option>
                    </select>

                    <Sep />

                    {/* Bold */}
                    <TBtn title="Bold (Ctrl+B)" onMouseDown={() => execCmd("bold")}>
                      <strong style={{fontSize:13}}>B</strong>
                    </TBtn>
                    {/* Italic */}
                    <TBtn title="Italic (Ctrl+I)" onMouseDown={() => execCmd("italic")}>
                      <em style={{fontSize:13, fontFamily:"Georgia,serif"}}>I</em>
                    </TBtn>

                    <Sep />

                    {/* Bullet List */}
                    <TBtn title="Bulleted list" onMouseDown={() => execCmd("insertUnorderedList")}>
                      <span style={{fontSize:13, letterSpacing:"-1px"}}>≔</span>
                    </TBtn>
                    {/* Numbered List */}
                    <TBtn title="Numbered list" onMouseDown={() => execCmd("insertOrderedList")}>
                      <span style={{fontSize:12}}>≡</span>
                    </TBtn>

                    <Sep />

                    {/* Blockquote */}
                    <TBtn title="Blockquote" onMouseDown={() => handleFormatBlock("blockquote")}>
                      <span style={{fontSize:14, fontFamily:"Georgia,serif"}}>{"\u201C\u201C"}</span>
                    </TBtn>

                    <Sep />

                    {/* Align Left */}
                    <TBtn title="Align left" onMouseDown={() => execCmd("justifyLeft")}>
                      <AlignIcon type="left" />
                    </TBtn>
                    {/* Align Center */}
                    <TBtn title="Align center" onMouseDown={() => execCmd("justifyCenter")}>
                      <AlignIcon type="center" />
                    </TBtn>
                    {/* Align Right */}
                    <TBtn title="Align right" onMouseDown={() => execCmd("justifyRight")}>
                      <AlignIcon type="right" />
                    </TBtn>

                    <Sep />

                    {/* Link */}
                    <TBtn title="Insert/edit link" onMouseDown={() => { saveSelection(); setShowLinkModal(true); }}>
                      <LinkIcon />
                    </TBtn>

                    <Sep />

                    {/* Horizontal Rule */}
                    <TBtn title="Insert horizontal line" onMouseDown={() => { editorRef.current?.focus(); document.execCommand("insertHorizontalRule"); }}>
                      <span style={{fontSize:11, letterSpacing:"-1px", color:"#555"}}>&#9135;&#9135;</span>
                    </TBtn>

                    {/* Insert Image (Temporarily Disabled) */}
                    {/* <TBtn title="Insert image" onMouseDown={() => { saveSelection(); setShowImageModal(true); }}>
                      <ImgIcon />
                    </TBtn> */}

                    <Sep />

                    {/* Code / Preformatted */}
                    <TBtn title="Code block" onMouseDown={() => handleFormatBlock("pre")}>
                      <span style={{fontSize:11, fontFamily:"monospace", color:"#555"}}>{"</>"}</span>
                    </TBtn>
                  </div>

                  {/* ROW 2: Advanced Tools */}
                  <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[#e0e0e0] bg-[#f7f7f7]">

                    {/* Strikethrough (ABC with line) */}
                    <TBtn title="Strikethrough" onMouseDown={() => execCmd("strikeThrough")}>
                      <span style={{fontSize:12, textDecoration:"line-through", color:"#555"}}>ABC</span>
                    </TBtn>

                    {/* Em Dash Divider shortcut */}
                    <TBtn title="Insert em dash" onMouseDown={() => { editorRef.current?.focus(); document.execCommand("insertText", false, "\u2014"); }}>
                      <span style={{fontSize:14, color:"#555"}}>—</span>
                    </TBtn>

                    {/* Font Color Picker */}
                    <div className="relative group inline-flex">
                      <button
                        type="button"
                        title="Text color"
                        className="tb-btn flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-slate-200 transition cursor-pointer"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <span className="text-[12px] font-bold" style={{borderBottom:"2px solid #e03030", lineHeight:1.2, paddingBottom:1}}>A</span>
                        <span style={{fontSize:9, color:"#666"}}>▾</span>
                      </button>
                      <div className="absolute left-0 top-full mt-0.5 hidden group-focus-within:flex group-hover:flex flex-wrap gap-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50" style={{width:148}}>
                        {["#000000","#cc0000","#dd6600","#ccaa00","#006600","#0044cc","#6600cc","#cc0088","#444444","#888888","#aaaaaa","#fc8f41","#ffffff","#1e293b"].map(c => (
                          <button
                            key={c}
                            type="button"
                            title={c}
                            onMouseDown={(e) => { e.preventDefault(); handleFontColor(c); }}
                            style={{ background: c, outline: c === "#ffffff" ? "1px solid #ccc" : "none" }}
                            className="w-5 h-5 rounded cursor-pointer hover:scale-125 transition-transform"
                          />
                        ))}
                      </div>
                    </div>

                    <Sep />

                    {/* Underline */}
                    <TBtn title="Underline (Ctrl+U)" onMouseDown={() => execCmd("underline")}>
                      <span style={{fontSize:13, textDecoration:"underline", fontFamily:"Georgia,serif"}}>U</span>
                    </TBtn>

                    {/* Clear Formatting */}
                    <TBtn title="Clear formatting" onMouseDown={handleRemoveFormat}>
                      <span style={{fontSize:11, color:"#555", fontFamily:"sans-serif"}}>T<sub style={{fontSize:7}}>×</sub></span>
                    </TBtn>

                    {/* Omega / Special char */}
                    <TBtn title="Insert special character (non-breaking space)" onMouseDown={() => { editorRef.current?.focus(); document.execCommand("insertText", false, "\u00a0"); }}>
                      <span style={{fontSize:13, color:"#555"}}>&Omega;</span>
                    </TBtn>

                    <Sep />

                    {/* Outdent */}
                    <TBtn title="Decrease indent" onMouseDown={() => execCmd("outdent")}>
                      <OutdentIcon />
                    </TBtn>
                    {/* Indent */}
                    <TBtn title="Increase indent" onMouseDown={() => execCmd("indent")}>
                      <IndentIcon />
                    </TBtn>

                    <Sep />

                    {/* Undo */}
                    <TBtn title="Undo (Ctrl+Z)" onMouseDown={handleUndo}>
                      <UndoIcon />
                    </TBtn>
                    {/* Redo */}
                    <TBtn title="Redo (Ctrl+Y)" onMouseDown={handleRedo}>
                      <RedoIcon />
                    </TBtn>

                    <Sep />

                    {/* Help */}
                    <TBtn title="Keyboard shortcuts" onMouseDown={(e) => { e.preventDefault(); alert("Shortcuts:\nCtrl+B  →  Bold\nCtrl+I  →  Italic\nCtrl+U  →  Underline\nCtrl+Z  →  Undo\nCtrl+Y  →  Redo\nCtrl+A  →  Select All"); }}>
                      <span style={{fontSize:12, fontWeight:700, color:"#555", border:"1px solid #bbb", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center"}}>?</span>
                    </TBtn>
                  </div>

                  {/* Tip */}
                  <div className="px-3 py-1 bg-white border-b border-slate-100">
                    <p className="text-[10px] text-slate-400">
                      Select text then click format button &bull; Use <strong>Paragraph ▾</strong> dropdown to set heading level &bull; <strong>Ctrl+Z</strong> to undo
                    </p>
                  </div>
                </div>


                {/* ── Content Editable Area ── */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setEditorText(editorRef.current?.innerText || "")}
                  className="blog-editor min-h-[580px] p-6 outline-none"
                  data-placeholder="Start writing your blog post here...&#10;&#10;Type your content and use the toolbar above to format it:&#10;• Select text → click H1 / H2 / H3 for headings&#10;• Select text → click B for bold, I for italic&#10;• Click • List for bullet points&#10;• Click Image to insert a photo&#10;• Click Link to add a backlink"
                />
              </div>

              {/* Keyword Analyzer */}
              <KeywordAnalyzer text={editorText} focusKeywords={formData.focusKeywords} />
            </main>
          </div>
        </div>
      )}

      {/* ══════════ TAB: ALL BLOGS ══════════ */}
      {activeTab === "all-blogs" && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title..."
              className="flex-1 bg-white border border-slate-300 px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#fc8f41] shadow-sm"
            />
            <select
              value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#fc8f41] shadow-sm cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={fetchBlogs}
              className="px-4 py-2.5 bg-[#0f172a] text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-sm"
            >
              Refresh
            </button>
          </div>

          {blogsLoading ? (
            <div className="text-center py-20 text-slate-400">Loading blogs...</div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">No blogs yet</p>
              <button
                onClick={() => setActiveTab("new-post")}
                className="mt-4 px-5 py-2 bg-[#fc8f41] text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition cursor-pointer"
              >
                Create First Post
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard label="Total Posts"     value={allBlogs.length}      color="bg-violet-50 border-violet-200 text-violet-700" />
                <StatCard label="Showing"         value={filteredBlogs.length} color="bg-sky-50 border-sky-200 text-sky-700" />
                <StatCard label="Categories Used" value={[...new Set(allBlogs.flatMap((b) => b.categories || []))].length} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
                <StatCard label="With SEO"        value={allBlogs.filter((b) => b.seo?.focusKeywords?.length).length} color="bg-amber-50 border-amber-200 text-amber-700" />
              </div>

              {filteredBlogs.map((blog) => (
                <div
                  key={blog.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 flex flex-col sm:flex-row gap-4"
                >
                  {blog.imageUrl
                    ? <img src={blog.imageUrl} alt={blog.title} className="w-full sm:w-28 h-20 object-cover rounded-xl border border-slate-100 shrink-0" />
                    : <div className="w-full sm:w-28 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-2xl shrink-0">Blog</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-2 flex-1">
                        {blog.title}
                      </h3>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleEdit(blog)}
                          className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-lg hover:bg-sky-100 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(blog.slug)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(blog.categories || []).map((cat) => (
                        <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 bg-[#fc8f41]/10 text-[#b35e1a] rounded-full border border-[#fc8f41]/20">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[11px] text-slate-400">
                      <span>Author: {blog.author || "—"}</span>
                      <span>Date: {blog.date || "—"}</span>
                      <span>Keywords: {blog.seo?.focusKeywords?.length || 0}</span>
                      <span className="text-slate-300">/blog/{blog.slug}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Link Insert Modal ── */}
      {showLinkModal && (
        <Modal title="Insert Backlink" onClose={() => setShowLinkModal(false)}>
          <Field label="URL">
            <input type="url" value={linkData.url} onChange={(e) => setLinkData((p) => ({ ...p, url: e.target.value }))} placeholder="https://example.com" className="field-input" />
          </Field>
          <Field label="Anchor Text (optional)">
            <input type="text" value={linkData.anchor} onChange={(e) => setLinkData((p) => ({ ...p, anchor: e.target.value }))} placeholder="Link display text" className="field-input" />
          </Field>
          <div className="flex gap-5">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={linkData.nofollow} onChange={(e) => setLinkData((p) => ({ ...p, nofollow: e.target.checked }))} className="accent-[#fc8f41]" />
              rel="nofollow"
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={linkData.newTab} onChange={(e) => setLinkData((p) => ({ ...p, newTab: e.target.checked }))} className="accent-[#fc8f41]" />
              New tab
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowLinkModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
            <button onClick={insertLink} className="flex-1 py-2.5 bg-[#fc8f41] text-white font-bold text-sm rounded-xl hover:bg-orange-500 transition cursor-pointer">Insert Link</button>
          </div>
        </Modal>
      )}

      {/* ── Image Insert Modal ── */}
      {showImageModal && (
        <Modal title="Insert Image" onClose={() => { setShowImageModal(false); setImageFile(null); setImageCaption(""); }}>
          <Field label="Select Image File">
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
            {imageFile && <p className="text-xs text-emerald-600 mt-1">Selected: {imageFile.name}</p>}
          </Field>
          <Field label="Caption (optional)">
            <input type="text" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} placeholder="Image caption shown below..." className="field-input" />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowImageModal(false); setImageFile(null); setImageCaption(""); }} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
            <button onClick={insertImage} disabled={!imageFile || imageUploading} className="flex-1 py-2.5 bg-[#fc8f41] text-white font-bold text-sm rounded-xl hover:bg-orange-500 transition disabled:opacity-50 cursor-pointer">
              {imageUploading ? "Uploading..." : "Insert Image"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <Modal title="Delete Blog Post?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-slate-500 text-sm">This action cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition cursor-pointer">Delete</button>
          </div>
        </Modal>
      )}

      {/* ── Global Styles ── */}
      <style jsx global>{`
        .label-text { display:block; font-size:0.75rem; font-weight:600; color:#475569; margin-bottom:0.25rem; }
        .field-input { width:100%; background:#f8fafc; border:1px solid #cbd5e1; padding:0.55rem 0.75rem; border-radius:0.5rem; color:#1e293b; font-size:0.875rem; outline:none; transition:all 0.15s; }
        .field-input:focus { border-color:#fc8f41; box-shadow:0 0 0 2px rgba(252,143,65,0.2); }

        /* Editor placeholder */
        .blog-editor:empty::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          white-space: pre-line;
          font-size: 0.925rem;
          line-height: 1.8;
        }

        /* Editor content styles */
        .blog-editor { font-size: 1rem; line-height: 1.85; color: #334155; }
        .blog-editor:focus { outline: none; }

        .blog-editor h1 { font-size:2rem; font-weight:800; color:#0f172a; margin:1.4rem 0 0.6rem; line-height:1.2; }
        .blog-editor h2 { font-size:1.5rem; font-weight:700; color:#1e293b; margin:1.2rem 0 0.5rem; padding-left:0.75rem; border-left:4px solid #fc8f41; }
        .blog-editor h3 { font-size:1.15rem; font-weight:600; color:#334155; margin:1rem 0 0.4rem; }
        .blog-editor p  { margin:0.6rem 0; }
        .blog-editor ul { list-style:disc; padding-left:1.6rem; margin:0.5rem 0; }
        .blog-editor ol { list-style:decimal; padding-left:1.6rem; margin:0.5rem 0; }
        .blog-editor li { margin:0.3rem 0; color:#475569; }
        .blog-editor blockquote { border-left:4px solid #0ea5e9; padding:0.8rem 1.1rem; background:#f0f9ff; border-radius:0 0.5rem 0.5rem 0; margin:1rem 0; color:#0369a1; font-style:italic; }
        .blog-editor blockquote cite { display:block; font-size:0.8rem; margin-top:0.4rem; color:#0284c7; font-style:normal; }
        .blog-editor hr { border:none; border-top:2px solid #e2e8f0; margin:1.5rem 0; }
        .blog-editor a, .blog-editor .blog-link { color:#2563eb; text-decoration:underline; cursor:pointer; }
        .blog-editor b, .blog-editor strong { font-weight:700; color:#1e293b; }
        .blog-editor i,  .blog-editor em { font-style:italic; }
        .blog-editor u  { text-decoration:underline; }
        .blog-editor .blog-figure { margin:1.2rem 0; }
        .blog-editor .blog-img { width:100%; border-radius:0.75rem; border:1px solid #e2e8f0; }
        .blog-editor .blog-figcaption { text-align:center; font-size:0.85rem; color:#64748b; margin-top:0.35rem; }
      `}</style>
    </div>
  );
}

// ─── Helper Sub-Components ────────────────────────────────────────────────────
function SectionLabel({ number, label, emoji }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-[#fc8f41] text-white text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </span>
      <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wide">
        {emoji && `${emoji} `}{label}
      </h3>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="label-text">{label}</label>
      {children}
    </div>
  );
}

function CharBar({ value, max, warnAt, dangerAt }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= dangerAt ? "bg-red-400" : value >= warnAt ? "bg-yellow-400" : "bg-green-400";
  return (
    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ─── Toolbar Icon Helpers ────────────────────────────────────────────────────
function TBtn({ title, onMouseDown, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown && onMouseDown(e); }}
      className="flex items-center justify-center min-w-[26px] h-7 px-1.5 rounded hover:bg-slate-200 active:bg-slate-300 transition cursor-pointer text-slate-700"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-[#ccc] mx-0.5 shrink-0" />;
}

function AlignIcon({ type }) {
  const rows = {
    left:   [12, 8, 12],
    center: [12, 8, 12],
    right:  [12, 8, 12],
  };
  const x = { left: [1, 1, 1], center: [1, 3, 1], right: [1, 5, 1] };
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x={x[type][0]} y="2" width={rows[type][0]} height="2" rx="0.8" />
      <rect x={x[type][1]} y="6" width={rows[type][1]} height="2" rx="0.8" />
      <rect x={x[type][2]} y="10" width={rows[type][2]} height="2" rx="0.8" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 9.5H4a4 4 0 0 1 0-8h1M9 3.5h1a4 4 0 0 1 0 8H9" />
      <line x1="5" y1="6.5" x2="10" y2="6.5" />
    </svg>
  );
}

function ImgIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1.5" width="13" height="11" rx="1.5" />
      <circle cx="5" cy="5" r="1.3" />
      <path d="M1 10.5l3.5-3.5L7 9.5l2.5-2.5L14 10.5" />
    </svg>
  );
}

function OutdentIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="currentColor">
      <rect x="6" y="2" width="8" height="1.8" rx="0.8" />
      <rect x="6" y="6" width="8" height="1.8" rx="0.8" />
      <rect x="6" y="10" width="8" height="1.8" rx="0.8" />
      <path d="M4 4.5L1 7l3 2.5V4.5z" />
    </svg>
  );
}

function IndentIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="currentColor">
      <rect x="1" y="2" width="8" height="1.8" rx="0.8" />
      <rect x="1" y="6" width="8" height="1.8" rx="0.8" />
      <rect x="1" y="10" width="8" height="1.8" rx="0.8" />
      <path d="M11 4.5l3 2.5-3 2.5V4.5z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8a5 5 0 1 1 1.2 3.2" />
      <polyline points="2,4 2,8 6,8" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8a5 5 0 1 0-1.2 3.2" />
      <polyline points="12,4 12,8 8,8" />
    </svg>
  );
}
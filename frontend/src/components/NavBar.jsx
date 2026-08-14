import { useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { HiX, HiChevronDown } from "react-icons/hi";
import { FaBars, FaExchangeAlt, FaArrowRight, FaMagic } from "react-icons/fa";
import {
  FaImage,
  FaFileLines,
  FaHeadphones,
  FaVideo,
} from "react-icons/fa6";

import logo from "../assets/logo.png";


const imageConversions = [
  { name: "Image → PDF", from: "", to: "pdf", desc: "Convert images to PDF document" },
  { name: "JPG → PDF", from: "jpg", to: "pdf", desc: "Convert JPG images to PDF" },
  { name: "PNG → PDF", from: "png", to: "pdf", desc: "Convert PNG images to PDF" },
  { name: "PNG → JPG", from: "png", to: "jpg", desc: "Convert PNG to JPG image" },
  { name: "JPG → PNG", from: "jpg", to: "png", desc: "Convert JPG to PNG image" },
  { name: "JPG → WebP", from: "jpg", to: "webp", desc: "Compress JPG to WebP" },
  { name: "WebP → JPG", from: "webp", to: "jpg", desc: "Convert WebP to JPG" },
  { name: "PNG → WebP", from: "png", to: "webp", desc: "Convert PNG to WebP" },
  { name: "WebP → PNG", from: "webp", to: "png", desc: "Convert WebP to PNG" },
  { name: "BMP → PNG", from: "bmp", to: "png", desc: "Convert BMP to PNG" },
  { name: "PNG → BMP", from: "png", to: "bmp", desc: "Convert PNG to BMP" },
  { name: "GIF → PNG", from: "gif", to: "png", desc: "Convert GIF to PNG" },
  { name: "All Image Tools", from: "", to: "", desc: "Open full image converter" },
];

const navItems = [
  { name: "Home", path: "/", icon: null },
  { name: "Document", path: "/document", icon: FaFileLines },
  { name: "Image", path: "/image", icon: FaImage, hasDropdown: true },
  { name: "Audio", path: "/audio", icon: FaHeadphones },
  { name: "Video", path: "/video", icon: FaVideo },
];

const NavBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
  const [mobileImageOpen, setMobileImageOpen] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const currentFrom = searchParams.get("from")?.toLowerCase();
  const currentTo = searchParams.get("to")?.toLowerCase();

  const closeAll = () => {
    setMenuOpen(false);
    setImageDropdownOpen(false);
    setMobileImageOpen(false);
  };

  const handleMouseEnter = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setImageDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setImageDropdownOpen(false);
    }, 200);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/40 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-colors duration-300">
      <div className="max-w-full mx-auto px-8 lg:px-32">
        <div className="flex items-center justify-between h-16 relative">
          {/* ── Logo ── */}
          <NavLink
            to="/"
            className="flex items-center gap-2 text-2xl font-bold tracking-wide z-10 group"
            onClick={closeAll}
          >
            <img src={logo} alt="logo" className="w-12 h-12" />

            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
              FileCooks
            </span>
          </NavLink>

          {/* ── Desktop Navigation — centred pill ── */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full border border-gray-200 shadow-xs bg-white/60 backdrop-blur-sm absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isImage = item.name === "Image";

              if (isImage) {
                return (
                  <div
                    key={item.name}
                    className="relative flex items-center"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${isActive || location.pathname.includes('/image')
                          ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md"
                          : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                        }`
                      }
                    >
                      <Icon size={14} />
                      <span>{item.name}</span>
                      <HiChevronDown
                        className={`transition-transform duration-200 ${imageDropdownOpen ? "rotate-180" : ""
                          }`}
                        size={14}
                      />
                    </NavLink>

                    {/* ── Image Tools Dropdown Menu ── */}
                    {imageDropdownOpen && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[22rem] sm:w-[28rem] rounded-3xl bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl p-4 z-50 animate-fade-in origin-top"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        {/* 🌟 New Tool Highlight: Icon & Web Assets Generator */}
                        <NavLink
                          to="/image-converter/icon-generator"
                          onClick={closeAll}
                          className={({ isActive }) =>
                            `flex items-center justify-between p-3 mb-3 rounded-2xl border transition-all duration-200 ${isActive || location.pathname.includes('/icon-generator')
                              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-md font-bold"
                              : "bg-gradient-to-r from-orange-50/80 to-amber-50/80 hover:from-orange-500 hover:to-amber-500 hover:text-white border-orange-200/80 text-gray-800"
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-white/90 text-orange-600 shadow-2xs">
                              <FaMagic size={16} />
                            </span>
                            <div>
                              <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                                <span>Icon & Web Assets Generator</span>
                                <span className="text-[9px] bg-orange-200/90 text-orange-900 px-1.5 py-0.5 rounded-full uppercase tracking-wide font-extrabold">
                                  New
                                </span>
                              </div>
                              <div className="text-[10px] opacity-85 font-medium mt-0.5">
                                Favicons, App Icons & OG Images from 1 image
                              </div>
                            </div>
                          </div>
                          <FaArrowRight size={12} className="shrink-0 ml-2" />
                        </NavLink>

                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 px-1">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-gray-800">
                            <FaExchangeAlt className="text-orange-500" />
                            <span>Image Converter</span>
                          </div>
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                            100% Free & Local
                          </span>
                        </div>

                        {/* 2-Column Grid of Conversion Shortcuts */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {imageConversions.map((conv) => {
                            const path =
                              conv.from && conv.to
                                ? `/image?from=${conv.from}&to=${conv.to}`
                                : conv.to
                                  ? `/image?to=${conv.to}`
                                  : "/image";

                            const isSelected =
                              conv.from && conv.to
                                ? currentFrom === conv.from && currentTo === conv.to
                                : conv.to
                                  ? currentTo === conv.to && (!currentFrom || currentFrom === conv.from)
                                  : location.pathname === "/image" && !currentFrom && !currentTo;

                            return (
                              <NavLink
                                key={conv.name}
                                to={path}
                                onClick={closeAll}
                                className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-200 ${isSelected
                                  ? "bg-orange-500 border-orange-500 text-white font-bold shadow-sm"
                                  : "bg-gray-50/60 hover:bg-orange-500 hover:text-white border-gray-100 text-gray-700"
                                  }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold leading-tight group-hover:text-white transition-colors">
                                    {conv.name}
                                  </div>
                                  <div
                                    className={`text-[10px] truncate transition-colors ${isSelected
                                      ? "text-white/90 font-medium"
                                      : "opacity-75 group-hover:text-white/90"
                                      }`}
                                  >
                                    {conv.desc}
                                  </div>
                                </div>
                                <FaArrowRight
                                  size={10}
                                  className={`transition-all shrink-0 ml-1 ${isSelected
                                    ? "opacity-100 text-white"
                                    : "opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                                    }`}
                                />
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${isActive
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md"
                      : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
                    }`
                  }
                >
                  {Icon && <Icon size={14} />}
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* ── Right side: mobile menu button ── */}
          <div className="flex items-center gap-3 z-10">
            <button
              className="lg:hidden relative z-[101] p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <HiX size={22} /> : <FaBars size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Backdrop overlay (mobile) ── */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-[90] ${menuOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
        onClick={closeAll}
        aria-hidden="true"
      />

      {/* ── Mobile Navigation ── */}
      <div
        className={`lg:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md shadow-lg border-t border-gray-200 overflow-hidden transition-all duration-300 z-[95] ${menuOpen ? "max-h-[38rem]" : "max-h-0 opacity-0"
          }`}
      >
        <nav className="overflow-y-auto max-h-[38rem]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isImage = item.name === "Image";

            if (isImage) {
              return (
                <div key={item.name} className="border-b border-gray-100">
                  <div className="flex items-center">
                    <NavLink
                      to={item.path}
                      onClick={closeAll}
                      className={({ isActive }) =>
                        `flex-1 flex items-center gap-3 px-6 py-4 text-base font-medium transition-colors ${isActive ? "text-orange-600 bg-orange-50/50" : "text-gray-700"
                        }`
                      }
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100 text-orange-500">
                        <Icon size={14} />
                      </span>
                      <span>Image Tools</span>
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => setMobileImageOpen(!mobileImageOpen)}
                      className="px-6 py-4 text-gray-500 hover:text-orange-600"
                      aria-label="Toggle Image Tools"
                    >
                      <HiChevronDown
                        size={18}
                        className={`transition-transform duration-300 ${mobileImageOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>
                  </div>

                  {/* Collapsible Sub-list for Mobile */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${mobileImageOpen ? "max-h-96" : "max-h-0"
                      }`}
                  >
                    <div className="bg-gray-50/90 py-3 px-4 space-y-2">
                      <NavLink
                        to="/image-converter/icon-generator"
                        onClick={closeAll}
                        className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs flex items-center justify-between shadow-xs"
                      >
                        <span className="flex items-center gap-2">
                          <FaMagic size={14} />
                          <span>Icon & Web Assets Generator</span>
                        </span>
                        <FaArrowRight size={10} />
                      </NavLink>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {imageConversions.map((conv) => {
                          const path =
                            conv.from && conv.to
                              ? `/image?from=${conv.from}&to=${conv.to}`
                              : conv.to
                                ? `/image?to=${conv.to}`
                                : "/image";

                          const isSelected =
                            conv.from && conv.to
                              ? currentFrom === conv.from && currentTo === conv.to
                              : conv.to
                                ? currentTo === conv.to && (!currentFrom || currentFrom === conv.from)
                                : location.pathname === "/image" && !currentFrom && !currentTo;

                          return (
                            <NavLink
                              key={conv.name}
                              to={path}
                              onClick={closeAll}
                              className={`p-2.5 rounded-xl border text-xs font-bold transition-colors block text-center shadow-2xs ${isSelected
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-white border-gray-200/80 text-gray-800 hover:bg-orange-500 hover:text-white"
                                }`}
                            >
                              {conv.name}
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={closeAll}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-4 text-base font-medium border-b border-gray-100 transition-colors ${isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-700 hover:bg-gray-50"
                  }`
                }
              >
                {Icon && (
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100 text-orange-500">
                    <Icon size={14} />
                  </span>
                )}
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default NavBar;


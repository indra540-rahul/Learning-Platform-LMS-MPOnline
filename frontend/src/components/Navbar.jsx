import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Navbar.css";
import { BookOpen, ChevronDown, LayoutDashboard, LogOut, Menu, Search, ShoppingCart, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import luminaLogo from "../assets/lumina_lms_logo.png";


const Navbar = () => {
  const navigate = useNavigate();
  const { cartCount, courses } = useCourses();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const menuRef = useRef(null);
  const isStudent = user?.role === "student";

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isStudent) return () => {
      mounted = false;
    };

    api.myEnrollments()
      .then((data) => {
        if (!mounted) return;
        const mapped = data.map((entry) => {
          const course = courses.find((item) => item.id === entry.course_id);
          return {
            ...entry,
            title: course?.title || entry.course_id,
            category: course?.category || "Purchased Course",
            price: course?.price || null,
          };
        });
        setPurchaseHistory(mapped);
      })
      .catch((err) => {
        if (!mounted) return;
        setPurchaseHistory([]);
        setHistoryError(err.message);
      });

    return () => {
      mounted = false;
    };
  }, [courses, isStudent]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const totalSpent = useMemo(() => (
    purchaseHistory.reduce((sum, entry) => sum + (entry.price || 0), 0)
  ), [purchaseHistory]);
  const visiblePurchaseHistory = isStudent ? purchaseHistory : [];
  const visibleHistoryError = isStudent ? historyError : "";

  const dashboardRoute = user?.role === "admin"
    ? "/admin/dashboard"
    : user?.role === "mentor"
      ? "/mentor/dashboard"
      : "/user/dashboard";

  const handleLogout = () => {
    setMenuOpen(false);
    setHistoryOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate("/");
  };

  const handleNavigate = (path) => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(path);
  };

  const formatPurchaseDate = (value) => {
    if (!value) return "Recently added";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently added";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const closeHistory = () => setHistoryOpen(false);

  const openHistory = () => {
    setMenuOpen(false);
    setHistoryOpen(true);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <img src={luminaLogo} alt="Lumina LMS logo" className="logo-mark" />
          <span><span className="logo-highlight">Lumina</span> LMS</span>
        </div>

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`navbar-panel ${mobileMenuOpen ? "is-open" : ""}`}>
          <ul className="nav-links">
            <li>
              <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>Home</NavLink>
            </li>
            <li>
              <NavLink to="/about" onClick={() => setMobileMenuOpen(false)}>About</NavLink>
            </li>
            <li>
              <NavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</NavLink>
            </li>
            <li>
              <NavLink to="/courses" onClick={() => setMobileMenuOpen(false)}>Courses</NavLink>
            </li>
          </ul>

          <div className="nav-right">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search courses..." onFocus={() => handleNavigate("/courses")} />
            </div>

            <button
              className="cart-btn"
              onClick={() => handleNavigate("/checkout")}
              aria-label="Go to checkout"
              title="Checkout"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            {user ? (
              <div className="nav-user-shell" ref={menuRef}>
                <button
                  type="button"
                  className={`nav-user-trigger ${menuOpen ? "is-open" : ""}`}
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-expanded={menuOpen}
                  aria-label="Open account menu"
                >
                  <span className="nav-user-avatar">{initials}</span>
                  <span className="nav-user-copy">
                    <strong>{user.name}</strong>
                    <small>{user.role}</small>
                  </span>
                  <ChevronDown size={16} />
                </button>

                {menuOpen && (
                  <div className="nav-user-menu">
                    <div className="nav-user-menu-head">
                      <div className="nav-user-avatar large">{initials}</div>
                      <div>
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                      </div>
                    </div>

                    <div className="nav-user-stat-row">
                      <div>
                        <span>Role</span>
                        <strong>{user.role}</strong>
                      </div>
                      <div>
                        <span>Purchases</span>
                        <strong>{visiblePurchaseHistory.length}</strong>
                      </div>
                      <div>
                        <span>Spent</span>
                        <strong>Rs. {totalSpent}</strong>
                      </div>
                    </div>

                    <div className="nav-user-history">
                      <div className="nav-user-section-head">
                        <h5>Purchase History</h5>
                        {isStudent ? (
                          <button type="button" className="nav-inline-link" onClick={openHistory}>
                            Open History
                          </button>
                        ) : null}
                      </div>

                      {!isStudent ? (
                        <p className="nav-user-empty">Purchase history is available for student accounts.</p>
                      ) : visibleHistoryError ? (
                        <p className="nav-user-empty">{visibleHistoryError}</p>
                      ) : (
                        <button
                          type="button"
                          className="nav-history-launch"
                          onClick={openHistory}
                          disabled={!visiblePurchaseHistory.length}
                        >
                          <span>{visiblePurchaseHistory.length ? `${visiblePurchaseHistory.length} purchases available` : "No purchases yet"}</span>
                          <strong>{visiblePurchaseHistory.length ? "Click to view full history" : "Explore courses to get started"}</strong>
                        </button>
                      )}
                    </div>

                    <div className="nav-user-actions">
                      <button type="button" className="nav-menu-btn" onClick={() => handleNavigate(dashboardRoute)}>
                        <LayoutDashboard size={15} />
                        Dashboard
                      </button>
                      <button
                        type="button"
                        className="nav-menu-btn secondary"
                        onClick={() => handleNavigate(isStudent ? "/user/my-courses" : dashboardRoute)}
                      >
                        <BookOpen size={15} />
                        {isStudent ? "My Courses" : "Workspace"}
                      </button>
                      <button type="button" className="nav-menu-btn danger" onClick={handleLogout}>
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button className="get-started-btn" onClick={() => handleNavigate("/auth")}>
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>

      {historyOpen && isStudent && (
        <div className="purchase-history-overlay" onClick={closeHistory}>
          <div className="purchase-history-modal" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-history-head">
              <div>
                <span className="purchase-history-kicker">Learning Wallet</span>
                <h3>{user.name}'s Purchase History</h3>
                <p>Every enrolled course, purchase date, and learning investment in one place.</p>
              </div>
              <button type="button" className="purchase-history-close" onClick={closeHistory} aria-label="Close history">
                ×
              </button>
            </div>

            <div className="purchase-history-stats">
              <div>
                <span>Total Purchases</span>
                <strong>{visiblePurchaseHistory.length}</strong>
              </div>
              <div>
                <span>Total Spent</span>
                <strong>Rs. {totalSpent}</strong>
              </div>
              <div>
                <span>Latest Purchase</span>
                <strong>{visiblePurchaseHistory[0] ? formatPurchaseDate(visiblePurchaseHistory[0].purchased_at) : "No orders"}</strong>
              </div>
            </div>

            <div className="purchase-history-body">
              {visibleHistoryError ? (
                <div className="purchase-history-empty">{visibleHistoryError}</div>
              ) : visiblePurchaseHistory.length ? (
                <div className="purchase-history-grid">
                  {visiblePurchaseHistory.map((entry, index) => (
                    <article className="purchase-history-card" key={entry.id}>
                      <div className="purchase-history-card-top">
                        <span className="purchase-history-badge">Order {String(index + 1).padStart(2, "0")}</span>
                        <strong>{entry.price ? `Rs. ${entry.price}` : "Purchased"}</strong>
                      </div>
                      <h4>{entry.title}</h4>
                      <p>{entry.category}</p>
                      <div className="purchase-history-meta">
                        <div>
                          <span>Purchased On</span>
                          <strong>{formatPurchaseDate(entry.purchased_at)}</strong>
                        </div>
                        <div>
                          <span>Course ID</span>
                          <strong>{entry.course_id}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="purchase-history-empty">
                  No purchases yet. Buy a course and your complete order history will appear here.
                </div>
              )}
            </div>

            <div className="purchase-history-actions">
              <button type="button" className="nav-menu-btn secondary" onClick={() => {
                closeHistory();
                navigate("/courses");
              }}>
                Explore Courses
              </button>
              <button type="button" className="nav-menu-btn" onClick={() => {
                closeHistory();
                navigate("/user/my-courses");
              }}>
                Open My Courses
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

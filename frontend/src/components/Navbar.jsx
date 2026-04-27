import React from "react";
import "./Navbar.css";
import { Search, ShoppingCart } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCourses } from "../hooks/useCourses";


const Navbar = () => {
  const navigate = useNavigate();
  const { cartCount } = useCourses();
  return (
    <nav className="navbar">
      <div className="navbar-container">
        
        {/* Logo */}
        <div className="logo">
          <span className="logo-highlight">Lumina</span> LMS
        </div>

        {/* Links */}
        <ul className="nav-links">
          <li>
            <NavLink to="/">Home</NavLink>
          </li>
          <li>
            <NavLink to="/about">About</NavLink>
          </li>
          <li>
            <NavLink to="/contact">Contact</NavLink>
          </li>
          <li>
            <NavLink to="/courses">Courses</NavLink>
          </li>
        </ul>

        {/* Right Section */}
        <div className="nav-right">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search courses..." onFocus={() => navigate("/courses")} />
          </div>

          <button className="get-started-btn" onClick={() => navigate("/auth")}>
            Get Started
          </button>
          <button
            className="cart-btn"
            onClick={() => navigate("/checkout")}
            aria-label="Go to checkout"
            title="Checkout"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;

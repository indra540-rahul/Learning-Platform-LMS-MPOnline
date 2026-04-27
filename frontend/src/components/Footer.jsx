import React from "react";
import "./Footer.css";
import { Send } from "lucide-react";
import { FaLinkedinIn, FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Left Section */}
        <div className="footer-brand">
          <h2><span>Lumina</span> LMS</h2>
          <p>
            Illuminating the path to knowledge through architectural precision
            and corporate-grade reliability.
          </p>

         <div className="social-icons">
  <a href="#" className="icon"><FaLinkedinIn /></a>
  <a href="#" className="icon"><FaXTwitter /></a>
</div>
        </div>

        {/* Platform */}
        <div className="footer-column">
          <h4>Platform</h4>
          <ul>
            <li>Courses</li>
            <li>Enterprise</li>
            <li>Lumina AI</li>
            <li>Integration</li>
          </ul>
        </div>

        {/* Resources */}
        <div className="footer-column">
          <h4>Resources</h4>
          <ul>
            <li>Documentation</li>
            <li>Community</li>
            <li>Webinars</li>
            <li>Blog</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="footer-column newsletter">
          <h4>Newsletter</h4>
          <p>
            Stay updated with the latest learning tracks and features.
          </p>

          <div className="newsletter-box">
            <input type="email" placeholder="Email address" />
            <button>
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2024 Lumina LMS. All rights reserved.</p>

        <div className="footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Cookies</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
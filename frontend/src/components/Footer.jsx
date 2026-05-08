import React, { useState } from "react";
import "./Footer.css";
import { Send } from "lucide-react";
import { FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { api } from "../services/api";

const Footer = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleNewsletterSubmit = async (event) => {
    event.preventDefault();
    const email = newsletterEmail.trim();

    if (!email) {
      setNewsletterStatus({ type: "error", message: "Please enter your email address." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.subscribeNewsletter({ email });
      setNewsletterStatus({ type: "success", message: response.message || "Subscribed successfully." });
      setNewsletterEmail("");
    } catch (error) {
      setNewsletterStatus({ type: "error", message: error.message || "Unable to subscribe right now." });
    } finally {
      setSubmitting(false);
    }
  };

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
  <a href="https://www.linkedin.com" className="icon"><FaLinkedinIn /></a>
  <a href="https://twitter.com" className="icon"><FaXTwitter /></a>
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

          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <div className="newsletter-box">
              <input
                type="email"
                placeholder="Email address"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                disabled={submitting}
              />
              <button type="submit" disabled={submitting} aria-label="Subscribe to newsletter">
                <Send size={16} />
              </button>
            </div>
            {newsletterStatus.message && (
              <p className={`newsletter-status ${newsletterStatus.type}`}>{newsletterStatus.message}</p>
            )}
          </form>
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

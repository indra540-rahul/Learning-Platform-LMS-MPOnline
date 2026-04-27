import React from "react";
import "./Contact.css";

const Contact = () => {
  return (
    <div className="contact">
      <section className="contact-hero">
        <div className="contact-header">
          <span className="contact-kicker">Contact</span>
          <h1>Let&apos;s <span>Connect.</span></h1>
          <p>
            Have questions about our enterprise learning solutions? Our team of
            experts is ready to help you illuminate your educational journey.
          </p>

          <div className="contact-highlights">
            <div>
              <strong>24/7</strong>
              <span>global support coverage</span>
            </div>
            <div>
              <strong>3</strong>
              <span>international office hubs</span>
            </div>
            <div>
              <strong>Fast</strong>
              <span>responses for enterprise teams</span>
            </div>
          </div>
        </div>
      </section>

      <div className="contact-container">
        <div className="contact-form-shell">
          <div className="contact-form-top">
            <div>
              <span className="contact-kicker subtle">Message Us</span>
              <h2>Tell us what your organization needs</h2>
            </div>
            <p>
              Share your goals, support questions, or rollout plans and our team
              will help guide the next step.
            </p>
          </div>

          <div className="contact-form">
            <div className="row">
              <div>
                <label>Full Name</label>
                <input type="text" placeholder="Alex Sterling" />
              </div>

              <div>
                <label>Work Email</label>
                <input type="email" placeholder="alex@company.com" />
              </div>
            </div>

            <div>
              <label>Subject</label>
              <select>
                <option>Enterprise Solutions</option>
                <option>General Inquiry</option>
              </select>
            </div>

            <div>
              <label>Message</label>
              <textarea placeholder="How can we help your organization?" />
            </div>

            <button className="send-btn">Send Message</button>
          </div>
        </div>

        <div className="contact-right">
          <div className="card">
            <span className="contact-kicker subtle">Quick Support</span>
            <h3>Quick Support</h3>
            <p>
              Access our extensive knowledge base or join the community forum.
            </p>

            <div className="support-link">Knowledge Base -&gt;</div>
            <div className="support-link">Community Forums -&gt;</div>
          </div>

          <div className="card offices-card">
            <span className="contact-kicker subtle">Offices</span>
            <h3>Global Offices</h3>

            <div className="office-item">
              <img src="https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=100" alt="San Francisco office" />
              <div>
                <strong>San Francisco</strong>
                <p>101 California St, Suite 2700<br />San Francisco, CA 94111</p>
              </div>
            </div>

            <div className="office-item">
              <img src="https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?w=100" alt="London office" />
              <div>
                <strong>London</strong>
                <p>25 Wilton Rd, Victoria<br />London SW1V 1LW, UK</p>
              </div>
            </div>

            <div className="office-item">
              <img src="https://images.unsplash.com/photo-1508964942454-1a56651d54ac?w=100" alt="Singapore office" />
              <div>
                <strong>Singapore</strong>
                <p>71 Robinson Rd, #14-01<br />Singapore 068895</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="map-section">
        <iframe
          title="map"
          src="https://www.google.com/maps?q=world&output=embed"
          loading="lazy"
        />

        <div className="map-overlay">
          <h4>GLOBAL SUPPORT</h4>
          <p>
            We provide 24/7 technical assistance through globally distributed
            operations centers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;

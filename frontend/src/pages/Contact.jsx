import React, { useRef, useState } from "react";
import { api } from "../services/api";
import "./Contact.css";

const Contact = () => {
  const messageInputRef = useRef(null);
  const [activeSupport, setActiveSupport] = useState(null);
  const [communityFaq, setCommunityFaq] = useState([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    subject: "Enterprise Solutions",
    message: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    };

    if (!payload.full_name || !payload.email || !payload.subject || !payload.message) {
      setStatus({ type: "error", message: "Please fill in all contact fields before sending." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.submitContact(payload);
      setStatus({ type: "success", message: response.message || "Your message has been sent." });
      setForm({
        full_name: "",
        email: "",
        subject: "Enterprise Solutions",
        message: "",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Unable to send your message right now." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSupport = (type) => {
    if (activeSupport === type) {
      setActiveSupport(null);
      setStatus({ type: "", message: "" });
      return;
    }

    const supportPresets = {
      knowledge: {
        subject: "General Inquiry",
        message: "Hi, I need help finding the right knowledge base resources for onboarding, platform usage, or troubleshooting.",
        status: "Tell us what topic you want help with and we will point you to the right knowledge base resources.",
      },
      community: {
        subject: "Support Request",
        message: "Hi, I would like help connecting with the community for discussions, peer support, and shared learning.",
        status: "Share what kind of community support you need and our team will guide you to the right forum path.",
      },
    };

    const preset = supportPresets[type];
    if (!preset) return;

    setForm((current) => ({
      ...current,
      subject: preset.subject,
      message: current.message.trim() ? current.message : preset.message,
    }));
    setStatus({ type: "success", message: preset.status });
    setActiveSupport(type);

    window.requestAnimationFrame(() => {
      messageInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      messageInputRef.current?.focus();
    });
  };

  const handleCommunityForum = async () => {
    if (activeSupport === "community") {
      setActiveSupport(null);
      setStatus({ type: "", message: "" });
      return;
    }

    setActiveSupport("community");
    setStatus({ type: "", message: "" });

    if (communityFaq.length) {
      window.requestAnimationFrame(() => {
        document.getElementById("community-faq-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    setFaqLoading(true);
    try {
      const faqItems = await api.communityFaq();
      setCommunityFaq(faqItems);
      window.requestAnimationFrame(() => {
        document.getElementById("community-faq-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Unable to load community support right now." });
      setActiveSupport(null);
    } finally {
      setFaqLoading(false);
    }
  };

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

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="row">
              <div>
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Alex Sterling"
                />
              </div>

              <div>
                <label>Work Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="alex@company.com"
                />
              </div>
            </div>

            <div>
              <label>Subject</label>
              <select name="subject" value={form.subject} onChange={handleChange}>
                <option>Enterprise Solutions</option>
                <option>General Inquiry</option>
                <option>Support Request</option>
                <option>Pricing & Demo</option>
                <option>Partnership</option>
              </select>
            </div>

            <div>
              <label>Message</label>
              <textarea
                ref={messageInputRef}
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="How can we help your organization?"
              />
            </div>

            {status.message && <p className={`contact-status ${status.type}`}>{status.message}</p>}
            <button type="submit" className="send-btn" disabled={submitting}>
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="contact-right">
          <div className="card">
            <span className="contact-kicker subtle">Quick Support</span>
            <h3>Quick Support</h3>
            <p>
              Access our extensive knowledge base or join the community forum.
            </p>

            <button type="button" className="support-link" onClick={() => handleQuickSupport("knowledge")}>
              Knowledge Base -&gt;
            </button>
            <button type="button" className="support-link" onClick={handleCommunityForum}>
              Community Forums -&gt;
            </button>

            {activeSupport === "knowledge" && (
              <div className="community-faq-panel" id="knowledge-base-panel">
                <div className="community-faq-head">
                  <strong>Knowledge Base Guide</strong>
                  <span>3 quick paths</span>
                </div>

                <article className="community-faq-item">
                  <small>Getting Started</small>
                  <h4>Platform onboarding and setup help</h4>
                  <p>Use this when you need help understanding features, course access, dashboard flow, or common first-step setup issues.</p>
                </article>

                <article className="community-faq-item">
                  <small>Troubleshooting</small>
                  <h4>Find the right issue details before contacting support</h4>
                  <p>Include what page you were on, what action you took, and any visible error text so the support team can guide you faster.</p>
                </article>

                <article className="community-faq-item">
                  <small>Best Route</small>
                  <h4>Use the contact form for direct help</h4>
                  <p>The form is already prepared for knowledge-base help, so you can send your exact question to the team from here.</p>
                </article>
              </div>
            )}

            {activeSupport === "community" && (
              <div className="community-faq-panel" id="community-faq-panel">
                <div className="community-faq-head">
                  <strong>Community FAQ</strong>
                  <span>{faqLoading ? "Loading..." : `${communityFaq.length} topics`}</span>
                </div>

                {faqLoading ? (
                  <p className="community-faq-empty">Loading community guidance from support service...</p>
                ) : (
                  <>
                    {communityFaq.map((item) => (
                      <article className="community-faq-item" key={item.id}>
                        <small>{item.category}</small>
                        <h4>{item.question}</h4>
                        <p>{item.answer}</p>
                      </article>
                    ))}

                    {!!communityFaq.length && (
                      <button type="button" className="support-link support-link-secondary" onClick={() => handleQuickSupport("community")}>
                        Ask Community Team via Contact Form -&gt;
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
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

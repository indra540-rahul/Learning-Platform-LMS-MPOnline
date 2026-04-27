import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-left">
          <span className="badge">Future-ready education</span>

          <h1>
            Architect Your Future with <span>Precision Learning</span>
          </h1>

          <p>
            Experience an illuminated learning journey powered by deep intelligence
            and structured growth. Lumina LMS provides the tools to master complex
            skills with corporate-grade precision. This system will help users to manage courses, plan study schedules, track progress, and improve productivity through analytics and reminders.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn" onClick={() => navigate("/courses")}>
              Explore Curriculum <ArrowRight size={16} />
            </button>
            <button className="secondary-btn" onClick={() => navigate("/about")}>Watch Demo</button>
          </div>

          <div className="users">
            <div className="avatars">
              <img src="https://i.pravatar.cc/30?img=1" alt="Student avatar" />
              <img src="https://i.pravatar.cc/30?img=2" alt="Student avatar" />
              <img src="https://i.pravatar.cc/30?img=3" alt="Student avatar" />
              <span>+12k</span>
            </div>
            <p>Joined by 12,000+ professionals this month</p>
          </div>
        </div>

        <div className="hero-right">
          <img
            src="./src/assets/hero.jpg"
            alt="AI learning workspace"
          />
        </div>
      </section>

      <section className="why">
        <div className="why-header">
          <p className="why-kicker">Why Lumina</p>
          <h3>Built for focused learners who want visible progress, not noise.</h3>
          <p className="why-copy">
            We've reimagined the digital learning experience to focus on what matters:
            retention, application, and mastery.
          </p>
        </div>

        <div className="why-layout">
          <div className="why-spotlight">
            <div className="why-spotlight-copy">
              <span className="spotlight-label">Adaptive Intelligence</span>
              <h4>Precision learning that adapts in motion.</h4>
              <p>
                Our AI engine analyzes your learning patterns in real time, reshaping
                content delivery, planning rhythm, and challenge level to keep your
                focus sharp.
              </p>
            </div>

            <div className="why-orbit-board">
              <div className="orbit-core">
                <strong>92%</strong>
                <span>Focus retention</span>
              </div>
              <div className="orbit-pill pill-one">Smart sequencing</div>
              <div className="orbit-pill pill-two">Live feedback</div>
              <div className="orbit-pill pill-three">Goal alignment</div>
            </div>
          </div>

          <div className="why-card-grid">
            <article className="why-card insight-card">
              <div className="why-card-top">
                <span>Deep Insights</span>
                <strong>70%</strong>
              </div>
              <p>Comprehensive tracking that goes beyond completion rates and shows real momentum.</p>
              <div className="progress">
                <div className="bar"></div>
              </div>
            </article>

            <article className="why-card hub-card">
              <div className="why-card-top">
                <span>Collaborative Hubs</span>
                <strong>24/7</strong>
              </div>
              <p>Connect with peers, mentors, and industry experts in a live learning loop.</p>
              <div className="hub-avatars">
                <img src="https://i.pravatar.cc/40?img=11" alt="Mentor avatar" />
                <img src="https://i.pravatar.cc/40?img=21" alt="Student avatar" />
                <img src="https://i.pravatar.cc/40?img=31" alt="Student avatar" />
                <span>Live</span>
              </div>
            </article>

            <article className="why-card track-card">
              <div className="why-card-top">
                <span>Accelerated Tracks</span>
                <strong>4x</strong>
              </div>
              <p>High-density learning paths designed for faster delivery without losing depth.</p>
              <div className="track-meters">
                <i></i>
                <i></i>
                <i></i>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="ecosystem">
        <div className="eco-header">
          <div>
            <p className="eco-kicker">Platform Layers</p>
            <h3>Core Ecosystem</h3>
            <p>
              Everything you need to manage, scale, and master your organizational
              learning objectives in one unified platform.
            </p>
          </div>

          <button className="view-all" onClick={() => navigate("/courses")}>View all features -&gt;</button>
        </div>

        <div className="eco-cards">
          <div className="eco-card">
            <span className="eco-index">01</span>
            <h4>Immersive Courses</h4>
            <p>High-definition video, interactive labs, and rich text documents.</p>
            <div className="eco-accent-line"></div>
          </div>

          <div className="eco-card">
            <span className="eco-index">02</span>
            <h4>Smart Planner</h4>
            <p>AI-driven scheduling adapted to your workflow and deadlines.</p>
            <div className="eco-mini-grid">
              <i></i>
              <i></i>
              <i></i>
            </div>
          </div>

          <div className="eco-card">
            <span className="eco-index">03</span>
            <h4>Goal Execution</h4>
            <p>Break complex courses into manageable daily tasks.</p>
            <div className="eco-checkpoints">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="eco-card">
            <span className="eco-index">04</span>
            <h4>Skill Radar</h4>
            <p>Visual map of your growth and improvement areas.</p>
            <div className="eco-radar">
              <b></b>
              <b></b>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-shell">
          <div className="cta-copy">
            <p className="cta-kicker">Launch Your Next Leap</p>
            <h2>Ready to Start Your Journey?</h2>
            <p>
              Join thousands of companies and millions of learners building the future of
              their industries on Lumina LMS.
            </p>

            <div className="cta-buttons">
              <button className="cta-primary" onClick={() => navigate("/courses")}>Get Lumina Premium</button>
              <button className="cta-secondary" onClick={() => navigate("/contact")}>Contact Sales</button>
            </div>
          </div>

          <div className="cta-side">
            <div className="cta-stat-card">
              <small>Trusted by teams</small>
              <strong>12k+</strong>
              <span>active learners this month</span>
            </div>
            <div className="brands">
              <span>TECHCORP</span>
              <span>SOLUTIONS</span>
              <span>NEXUS</span>
              <span>FORGE</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

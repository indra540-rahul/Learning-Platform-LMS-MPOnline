import React from "react";
import "./About.css";

const About = () => {
  return (
    <div className="about">
      <section className="about-hero-full">
        <div className="about-hero-inner">
          <div className="about-left">
            <span className="badge">OUR STORY</span>
            <h1>
              Illuminating the Path to <span>Mastery.</span>
            </h1>
            <p>
              Lumina LMS was founded on the principle that technology should adapt
              to the brain, not the other way around.
            </p>

            <div className="about-hero-points">
              <div>
                <strong>10K+</strong>
                <span>learning partners</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>accessible insight loops</span>
              </div>
              <div>
                <strong>Human</strong>
                <span>centered educational systems</span>
              </div>
            </div>
          </div>

          <div className="about-right">
            <div className="about-image-frame">
              <img src="https://images.unsplash.com/photo-1556740749-887f6717d7e4" alt="Team collaboration" />
            </div>
            <div className="about-floating-note">
              <span>Built for focus</span>
              <strong>Technology that follows the learner, not the reverse.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="mission">
        <div className="mission-container">
          <div className="section-intro">
            <span className="section-kicker">Mission</span>
            <h2>Our Mission</h2>
            <p>
              To bridge the gap between human potential and digital knowledge by
              crafting an environment that fosters deep focus, long-term retention,
              and genuine intellectual growth.
            </p>
          </div>

          <div className="mission-cards">
            <div className="mission-card">
              <h3>Cognitive-First</h3>
              <p>
                Our interface is designed to minimize cognitive load, allowing
                learners to focus entirely on the material at hand.
              </p>
            </div>

            <div className="mission-card active">
              <h3>Intelligent Insight</h3>
              <p>
                Using advanced data analytics to provide learners and educators
                with real-time feedback on progress and mastery levels.
              </p>
            </div>

            <div className="mission-card">
              <h3>Universal Access</h3>
              <p>
                Democratizing high-end education technology to ensure that quality
                learning tools are available to every curious mind.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="science">
        <div className="science-left">
          <img src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200" alt="Technology visual" />
          <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200" alt="AI concept" />
          <img src="https://images.unsplash.com/photo-1674027444485-cec3da58eef4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YWl8ZW58MHx8MHx8fDA%3D" alt="Research lab" />
          <img src="https://plus.unsplash.com/premium_photo-1682756540097-6a887bbcf9b0?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGFpfGVufDB8fDB8fHww" alt="Computer chip" />
        </div>

        <div className="science-right">
          <span className="section-kicker light">Research</span>
          <h2>The Science of Learning</h2>
          <p>
            We leverage the latest research in neuroplasticity and spaced repetition
            to build a platform that actually works.
          </p>

          <ul>
            <li>Spaced Repetition Algorithms</li>
            <li>Contextual Scaffolding</li>
            <li>Low-Friction Interface</li>
          </ul>
        </div>
      </section>

      <section className="team">
        <div className="section-intro">
          <span className="section-kicker">People</span>
          <h2>Our Team</h2>
          <p>
            A collective of cognitive scientists, engineers, and experts dedicated to
            the future of education.
          </p>
        </div>

        <div className="team-grid">
          <div className="team-card">
            <img src="https://i.pravatar.cc/300?img=5" alt="Dr. Aarya Chen" />
            <h4>Dr. Aarya Chen</h4>
            <span>Chief Cognitive Architect</span>
          </div>

          <div className="team-card">
            <img src="https://i.pravatar.cc/300?img=12" alt="Rohan Reed" />
            <h4>Rohan Reed</h4>
            <span>VP of Engineering</span>
          </div>

          <div className="team-card">
            <img src="https://i.pravatar.cc/300?img=20" alt="Elena Kapoor" />
            <h4>Elena Kapoor</h4>
            <span>Director of Product Design</span>
          </div>

          <div className="team-card">
            <img src="https://i.pravatar.cc/300?img=30" alt="Marcus Iyer" />
            <h4>Marcus Iyer</h4>
            <span>Head of Learning Science</span>
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="cta-content">
          <span className="section-kicker cta-kicker">Next Step</span>
          <h2>Ready to Evolve Your Learning?</h2>
          <p>
            Join over 10,000 corporate partners and academic institutions redefining
            excellence with Lumina LMS.
          </p>

          <div className="cta-buttons">
            <a
              className="primary-btn"
              href="https://github.com/indra540-rahul"
              target="_blank"
              rel="noreferrer"
            >
              Documentation on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

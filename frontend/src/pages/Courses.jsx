import { useMemo, useState } from "react";
import { motion as Motion} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Filter,
  IndianRupee,
  Layers3,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCourses } from "../hooks/useCourses";
import "./Courses.css";

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses, addToCart, isInCart, isEnrolled, cartCount } = useCourses();
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [loadStep, setLoadStep] = useState(6);
  const courseCategories = useMemo(() => ["All", ...new Set(courses.map((course) => course.category))], [courses]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((course) => {
      const categoryMatch = activeCategory === "All" || course.category === activeCategory;
      const termMatch = !term || [course.title, course.category, course.summary, course.mentor, course.level]
        .join(" ")
        .toLowerCase()
        .includes(term);
      return categoryMatch && termMatch;
    });
  }, [activeCategory, courses, search]);

  const visibleCourses = useMemo(
    () => filteredCourses.slice(0, visibleCount),
    [filteredCourses, visibleCount],
  );

  const featured = courses.slice(0, 3);

  return (
    <div className="courses-page">
      <Motion.section className="courses-hero" initial="hidden" animate="show" variants={stagger}>
        <Motion.div className="courses-hero-copy" variants={fadeUp}>
          <span className="courses-kicker"><Sparkles size={14} /> Curated learning tracks</span>
          <h1>Explore future-ready courses built like a final year showcase.</h1>
          <p>
            Discover premium learning paths across AI, engineering, design, business, and security,
            then move from cart to payment to your student dashboard in one smooth flow.
          </p>
          <div className="courses-hero-actions">
            <button type="button" className="catalog-primary" onClick={() => navigate("/checkout")}>
              <ShoppingCart size={16} />
              View Cart {cartCount ? `(${cartCount})` : ""}
            </button>
            <button type="button" className="catalog-secondary" onClick={() => navigate(user?.role === "student" ? "/user/my-courses" : "/auth")}>
              <BookOpen size={16} />
              My Learning Space
            </button>
          </div>
        </Motion.div>

        <Motion.div className="courses-hero-panel" variants={fadeUp}>
          {featured.map((course) => (
            <article key={course.id} className="hero-course-chip" style={{ "--chip-accent": course.accent }}>
              <img src={course.image} alt={course.title} />
              <div>
                <small>{course.category}</small>
                <strong>{course.title}</strong>
                <span>{course.duration} • {course.level}</span>
              </div>
            </article>
          ))}
        </Motion.div>
      </Motion.section>

      <section className="catalog-shell">
        <div className="catalog-toolbar">
          <div>
            <p className="catalog-eyebrow">Browse by category</p>
            <h2>Course Catalog</h2>
          </div>
          <label className="catalog-search">
            <Filter size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(loadStep);
              }}
              placeholder="Search titles, mentors, categories..."
            />
          </label>
        </div>

        <div className="category-strip">
          {courseCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? "active" : ""}
              onClick={() => {
                setActiveCategory(category);
                setVisibleCount(loadStep);
              }}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="catalog-results-bar">
          <p>
            Showing <strong>{visibleCourses.length}</strong> of <strong>{filteredCourses.length}</strong> courses
          </p>
          <label className="catalog-view-select">
            <span>See more by</span>
            <select
              value={String(loadStep)}
              onChange={(event) => {
                const nextStep = Number(event.target.value) || 6;
                setLoadStep(nextStep);
                setVisibleCount(nextStep);
              }}
            >
              <option value="6">6 courses</option>
              <option value="9">9 courses</option>
              <option value="12">12 courses</option>
            </select>
          </label>
        </div>

        <Motion.div className="courses-grid" initial="hidden" animate="show" variants={stagger}>
          {visibleCourses.map((course) => {
            const enrolled = isEnrolled(course.id);
            const inCart = isInCart(course.id);

            return (
              <Motion.article className="course-showcase-card" key={course.id} variants={fadeUp}>
                <div className="course-showcase-media">
                  <img src={course.image} alt={course.title} />
                  <span>{course.badge}</span>
                </div>

                <div className="course-showcase-body">
                  <div className="course-meta-line">
                    <p>{course.category}</p>
                    <strong>{course.level}</strong>
                  </div>

                  <h3>{course.title}</h3>
                  <p className="course-summary">{course.summary}</p>

                  <div className="course-stat-line">
                    <span><Layers3 size={14} /> {course.lessons} lessons</span>
                    <span><Users size={14} /> {course.students} learners</span>
                    <span><BookOpen size={14} /> {course.duration}</span>
                  </div>

                  <div className="course-outcomes">
                    {course.outcomes.map((item) => <i key={item}>{item}</i>)}
                  </div>

                  <div className="course-card-foot">
                    <div>
                      <small>Mentor</small>
                      <strong>{course.mentor}</strong>
                    </div>
                    <div className="course-price">
                      <small>Price</small>
                      <strong><IndianRupee size={15} /> {course.price}</strong>
                    </div>
                  </div>

                  <div className="course-card-actions">
                    <button
                      type="button"
                      className={`catalog-primary ${enrolled ? "is-disabled" : ""}`}
                      onClick={() => !enrolled && addToCart(course.id)}
                      disabled={enrolled}
                    >
                      <ShoppingCart size={16} />
                      {enrolled ? "Already Enrolled" : inCart ? "Added to Cart" : "Add to Cart"}
                    </button>
                    <button type="button" className="catalog-link" onClick={() => navigate("/checkout")}>
                      Checkout <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </Motion.article>
            );
          })}
        </Motion.div>

        {!!filteredCourses.length && visibleCourses.length < filteredCourses.length && (
          <div className="catalog-load-more">
            <button
              type="button"
              className="catalog-secondary"
              onClick={() => setVisibleCount((current) => Math.min(current + loadStep, filteredCourses.length))}
            >
              See More Courses
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Courses;

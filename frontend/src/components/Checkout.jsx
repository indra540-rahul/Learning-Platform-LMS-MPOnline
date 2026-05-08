import React, { useMemo, useState } from "react";
import "./Checkout.css";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Headphones,
  Landmark,
  LockKeyhole,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCourses } from "../hooks/useCourses";
import { api } from "../services/api";

const loadRazorpayScript = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(window.Razorpay);
    return;
  }

  const existing = document.querySelector('script[data-razorpay-checkout="true"]');
  if (existing) {
    existing.addEventListener("load", () => resolve(window.Razorpay), { once: true });
    existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.dataset.razorpayCheckout = "true";
  script.onload = () => resolve(window.Razorpay);
  script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
  document.body.appendChild(script);
});

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartIds, cartCourses, removeFromCart, subtotal, clearCart, refreshEnrollments } = useCourses();
  const [promo, setPromo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const discount = useMemo(() => (
    promo.trim().toUpperCase() === "LUMINA10" ? subtotal * 0.1 : 0
  ), [promo, subtotal]);

  const tax = Math.max(0, (subtotal - discount) * 0.18);
  const total = Math.max(0, subtotal - discount + tax);
  const averagePrice = cartCourses.length ? subtotal / cartCourses.length : 0;

  const handlePayment = async () => {
    setError("");
    setMessage("");

    if (!user) {
      navigate("/auth?redirect=/checkout");
      return;
    }

    if (user.role !== "student") {
      setError("Course purchase is available for student accounts only.");
      return;
    }

    try {
      setIsPaying(true);
      const Razorpay = await loadRazorpayScript();
      const order = await api.createRazorpayOrder({
        course_ids: cartIds,
        promo_code: promo.trim() || undefined,
      });

      await new Promise((resolve, reject) => {
        const razorpay = new Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          order_id: order.order_id,
          prefill: {
            name: order.prefill_name,
            email: order.prefill_email,
          },
          theme: {
            color: "#2563eb",
          },
          handler: async (response) => {
            try {
              const verification = await api.verifyRazorpayPayment(response);
              await refreshEnrollments();
              clearCart();
              setMessage(verification.message);
              setTimeout(() => navigate("/user/my-courses"), 900);
              resolve(verification);
            } catch (verifyError) {
              reject(verifyError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
          },
        });

        razorpay.on("payment.failed", (response) => {
          reject(new Error(response.error?.description || "Payment failed. Please try again."));
        });
        razorpay.open();
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="checkout">
      <div className="checkout-header">
        <button type="button" className="back" onClick={() => navigate("/courses")}>
          <ArrowLeft size={16} /> Back to Courses
        </button>

        <div className="checkout-hero">
          <div className="checkout-hero-copy">
            <span className="checkout-kicker"><Sparkles size={14} /> Finalize your learning bundle</span>
            <h1>Confirm Enrollment</h1>
            <p>
              Review your cart, complete the payment flow, and unlock your courses inside the student dashboard.
            </p>
          </div>

          <div className="checkout-hero-stats">
            <div>
              <small>Courses Selected</small>
              <strong>{cartCourses.length}</strong>
            </div>
            <div>
              <small>Average Course Value</small>
              <strong>Rs. {averagePrice.toFixed(0)}</strong>
            </div>
            <div>
              <small>Instant Access</small>
              <strong>After Payment</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-steps">
        <div className="checkout-step active"><span>1</span> Review Cart</div>
        <div className="checkout-step active"><span>2</span> Secure Payment</div>
        <div className="checkout-step"><span>3</span> Dashboard Access</div>
      </div>

      <div className="checkout-container">
        <div className="left">
          <div className="course-wrapper">
            <div className="section-title-row">
              <h3>Course Selection</h3>
              <span>{cartCourses.length} selected</span>
            </div>

            {cartCourses.length ? cartCourses.map((course) => (
              <div className="course-item" key={course.id}>
                <img src={course.image} alt={course.title} />
                <div className="course-info">
                  <h4>{course.title}</h4>
                  <p>{course.category} | {course.duration} | {course.mentor}</p>
                  <div className="course-pill-row">
                    <span>{course.level}</span>
                    <span>{course.lessons} lessons</span>
                    <span>{course.badge}</span>
                  </div>
                  <button type="button" className="remove" onClick={() => removeFromCart(course.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <span className="price">Rs. {course.price}</span>
              </div>
            )) : (
              <div className="empty-cart">
                <BookOpen size={22} />
                <div>
                  <h4>Your cart is empty.</h4>
                  <p>Add courses from the catalog to continue.</p>
                </div>
                <button type="button" onClick={() => navigate("/courses")}>Explore Courses</button>
              </div>
            )}

            <div className="promo">
              <div className="promo-input">
                <Sparkles size={16} />
                <input
                  value={promo}
                  onChange={(event) => setPromo(event.target.value)}
                  placeholder="Promo Code (try LUMINA10)"
                />
              </div>
              <button type="button">Apply Code</button>
            </div>
          </div>

          <div className="security">
            <span><ShieldCheck size={16} /> Razorpay test checkout</span>
            <span><Sparkles size={16} /> Enrollment appears instantly after verified payment</span>
          </div>

          <div className="checkout-benefits">
            <article>
              <Rocket size={18} />
              <div>
                <strong>Fast onboarding</strong>
                <p>Purchased courses appear in the student dashboard immediately after payment.</p>
              </div>
            </article>
            <article>
              <LockKeyhole size={18} />
              <div>
                <strong>Protected checkout</strong>
                <p>Your cart, payment redirect, and enrollment state stay synced to this account.</p>
              </div>
            </article>
            <article>
              <Star size={18} />
              <div>
                <strong>Premium learning bundle</strong>
                <p>Each selected course keeps its level, lesson count, and curated catalog badge visible here.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="right">
          <div className="summary-card">
            <div className="summary-head">
              <div>
                <small>Enrollment Summary</small>
                <h3>Order Summary</h3>
              </div>
              <CheckCircle2 size={20} />
            </div>

            <div className="row">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>

            <div className="row">
              <span>Tax (GST 18%)</span>
              <span>Rs. {tax.toFixed(2)}</span>
            </div>

            <div className="row discount">
              <span>Discount</span>
              <span>-Rs. {discount.toFixed(2)}</span>
            </div>

            <hr />

            <div className="total">
              <span>Total Amount</span>
              <span className="amount">Rs. {total.toFixed(2)}</span>
            </div>

            <div className="summary-callout">
              <strong>Included with this order</strong>
              <p>Dashboard access, enrollment memory for this student account, and instant visibility inside My Courses.</p>
            </div>

            {!user && <p className="terms">Create or sign into a student account before payment.</p>}
            {error && <p className="checkout-error">{error}</p>}
            {message && <p className="checkout-success">{message}</p>}

            <button className="pay-btn" type="button" onClick={handlePayment} disabled={!cartCourses.length || isPaying}>
              <img src="https://cdn-icons-png.flaticon.com/512/5968/5968260.png" alt="Payment" />
              {isPaying ? "Processing..." : user ? "Pay & Enroll" : "Continue to Sign Up"}
            </button>

            <p className="terms">
              By continuing, your purchased courses will be added to the My Courses section of the student dashboard.
            </p>

            <p className="secure-text">PAYMENT OPTIONS</p>

            <div className="payment-icons">
              <div><CreditCard size={18} />Cards</div>
              <div><Landmark size={18} />NetBanking</div>
              <div><QrCode size={18} />UPI</div>
              <div><Wallet size={18} />Wallets</div>
            </div>
          </div>

          <div className="support">
            <Headphones size={18} />
            <div>
              <p>Need help?</p>
              <span>Support can help with payment and course access.</span>
            </div>
            <button type="button" onClick={() => navigate("/contact")}>Contact</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

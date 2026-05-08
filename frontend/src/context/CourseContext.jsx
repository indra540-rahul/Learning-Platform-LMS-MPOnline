import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { CourseContext } from "./course-context";

const CART_KEY = "lumina_course_cart_v1";

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const CourseProvider = ({ children }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [cartIds, setCartIds] = useState(() => readJson(CART_KEY, []));
  const [enrollments, setEnrollments] = useState([]);
  const isStudent = user?.role === "student";

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartIds));
  }, [cartIds]);

  useEffect(() => {
    let mounted = true;
    api.courses()
      .then((data) => {
        if (mounted) {
          setCourses(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setCourses([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isStudent) return () => {
      mounted = false;
    };

    api.myEnrollments()
      .then((data) => {
        if (mounted) {
          setEnrollments(data);
          setCartIds((current) => current.filter((courseId) => !data.some((entry) => entry.course_id === courseId)));
        }
      })
      .catch(() => {
        if (mounted) {
          setEnrollments([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isStudent]);

  const cartCourses = useMemo(
    () => cartIds.map((courseId) => courses.find((course) => course.id === courseId)).filter(Boolean),
    [cartIds, courses],
  );

  const enrolledCourseIds = useMemo(() => {
    return (isStudent ? enrollments : []).map((entry) => entry.course_id);
  }, [enrollments, isStudent]);

  const enrolledCourses = useMemo(
    () => (isStudent ? enrollments : []).map((entry) => {
      const course = courses.find((item) => item.id === entry.course_id);
      return course ? {
        ...course,
        purchasedAt: entry.purchased_at,
        razorpayPaymentId: entry.razorpay_payment_id,
      } : null;
    }).filter(Boolean),
    [courses, enrollments, isStudent],
  );

  const addToCart = (courseId) => {
    setCartIds((current) => (current.includes(courseId) ? current : [...current, courseId]));
  };

  const removeFromCart = (courseId) => {
    setCartIds((current) => current.filter((id) => id !== courseId));
  };

  const clearCart = () => {
    setCartIds([]);
  };

  const isInCart = (courseId) => cartIds.includes(courseId);
  const isEnrolled = (courseId) => enrolledCourseIds.includes(courseId);

  const refreshEnrollments = async () => {
    if (!isStudent) {
      setEnrollments([]);
      return [];
    }
    const data = await api.myEnrollments();
    setEnrollments(data);
    setCartIds((current) => current.filter((courseId) => !data.some((entry) => entry.course_id === courseId)));
    return data;
  };

  const subtotal = cartCourses.reduce((total, course) => total + course.price, 0);

  return (
    <CourseContext.Provider
      value={{
        courses,
        cartIds,
        cartCourses,
        cartCount: cartCourses.length,
        subtotal,
        enrolledCourses,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        isEnrolled,
        refreshEnrollments,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

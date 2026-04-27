import { useEffect, useMemo, useState } from "react";
import { courseCatalog } from "../data/courseCatalog";
import { useAuth } from "../hooks/useAuth";
import { CourseContext } from "./course-context";

const CART_KEY = "lumina_course_cart_v1";
const ENROLLMENTS_KEY = "lumina_course_enrollments_v1";

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const resolveUserKey = (user) => user?.email || (user?.id ? String(user.id) : "");

export const CourseProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartIds, setCartIds] = useState(() => readJson(CART_KEY, []));
  const [enrollmentsByUser, setEnrollmentsByUser] = useState(() => readJson(ENROLLMENTS_KEY, {}));

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartIds));
  }, [cartIds]);

  useEffect(() => {
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(enrollmentsByUser));
  }, [enrollmentsByUser]);

  const cartCourses = useMemo(
    () => cartIds.map((courseId) => courseCatalog.find((course) => course.id === courseId)).filter(Boolean),
    [cartIds],
  );

  const enrolledCourseIds = useMemo(() => {
    const key = resolveUserKey(user);
    return key ? enrollmentsByUser[key] || [] : [];
  }, [enrollmentsByUser, user]);

  const enrolledCourses = useMemo(
    () => enrolledCourseIds.map((courseId) => courseCatalog.find((course) => course.id === courseId)).filter(Boolean),
    [enrolledCourseIds],
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
  const isEnrolled = (courseId, scopedUser = user) => {
    const key = resolveUserKey(scopedUser);
    return key ? (enrollmentsByUser[key] || []).includes(courseId) : false;
  };

  const completePurchase = () => {
    const userKey = resolveUserKey(user);

    if (!userKey) {
      throw new Error("Please create your student account to complete payment.");
    }

    if (user?.role !== "student") {
      throw new Error("Course enrollment is available for student accounts only.");
    }

    if (!cartIds.length) {
      throw new Error("Your cart is empty.");
    }

    setEnrollmentsByUser((current) => {
      const existing = current[userKey] || [];
      return {
        ...current,
        [userKey]: [...new Set([...existing, ...cartIds])],
      };
    });

    setCartIds([]);
    return cartIds;
  };

  const subtotal = cartCourses.reduce((total, course) => total + course.price, 0);

  return (
    <CourseContext.Provider
      value={{
        courses: courseCatalog,
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
        completePurchase,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

import { useContext } from "react";
import { CourseContext } from "../context/course-context";

export const useCourses = () => useContext(CourseContext);

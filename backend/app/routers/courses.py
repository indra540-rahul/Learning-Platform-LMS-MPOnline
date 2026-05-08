from fastapi import APIRouter

from ..course_catalog import COURSE_CATALOG
from ..schemas import CourseOut

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("", response_model=list[CourseOut])
def list_courses():
  return COURSE_CATALOG

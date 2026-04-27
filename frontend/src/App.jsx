import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CourseProvider } from "./context/CourseContext";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourseProvider>
          <AppRoutes />
        </CourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

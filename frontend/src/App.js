import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import SearchPage from "./pages/SearchPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function App() {
  return (
      <BrowserRouter>
        <div style={{ padding: 16 }}>
          <h2>Digital Evidence System</h2>

          <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <NavLink to="/upload">Upload</NavLink>
            <NavLink to="/search">Search</NavLink>
            <NavLink to="/analytics">Analytics</NavLink>
          </nav>

          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </div>
      </BrowserRouter>
  );
}

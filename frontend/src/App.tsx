import { Route, Routes } from "react-router-dom";
import DetailPage from "./pages/DetailPage";
import ListPage from "./pages/ListPage";
import MembersPage from "./pages/MembersPage";
import NewPage from "./pages/NewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ListPage />} />
      <Route path="/new" element={<NewPage />} />
      <Route path="/tasks/:id" element={<DetailPage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="*" element={<main><p>見つかりません。</p></main>} />
    </Routes>
  );
}

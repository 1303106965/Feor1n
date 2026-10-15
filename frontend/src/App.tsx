import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MomentsPage from './pages/MomentsPage';
import MomentDetailPage from './pages/MomentDetailPage';
import AnniversariesPage from './pages/AnniversariesPage';
import AnniversaryDetailPage from './pages/AnniversaryDetailPage';
import GalleryPage from './pages/GalleryPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/moments" element={<MomentsPage />} />
        <Route path="/moments/:slug" element={<MomentDetailPage />} />
        <Route path="/anniversaries" element={<AnniversariesPage />} />
        <Route path="/anniversaries/:id" element={<AnniversaryDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

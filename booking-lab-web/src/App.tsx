import { Navigate, Route, Routes } from 'react-router-dom';
import { LabLayout } from './layout/LabLayout';
import { ClaimLandingPage } from './pages/ClaimLandingPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { GiftSchedulePage } from './pages/GiftSchedulePage';
import { ReviewPage } from './pages/ReviewPage';
import { SchedulePage } from './pages/SchedulePage';
import { ServicesPage } from './pages/ServicesPage';

function App() {
  return (
    <Routes>
      <Route element={<LabLayout />}>
        <Route path="/" element={<Navigate to="/booking" replace />} />
        <Route path="/booking" element={<ServicesPage />} />
        <Route path="/booking/schedule" element={<SchedulePage />} />
        <Route path="/booking/review" element={<ReviewPage />} />
        <Route path="/booking/confirmation" element={<ConfirmationPage />} />
        <Route path="/gift/:token" element={<ClaimLandingPage />} />
        <Route path="/gift/:token/schedule" element={<GiftSchedulePage />} />
        <Route path="*" element={<Navigate to="/booking" replace />} />
      </Route>
    </Routes>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TripList from './pages/TripList';
import TripForm from './pages/TripForm';
import TripDetail from './pages/TripDetail';
import LocationForm from './pages/LocationForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripList />} />
        <Route path="/trip/new" element={<TripForm />} />
        <Route path="/trip/:id" element={<TripDetail />} />
        <Route path="/trip/:id/edit" element={<TripForm />} />
        <Route path="/trip/:tripId/location/new" element={<LocationForm />} />
        <Route path="/trip/:tripId/location/:locationId/edit" element={<LocationForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

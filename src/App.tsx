import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TripList from './pages/TripList';
import TripForm from './pages/TripForm';
import TripDetail from './pages/TripDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripList />} />
        <Route path="/trip/new" element={<TripForm />} />
        <Route path="/trip/:id" element={<TripDetail />} />
        <Route path="/trip/:id/edit" element={<TripForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

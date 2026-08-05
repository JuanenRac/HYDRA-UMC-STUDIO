import { HydraProvider } from './store';
import Dashboard from './Dashboard';

function App() {
  return (
    <HydraProvider>
      <Dashboard />
    </HydraProvider>
  );
}

export default App;
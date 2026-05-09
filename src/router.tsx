import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import AnalyticsModule from './pages/AnalyticsModule';
import FinancesPage from './pages/FinancesPage';
import ServicesModule from './pages/ServicesModule';
import ClientsModule from './pages/ClientsModule';
import QuotesModule from './pages/QuotesModule';
import SimulatorModule from './pages/SimulatorModule';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <AnalyticsModule /> },
        { path: 'finances', element: <FinancesPage /> },
        { path: 'services', element: <ServicesModule /> },
        { path: 'clients', element: <ClientsModule /> },
        { path: 'quotes', element: <QuotesModule /> },
        { path: 'simulator', element: <SimulatorModule /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

export default router;

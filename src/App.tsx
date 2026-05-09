import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useOutletContext } from 'react-router-dom';
import { Building2, LogOut, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Button from './components/ui/Button';
import Input from './components/ui/Input';
import LoginPage from './components/auth/LoginPage';
import {
  AgencySettings,
  AgencyCost,
  AgencyService,
  AgencyClient,
  AgencyQuote,
  AgencyAsset,
  TermTemplate,
  MonthlySale,
  CostType,
  DEFAULT_SETTINGS,
  DEFAULT_TERM_TEMPLATES,
} from './types';

// ─── Context type ─────────────────────────────────────────────────────────────

export type AppOutletContext = {
  costsWithDepreciation: AgencyCost[];
  monthlySales: MonthlySale[];
  setMonthlySales: React.Dispatch<React.SetStateAction<MonthlySale[]>>;
  handleAddCost: (cost: Omit<AgencyCost, 'id'>) => void;
  handleUpdateCost: (cost: AgencyCost) => void;
  handleDeleteCost: (id: string) => void;
  handleAddService: (service: Omit<AgencyService, 'id'>) => void;
  handleUpdateService: (service: AgencyService) => void;
  handleDeleteService: (id: string) => void;
  handleAddClient: (client: Omit<AgencyClient, 'id' | 'createdAt'>) => void;
  handleUpdateClient: (client: AgencyClient) => void;
  handleDeleteClient: (id: string) => void;
  handleUpdateQuote: (quote: AgencyQuote) => void;
  handleDeleteQuote: (id: string) => void;
  services: AgencyService[];
  clients: AgencyClient[];
  quotes: AgencyQuote[];
  settings: AgencySettings;
  handleUpdateSettings: (s: AgencySettings) => void;
  bepHourlyRate: number;
  assets: AgencyAsset[];
  setAssets: React.Dispatch<React.SetStateAction<AgencyAsset[]>>;
  termTemplates: TermTemplate[];
  setTermTemplates: React.Dispatch<React.SetStateAction<TermTemplate[]>>;
  setClients: React.Dispatch<React.SetStateAction<AgencyClient[]>>;
  setQuotes: React.Dispatch<React.SetStateAction<AgencyQuote[]>>;
};

export function useAppContext() {
  return useOutletContext<AppOutletContext>();
}

// ─── localStorage migration helper ────────────────────────────────────────────

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const LS_KEYS = [
  'liu_settings', 'liu_costs', 'liu_services', 'liu_clients',
  'liu_quotes', 'liu_assets', 'liu_term_templates', 'liu_monthly_sales',
];

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Análisis', end: true },
  { to: '/finances', label: 'Finanzas' },
  { to: '/services', label: 'Servicios' },
  { to: '/clients', label: 'Clientes' },
  { to: '/quotes', label: 'Cotizador' },
  { to: '/simulator', label: 'Simulador' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
    isActive
      ? 'border border-[#FD8000] text-[#FD8000] bg-[#FD8000]/10'
      : 'text-gray-300 hover:text-[#FD8000]'
  }`;

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#FFCC00] flex items-center justify-center animate-pulse">
          <span className="text-[#111111] font-black text-xl tracking-tight">LIU</span>
        </div>
        <p className="text-gray-500 text-sm">Cargando…</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── App state (sourced from Firestore, not localStorage) ─────────────────
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [costs, setCosts] = useState<AgencyCost[]>([]);
  const [services, setServices] = useState<AgencyService[]>([]);
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [quotes, setQuotes] = useState<AgencyQuote[]>([]);
  const [assets, setAssets] = useState<AgencyAsset[]>([]);
  const [termTemplates, setTermTemplates] = useState<TermTemplate[]>(DEFAULT_TERM_TEMPLATES);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthChecked(true);
      if (!u) setDataLoaded(false);
    });
    return unsub;
  }, []);

  // ── Load data from Firestore when user logs in ───────────────────────────
  const justLoaded = useRef(false);

  useEffect(() => {
    if (!user) return;
    setDataLoaded(false);

    getDoc(doc(db, 'users', user.uid)).then(snap => {
      justLoaded.current = true;

      if (snap.exists()) {
        const d = snap.data();
        setSettings(d.settings ?? DEFAULT_SETTINGS);
        setCosts(d.costs ?? []);
        setServices(d.services ?? []);
        setClients(d.clients ?? []);
        setQuotes(d.quotes ?? []);
        setAssets(d.assets ?? []);
        setTermTemplates(d.termTemplates ?? DEFAULT_TERM_TEMPLATES);
        setMonthlySales(d.monthlySales ?? []);
      } else {
        // First login — migrate any existing localStorage data
        setSettings(getStored('liu_settings', DEFAULT_SETTINGS));
        setCosts(getStored<AgencyCost[]>('liu_costs', []));
        setServices(getStored<AgencyService[]>('liu_services', []));
        setClients(getStored<AgencyClient[]>('liu_clients', []));
        setQuotes(getStored<AgencyQuote[]>('liu_quotes', []));
        setAssets(getStored<AgencyAsset[]>('liu_assets', []));
        setTermTemplates(getStored<TermTemplate[]>('liu_term_templates', DEFAULT_TERM_TEMPLATES));
        setMonthlySales(getStored<MonthlySale[]>('liu_monthly_sales', []));
        LS_KEYS.forEach(k => localStorage.removeItem(k));
      }

      setDataLoaded(true);
    }).catch(err => {
      console.error('Error loading data:', err);
      setDataLoaded(true);
    });
  }, [user]);

  // ── Debounced save to Firestore on any state change ──────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!user || !dataLoaded) return;
    if (justLoaded.current) {
      justLoaded.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!userRef.current) return;
      try {
        await setDoc(doc(db, 'users', userRef.current.uid), {
          settings, costs, services, clients, quotes, assets, termTemplates, monthlySales,
        });
      } catch (err) {
        console.error('Firestore save error:', err);
      }
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, costs, services, clients, quotes, assets, termTemplates, monthlySales, dataLoaded]);

  // ── Settings drawer ─────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<AgencySettings>(settings);

  const openSettings = () => { setDraft(settings); setSettingsOpen(true); };
  const saveSettings = () => { setSettings(draft); setSettingsOpen(false); };

  // ── Derived: depreciation virtual cost ──────────────────────────────────
  const totalMonthlyDepreciation = assets.reduce(
    (sum, a) => sum + a.initialValue / (a.usefulLife * 12),
    0
  );

  const costsWithDepreciation: AgencyCost[] = [
    ...costs,
    ...(totalMonthlyDepreciation > 0
      ? [{ id: 'depreciation-virtual-cost', name: 'Depreciación de Activos', type: CostType.FIXED, amount: totalMonthlyDepreciation }]
      : []),
  ];

  const totalMonthlyCosts = costsWithDepreciation.reduce((sum, c) => sum + c.amount, 0);
  const bepHourlyRate = totalMonthlyCosts / (settings.capacityHours || 160);

  // ── CRUD handlers ────────────────────────────────────────────────────────
  const handleUpdateSettings = (s: AgencySettings) => setSettings(s);

  const handleAddCost = (cost: Omit<AgencyCost, 'id'>) =>
    setCosts(prev => [...prev, { ...cost, id: uuidv4() }]);
  const handleUpdateCost = (cost: AgencyCost) =>
    setCosts(prev => prev.map(c => (c.id === cost.id ? cost : c)));
  const handleDeleteCost = (id: string) =>
    setCosts(prev => prev.filter(c => c.id !== id));

  const handleAddService = (service: Omit<AgencyService, 'id'>) =>
    setServices(prev => [...prev, { ...service, id: uuidv4() }]);
  const handleUpdateService = (service: AgencyService) =>
    setServices(prev => prev.map(s => (s.id === service.id ? service : s)));
  const handleDeleteService = (id: string) =>
    setServices(prev => prev.filter(s => s.id !== id));

  const handleAddClient = (client: Omit<AgencyClient, 'id' | 'createdAt'>) =>
    setClients(prev => [...prev, { ...client, id: uuidv4(), createdAt: new Date().toISOString() }]);
  const handleUpdateClient = (client: AgencyClient) =>
    setClients(prev => prev.map(c => (c.id === client.id ? client : c)));
  const handleDeleteClient = (id: string) =>
    setClients(prev => prev.filter(c => c.id !== id));

  const handleUpdateQuote = (quote: AgencyQuote) =>
    setQuotes(prev =>
      prev.some(q => q.id === quote.id)
        ? prev.map(q => (q.id === quote.id ? quote : q))
        : [...prev, quote]
    );
  const handleDeleteQuote = (id: string) =>
    setQuotes(prev => prev.filter(q => q.id !== id));

  // ── Outlet context ───────────────────────────────────────────────────────
  const outletContext: AppOutletContext = {
    costsWithDepreciation,
    monthlySales,
    setMonthlySales,
    handleAddCost,
    handleUpdateCost,
    handleDeleteCost,
    handleAddService,
    handleUpdateService,
    handleDeleteService,
    handleAddClient,
    handleUpdateClient,
    handleDeleteClient,
    handleUpdateQuote,
    handleDeleteQuote,
    services,
    clients,
    quotes,
    settings,
    handleUpdateSettings,
    bepHourlyRate,
    assets,
    setAssets,
    termTemplates,
    setTermTemplates,
    setClients,
    setQuotes,
  };

  // ── Render gates ─────────────────────────────────────────────────────────
  if (!authChecked || (user && !dataLoaded)) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111111] flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex items-center gap-4 px-4 h-14 bg-[#0D0D0D] border-b border-[#7F54F5]/20">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-[#FFCC00] flex items-center justify-center rounded-sm">
            <span className="text-[#111111] font-black text-xs leading-none tracking-tight">LIU</span>
          </div>
          <span className="text-[#FFCC00] font-semibold text-sm">Services 2026</span>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Settings button */}
        <div className="ml-auto shrink-0">
          <Button variant="ghost" size="sm" icon={<Building2 size={16} />} onClick={openSettings}>
            <span className="hidden sm:inline">Configuración</span>
          </Button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet context={outletContext} />
        </div>
      </main>

      {/* ── Settings drawer backdrop ── */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        />
      )}

      {/* ── Settings drawer ── */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 z-50 bg-[#1C1C1C] border-l border-[#7F54F5]/20 flex flex-col transform transition-transform duration-300 ease-in-out ${
          settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#7F54F5]/20 shrink-0">
          <div>
            <span className="text-sm font-semibold text-gray-100">Configuración</span>
            {user.email && (
              <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]">{user.email}</p>
            )}
          </div>
          <button
            className="text-gray-400 hover:text-gray-100 transition-colors"
            onClick={() => setSettingsOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Logo preview */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Logo Preview
            </span>
            <div className="h-24 rounded-lg border-2 border-dashed border-[#7F54F5]/40 flex items-center justify-center bg-[#111111]">
              {draft.logoUrl ? (
                <img src={draft.logoUrl} alt="Logo" className="max-h-20 max-w-full object-contain rounded" />
              ) : (
                <span className="text-gray-600 text-xs">{draft.agencyName || 'Sin logo'}</span>
              )}
            </div>
          </div>

          <Input
            label="Nombre de Fantasía"
            value={draft.agencyName}
            onChange={e => setDraft(d => ({ ...d, agencyName: e.target.value }))}
            placeholder="Liu Agency"
          />
          <Input
            label="RUT Empresa"
            value={draft.rut}
            onChange={e => setDraft(d => ({ ...d, rut: e.target.value }))}
            placeholder="76.123.456-7"
          />
          <Input
            label="Dirección Comercial"
            value={draft.address}
            onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
            placeholder="Av. Ejemplo 1234, Santiago"
          />
          <Input
            label="Email Contacto"
            type="email"
            value={draft.email}
            onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
            placeholder="contacto@liuagency.cl"
          />
          <Input
            label="URL Logo"
            value={draft.logoUrl}
            onChange={e => setDraft(d => ({ ...d, logoUrl: e.target.value }))}
            placeholder="https://..."
          />
          <Input
            label="Capacidad (Horas/Mes)"
            type="number"
            min={1}
            value={draft.capacityHours ?? 160}
            onChange={e => setDraft(d => ({ ...d, capacityHours: Number(e.target.value) || 160 }))}
            placeholder="160"
          />
        </div>

        {/* Drawer footer */}
        <div className="px-5 py-4 border-t border-[#7F54F5]/20 shrink-0 flex flex-col gap-2">
          <button
            onClick={saveSettings}
            className="w-full h-10 rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors"
          >
            Guardar Cambios
          </button>
          <button
            onClick={() => signOut(auth)}
            className="w-full h-10 rounded-lg border border-[#7F54F5]/20 text-gray-400 text-sm hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  );
}

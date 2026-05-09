import { useState, useMemo, useEffect, useRef } from 'react';
import { UserPlus, Search, Mail, Phone, MapPin, Trash2, Check, X, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../App';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7F54F5', '#FD8000', '#FFCC00'] as const;

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % 3];
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length <= 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${dv}`;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

// ─── Form state ───────────────────────────────────────────────────────────────

interface ClientForm {
  name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
}

const BLANK: ClientForm = { name: '', rut: '', email: '', phone: '', address: '' };

const inputCls =
  'h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientsModule() {
  const { clients, setClients, quotes } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ClientForm>(BLANK);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      c => c.name.toLowerCase().includes(q) || (c.rut ?? '').toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // ── Quote helpers ─────────────────────────────────────────────────────────
  const getClientQuoteCount = (id: string) => quotes.filter(q => q.clientId === id).length;

  const getClientLastTotal = (id: string): number | null => {
    const sorted = quotes
      .filter(q => q.clientId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted[0]?.total ?? null;
  };

  // ── Modal handlers ────────────────────────────────────────────────────────
  const openModal = () => { setForm(BLANK); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleSave = () => {
    if (!form.name.trim() || !form.rut.trim()) return;
    setClients(prev => [
      ...prev,
      {
        id: uuidv4(),
        name: form.name.trim(),
        rut: form.rut,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    closeModal();
  };

  const handleDelete = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setConfirmDeleteId(null);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSaveRef.current();
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o RUT…"
            className="w-full h-10 bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg pl-9 pr-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
          />
        </div>
        <button
          onClick={openModal}
          className="shrink-0 h-10 px-4 rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors flex items-center gap-2"
        >
          <UserPlus size={15} />
          <span className="hidden sm:inline">Nuevo Cliente</span>
        </button>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1C1C1C] border border-[#7F54F5]/20 flex items-center justify-center">
            <UserPlus size={24} className="text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-gray-400 font-medium text-sm">
              {searchQuery ? 'Sin resultados' : 'No hay clientes'}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              {searchQuery
                ? 'Prueba con otro nombre o RUT.'
                : 'Registra tu primer cliente en el directorio.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={openModal}
              className="px-5 py-2 bg-[#FD8000] text-white text-sm font-semibold rounded-lg hover:bg-[#E57200] transition-colors"
            >
              + Nuevo Cliente
            </button>
          )}
        </div>
      )}

      {/* ── Client grid ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => {
            const avatarColor = getAvatarColor(client.name);
            const initials = getInitials(client.name);
            const avatarText = avatarColor === '#FFCC00' ? '#111111' : '#FFFFFF';
            const quoteCount = getClientQuoteCount(client.id);
            const lastTotal = getClientLastTotal(client.id);
            const isConfirming = confirmDeleteId === client.id;

            return (
              <div key={client.id} className="bg-[#1C1C1C] rounded-xl border border-[#7F54F5]/20 flex flex-col">
                {/* Card header */}
                <div className="p-4 flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0 select-none"
                    style={{ backgroundColor: avatarColor, color: avatarText }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[#FFCC00] font-bold text-sm leading-tight truncate">
                      {client.name}
                    </h3>
                    {client.rut && (
                      <span className="inline-block mt-1 font-mono text-[10px] bg-[#111111] text-gray-400 px-2 py-0.5 rounded">
                        {client.rut}
                      </span>
                    )}
                  </div>
                  {/* Delete */}
                  <div className="shrink-0">
                    {isConfirming ? (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(client.id)}
                        className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="px-4 pb-3 flex flex-col gap-1.5">
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#FFCC00] transition-colors group"
                    >
                      <Mail size={11} className="text-gray-600 group-hover:text-[#FFCC00] shrink-0 transition-colors" />
                      <span className="truncate">{client.email}</span>
                    </a>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Phone size={11} className="text-gray-600 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MapPin size={11} className="text-gray-600 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-[#7F54F5]/10 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-gray-600" />
                    <span
                      className={`text-xs font-medium ${
                        quoteCount > 0 ? 'text-[#7F54F5]' : 'text-gray-600'
                      }`}
                    >
                      {quoteCount} {quoteCount === 1 ? 'cotización' : 'cotizaciones'}
                    </span>
                  </div>
                  {lastTotal !== null && (
                    <span className="text-xs font-bold text-[#FFCC00] tabular-nums">
                      {formatCurrency(lastTotal)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-[#1C1C1C] rounded-2xl border border-[#7F54F5]/20 w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#7F54F5]/20 shrink-0">
              <h2 className="text-sm font-semibold text-gray-100">Nuevo Cliente</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Razón Social / Nombre <span className="text-[#FD8000]">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Liu Agency SpA"
                  autoFocus
                  className={inputCls}
                />
              </div>

              {/* RUT + Phone grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    RUT <span className="text-[#FD8000]">*</span>
                  </label>
                  <input
                    value={form.rut}
                    onChange={e => setForm(f => ({ ...f, rut: formatRut(e.target.value) }))}
                    placeholder="76.123.456-7"
                    className={inputCls + ' font-mono'}
                    maxLength={12}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Teléfono
                  </label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+56 9 1234 5678"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Email Contacto
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contacto@empresa.cl"
                  className={inputCls}
                />
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Ciudad / Dirección
                </label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Santiago, Región Metropolitana"
                  className={inputCls}
                />
              </div>

              <p className="text-[10px] text-gray-600 text-center">Ctrl+Enter guarda · Escape cierra</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#7F54F5]/20 shrink-0">
              <button
                onClick={closeModal}
                className="h-10 px-4 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.rut.trim()}
                className="h-10 px-5 rounded-lg bg-[#FD8000] text-white text-sm font-semibold hover:bg-[#E57200] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Registrar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserPlus, Search, Mail, Phone, MapPin, Trash2, Check, X, FileText,
  MessageCircle, ChevronDown, ChevronUp, User,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../App';
import type { AgencyClient, AgencyQuote, ClientStatus } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7F54F5', '#FD8000', '#FFCC00'] as const;

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bg: string; border: string }> = {
  info:      { label: 'Solo información',  color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30'    },
  interested:{ label: 'Interesado',        color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30'   },
  active:    { label: 'Cliente activo',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  proposal:  { label: 'Propuesta enviada', color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/30'  },
  unhappy:   { label: 'Inconforme',        color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30'     },
  inactive:  { label: 'Inactivo',          color: 'text-gray-400',    bg: 'bg-gray-400/10',    border: 'border-gray-400/30'    },
};

const WA_MESSAGES: Record<ClientStatus, (name: string, agency: string) => string> = {
  info:      (n, a) => `Hola ${n} 👋, soy ${a}. ¿Quedó alguna duda sobre la información que te enviamos? Con gusto te ayudo.`,
  interested:(n)    => `Hola ${n} 👋, te escribo porque tienes una cotización pendiente. ¿Pudiste revisarla? Puedo ajustarla si necesitas algo diferente.`,
  active:    (n)    => `Hola ${n} 😊 ¿Todo bien con el proyecto? Paso a saludarte y ver si necesitas algo más.`,
  proposal:  (n)    => `Hola ${n}, quería saber si tuviste la oportunidad de revisar la propuesta que te enviamos. Quedo atento a tus comentarios.`,
  unhappy:   (n)    => `Hola ${n}, me interesa mucho resolver la situación. ¿Podemos hablar unos minutos? Quiero escucharte.`,
  inactive:  (n)    => `Hola ${n} 👋, hace tiempo que no hablamos. ¿Hay algo en lo que pueda ayudarte?`,
};

const QUOTE_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Borrador',  color: 'text-gray-400'    },
  sent:     { label: 'Enviada',   color: 'text-blue-400'    },
  accepted: { label: 'Aceptada',  color: 'text-emerald-400' },
  rejected: { label: 'Rechazada', color: 'text-red-400'     },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % 3];
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
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

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-()+]/g, '');
  return /^9\d{8}$/.test(digits) ? `56${digits}` : digits;
}

function isValidChileanMobile(phone: string): boolean {
  return !!phone && /^569\d{8}$/.test(normalizePhone(phone));
}

function getContactName(client: AgencyClient): string {
  return client.contactName?.trim() || client.name.trim().split(/\s+/)[0];
}

function getQuoteDisplayStatus(quote: AgencyQuote): { label: string; color: string } {
  if ((quote.status === 'draft' || quote.status === 'sent') && quote.validUntil) {
    if (new Date(quote.validUntil) < new Date()) return { label: 'Vencida', color: 'text-gray-500' };
  }
  return QUOTE_STATUS_DISPLAY[quote.status] ?? { label: quote.status, color: 'text-gray-500' };
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// ─── Form types ───────────────────────────────────────────────────────────────

interface ClientForm {
  name: string;
  contactName: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
}

const BLANK: ClientForm = { name: '', contactName: '', rut: '', email: '', phone: '', address: '' };

const inputCls =
  'h-10 w-full bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors';

// ─── WhatsApp preview (inside modal form) ─────────────────────────────────────

function WAFormPreview({ form, agencyName }: { form: ClientForm; agencyName: string }) {
  const displayName = form.contactName.trim() || form.name.trim().split(/\s+/)[0] || '';
  if (!displayName) return null;

  const message = WA_MESSAGES.info(displayName, agencyName);
  const phoneEntered = !!form.phone.trim();
  const phoneValid = isValidChileanMobile(form.phone);
  const phoneNorm = normalizePhone(form.phone);

  return (
    <div className="rounded-lg border border-[#7F54F5]/20 bg-[#111111] p-3 flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7F54F5]/70">Vista previa WhatsApp</p>
      <p className="text-xs text-gray-300 leading-relaxed">{message}</p>
      {!phoneEntered ? (
        <p className="text-[11px] text-gray-600 italic">Agrega teléfono para activar</p>
      ) : !phoneValid ? (
        <p className="text-[11px] text-red-400">Número no válido para WhatsApp</p>
      ) : (
        <a
          href={`https://wa.me/${phoneNorm}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
        >
          <MessageCircle size={12} />
          Abrir WhatsApp
        </a>
      )}
    </div>
  );
}

// ─── Client card ─────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: AgencyClient;
  quotes: AgencyQuote[];
  agencyName: string;
  onStatusChange: (id: string, status: ClientStatus) => void;
  onWhatsAppClick: (id: string) => void;
  onDelete: (id: string) => void;
}

function ClientCard({ client, quotes, agencyName, onStatusChange, onWhatsAppClick, onDelete }: ClientCardProps) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const color = getAvatarColor(client.name);
  const textCol = color === '#FFCC00' ? '#111111' : '#FFFFFF';
  const inits = getInitials(client.name);
  const contact = getContactName(client);
  const status: ClientStatus = (client.status as ClientStatus | undefined) ?? 'info';
  const city = client.address?.split(',')[0]?.trim() ?? '';

  const phoneValid = isValidChileanMobile(client.phone ?? '');
  const phoneNorm = normalizePhone(client.phone ?? '');
  const waMsg = WA_MESSAGES[status](contact, agencyName);
  const waUrl = `https://wa.me/${phoneNorm}?text=${encodeURIComponent(waMsg)}`;

  const clientQuotes = quotes
    .filter(q => q.clientId === client.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const contracted = clientQuotes.filter(q => q.status === 'accepted');

  return (
    <div className="bg-[#1C1C1C] rounded-xl border border-[#7F54F5]/20 flex flex-col">

      {/* ── Header ── */}
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0 select-none"
          style={{ backgroundColor: color, color: textCol }}
        >
          {inits}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[#FFCC00] font-bold text-sm leading-tight truncate">{client.name}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {client.rut && <span className="font-mono">{client.rut}</span>}
            {client.rut && city && <span className="mx-1">·</span>}
            {city}
          </p>
          {client.contactName && (
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <User size={10} className="text-gray-600 shrink-0" />
              {client.contactName}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {confirmDel ? (
            <div className="flex gap-0.5">
              <button
                onClick={() => onDelete(client.id)}
                className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Contact info ── */}
      <div className="px-4 pb-2 flex flex-col gap-1.5">
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

      {/* ── Status badges ── */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {(Object.keys(STATUS_CONFIG) as ClientStatus[]).map(s => {
          const conf = STATUS_CONFIG[s];
          const active = s === status;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(client.id, s)}
              title={conf.label}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                active
                  ? `${conf.color} ${conf.bg} ${conf.border}`
                  : 'text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
              }`}
            >
              {conf.label}
            </button>
          );
        })}
      </div>

      {/* ── WhatsApp button ── */}
      <div className="px-4 pb-3">
        {phoneValid ? (
          <>
            <button
              onClick={() => setWaOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <MessageCircle size={13} />
              Mensaje WhatsApp
              {waOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {waOpen && (
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-[#111111] p-3 flex flex-col gap-2">
                <p className="text-xs text-gray-300 leading-relaxed">{waMsg}</p>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onWhatsAppClick(client.id)}
                  className="w-fit flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle size={12} />
                  Abrir WhatsApp
                </a>
              </div>
            )}
          </>
        ) : client.phone ? (
          <p className="text-[11px] text-gray-600">Número no válido para WhatsApp</p>
        ) : null}
      </div>

      {/* ── Quote history ── */}
      <div className="border-t border-[#7F54F5]/10">
        <button
          onClick={() => setQuotesOpen(v => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={12} />
            {clientQuotes.length} {clientQuotes.length === 1 ? 'cotización' : 'cotizaciones'}
          </span>
          {quotesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {quotesOpen && (
          <div className="px-4 pb-3 flex flex-col gap-2">
            {clientQuotes.length === 0 ? (
              <p className="text-xs text-gray-600">Sin cotizaciones aún.</p>
            ) : (
              clientQuotes.map(q => {
                const { label: qLabel, color: qColor } = getQuoteDisplayStatus(q);
                const days = daysAgo(q.createdAt);
                return (
                  <div key={q.id} className="rounded-lg bg-[#111111] p-2.5 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-gray-200 truncate">{q.number}</span>
                      <span className={`text-[10px] font-semibold shrink-0 ${qColor}`}>{qLabel}</span>
                    </div>
                    {q.notes && <p className="text-[11px] text-gray-500 truncate">{q.notes}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-600">
                        {new Date(q.createdAt).toLocaleDateString('es-CL')} · hace {days}d
                      </span>
                      <span className="text-xs font-bold text-[#FFCC00] tabular-nums">{formatCurrency(q.total)}</span>
                    </div>
                    {phoneValid && (
                      <a
                        href={`https://wa.me/${phoneNorm}?text=${encodeURIComponent(
                          `Hola ${contact}, te reenvío la cotización ${q.number} por ${formatCurrency(q.total)}. Quedo atento a tus comentarios.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors w-fit mt-0.5"
                      >
                        <MessageCircle size={10} />
                        Reenviar por WhatsApp
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Contracted services (accepted quotes) ── */}
      {contracted.length > 0 && (
        <div className="border-t border-[#7F54F5]/10">
          <button
            onClick={() => setServicesOpen(v => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-emerald-400" />
              {contracted.length} {contracted.length === 1 ? 'servicio contratado' : 'servicios contratados'}
            </span>
            {servicesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {servicesOpen && (
            <div className="px-4 pb-3 flex flex-col gap-2">
              {contracted.map(q => (
                <div key={q.id} className="rounded-lg bg-[#111111] p-2.5 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-200 truncate">
                      {q.items[0]?.name || q.number}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 shrink-0">Pagado</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">
                      {new Date(q.createdAt).toLocaleDateString('es-CL')}
                    </span>
                    <span className="text-xs font-bold text-[#FFCC00] tabular-nums">{formatCurrency(q.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientsModule() {
  const { clients, setClients, quotes, handleUpdateClient, settings } = useAppContext();
  const agencyName = settings.agencyName || 'Liu Agency';

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ClientForm>(BLANK);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.rut ?? '').toLowerCase().includes(q) ||
        (c.contactName ?? '').toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  // ── Modal handlers ──────────────────────────────────────────────────────────
  const openModal = () => { setForm(BLANK); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleSave = () => {
    if (!form.name.trim() || !form.rut.trim()) return;
    setClients(prev => [
      ...prev,
      {
        id: uuidv4(),
        name: form.name.trim(),
        contactName: form.contactName.trim() || undefined,
        rut: form.rut,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        status: 'info',
        createdAt: new Date().toISOString(),
      },
    ]);
    closeModal();
  };

  // ── Card action handlers ────────────────────────────────────────────────────
  const handleStatusChange = (id: string, status: ClientStatus) => {
    const client = clients.find(c => c.id === id);
    if (client) handleUpdateClient({ ...client, status });
  };

  const handleWhatsAppClick = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) handleUpdateClient({ ...client, lastWhatsAppContact: new Date().toISOString() });
  };

  const handleDelete = (id: string) => setClients(prev => prev.filter(c => c.id !== id));

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, RUT o contacto…"
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
                ? 'Prueba con otro nombre, RUT o contacto.'
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
          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              quotes={quotes}
              agencyName={agencyName}
              onStatusChange={handleStatusChange}
              onWhatsAppClick={handleWhatsAppClick}
              onDelete={handleDelete}
            />
          ))}
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

              {/* Razón Social */}
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

              {/* Nombre de contacto */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Nombre de Contacto
                </label>
                <input
                  value={form.contactName}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Ej: Juan Pérez"
                  className={inputCls}
                />
              </div>

              {/* RUT + Phone */}
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

              {/* WhatsApp preview */}
              <WAFormPreview form={form} agencyName={agencyName} />

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

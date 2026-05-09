import { useState, useEffect, useRef } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { useAppContext } from '../../App';
import Card from '../ui/Card';
import { CostType, AgencyCost } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPRECIATION_ID = 'depreciation-virtual-cost';

type CostTab = 'fixed' | 'variable' | 'depreciation';

const COST_TABS: { id: CostTab; label: string; accent: string }[] = [
  { id: 'fixed', label: 'Fijos', accent: '#7F54F5' },
  { id: 'variable', label: 'Variables', accent: '#FD8000' },
  { id: 'depreciation', label: 'Depreciación', accent: '#FFCC00' },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ cost }: { cost: AgencyCost }) {
  if (cost.id === DEPRECIATION_ID)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFCC00]/20 text-[#FFCC00]">
        Depreciación
      </span>
    );
  if (cost.type === CostType.FIXED)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#7F54F5]/20 text-[#7F54F5]">
        Fijo
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FD8000]/20 text-[#FD8000]">
      Variable
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CostsModule() {
  const {
    costsWithDepreciation,
    handleAddCost,
    handleUpdateCost,
    handleDeleteCost,
    settings,
    handleUpdateSettings,
  } = useAppContext();

  // ── KPI: capacity input ──────────────────────────────────────────────────
  const [capacityInput, setCapacityInput] = useState(String(settings.capacityHours || 160));
  useEffect(() => {
    setCapacityInput(String(settings.capacityHours || 160));
  }, [settings.capacityHours]);

  const saveCapacity = () => {
    const val = Math.max(1, parseInt(capacityInput) || 160);
    if (val !== settings.capacityHours) handleUpdateSettings({ ...settings, capacityHours: val });
  };

  // ── New cost form ─────────────────────────────────────────────────────────
  const [costTab, setCostTab] = useState<CostTab>('fixed');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<CostType>(CostType.FIXED);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount) || amount <= 0) return;
    handleAddCost({ name: newName.trim(), amount, type: newType });
    setNewName('');
    setNewAmount('');
    nameRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // ── Inline edit ───────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState('');
  const [editingName, setEditingName] = useState('');

  const startEdit = (cost: AgencyCost) => {
    setEditingId(cost.id);
    setEditingAmount(String(cost.amount));
    setEditingName(cost.name);
  };

  const commitEdit = (cost: AgencyCost) => {
    const amount = parseFloat(editingAmount);
    if (!isNaN(amount) && amount > 0) {
      handleUpdateCost({ ...cost, amount, name: editingName.trim() || cost.name });
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    handleDeleteCost(id);
    setConfirmDeleteId(null);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const totalFixed = costsWithDepreciation
    .filter(c => c.type === CostType.FIXED)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalVariable = costsWithDepreciation
    .filter(c => c.type === CostType.VARIABLE)
    .reduce((sum, c) => sum + c.amount, 0);

  const totalCosts = totalFixed + totalVariable;
  const capacityHours = settings.capacityHours || 160;
  const fixedPct = totalCosts > 0 ? (totalFixed / totalCosts) * 100 : 0;
  const variablePct = totalCosts > 0 ? (totalVariable / totalCosts) * 100 : 0;
  const bepRate = capacityHours > 0 ? totalFixed / capacityHours : 0;

  const fixedCosts = costsWithDepreciation.filter(
    c => c.type === CostType.FIXED && c.id !== DEPRECIATION_ID
  );
  const variableCosts = costsWithDepreciation.filter(c => c.type === CostType.VARIABLE);
  const depreciationCosts = costsWithDepreciation.filter(c => c.id === DEPRECIATION_ID);

  const visibleCosts: AgencyCost[] =
    costTab === 'fixed' ? fixedCosts : costTab === 'variable' ? variableCosts : depreciationCosts;

  const subtotal = visibleCosts.reduce((sum, c) => sum + c.amount, 0);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total costs */}
        <div className="rounded-xl bg-[#1C1C1C] border border-[#7F54F5]/20 border-l-4 border-l-[#FFCC00] p-5 flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Costos Totales
          </span>
          <span className="text-2xl font-bold text-[#FFCC00]">
            {formatCurrency(totalCosts)}
          </span>
          <div className="h-1.5 rounded-full bg-[#0D0D0D] overflow-hidden flex">
            <div
              className="h-full bg-[#7F54F5] transition-all duration-500"
              style={{ width: `${fixedPct}%` }}
            />
            <div
              className="h-full bg-[#FD8000] transition-all duration-500"
              style={{ width: `${variablePct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#7F54F5] inline-block" /> Fijos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#FD8000] inline-block" /> Variables
            </span>
          </div>
        </div>

        {/* 2. Capacity (editable) */}
        <div className="rounded-xl bg-[#1C1C1C] border border-[#7F54F5]/20 border-l-4 border-l-[#7F54F5] p-5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Capacidad (Hrs)
          </span>
          <input
            type="number"
            min={1}
            value={capacityInput}
            onChange={e => setCapacityInput(e.target.value)}
            onBlur={saveCapacity}
            onKeyDown={e => e.key === 'Enter' && saveCapacity()}
            className="bg-transparent border-0 border-b-2 border-dashed border-[#7F54F5]/60 text-2xl font-bold text-[#7F54F5] w-24 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[11px] text-gray-500 mt-1">horas facturables / mes</span>
        </div>

        {/* 3. BEP hourly rate */}
        <div className="rounded-xl bg-[#1C1C1C] border border-[#7F54F5]/20 border-l-4 border-l-[#FD8000] p-5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Valor Hora B.E.P.
          </span>
          <span className="text-2xl font-bold text-[#FD8000]">
            {formatCurrency(bepRate)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1">costos fijos / horas</span>
        </div>

        {/* 4. Annual projection */}
        <div className="rounded-xl bg-[#1C1C1C] border border-[#7F54F5]/20 border-l-4 border-l-gray-500 p-5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Proyección Anual
          </span>
          <span className="text-2xl font-bold text-gray-200">
            {formatCurrency(totalCosts * 12)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1">costos totales × 12</span>
        </div>
      </div>

      {/* ── Costs table ── */}
      <Card noPadding>
        {/* New cost form */}
        {costTab !== 'depreciation' && (
          <div className="px-5 py-4 border-b border-[#7F54F5]/20 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Nombre del ítem
              </label>
              <input
                ref={nameRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={onKey}
                placeholder="Servidor, Diseñador, etc."
                className="h-10 bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Monto Mensual
              </label>
              <input
                type="number"
                min={0}
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={onKey}
                placeholder="150000"
                className="h-10 w-36 bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Tipo
              </label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as CostType)}
                className="h-10 bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors"
              >
                <option value={CostType.FIXED}>Fijo</option>
                <option value={CostType.VARIABLE}>Variable</option>
              </select>
            </div>
            <button
              onClick={handleSubmit}
              className="h-10 px-5 rounded-lg bg-[#FFCC00] text-[#111111] text-sm font-semibold hover:bg-[#E6B800] transition-colors whitespace-nowrap"
            >
              + Agregar
            </button>
          </div>
        )}

        {/* Sub-tab bar */}
        <div className="flex items-center border-b border-[#7F54F5]/20 px-2">
          {COST_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCostTab(tab.id)}
              style={
                costTab === tab.id
                  ? { borderColor: tab.accent, color: tab.accent }
                  : undefined
              }
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                costTab === tab.id
                  ? 'border-current'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#7F54F5]/10">
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Ítem
                </th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-left">
                  Tipo
                </th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">
                  Monto Mensual
                </th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right w-28">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleCosts.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-600 text-sm">
                    No hay ítems registrados.
                  </td>
                </tr>
              )}

              {visibleCosts.map(cost => {
                const isEditing = editingId === cost.id;
                const isDepreciation = cost.id === DEPRECIATION_ID;
                const isConfirmingDelete = confirmDeleteId === cost.id;

                return (
                  <tr
                    key={cost.id}
                    className={`border-b border-[#7F54F5]/10 transition-colors ${
                      isEditing ? 'bg-[#FFCC00]/5' : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && commitEdit(cost)}
                          className="bg-transparent border-b border-[#FFCC00]/50 text-gray-100 text-sm outline-none w-full"
                          autoFocus
                        />
                      ) : (
                        <span className="text-gray-200">{cost.name}</span>
                      )}
                    </td>

                    {/* Badge */}
                    <td className="px-3 py-3">
                      <TypeBadge cost={cost} />
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editingAmount}
                          onChange={e => setEditingAmount(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(cost);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="bg-transparent border-b border-[#FFCC00]/50 text-gray-100 text-sm outline-none text-right w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <button
                          onClick={() => !isDepreciation && startEdit(cost)}
                          className={`tabular-nums font-medium ${
                            isDepreciation
                              ? 'text-gray-400 cursor-default'
                              : 'text-gray-200 hover:text-[#FFCC00] transition-colors cursor-pointer'
                          }`}
                        >
                          {formatCurrency(cost.amount)}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isDepreciation ? null : isEditing ? (
                          <>
                            <button
                              onClick={() => commitEdit(cost)}
                              className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              title="Guardar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : isConfirmingDelete ? (
                          <>
                            <button
                              onClick={() => confirmDelete(cost.id)}
                              className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              title="Confirmar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(cost.id)}
                            className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer subtotal */}
            {visibleCosts.length > 0 && (
              <tfoot>
                <tr className="border-t border-[#7F54F5]/20 bg-[#0D0D0D]/40">
                  <td colSpan={2} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Subtotal
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-200 tabular-nums">
                    {formatCurrency(subtotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

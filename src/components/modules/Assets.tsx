import { useState } from 'react';
import { Trash2, Check, X, Pencil } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../App';
import Card from '../ui/Card';
import { AgencyAsset } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function calcValues(asset: AgencyAsset) {
  const annualDep = asset.usefulLife > 0 ? asset.initialValue / asset.usefulLife : 0;
  const monthlyDep = annualDep / 12;

  const purchaseDate = new Date(asset.purchaseDate);
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const yearsElapsed = Math.max(0, (Date.now() - purchaseDate.getTime()) / msPerYear);
  const currentValue = Math.max(0, asset.initialValue - yearsElapsed * annualDep);

  return { annualDep, monthlyDep, currentValue };
}

// ─── Blank form state ─────────────────────────────────────────────────────────

interface FormState {
  name: string;
  initialValue: string;
  purchaseDate: string;
  usefulLife: string;
}

const BLANK_FORM: FormState = { name: '', initialValue: '', purchaseDate: '', usefulLife: '' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssetsModule() {
  const { assets, setAssets } = useAppContext();

  // ── Add form ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(BLANK_FORM);

  const handleAdd = () => {
    const initialValue = parseFloat(form.initialValue);
    const usefulLife = parseInt(form.usefulLife);
    if (!form.name.trim() || isNaN(initialValue) || initialValue <= 0 || isNaN(usefulLife) || usefulLife <= 0 || !form.purchaseDate) return;
    setAssets(prev => [
      ...prev,
      {
        id: uuidv4(),
        name: form.name.trim(),
        initialValue,
        purchaseDate: form.purchaseDate,
        usefulLife,
      },
    ]);
    setForm(BLANK_FORM);
  };

  // ── Inline edit ───────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FormState>(BLANK_FORM);

  const startEdit = (asset: AgencyAsset) => {
    setEditingId(asset.id);
    setEditDraft({
      name: asset.name,
      initialValue: String(asset.initialValue),
      purchaseDate: asset.purchaseDate,
      usefulLife: String(asset.usefulLife),
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const initialValue = parseFloat(editDraft.initialValue);
    const usefulLife = parseInt(editDraft.usefulLife);
    if (!editDraft.name.trim() || isNaN(initialValue) || isNaN(usefulLife)) {
      setEditingId(null);
      return;
    }
    setAssets(prev =>
      prev.map(a =>
        a.id === editingId
          ? { ...a, name: editDraft.name.trim(), initialValue, purchaseDate: editDraft.purchaseDate, usefulLife }
          : a
      )
    );
    setEditingId(null);
  };

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    setConfirmDeleteId(null);
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalAnnualDep = assets.reduce((sum, a) => sum + calcValues(a).annualDep, 0);
  const totalMonthlyDep = assets.reduce((sum, a) => sum + calcValues(a).monthlyDep, 0);

  // ── Input helper ──────────────────────────────────────────────────────────
  const inputCls =
    'h-9 bg-[#111111] border border-[#7F54F5]/30 text-gray-100 rounded-lg px-3 text-sm outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-[#FFCC00]/50 focus:border-[#FFCC00] transition-colors w-full';

  const inlineInputCls =
    'bg-transparent border-b border-[#FD8000]/50 text-gray-100 text-sm outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <Card noPadding>
        {/* ── Add form ── */}
        <div className="px-5 py-4 border-b border-[#7F54F5]/20">
          <h2 className="text-sm font-semibold text-gray-100 mb-4">Agregar Activo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col gap-1 lg:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Nombre Activo
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="MacBook Pro, Cámara…"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Valor Inicial
              </label>
              <input
                type="number"
                min={0}
                value={form.initialValue}
                onChange={e => setForm(f => ({ ...f, initialValue: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="1500000"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Fecha Compra
              </label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                className={inputCls + ' [color-scheme:dark]'}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Vida Útil (años)
              </label>
              <input
                type="number"
                min={1}
                value={form.usefulLife}
                onChange={e => setForm(f => ({ ...f, usefulLife: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="5"
                className={inputCls}
              />
            </div>
            <button
              onClick={handleAdd}
              className="h-9 px-5 rounded-lg bg-[#FFCC00] text-[#111111] text-sm font-semibold hover:bg-[#E6B800] transition-colors whitespace-nowrap"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-[#7F54F5]/10">
                {[
                  { label: 'Activo', align: 'left' },
                  { label: 'Fecha Compra', align: 'left' },
                  { label: 'Vida Útil', align: 'right' },
                  { label: 'Valor Inicial', align: 'right' },
                  { label: 'Dep. Anual', align: 'right' },
                  { label: 'Dep. Mensual', align: 'right' },
                  { label: 'Valor Actual', align: 'right' },
                  { label: 'Acciones', align: 'right' },
                ].map(col => (
                  <th
                    key={col.label}
                    className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-${col.align}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-gray-600 text-sm">No hay activos registrados.</p>
                    <p className="text-gray-700 text-xs mt-1">
                      Agrega equipos, software u otros activos para calcular su depreciación.
                    </p>
                  </td>
                </tr>
              )}

              {assets.map(asset => {
                const { annualDep, monthlyDep, currentValue } = calcValues(asset);
                const isEditing = editingId === asset.id;
                const isConfirming = confirmDeleteId === asset.id;

                if (isEditing) {
                  return (
                    <tr key={asset.id} className="bg-[#FD8000]/10 border-b border-[#7F54F5]/10">
                      <td className="px-4 py-2">
                        <input
                          value={editDraft.name}
                          onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                          className={inlineInputCls}
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editDraft.purchaseDate}
                          onChange={e => setEditDraft(d => ({ ...d, purchaseDate: e.target.value }))}
                          className={inlineInputCls + ' [color-scheme:dark]'}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          value={editDraft.usefulLife}
                          onChange={e => setEditDraft(d => ({ ...d, usefulLife: e.target.value }))}
                          className={inlineInputCls + ' text-right w-16'}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={editDraft.initialValue}
                          onChange={e => setEditDraft(d => ({ ...d, initialValue: e.target.value }))}
                          className={inlineInputCls + ' text-right w-24'}
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400 tabular-nums text-xs">
                        {formatCurrency(
                          parseFloat(editDraft.initialValue) / (parseInt(editDraft.usefulLife) || 1) || 0
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400 tabular-nums text-xs">
                        {formatCurrency(
                          parseFloat(editDraft.initialValue) / ((parseInt(editDraft.usefulLife) || 1) * 12) || 0
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400 text-xs">—</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-1.5 rounded text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={asset.id} className="border-b border-[#7F54F5]/10 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-200 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(asset.purchaseDate)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{asset.usefulLife} años</td>
                    <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                      {formatCurrency(asset.initialValue)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 tabular-nums">
                      -{formatCurrency(annualDep)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 tabular-nums">
                      -{formatCurrency(monthlyDep)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#FFCC00] tabular-nums">
                      {formatCurrency(currentValue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isConfirming ? (
                          <>
                            <button
                              onClick={() => confirmDelete(asset.id)}
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
                          <>
                            <button
                              onClick={() => startEdit(asset)}
                              className="p-1.5 rounded text-gray-500 hover:text-[#FD8000] hover:bg-[#FD8000]/10 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(asset.id)}
                              className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totals */}
            {assets.length > 0 && (
              <tfoot>
                <tr className="border-t border-[#7F54F5]/20 bg-[#0D0D0D]/40">
                  <td colSpan={4} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Totales
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-500 tabular-nums">
                    -{formatCurrency(totalAnnualDep)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-500 tabular-nums">
                    -{formatCurrency(totalMonthlyDep)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}

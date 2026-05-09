import { useState } from 'react';
import CostsModule from '../components/modules/Costs';
import AssetsModule from '../components/modules/Assets';

type Tab = 'costs' | 'assets';

const TABS: { id: Tab; label: string }[] = [
  { id: 'costs', label: 'Costos' },
  { id: 'assets', label: 'Activos' },
];

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('costs');

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[#7F54F5]/20 px-4 md:px-6 bg-[#111111] shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[#FFCC00] text-[#FFCC00]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'costs' ? <CostsModule /> : <AssetsModule />}
      </div>
    </div>
  );
}

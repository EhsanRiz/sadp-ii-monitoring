import { Search } from 'lucide-react';
import { DISTRICTS } from '../lib/stages';
import { inputCls } from './ui';

export function Filters({
  search,
  setSearch,
  district,
  setDistrict,
  children,
}: {
  search: string;
  setSearch: (s: string) => void;
  district: string;
  setDistrict: (d: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input className={`${inputCls} pl-8`} placeholder="Search enterprise…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
        {['', ...DISTRICTS].map((d) => (
          <button key={d || 'all'} onClick={() => setDistrict(d)} className={`rounded px-2.5 py-1 ${district === d ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {d || 'All'}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

export function matches(name: string, search: string) {
  return !search || name.toLowerCase().includes(search.trim().toLowerCase());
}

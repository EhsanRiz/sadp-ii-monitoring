import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LayoutGrid, Columns3, List, ListChecks, PlusCircle, Users, LogOut, History } from 'lucide-react';
import { supabase } from './lib/supabase';
import { DataProvider, useData } from './lib/data';
import type { StageKey } from './lib/stages';
import { Login } from './components/Login';
import { Logo, FullLogo } from './components/Logo';
import { Toaster, Button } from './components/ui';
import { Summary } from './components/Summary';
import { Board } from './components/Board';
import { ListView } from './components/ListView';
import { ActionsView } from './components/ActionsView';
import { PlaceView } from './components/PlaceView';
import { UsersView } from './components/UsersView';
import { ActivityView } from './components/ActivityView';
import { EnterpriseDrawer } from './components/EnterpriseDrawer';
import { BellMenu } from './components/Tasks';

export type View = 'summary' | 'board' | 'list' | 'actions' | 'activity' | 'add' | 'users';
export interface ListFilter { stage?: StageKey | 'pending' | 'with_4d' | 'unplaced'; district?: string; owner?: string }

interface Nav {
  view: View;
  go: (v: View, f?: ListFilter) => void;
  listFilter: ListFilter;
  openItem: (trackingId: string) => void;
}
const NavCtx = createContext<Nav | null>(null);
export const useNav = () => useContext(NavCtx)!;

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Splash />;
  return (
    <>
      <Toaster />
      {session ? (
        <DataProvider key={session.user.id} authUserId={session.user.id}>
          <Shell />
        </DataProvider>
      ) : (
        <Login />
      )}
    </>
  );
}

function Splash() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
}

const VIEWS: { key: View; label: string; icon: typeof List; admin?: boolean; edit?: boolean }[] = [
  { key: 'summary', label: 'Summary', icon: LayoutGrid },
  { key: 'board', label: 'Board', icon: Columns3 },
  { key: 'list', label: 'Enterprises', icon: List },
  { key: 'actions', label: 'Actions', icon: ListChecks },
  { key: 'activity', label: 'Activity', icon: History },
  { key: 'add', label: 'Bulk add', icon: PlusCircle, edit: true },
  { key: 'users', label: 'Users', icon: Users, admin: true },
];

function readHash(): View {
  const h = window.location.hash.replace('#', '') as View;
  return VIEWS.some((v) => v.key === h) ? h : 'summary';
}

function Shell() {
  const { loading, error, me, isAdmin, canEdit, live } = useData();
  const [view, setView] = useState<View>(readHash());
  const [listFilter, setListFilter] = useState<ListFilter>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const h = () => setView(readHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const go = (v: View, f?: ListFilter) => {
    setListFilter(f ?? {});
    window.location.hash = v;
    setView(v);
    window.scrollTo(0, 0);
  };

  if (loading) return <Splash />;

  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-600">{error ? `Error: ${error}` : 'Your account is not active on the tracker. Contact your admin.'}</p>
        <Button variant="secondary" onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </div>
    );
  }

  const visible = VIEWS.filter((v) => (!v.admin || isAdmin) && (!v.edit || canEdit));

  return (
    <NavCtx.Provider value={{ view, go, listFilter, openItem: setOpenId }}>
      <div className="min-h-screen pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur print:static print:border-0">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">
            <span className="sm:hidden"><Logo size={34} /></span>
            <span className="hidden sm:block"><FullLogo height={36} /></span>
            <div className="min-w-0 border-l border-slate-200 pl-3 leading-tight lg:hidden 2xl:block">
              <div className="truncate text-sm font-bold text-brand-dark">MGP M1 Approval Tracker</div>
              <div className="truncate text-[11px] text-fdbrown">SADP II · Central Region</div>
            </div>
            <nav className="ml-4 hidden items-center gap-0.5 lg:flex print:hidden">
              {visible.map((v) => (
                <button
                  key={v.key}
                  onClick={() => go(v.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium ${view === v.key ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <v.icon size={16} />
                  {v.label}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 print:hidden">
              <BellMenu />
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? 'bg-brand-light text-brand-dark' : 'bg-amber-50 text-amber-800'}`}
                title={live ? 'Changes by others appear instantly' : 'Reconnecting — changes will sync when back online'}
              >
                <span className="relative flex h-2 w-2">
                  {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-logo opacity-60" />}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-brand-logo' : 'bg-amber-500'}`} />
                </span>
                {live ? 'Live' : 'Reconnecting…'}
              </span>
              <span className="hidden whitespace-nowrap text-right text-xs leading-tight text-slate-500 sm:block">
                <span className="font-medium text-slate-700">{me.full_name}</span>
                <br />
                {me.role.replace('_', ' ')}
              </span>
              <button onClick={() => supabase.auth.signOut()} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="flex h-1 print:hidden">
            <div className="flex-1 bg-fdblue" />
            <div className="flex-1 bg-fdlime" />
            <div className="flex-1 bg-fdbrown-light" />
            <div className="flex-1 bg-brand-logo" />
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-5">
          {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Could not refresh data: {error}</div>}
          {view === 'summary' && <Summary />}
          {view === 'board' && <Board />}
          {view === 'list' && <ListView />}
          {view === 'actions' && <ActionsView />}
          {view === 'activity' && <ActivityView />}
          {view === 'add' && canEdit && <PlaceView />}
          {view === 'users' && isAdmin && <UsersView />}
        </main>

        {/* mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-white lg:hidden print:hidden" style={{ gridTemplateColumns: `repeat(${visible.length}, 1fr)` }}>
          {visible.map((v) => (
            <button key={v.key} onClick={() => go(v.key)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${view === v.key ? 'text-brand' : 'text-slate-500'}`}>
              <v.icon size={18} />
              {v.label.split(' ')[0]}
            </button>
          ))}
        </nav>

        <EnterpriseDrawer trackingId={openId} onClose={() => setOpenId(null)} />
      </div>
    </NavCtx.Provider>
  );
}

import {
  ShoppingCart, Package, Boxes, Users, BookOpen,
  History, BarChart3, Settings, HelpCircle,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { useRef } from 'react';

const items = [
  { id: 'billing', label: 'Billing', icon: ShoppingCart, shortcut: 'F8' },
  { id: 'products', label: 'Products', icon: Package, shortcut: 'F2' },
  { id: 'stock', label: 'Stock', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'sales', label: 'Sales History', icon: History },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ current, onNavigate, collapsed, onToggle, onHoverExpand, onHoverCollapse }) {
  const leaveTimer = useRef(null);

  const handleEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    onHoverExpand?.();
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => {
      onHoverCollapse?.();
    }, 220);
  };

  return (
    <aside
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`${collapsed ? 'w-[56px]' : 'w-[200px]'} shrink-0 bg-[#0b1220] text-white flex flex-col transition-all duration-200`}
    >
      <div className={`h-12 flex items-center border-b border-white/10 ${collapsed ? 'justify-center px-1' : 'px-2 gap-2'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center shrink-0">
          <ShoppingCart size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm leading-tight">Alif POS</div>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="p-1.5 rounded-md text-white bg-white/10 hover:bg-[#1d4ed8] hover:text-white shrink-0"
        >
          {collapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
              className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'}
                ${active
                  ? 'bg-[#1d4ed8] text-white'
                  : 'text-white hover:bg-white/10 hover:text-white'}`}
            >
              <Icon size={17} className="shrink-0 text-white" strokeWidth={active ? 2.25 : 2} />
              {!collapsed && <span className="truncate text-left text-white">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-1.5 border-t border-white/10">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))}
          className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] text-white hover:bg-white/10 hover:text-white py-2
            ${collapsed ? 'justify-center px-0' : 'px-2.5'}`}
          title="Help (F1)"
        >
          <HelpCircle size={17} className="text-white" />
          {!collapsed && <span className="text-white">Help</span>}
        </button>
      </div>
    </aside>
  );
}

import {
  Package,
  Warehouse,
  Users,
  BookOpen,
  Receipt,
  BarChart3,
  Settings,
  ShoppingCart,
  PanelLeftClose,
  PanelLeft,
  HelpCircle,
  Tags
} from 'lucide-react';

const items = [
  { id: 'billing', label: 'Billing', icon: ShoppingCart },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'stock', label: 'Stock', icon: Warehouse },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'pricing', label: 'Personal Pricing', icon: Tags },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'sales', label: 'Sales', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ current, onNavigate, collapsed, onToggleCollapse, onOpenHelp }) {
  return (
    <aside
      className={`${collapsed ? 'w-[56px]' : 'w-[200px]'} shrink-0 bg-[#0b1220] text-white flex flex-col transition-all duration-200`}
    >
      <div className={`flex items-center gap-2.5 border-b border-white/10 ${collapsed ? 'px-2 py-3 justify-center' : 'px-3 py-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center shrink-0">
          <ShoppingCart size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm leading-tight">Alif POS</div>
            <div className="text-white/60 text-[10px] leading-tight">Wholesale · Retail</div>
          </div>
        )}
        <button
          type="button"
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-white bg-white/10 hover:bg-[#1d4ed8] hover:text-white shrink-0"
        >
          {collapsed ? <PanelLeft size={15} className="text-white" /> : <PanelLeftClose size={15} className="text-white" />}
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto py-2 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'}
                ${active
                  ? 'seg-active'
                  : 'text-white hover:bg-white/10 hover:text-white'}`}
            >
              <Icon size={17} className="shrink-0 text-white" strokeWidth={active ? 2.25 : 2} />
              {!collapsed && <span className="truncate text-left text-white">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-white/10 py-2 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        <button
          type="button"
          title="Help (F1)"
          onClick={onOpenHelp}
          className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] text-white hover:bg-white/10 hover:text-white py-2
            ${collapsed ? 'justify-center px-0' : 'px-2.5'}`}
        >
          <HelpCircle size={17} className="text-white" />
          {!collapsed && <span className="text-white">Help</span>}
        </button>
      </div>
    </aside>
  );
}

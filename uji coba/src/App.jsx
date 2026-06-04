import './index.css';
import React, { useState, useMemo } from 'react';
import { 
  Layers, Search, Plus, Minus, Edit3, X, Printer, Activity, FileText, BarChart3 
} from 'lucide-react';

const INITIAL_MENU = [
  { id: 'm1', name: 'ESPRESSO DOUBLE', price: 25000, category: 'COFFEE', stock: 45 },
  { id: 'm2', name: 'OAT MILK LATTE', price: 38000, category: 'COFFEE', stock: 12 },
  { id: 'm3', name: 'MATCHA PRESS', price: 35000, category: 'NON-COFFEE', stock: 20 },
  { id: 'm4', name: 'ALMOND CROISSANT', price: 30000, category: 'PASTRY', stock: 5 },
  { id: 'm5', name: 'COLD BREW NITRO', price: 40000, category: 'COFFEE', stock: 8 },
];

export default function CafeTerminal() {
  // --- STATE MANAGEMENT ---
  const [menu, setMenu] = useState(INITIAL_MENU);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  
  // New States for Audit
  const [salesHistory, setSalesHistory] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  // --- LOGIC: ANALYTICS (DASHBOARD) ---
  const stats = useMemo(() => {
    const totalRevenue = salesHistory.reduce((acc, sale) => acc + sale.total, 0);
    const totalTransactions = salesHistory.length;
    
    const menuCount = {};
    const paymentCount = { QRIS: 0, CASH: 0, CARD: 0 };
    
    salesHistory.forEach(sale => {
      paymentCount[sale.method]++;
      sale.items.forEach(item => {
        menuCount[item.name] = (menuCount[item.name] || 0) + item.qty;
      });
    });

    const topMenu = Object.entries(menuCount).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
    return { totalRevenue, totalTransactions, topMenu, paymentCount };
  }, [salesHistory]);

  // --- LOGIC: FILTER MENU ---
  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory, menu]);

  // --- LOGIC: CART ACTIONS ---
  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (item.isCustom || existing.qty < item.stock) {
        setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      } else {
        alert("STOK TIDAK MENCUKUPI");
      }
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const decreaseQty = (id) => {
    const existing = cart.find(c => c.id === id);
    if (existing.qty === 1) {
      setCart(cart.filter(c => c.id !== id));
    } else {
      setCart(cart.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c));
    }
  };

  const addCustomToCart = (e) => {
    e.preventDefault();
    if (!customName || !customPrice) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      name: `(CUSTOM) ${customName.toUpperCase()}`,
      price: parseInt(customPrice),
      qty: 1,
      isCustom: true
    };
    setCart([...cart, newItem]);
    setCustomName('');
    setCustomPrice('');
    setShowCustomForm(false);
  };

  // --- LOGIC: CHECKOUT & AUDIT ---
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const date = new Date().toLocaleString();
    const invoiceNo = `INV-${Date.now()}`;
    
    // Simpan ke History Penjualan untuk Dashboard
    const transactionData = {
      id: invoiceNo,
      time: date,
      items: [...cart],
      total: Math.round(total),
      method: paymentMethod
    };
    setSalesHistory(prev => [...prev, transactionData]);

    // Generate Struk Konten
    let receiptContent = `
================================
      LEDGER COFFEE & CO
      STATION: NODE_PRIME
================================
Date: ${date}
ID  : ${invoiceNo}
--------------------------------
`;
    cart.forEach(item => {
      const line = `${item.name.padEnd(20)} x${item.qty}  ${(item.price * item.qty).toLocaleString()}`;
      receiptContent += line + "\n";
    });

    receiptContent += `
--------------------------------
SUBTOTAL: IDR ${subtotal.toLocaleString()}
TAX (11%): IDR ${Math.round(tax).toLocaleString()}
TOTAL   : IDR ${Math.round(total).toLocaleString()}
--------------------------------
METHOD  : ${paymentMethod}
STATUS  : SETTLED / PAID
================================
   THANK YOU FOR YOUR ASSET
================================
`;

    // Trigger Download
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceNo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Update Stock & Reset
    setMenu(menu.map(m => {
      const ci = cart.find(c => c.id === m.id);
      return ci ? { ...m, stock: Math.max(0, m.stock - ci.qty) } : m;
    }));
    setCart([]);
    alert("TRANSACTION SUCCESS // AUDIT LOG UPDATED");
  };

  return (
    <div className="min-h-screen bg-[#0d0d0e] text-[#e1e1e3] font-mono selection:bg-emerald-500/30 p-4 md:p-8">
      
      {/* HEADER SECTION */}
      <div className="max-w-[1400px] mx-auto mb-8 flex justify-between items-end border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500 text-black rounded-sm">
              <Layers size={20} />
            </div>
            <h1 className="text-lg font-black tracking-[0.3em]">LEDGER_COFFEE_V1.4</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            System Status: Secure & Operational
          </p>
        </div>
        <button 
          onClick={() => setShowDashboard(true)}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-800 hover:border-emerald-500 transition-all text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-500"
        >
          <BarChart3 size={14} /> Open Audit Dashboard
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: MENU SELECTION */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" placeholder="SEARCH ASSETS..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#161618] border border-zinc-800 rounded-sm pl-10 pr-4 py-3 text-[11px] outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div className="flex bg-[#161618] border border-zinc-800 p-1 rounded-sm overflow-x-auto">
              {['ALL', 'COFFEE', 'NON-COFFEE', 'PASTRY'].map(cat => (
                <button 
                  key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 px-3 py-2 text-[9px] font-black tracking-widest transition-all ${selectedCategory === cat ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredMenu.map(item => (
              <button 
                key={item.id} onClick={() => addToCart(item)} disabled={item.stock === 0}
                className="group flex justify-between items-center bg-[#161618] border border-zinc-800 hover:border-emerald-500/40 p-4 transition-all disabled:opacity-30 text-left"
              >
                <div>
                  <span className="text-[9px] text-emerald-500/70 font-bold uppercase">{item.category}</span>
                  <h3 className="text-xs font-bold tracking-wide mt-1 group-hover:text-emerald-400">{item.name}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">STOCK: {item.stock}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black">IDR {item.price.toLocaleString()}</p>
                  <Plus size={14} className="ml-auto mt-2 text-zinc-700 group-hover:text-emerald-500" />
                </div>
              </button>
            ))}
            <button 
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="flex flex-col items-center justify-center border border-dashed border-zinc-800 hover:border-zinc-500 p-4 transition-all group gap-2"
            >
              <Edit3 size={16} className="text-zinc-600 group-hover:text-emerald-500" />
              <span className="text-[9px] font-black tracking-widest uppercase text-zinc-500 group-hover:text-zinc-300">Register Custom Asset</span>
            </button>
          </div>

          {showCustomForm && (
            <form onSubmit={addCustomToCart} className="bg-[#1a1a1c] border border-emerald-500/30 p-6 rounded-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">New Asset Registration</span>
                <X size={16} className="cursor-pointer text-zinc-500" onClick={() => setShowCustomForm(false)} />
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="ASSET NAME" value={customName} onChange={(e) => setCustomName(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs outline-none focus:border-emerald-500" />
                <input type="number" placeholder="PRICE" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="md:w-40 bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs outline-none focus:border-emerald-500" />
                <button type="submit" className="bg-emerald-500 text-black font-black px-6 py-2 text-[10px] uppercase hover:bg-emerald-400 transition-colors">Execute</button>
              </div>
            </form>
          )}
        </div>

        {/* RIGHT: SETTLEMENT / CART */}
        <div className="lg:col-span-5">
          <div className="bg-[#161618] border border-zinc-800 flex flex-col h-full min-h-[600px]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-zinc-400">Order Ledger</h2>
              <Activity size={14} className="text-emerald-500" />
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-20 italic text-[10px] tracking-widest">// NO_PENDING_TRANSACTIONS</div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
                    <div className="space-y-1">
                      <p className={`text-[11px] font-bold tracking-wide ${item.isCustom ? 'text-emerald-400' : ''}`}>{item.name}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Price: {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-sm gap-3">
                        <button onClick={() => decreaseQty(item.id)} className="hover:text-emerald-500"><Minus size={12} /></button>
                        <span className="text-[11px] font-black text-white w-4 text-center">{item.qty}</span>
                        <button onClick={() => addToCart(item)} className="hover:text-emerald-500"><Plus size={12} /></button>
                      </div>
                      <span className="text-xs font-bold w-20 text-right">{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-[#0d0d0e] border-t border-zinc-800 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['QRIS', 'CASH', 'CARD'].map(m => (
                  <button 
                    key={m} onClick={() => setPaymentMethod(m)}
                    className={`py-2 text-[9px] font-black tracking-widest border transition-all ${paymentMethod === m ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Gross Subtotal</span>
                  <span>IDR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>VAT Engine (11%)</span>
                  <span>IDR {Math.round(tax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-zinc-800">
                  <span className="text-[11px] font-black tracking-[0.2em] text-emerald-500 uppercase">Settlement Total</span>
                  <span className="text-2xl font-black tracking-tighter">IDR {Math.round(total).toLocaleString()}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout} disabled={cart.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 disabled:text-zinc-700 text-black font-black py-4 rounded-sm mt-4 transition-all text-[11px] tracking-[0.3em] uppercase flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              >
                <Printer size={16} strokeWidth={3} />
                Confirm & Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY DASHBOARD */}
      {showDashboard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] p-4 md:p-8 flex items-center justify-center animate-in fade-in duration-300">
          <div className="max-w-4xl w-full bg-[#161618] border border-zinc-800 p-8 rounded-sm relative shadow-[0_0_50px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowDashboard(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
            
            <h2 className="text-xl font-black tracking-[0.4em] text-emerald-500 mb-8 uppercase">Internal Audit Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-[#0d0d0e] border border-zinc-800 p-6">
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-2">Gross Revenue</p>
                <p className="text-2xl font-black text-white">IDR {stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-[#0d0d0e] border border-zinc-800 p-6">
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-2">Transactions</p>
                <p className="text-2xl font-black text-emerald-400">{stats.totalTransactions}</p>
              </div>
              <div className="bg-[#0d0d0e] border border-zinc-800 p-6">
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-2">Best Asset</p>
                <p className="text-lg font-black text-white uppercase truncate">{stats.topMenu[0]}</p>
                <p className="text-[10px] text-zinc-500 italic">Volume: {stats.topMenu[1]} Units</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Payment Distribution</h3>
                {Object.entries(stats.paymentCount).map(([method, count]) => (
                  <div key={method} className="flex items-center gap-4">
                    <span className="text-[10px] w-12 font-bold">{method}</span>
                    <div className="flex-1 bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(count / stats.totalTransactions * 100) || 0}%` }}></div>
                    </div>
                    <span className="text-[10px] text-zinc-500">{count}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Recent System Logs</h3>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {salesHistory.length === 0 ? (
                    <p className="text-[10px] text-zinc-700 italic">WAITING_FOR_DATA...</p>
                  ) : (
                    salesHistory.slice(-5).reverse().map(sale => (
                      <div key={sale.id} className="text-[9px] font-mono text-zinc-500 flex justify-between border-b border-zinc-800/50 pb-1">
                        <span>{sale.id}</span>
                        <span className="text-emerald-500/70">IDR {sale.total.toLocaleString()}</span>
                        <span>{sale.method}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
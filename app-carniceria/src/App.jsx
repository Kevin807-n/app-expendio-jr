import React, { useState, useEffect } from 'react';
import { 
  Save, Share2, Plus, Trash2, History, FileText, ArrowLeft, 
  Truck, CheckCircle, Calculator, MapPin, Navigation, 
  DollarSign, Coffee, Wrench, Fuel, Bed, AlertTriangle, Printer, 
  Users, UserPlus, Edit, UserCog, X, Search, Settings, Map, TrendingUp, Package, Calendar, Clock, MapPinned, PauseCircle, PlayCircle, CreditCard, Banknote, ChevronDown, ChevronUp, Car, Smartphone
} from 'lucide-react';

// --- HOOK DE GUARDADO SEGURO ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// --- DATOS INICIALES ---
const PRODUCTOS_COMUNES = [
  "Hígado", "Mondongo", "Chunchullo", "Riñón", "Pajarilla", "Lenguas", "Bofe", "Corazón", "Ubre", "Malaya", 
  "Chocosuela", "Hueso", "Orejas", "Pezuña", "Tocino", 
  "Bofe Cerdo", "Corazón de Cerdo", "Carne", "Pata de Res", "Buches", "Tripita", "Entresijos"
];

const EXPENSE_TYPES = [
    {l:'ACPM',i:Fuel}, {l:'Peaje',i:MapPin}, {l:'Comida',i:Coffee}, {l:'Hotel',i:Bed}, {l:'Taller',i:Wrench}, {l:'Otro',i:AlertTriangle}
];

const App = () => {
  // --- ESTADOS ---
  const [view, setView] = useState('home'); 
  
  // DATOS PERSISTENTES
  const [salesHistory, setSalesHistory] = useLocalStorage('meatAppHistoryV22', []);
  const [tripHistory, setTripHistory] = useLocalStorage('meatAppTripHistoryV22', []); 
  const [savedClients, setSavedClients] = useLocalStorage('meatAppClientsV22', []);
  const [invoiceCounter, setInvoiceCounter] = useLocalStorage('meatAppCounterV22', 61); 
  const [activeTrip, setActiveTrip] = useLocalStorage('meatAppTripV22', null);
  const [tripExpenses, setTripExpenses] = useLocalStorage('meatAppExpensesV22', []);
  const [savedRoutes, setSavedRoutes] = useLocalStorage('meatAppRoutesV22', [
    { id: 1, nombre: "Ruta Habitual", origen: "Neiva", destino: "Bogotá", distancia: 300 },
    { id: 2, nombre: "Costa", origen: "Bogotá", destino: "Cartagena", distancia: 1050 }
  ]);

  // ESTADOS DE TRABAJO
  const [cart, setCart] = useLocalStorage('meatAppCurrentCartV22', []); 
  const [client, setClient] = useLocalStorage('meatAppCurrentClientV22', { name: '', id: '', address: '', phone: '' }); 
  
  // DATOS DE TRANSPORTE
  const [transportInfo, setTransportInfo] = useLocalStorage('meatAppTransportV22', {
    destino: '',
    conductor: '',
    cedulaConductor: '',
    placa: '',
    color: ''
  });

  const [pendingSales, setPendingSales] = useLocalStorage('meatAppPendingSalesV22', []);
  
  // --- ESTADOS DE PAGO Y FECHA ---
  const [paymentCondition, setPaymentCondition] = useState('Contado'); // Contado vs Credito
  const [paymentMethod, setPaymentMethod] = useState(''); // VACÍO POR DEFECTO
  // Inicializamos la fecha con la de HOY
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  // ESTADOS TEMPORALES
  const [editingClient, setEditingClient] = useState(null);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Inputs
  const [selectedProduct, setSelectedProduct] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [newExpense, setNewExpense] = useState({ type: 'ACPM', value: '', note: '' });
  
  const [newRoute, setNewRoute] = useState({ nombre: '', origen: '', destino: '', distancia: '' });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [cargoItem, setCargoItem] = useState({ product: '', weight: '' });
  const [showConfig, setShowConfig] = useState(false);
  const [tempCounter, setTempCounter] = useState('');

  // --- CALCULOS FINANCIEROS ---
  const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  const totalGlobalSales = salesHistory.reduce((acc, s) => acc + (s.total || 0), 0);
  const currentTripExpensesTotal = tripExpenses.reduce((acc, item) => acc + parseFloat(item.value || 0), 0);
  const historicalTripExpensesTotal = tripHistory.reduce((acc, trip) => acc + (trip.totalExpenses || 0), 0);
  const totalGlobalExpenses = currentTripExpensesTotal + historicalTripExpensesTotal;

  const getSalesInCurrentTrip = () => {
    if (!activeTrip || !activeTrip.startDate) return 0;
    const tripStart = new Date(activeTrip.startDate).getTime();
    return salesHistory.filter(sale => sale.timestamp >= tripStart).reduce((acc, sale) => acc + sale.total, 0);
  };

  // --- LÓGICA VENTA ---
  const addToCart = () => {
    if (!selectedProduct) return alert("Selecciona producto");
    if (!weight || !price) return alert("Falta peso o precio");
    setCart([...cart, {
      id: Date.now(),
      product: selectedProduct,
      weight: parseFloat(weight),
      price: parseFloat(price),
      total: parseFloat(weight) * parseFloat(price)
    }]);
    setWeight(''); 
    setPrice(''); 
  };

  const calculateTotalSale = () => cart.reduce((acc, item) => acc + item.total, 0);

  const handleFinishSale = () => {
    if (cart.length === 0) return alert("Carrito vacío");
    if (!client.name.trim()) return alert("Falta nombre del cliente");
    
    if (transportInfo.placa && !transportInfo.destino) {
        if(!window.confirm("Pusiste placa pero no Destino. ¿Seguro?")) return;
    }

    const nextInvoiceNumber = parseInt(invoiceCounter) + 1;
    const now = new Date(); // Hora real
    
    // --- LÓGICA DE FECHA EDITABLE ---
    const [y, m, d] = saleDate.split('-').map(Number);
    const selectedDateObj = new Date(y, m - 1, d); 

    let formattedDueDate = "-"; 
    if (paymentCondition === 'Credito') {
        const dueDateObj = new Date(selectedDateObj); 
        dueDateObj.setDate(dueDateObj.getDate() + 30); 
        formattedDueDate = dueDateObj.toLocaleDateString('es-CO');
    }

    const saleData = {
      id: Date.now(),
      timestamp: selectedDateObj.getTime(), 
      date: selectedDateObj.toLocaleDateString('es-CO'), 
      dueDate: formattedDueDate,
      time: now.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit', hour12: true}),
      paymentCondition: paymentCondition, 
      paymentMethod: paymentMethod, 
      client: { ...client },
      transport: { ...transportInfo }, 
      items: [...cart],
      total: calculateTotalSale(),
      invoiceNumber: `0${nextInvoiceNumber}`
    };

    setSalesHistory([saleData, ...salesHistory]);
    setInvoiceCounter(nextInvoiceNumber);
    setCurrentInvoice(saleData);
    
    setCart([]);
    setClient({ name: '', id: '', address: '', phone: '' });
    setTransportInfo({ destino: '', conductor: '', cedulaConductor: '', placa: '', color: '' });
    
    setPaymentCondition('Contado'); 
    setPaymentMethod(''); // Reseteamos a vacío
    setSaleDate(new Date().toISOString().split('T')[0]); // Volvemos a hoy
    setView('invoice');
  };

  // --- OTRAS FUNCIONES ---
  const parkSale = () => {
      if (cart.length === 0 && !client.name) return alert("No hay nada que guardar.");
      const draft = { id: Date.now(), client: client, cart: cart, date: new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'}) };
      setPendingSales([...pendingSales, draft]);
      setCart([]); setClient({ name: '', id: '', address: '', phone: '' }); alert("Venta guardada en pendientes.");
  };
  const resumeSale = (draftId) => {
      const draft = pendingSales.find(d => d.id === draftId);
      if(!draft) return;
      if(cart.length > 0 || client.name) { if(!window.confirm("¿Reemplazar venta actual?")) return; }
      setClient(draft.client); setCart(draft.cart); setPendingSales(pendingSales.filter(d => d.id !== draftId)); 
  };
  const deleteDraft = (draftId) => { if(window.confirm("¿Borrar pendiente?")) setPendingSales(pendingSales.filter(d => d.id !== draftId)); };
  const handleSelectClient = (e) => {
    const id = parseInt(e.target.value);
    const found = savedClients.find(c => c.internalId === id);
    if (found) setClient(found); else setClient({ name: '', id: '', address: '', phone: '' });
  };
  const saveClientFromPOS = () => { if (!client.name) return; setSavedClients([...savedClients, { ...client, internalId: Date.now() }]); alert("Cliente guardado"); };
  const updateCounter = () => { if(tempCounter) { setInvoiceCounter(parseInt(tempCounter)); alert("Contador actualizado."); setShowConfig(false); } };
  const deleteInvoice = (id, e) => { e.stopPropagation(); if(window.confirm("¿Borrar esta factura?")) setSalesHistory(salesHistory.filter(s => s.id !== id)); };
  const deleteTripFromHistory = (id) => { if(window.confirm("¿Borrar este viaje?")) setTripHistory(tripHistory.filter(t => t.id !== id)); };
  const saveNewRoute = () => { if(!newRoute.origen || !newRoute.destino) return alert("Origen y Destino obligatorios"); const nombreFinal = newRoute.nombre || `${newRoute.origen} - ${newRoute.destino}`; setSavedRoutes([...savedRoutes, { ...newRoute, nombre: nombreFinal, id: Date.now() }]); setNewRoute({ nombre: '', origen: '', destino: '', distancia: '' }); setShowRouteForm(false); };
  const deleteRoute = (id) => { if(window.confirm("¿Borrar ruta?")) setSavedRoutes(savedRoutes.filter(r => r.id !== id)); };
  
  const startTrip = (ruta) => { 
      if(activeTrip && !window.confirm("¿Reiniciar viaje activo?")) return; 
      setActiveTrip({ id: Date.now(), ruta, startDate: new Date(), cargo: [] }); 
      setTripExpenses([]); 
      setView('trip'); 
  };
  
  const addCargo = () => { if(!cargoItem.product || !cargoItem.weight) return alert("Faltan datos"); const newLoad = [...(activeTrip.cargo || []), { ...cargoItem, id: Date.now() }]; setActiveTrip({ ...activeTrip, cargo: newLoad }); setCargoItem({ product: '', weight: '' }); };
  const removeCargo = (id) => { const newLoad = activeTrip.cargo.filter(c => c.id !== id); setActiveTrip({ ...activeTrip, cargo: newLoad }); };
  
  const addExpense = () => { 
      if (!newExpense.value) return alert("Ingresa valor"); 
      setTripExpenses([{ id: Date.now(), type: newExpense.type, value: parseFloat(newExpense.value), note: newExpense.note, time: new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'}) }, ...tripExpenses]); 
      setNewExpense({ ...newExpense, value: '', note: '' }); 
  };

  const endTrip = () => {
     if(!activeTrip) { alert("No hay viaje activo."); return; }
     if(!window.confirm("¿Finalizar viaje y guardar en bitácora?")) return;
     
     const finalSales = getSalesInCurrentTrip();
     const finalExpenses = tripExpenses.reduce((acc, item) => acc + parseFloat(item.value || 0), 0);

     const tripSummary = {
         ...activeTrip,
         endDate: new Date(),
         totalSales: finalSales,
         totalExpenses: finalExpenses,
         expensesList: [...tripExpenses]
     };

     setTripHistory([tripSummary, ...tripHistory]);
     setActiveTrip(null);
     setTripExpenses([]); 
     alert("¡Viaje finalizado!");
     setView('trip_history'); 
  };

  const getDuration = (start, end) => { 
      if(!start || !end) return "-";
      const diff = new Date(end) - new Date(start); 
      const hours = Math.floor(diff / (1000 * 60 * 60)); 
      return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`; 
  };

  // --- 🖨️ FIX IMPRESIÓN + NOMBRE PDF ---
  const handlePrint = () => {
      const originalTitle = document.title;
      document.title = `Factura ${currentInvoice.invoiceNumber} - ${currentInvoice.client.name}`;
      setTimeout(() => {
          window.print();
          document.title = originalTitle;
      }, 500);
  };

  // --- RENDERIZADO ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 max-w-lg mx-auto shadow-2xl print:shadow-none print:max-w-none">
      
      {/* HEADER */}
      {view !== 'invoice' && (
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 sticky top-0 z-40 shadow-lg flex justify-between items-center print:hidden">
           {view === 'home' ? (
             <div><h1 className="font-black text-xl italic tracking-tighter">VÍSCERAS JR.</h1><p className="text-[10px] text-blue-200 uppercase tracking-widest">Sistema Móvil</p></div>
           ) : (
             <button onClick={() => setView('home')} className="flex items-center gap-2 font-bold text-blue-100"><ArrowLeft/> Menú</button>
           )}
           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-blue-200 overflow-hidden">
             <img src="/logo-jr.png" alt="JR" className="w-full h-full object-cover" onError={(e) => {e.target.style.display='none';}} />
             <Truck size={20} className="text-blue-900 absolute" style={{zIndex: -1}}/>
           </div>
        </header>
      )}

      <main className="p-4 print:p-0">
        
        {/* VISTA: HOME */}
        {view === 'home' && (
          <div className="grid grid-cols-2 gap-4 mt-4 animate-in zoom-in duration-300">
            <button onClick={() => setView('pos')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:shadow-md">
              <div className="bg-blue-50 p-4 rounded-full text-blue-600"><FileText size={32}/></div><span className="font-bold text-gray-700">Nueva Venta</span>
            </button>
            <button onClick={() => setView('trip')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:shadow-md">
              <div className="bg-orange-50 p-4 rounded-full text-orange-600 relative"><Truck size={32}/>{activeTrip && <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></span>}</div><span className="font-bold text-gray-700">Mi Viaje</span>
            </button>
            <button onClick={() => setView('clients')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:shadow-md">
              <div className="bg-teal-50 p-4 rounded-full text-teal-600"><Users size={32}/></div><span className="font-bold text-gray-700">Clientes</span>
            </button>
            <button onClick={() => setView('wallet')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center gap-3 active:scale-95 transition-transform hover:shadow-md">
              <div className="bg-green-50 p-4 rounded-full text-green-600"><DollarSign size={32}/></div><span className="font-bold text-gray-700">Ganancias</span>
            </button>
            <div className="col-span-2 space-y-3 mt-2">
                <div className="bg-gray-900 rounded-xl p-4 text-white flex justify-between items-center cursor-pointer hover:bg-gray-800" onClick={() => setView('trip_history')}>
                   <div className="flex items-center gap-3"><div className="bg-gray-700 p-2 rounded-lg"><MapPinned size={20}/></div><div><p className="font-bold text-sm">Bitácora de Viajes</p><p className="text-xs text-gray-400">Ver historial de rutas</p></div></div>
                   <ArrowLeft className="rotate-180 text-gray-500" size={18}/>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => setView('history')}>
                   <div className="flex items-center gap-3"><div className="bg-purple-50 p-2 rounded-lg text-purple-600"><History size={20}/></div><div><p className="font-bold text-sm text-gray-700">Historial de Facturas</p></div></div>
                   <ArrowLeft className="rotate-180 text-gray-400" size={18}/>
                </div>
            </div>
          </div>
        )}

        {/* VISTA: POS (VENTA) */}
        {view === 'pos' && (
          <div className="pb-20 space-y-4 animate-in slide-in-from-right duration-200">
            {pendingSales.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                    <h3 className="text-xs font-bold text-yellow-700 mb-2 flex items-center gap-1"><PauseCircle size={14}/> Ventas Pendientes ({pendingSales.length})</h3>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {pendingSales.map(draft => (
                            <div key={draft.id} className="bg-white p-2 rounded border border-yellow-100 min-w-[120px] flex flex-col justify-between shadow-sm">
                                <div><p className="font-bold text-xs truncate">{draft.client.name || 'Sin nombre'}</p><p className="text-[10px] text-gray-500">{draft.cart.length} items</p></div>
                                <div className="flex gap-1 mt-1"><button onClick={() => resumeSale(draft.id)} className="bg-green-100 text-green-700 p-1 rounded flex-1 flex justify-center"><PlayCircle size={14}/></button><button onClick={() => deleteDraft(draft.id)} className="bg-red-100 text-red-700 p-1 rounded flex justify-center"><Trash2 size={14}/></button></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Users size={14}/> Cliente</h3>
                {savedClients.length > 0 && (
                  <select onChange={handleSelectClient} className="text-xs p-1 bg-blue-50 text-blue-800 rounded border border-blue-200 outline-none max-w-[150px]">
                    <option value="">-- Cargar --</option>
                    {savedClients.map(c => <option key={c.internalId} value={c.internalId}>{c.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <input className="flex-1 p-2 border border-gray-300 rounded outline-none font-bold text-gray-700" placeholder="Nombre Cliente *" value={client.name} onChange={e => setClient({...client, name: e.target.value})} />
                <button onClick={saveClientFromPOS} className="bg-gray-100 px-3 rounded text-gray-500 hover:text-blue-600 border border-gray-200"><Save size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <input type="number" placeholder="NIT / CC" className="p-2 border border-gray-300 rounded outline-none text-sm" value={client.id} onChange={e => setClient({...client, id: e.target.value})}/>
                 <input type="tel" placeholder="Celular" className="p-2 border border-gray-300 rounded outline-none text-sm" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})}/>
              </div>
              <input type="text" placeholder="Dirección" className="w-full p-2 border border-gray-300 rounded outline-none text-sm mt-2" value={client.address} onChange={e => setClient({...client, address: e.target.value})}/>
            </div>
            
            {/* DATOS TRANSPORTE (LEGAL) */}
            <div className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-100">
               <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-1"><Truck size={14}/> Datos Transporte (Opcional)</h3>
               <div className="grid grid-cols-2 gap-2 mb-2">
                  <input className="p-2 border border-blue-200 rounded text-sm" placeholder="Destino (Ciudad)" value={transportInfo.destino} onChange={e => setTransportInfo({...transportInfo, destino: e.target.value})}/>
                  <input className="p-2 border border-blue-200 rounded text-sm" placeholder="Conductor" value={transportInfo.conductor} onChange={e => setTransportInfo({...transportInfo, conductor: e.target.value})}/>
               </div>
               <div className="grid grid-cols-3 gap-2">
                   <input type="number" className="p-2 border border-blue-200 rounded text-sm" placeholder="CC Conductor" value={transportInfo.cedulaConductor} onChange={e => setTransportInfo({...transportInfo, cedulaConductor: e.target.value})}/>
                   <input className="p-2 border border-blue-200 rounded text-sm uppercase" placeholder="Placa Veh." value={transportInfo.placa} onChange={e => setTransportInfo({...transportInfo, placa: e.target.value})}/>
                   <input className="p-2 border border-blue-200 rounded text-sm" placeholder="Color Veh." value={transportInfo.color} onChange={e => setTransportInfo({...transportInfo, color: e.target.value})}/>
               </div>
               <p className="text-[10px] text-blue-400 mt-2 italic">* Si dejas el Destino vacío, esta información NO saldrá en la factura.</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Agregar Producto</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {PRODUCTOS_COMUNES.map(p => (
                  <button key={p} onClick={() => setSelectedProduct(p)} className={`px-2 py-1 text-xs rounded border ${selectedProduct === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{p}</button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-400">ITEM</label>
                  <div className="h-10 px-2 bg-blue-50 border border-blue-100 rounded flex items-center font-bold text-blue-900 text-sm truncate">{selectedProduct || '...'}</div>
                </div>
                <div className="w-20">
                  <label className="text-[10px] font-bold text-gray-400">KG</label>
                  <input type="number" className="w-full h-10 px-2 border border-gray-300 rounded font-bold text-center outline-none" placeholder="0" value={weight} onChange={e => setWeight(e.target.value)}/>
                </div>
                <div className="w-24">
                  <label className="text-[10px] font-bold text-gray-400">PRECIO</label>
                  <input type="number" className="w-full h-10 px-2 border border-gray-300 rounded font-bold text-center outline-none" placeholder="$" value={price} onChange={e => setPrice(e.target.value)}/>
                </div>
                <button onClick={addToCart} className="h-10 w-10 bg-blue-600 text-white rounded flex items-center justify-center shadow-lg active:scale-95"><Plus size={24}/></button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-end border-b border-gray-700 pb-2 mb-2">
                  <span className="text-gray-400 text-sm">Total a Pagar</span>
                  <span className="text-3xl font-black">{formatCurrency(calculateTotalSale())}</span>
                </div>
                
                {/* CONFIGURACIÓN DE PAGO Y FECHA */}
                <div className="space-y-2 mb-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                    {/* FECHA FACTURA (EDITABLE) */}
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                        <Calendar size={16} className="text-gray-400"/>
                        <span className="text-xs font-bold text-gray-300">Fecha Factura:</span>
                        <input 
                            type="date" 
                            value={saleDate} 
                            onChange={(e) => setSaleDate(e.target.value)}
                            className="bg-gray-700 text-white text-sm p-1 rounded border border-gray-600 outline-none flex-1"
                        />
                    </div>

                    {/* Fila 1: CONDICIÓN (Plazo) */}
                    <div className="flex gap-2">
                        <button onClick={() => setPaymentCondition('Contado')} className={`flex-1 py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all ${paymentCondition === 'Contado' ? 'bg-green-500 text-white shadow' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                            <Banknote size={16}/> CONTADO
                        </button>
                        <button onClick={() => setPaymentCondition('Credito')} className={`flex-1 py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all ${paymentCondition === 'Credito' ? 'bg-orange-500 text-white shadow' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                            <CreditCard size={16}/> CRÉDITO
                        </button>
                    </div>

                    {/* Fila 2: MEDIO DE PAGO (Dinero) */}
                    <div className="flex gap-2 items-center">
                        <span className="text-xs text-gray-400 font-bold uppercase w-12">Medio:</span>
                        <select 
                            value={paymentMethod} 
                            onChange={(e) => setPaymentMethod(e.target.value)} 
                            className="flex-1 bg-gray-700 text-white text-sm p-2 rounded border border-gray-600 outline-none"
                        >
                            <option value="">-- Ninguno --</option>
                            <option value="Efectivo">💵 Efectivo</option>
                            <option value="Consignacion">📱 Consignación</option>
                            <option value="Otro">🏳️ Otro</option>
                        </select>
                    </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm bg-gray-800 p-2 rounded">
                      <div><div className="font-bold">{item.product}</div><div className="text-xs text-gray-400">{item.weight}kg x {formatCurrency(item.price)}</div></div>
                      <div className="flex items-center gap-3"><span className="font-bold">{formatCurrency(item.total)}</span><button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-red-400"><Trash2 size={16}/></button></div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={parkSale} className="px-4 py-3 bg-gray-700 text-white font-bold rounded-lg flex flex-col items-center justify-center text-[10px] uppercase tracking-wide"><PauseCircle size={18}/> Pendiente</button>
                    <button onClick={handleFinishSale} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex justify-center items-center gap-2"><Save size={20}/> FINALIZAR</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ... (CLIENTES, TRIP, TRIP_HISTORY, HISTORY, WALLET se mantienen igual) ... */}
        {view === 'clients' && (
          <div className="pb-20 animate-in slide-in-from-right duration-200">
             {editingClient ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
                   <div className="flex justify-between items-center border-b pb-2"><h2 className="font-bold text-lg">Editar Cliente</h2><button onClick={() => setEditingClient(null)}><X size={20}/></button></div>
                   <input className="w-full p-3 border rounded-lg" placeholder="Nombre" value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})}/>
                   <input className="w-full p-3 border rounded-lg" type="number" placeholder="NIT/CC" value={editingClient.id} onChange={e => setEditingClient({...editingClient, id: e.target.value})}/>
                   <input className="w-full p-3 border rounded-lg" type="tel" placeholder="Celular" value={editingClient.phone} onChange={e => setEditingClient({...editingClient, phone: e.target.value})}/>
                   <input className="w-full p-3 border rounded-lg" placeholder="Dirección" value={editingClient.address} onChange={e => setEditingClient({...editingClient, address: e.target.value})}/>
                   <button onClick={() => {
                       if(!editingClient.name) return;
                       if(editingClient.internalId) setSavedClients(savedClients.map(c => c.internalId === editingClient.internalId ? editingClient : c));
                       else setSavedClients([...savedClients, {...editingClient, internalId: Date.now()}]);
                       setEditingClient(null);
                   }} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Guardar</button>
                </div>
             ) : (
                <div className="space-y-4">
                  <button onClick={() => setEditingClient({name:'', id:'', phone:'', address:''})} className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-600 font-bold rounded-xl flex justify-center gap-2"><UserPlus size={20}/> Nuevo Cliente</button>
                  <div className="space-y-2">
                    {savedClients.map(c => (
                      <div key={c.internalId} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                        <div><div className="font-bold text-gray-800">{c.name}</div><div className="text-xs text-gray-500">{c.phone}</div></div>
                        <div className="flex gap-2"><button onClick={() => setEditingClient(c)} className="p-2 bg-blue-50 text-blue-600 rounded"><Edit size={16}/></button><button onClick={() => {if(window.confirm("¿Borrar?")) setSavedClients(savedClients.filter(x => x.internalId !== c.internalId))}} className="p-2 bg-red-50 text-red-500 rounded"><Trash2 size={16}/></button></div>
                      </div>
                    ))}
                  </div>
                </div>
             )}
          </div>
        )}

        {view === 'trip' && (
          <div className="pb-20 animate-in slide-in-from-right duration-200">
             {!activeTrip ? (
                <div className="space-y-4">
                   {showRouteForm ? (
                       <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                           <div className="flex justify-between items-center"><h3 className="font-bold">Nueva Ruta</h3><button onClick={() => setShowRouteForm(false)}><X size={20}/></button></div>
                           <input className="w-full p-3 border rounded-lg" placeholder="Nombre (Ej: Ruta Habitual)" value={newRoute.nombre} onChange={e => setNewRoute({...newRoute, nombre: e.target.value})}/>
                           <div className="grid grid-cols-2 gap-2">
                             <input className="p-3 border rounded-lg" placeholder="Origen (Ej: Neiva)" value={newRoute.origen} onChange={e => setNewRoute({...newRoute, origen: e.target.value})}/>
                             <input className="p-3 border rounded-lg" placeholder="Destino (Ej: Ibagué)" value={newRoute.destino} onChange={e => setNewRoute({...newRoute, destino: e.target.value})}/>
                           </div>
                           <input className="w-full p-3 border rounded-lg" placeholder="Distancia (Km) - Opcional" type="number" value={newRoute.distancia} onChange={e => setNewRoute({...newRoute, distancia: e.target.value})}/>
                           <button onClick={saveNewRoute} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Guardar Ruta</button>
                       </div>
                   ) : (
                       <div className="bg-white p-6 rounded-xl border border-gray-200 text-center space-y-4">
                           <Map size={48} className="mx-auto text-blue-200"/>
                           <h2 className="text-xl font-bold text-gray-800">¿Para dónde vamos hoy?</h2>
                           <p className="text-sm text-gray-500">Selecciona tu ruta.</p>
                           <div className="space-y-2">
                               {savedRoutes.map(r => (
                                  <div key={r.id} className="flex gap-2 items-center">
                                      <button onClick={() => startTrip(r)} className="flex-1 p-4 bg-gray-50 border rounded-xl font-bold flex justify-between hover:bg-blue-50 hover:border-blue-200 text-left items-center">
                                          <div><div className="flex items-center gap-2 text-sm text-gray-500 mb-1"><MapPin size={12}/> {r.origen} <ArrowLeft size={12} className="rotate-180"/> {r.destino}</div><div className="text-lg text-blue-900">{r.nombre}</div></div><span className="text-gray-400 text-xs">{r.distancia}km</span>
                                      </button>
                                      <button onClick={() => deleteRoute(r.id)} className="p-4 text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                                  </div>
                               ))}
                           </div>
                           <button onClick={() => setShowRouteForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl flex justify-center gap-2 hover:bg-gray-50"><Plus size={20}/> Crear Nueva Ruta</button>
                       </div>
                   )}
                </div>
             ) : (
                <div className="space-y-4">
                   {/* INFO VIAJE */}
                   <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1 block">Rumbo a:</span>
                          <h2 className="text-3xl font-black mb-1 flex items-center gap-2">{activeTrip.ruta.destino}</h2>
                          <p className="text-sm text-blue-200 mb-4 flex items-center gap-1"><MapPin size={14}/> Saliendo de: {activeTrip.ruta.origen}</p>
                          <div className="grid grid-cols-2 gap-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                              <div><p className="text-xs text-blue-200 uppercase">Ventas Viaje</p><p className="font-bold text-lg text-green-300">{formatCurrency(getSalesInCurrentTrip())}</p></div>
                              <div><p className="text-xs text-blue-200 uppercase">Gastos Viaje</p><p className="font-bold text-lg text-red-300">{formatCurrency(currentTripExpensesTotal)}</p></div>
                          </div>
                          <div className="flex gap-2 mt-4">
                             <button onClick={() => window.open(`https://waze.com/ul?q=${activeTrip.ruta.destino}`, '_blank')} className="bg-white text-blue-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg"><Navigation size={16}/> Waze</button>
                             <button onClick={endTrip} className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">Finalizar</button>
                          </div>
                      </div>
                      <Map size={140} className="absolute -bottom-6 -right-6 text-white opacity-10"/>
                   </div>
                   
                   {/* CARGA */}
                   <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Package size={14}/> Carga del Camión</h3>
                      <div className="flex gap-2 mb-3">
                         <select className="flex-1 p-2 text-sm border rounded outline-none" value={cargoItem.product} onChange={e => setCargoItem({...cargoItem, product: e.target.value})}>
                            <option value="">Producto...</option>
                            {PRODUCTOS_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                         <input type="number" placeholder="Kg" className="w-20 p-2 text-sm border rounded outline-none" value={cargoItem.weight} onChange={e => setCargoItem({...cargoItem, weight: e.target.value})}/>
                         <button onClick={addCargo} className="bg-blue-600 text-white p-2 rounded"><Plus size={18}/></button>
                      </div>
                      <div className="space-y-1">
                         {(activeTrip.cargo || []).map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-blue-50 p-2 rounded border border-blue-100">
                               <span className="font-bold text-blue-900">{item.product}</span>
                               <div className="flex items-center gap-2"><span className="text-blue-700">{item.weight} Kg</span><button onClick={() => removeCargo(item.id)} className="text-red-400"><X size={14}/></button></div>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* --- 📝 REGISTRO DE GASTO EN LÍNEA (DISEÑO AJUSTADO) --- */}
                   <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Plus size={14}/> Registrar Gasto</h3>
                      
                      {/* FILA 1: VALOR + NOTA + BOTÓN GUARDAR (+) */}
                      <div className="flex gap-2 mb-3 items-stretch">
                         <div className="relative w-32">
                            <span className="absolute left-3 top-3 text-gray-400 font-bold">$</span>
                            <input 
                                type="number" 
                                placeholder="0" 
                                className="w-full pl-6 p-3 text-xl font-black outline-none border border-gray-200 rounded-lg focus:border-blue-500 transition-colors" 
                                value={newExpense.value} 
                                onChange={e => setNewExpense({...newExpense, value: e.target.value})}
                            />
                         </div>
                         <input 
                            type="text" 
                            placeholder="Nota..." 
                            className="flex-1 p-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500" 
                            value={newExpense.note} 
                            onChange={e => setNewExpense({...newExpense, note: e.target.value})}
                         />
                         <button onClick={addExpense} className="bg-blue-600 text-white w-12 rounded-lg flex items-center justify-center shadow-md active:scale-95">
                             <Plus size={28} strokeWidth={3}/>
                         </button>
                      </div>

                      {/* FILA 2: BOTONES DE CATEGORÍA (SELECCIÓN) */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                         {EXPENSE_TYPES.map((x,i) => (
                            <button 
                                key={i} 
                                onClick={() => setNewExpense({...newExpense, type: x.l})} 
                                className={`flex flex-col items-center p-2 rounded-lg border transition-all ${newExpense.type === x.l ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'}`}
                            >
                              <x.i size={18} className="mb-1"/><span className="text-[10px] font-bold">{x.l}</span>
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* GASTOS RECIENTES */}
                   <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Últimos Gastos del Viaje</h3>
                      {tripExpenses.length === 0 ? <p className="text-xs text-gray-400 italic">No has registrado gastos aún.</p> : (
                          <div className="space-y-0 text-sm">{tripExpenses.slice(0, 5).map((expense) => (
                                  <div key={expense.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                      <div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{expense.type}</span><span className="text-xs text-gray-400">{expense.note}</span></div>
                                      <div className="text-right"><span className="font-bold text-red-500 block">-{formatCurrency(expense.value)}</span><span className="text-[10px] text-gray-300">{expense.time}</span></div>
                                  </div>
                              ))}
                          </div>
                      )}
                   </div>
                </div>
             )}
          </div>
        )}

        {/* ... (TRIP_HISTORY, HISTORY, WALLET se mantienen igual) ... */}
        {view === 'trip_history' && (
           <div className="pb-20 space-y-4 animate-in slide-in-from-right duration-200">
               <div className="bg-white p-4 rounded-xl border border-gray-200 mb-2"><h2 className="font-bold text-lg">Bitácora de Viajes</h2><p className="text-xs text-gray-500">Resumen financiero y de carga</p></div>
               {tripHistory.map(trip => {
                   const profit = (trip.totalSales || 0) - (trip.totalExpenses || 0);
                   const isExpanded = expandedTripId === trip.id;
                   
                   return (
                   <div key={trip.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 relative">
                       <button onClick={() => deleteTripFromHistory(trip.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                       <div className="flex justify-between items-start border-b border-gray-100 pb-2 pr-6">
                           <div><h3 className="font-black text-blue-900 text-lg">{trip.ruta.destino}</h3><p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> Desde {trip.ruta.origen}</p></div>
                           <div className="text-right"><p className="text-xs font-bold text-gray-400">{new Date(trip.startDate).toLocaleDateString()}</p><p className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded inline-block">Duración: {getDuration(trip.startDate, trip.endDate)}</p></div>
                       </div>
                       <div className="grid grid-cols-3 gap-2 text-sm">
                           <div className="bg-green-50 p-2 rounded text-center"><span className="block text-[10px] font-bold text-green-700 uppercase">Ventas</span><span className="font-bold text-green-800">{formatCurrency(trip.totalSales)}</span></div>
                           <div className="bg-red-50 p-2 rounded text-center"><span className="block text-[10px] font-bold text-red-700 uppercase">Gastos</span><span className="font-bold text-red-800">{formatCurrency(trip.totalExpenses)}</span></div>
                           <div className={`p-2 rounded text-center ${profit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}><span className={`block text-[10px] font-bold uppercase ${profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Ganancia</span><span className={`font-bold ${profit >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatCurrency(profit)}</span></div>
                       </div>
                       {trip.cargo && trip.cargo.length > 0 && (<div className="bg-gray-50 p-2 rounded border border-gray-100"><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Carga Transportada:</p><div className="flex flex-wrap gap-1">{trip.cargo.map((c, i) => (<span key={i} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-600">{c.product} ({c.weight}kg)</span>))}</div></div>)}
                       <div className="border-t border-gray-100 pt-2">
                           <button onClick={() => setExpandedTripId(isExpanded ? null : trip.id)} className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 font-bold hover:text-blue-600 py-1">
                               {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}{isExpanded ? "Ocultar Gastos" : "Ver Detalle de Gastos"}
                           </button>
                           {isExpanded && (
                               <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded text-xs animate-in slide-in-from-top-2">
                                   {(!trip.expensesList || trip.expensesList.length === 0) ? <p className="text-center text-gray-400 italic">No hubo gastos registrados.</p> : (
                                       trip.expensesList.map((exp, idx) => (
                                           <div key={idx} className="flex justify-between items-center border-b border-gray-200 last:border-0 pb-1">
                                               <div className="flex items-center gap-2"><span className="font-bold text-gray-700">{exp.type}</span><span className="text-gray-500 truncate max-w-[150px]">{exp.note}</span></div><span className="font-bold text-red-500">-{formatCurrency(exp.value)}</span>
                                           </div>
                                       ))
                                   )}
                               </div>
                           )}
                       </div>
                   </div>
               )})}
           </div>
        )}

        {view === 'history' && (
           <div className="pb-20 space-y-3 animate-in slide-in-from-right duration-200">
             <div className="bg-white p-4 rounded-xl border border-gray-200 mb-2"><h2 className="font-bold text-lg">Historial de Ventas</h2><p className="text-xs text-gray-500">{salesHistory.length} facturas generadas</p></div>
             {salesHistory.map(sale => (
                 <div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center cursor-pointer relative" onClick={() => {setCurrentInvoice(sale); setView('invoice')}}>
                    <div><div className="font-bold text-gray-800">{sale.client.name}</div><div className="text-xs text-gray-500">{sale.date} • Fact #{sale.invoiceNumber}</div></div>
                    <div className="flex items-center gap-3"><div className="font-black text-gray-900">{formatCurrency(sale.total)}</div><button onClick={(e) => deleteInvoice(sale.id, e)} className="p-2 text-red-300 hover:text-red-500 z-10"><Trash2 size={18}/></button></div>
                 </div>
             ))}
           </div>
        )}

        {view === 'wallet' && (
           <div className="pb-20 space-y-4 animate-in fade-in duration-300">
             <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 rounded-2xl shadow-xl text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2"><TrendingUp size={14}/> Balance General Estimado</p>
                 <h2 className="text-5xl font-black tracking-tight">{formatCurrency(totalGlobalSales - totalGlobalExpenses)}</h2>
                 <p className="text-xs text-gray-500 mt-2">Ventas Totales - Gastos Totales</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Ingresos</p><p className="text-2xl font-bold text-green-600">{formatCurrency(totalGlobalSales)}</p></div>
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Gastos</p><p className="text-2xl font-bold text-red-500">{formatCurrency(totalGlobalExpenses)}</p></div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Últimos Gastos Globales</h3>
                 {tripExpenses.length === 0 && tripHistory.length === 0 ? <p className="text-xs text-gray-400">Sin registros recientes.</p> : (
                   <div className="space-y-2">{[...tripExpenses, ...tripHistory.flatMap(t => t.expensesList || [])].sort((a,b) => b.id - a.id).slice(0, 5).map(g => (<div key={g.id} className="flex justify-between text-sm border-b border-gray-50 last:border-0 pb-2"><div><span className="font-bold text-gray-700 block">{g.type}</span><span className="text-[10px] text-gray-400">{g.note || new Date(g.id).toLocaleDateString()}</span></div><span className="font-bold text-red-500">-{formatCurrency(g.value)}</span></div>))}</div>
                 )}
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200">
                 <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 text-gray-500 font-bold text-sm w-full justify-between"><span className="flex items-center gap-2"><Settings size={16}/> Configuración</span><ArrowLeft size={16} className={`transition-transform ${showConfig ? '-rotate-90' : 'rotate-180'}`}/></button>
                 {showConfig && (<div className="bg-gray-50 p-4 rounded-lg mt-4 animate-in slide-in-from-top-2"><p className="text-xs text-gray-600 mb-2">Último consecutivo: <strong>{invoiceCounter}</strong></p><div className="flex gap-2"><input type="number" placeholder="Nuevo valor" className="p-2 border rounded w-full text-sm" value={tempCounter} onChange={e => setTempCounter(e.target.value)} /><button onClick={updateCounter} className="bg-blue-600 text-white px-4 rounded font-bold text-sm">Guardar</button></div></div>)}
                 {/* BOTÓN DE BACKUP (COPIA DE SEGURIDAD) */}
                 {showConfig && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-4 animate-in slide-in-from-top-2 space-y-4">
                        <hr className="border-gray-200"/>
                        <div>
                            <p className="text-xs text-gray-600 mb-2 font-bold">Seguridad de Datos</p>
                            <button 
                                onClick={() => {
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
                                    const downloadAnchorNode = document.createElement('a');
                                    downloadAnchorNode.setAttribute("href", dataStr);
                                    downloadAnchorNode.setAttribute("download", "visceras_jr_backup_" + new Date().toLocaleDateString().replace(/\//g, "-") + ".json");
                                    document.body.appendChild(downloadAnchorNode);
                                    downloadAnchorNode.click();
                                    downloadAnchorNode.remove();
                                }}
                                className="w-full bg-gray-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold active:scale-95"
                            >
                                <Save size={16}/> DESCARGAR COPIA DE SEGURIDAD
                            </button>
                            <p className="text-[10px] text-gray-400 mt-1 text-center">Guarda este archivo por si se borra el celular.</p>
                        </div>
                    </div>
                )}
             </div>
           </div>
        )}

        {/* VISTA: FACTURA */}
        {view === 'invoice' && currentInvoice && (
           <div className="fixed inset-0 bg-white z-50 flex flex-col h-full print:absolute print:inset-0 print:h-auto print:w-full print:z-[100] print:bg-white print:overflow-visible">
             
             {/* HEADER FIJO EN PANTALLA (Se oculta al imprimir) */}
             <div className="flex-none bg-white p-4 shadow-sm flex justify-between items-center border-b print:hidden">
                 <button onClick={() => setView('history')} className="flex items-center gap-1 font-bold text-gray-600"><ArrowLeft size={20}/> Volver</button>
                 <span className="font-bold text-gray-800">Vista Previa</span>
                 <div className="w-8"></div>
             </div>
             
             {/* CUERPO SCROLLABLE (FACTURA) */}
             <div className="flex-1 overflow-y-auto p-2 bg-gray-100 print:overflow-visible print:h-auto print:bg-white print:p-0 print:block">
                 
                 <div className="bg-white shadow-lg p-4 md:p-8 mx-auto max-w-2xl print:shadow-none print:w-full print:max-w-none print:p-0 print:m-0 relative overflow-hidden" style={{fontFamily: 'Arial, sans-serif'}}>
                   
                   {/* 💧 MARCA DE AGUA (FONDO) */}
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{zIndex: 0}}>
                      <img src="/logo-jr.png" alt="watermark" className="w-[500px] opacity-10" onError={(e) => e.target.style.display='none'}/>
                   </div>

                   {/* CONTENIDO PRINCIPAL (Encima de la marca de agua) */}
                   <div className="relative z-10">
                        {/* ENCABEZADO */}
                        <div className="flex justify-between items-start border-b-2 border-blue-900 pb-2 mb-2">
                            <div className="w-20 h-20 md:w-24 md:h-24 relative mr-2">
                                <img src="/logo-jr.png" alt="JR" className="w-full h-full object-contain" onError={(e) => {e.target.style.display='none';}}/>
                            </div>
                            <div className="flex-1 text-center">
                                <h1 className="text-xl md:text-2xl font-black text-blue-900 uppercase leading-none tracking-tighter">EXPENDIO DE VÍSCERAS JR.</h1>
                                <h2 className="text-xs md:text-sm font-bold text-gray-800 mt-1 uppercase">ROMULO JIMENEZ ROA</h2>
                                <p className="text-xs md:text-sm font-bold text-gray-700">Nit: 79.989.335 - 4</p>
                                <p className="text-[10px] md:text-xs text-gray-600 font-bold">No Responsable IVA</p>
                                <p className="text-[8px] md:text-[10px] text-gray-600 mt-1">Cra 22 No. 25B - 17 Sur * Cels: 312 300 8386 / 317 218 4533 Neiva - Huila</p>
                            </div>
                        </div>

                        {/* CAJA DE DATOS (REDISEÑADA V10.4) */}
                        <div className="border border-blue-900 mb-2 flex flex-col text-[10px] md:text-xs">
                            
                            {/* FILA SUPERIOR: FECHAS Y NUMERO */}
                            <div className="flex border-b border-blue-900">
                                <div className="border-r border-blue-900 p-1 flex-1">
                                    <div className="bg-blue-900 text-white font-bold px-1 text-center text-[8px] print:text-black print:bg-transparent print:border-b print:border-gray-300">FECHA EMISIÓN</div>
                                    <div className="text-center font-bold py-1">{currentInvoice.date} <span className="text-[8px] font-normal text-gray-500">{currentInvoice.time}</span></div>
                                </div>
                                <div className="border-r border-blue-900 p-1 flex-1">
                                    <div className="bg-blue-900 text-white font-bold px-1 text-center text-[8px] print:text-black print:bg-transparent print:border-b print:border-gray-300">FECHA VENCIM.</div>
                                    <div className="text-center font-bold py-1">{currentInvoice.dueDate || '-'}</div>
                                </div>
                                <div className="p-1 flex-[1.5] text-center flex flex-col justify-center">
                                    <div className="font-bold text-blue-900 text-[10px]">FACTURA DE VENTA</div>
                                    <div className="text-xl md:text-2xl font-black text-red-600 leading-none">{currentInvoice.invoiceNumber}</div>
                                </div>
                            </div>

                            {/* FILA INFERIOR: CONDICION Y MEDIO PAGO (NUEVO) */}
                            <div className="flex">
                                {/* COLUMNA 1: FORMA DE PAGO (CONTADO/CREDITO) */}
                                <div className="border-r border-blue-900 p-1 flex-1">
                                    <div className="font-bold text-blue-900 text-[8px] mb-1">CONDICIÓN DE PAGO:</div>
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px] font-bold leading-none">{currentInvoice.paymentCondition === 'Contado' && 'X'}</div>
                                            <span>Contado</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px] font-bold leading-none">{currentInvoice.paymentCondition === 'Credito' && 'X'}</div>
                                            <span>Crédito</span>
                                        </div>
                                    </div>
                                </div>

                                {/* COLUMNA 2: MEDIO DE PAGO (EFECTIVO/CONSIGNACION) */}
                                <div className="p-1 flex-[1.5]">
                                    <div className="font-bold text-blue-900 text-[8px] mb-1">MEDIO DE PAGO:</div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-0 px-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px] font-bold leading-none">{currentInvoice.paymentMethod === 'Efectivo' && 'X'}</div>
                                            <span>Efectivo</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px] font-bold leading-none">{currentInvoice.paymentMethod === 'Consignacion' && 'X'}</div>
                                            <span>Consignación</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 border border-black flex items-center justify-center text-[8px] font-bold leading-none">{currentInvoice.paymentMethod === 'Otro' && 'X'}</div>
                                            <span>Otro</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DATOS CLIENTE */}
                        <div className="mb-4 text-[10px] md:text-xs font-bold text-gray-800 leading-relaxed border-b pb-2">
                            <div className="flex"><span className="w-16 md:w-20">Señor(es):</span><span className="flex-1 uppercase ml-1">{currentInvoice.client.name}</span></div>
                            <div className="flex mt-1"><span className="w-16 md:w-20">C.C. o Nit:</span><span className="flex-1 ml-1">{currentInvoice.client.id}</span><span className="w-8">Tel:</span><span className="w-24">{currentInvoice.client.phone}</span></div>
                            <div className="flex mt-1"><span className="w-16 md:w-20">Dirección:</span><span className="flex-1 ml-1">{currentInvoice.client.address}</span></div>
                        </div>

                        {/* TABLA DE PRODUCTOS */}
                        <div className="border border-blue-900 mb-2 min-h-[250px] relative">
                            <div className="flex bg-blue-900 text-white text-[10px] md:text-xs font-bold text-center print:text-black print:bg-gray-100 print:border-b print:border-black">
                                <div className="w-10 md:w-12 py-1 border-r border-white print:border-black">CANT.</div>
                                <div className="flex-1 py-1 border-r border-white print:border-black">DETALLE</div>
                                <div className="w-20 md:w-24 py-1 border-r border-white print:border-black">V. UNIT.</div>
                                <div className="w-20 md:w-24 py-1">VR. TOTAL</div>
                            </div>
                            {currentInvoice.items.map((item, i) => (
                                <div key={i} className="flex text-[10px] md:text-xs border-b border-gray-200 print:border-gray-300">
                                    <div className="w-10 md:w-12 py-1 text-center border-r border-blue-900 print:border-gray-300">{item.weight}</div>
                                    <div className="flex-1 py-1 px-1 border-r border-blue-900 uppercase truncate print:border-gray-300">{item.product}</div>
                                    <div className="w-20 md:w-24 py-1 text-right px-1 border-r border-blue-900 print:border-gray-300">{formatCurrency(item.price)}</div>
                                    <div className="w-20 md:w-24 py-1 text-right px-1 font-bold">{formatCurrency(item.total)}</div>
                                </div>
                            ))}
                            
                            <div className="absolute bottom-0 left-0 right-0 border-t-2 border-blue-900 flex text-xs md:text-sm font-bold print:relative print:mt-4 print:border-t-2 print:border-black">
                                <div className="flex-1 p-1 text-right pr-2">TOTAL $</div>
                                <div className="w-20 md:w-24 p-1 text-right border-l border-blue-900 bg-gray-100 print:border-black print:bg-transparent">{formatCurrency(currentInvoice.total)}</div>
                            </div>
                        </div>

                        {/* --- 🚚 PÁRRAFO LEGAL DE TRANSPORTE (CONDICIONAL) --- */}
                        {/* Solo aparece si currentInvoice.transport.destino tiene algo escrito */}
                        {currentInvoice.transport && currentInvoice.transport.destino && (
                            <div className="mb-8 text-[9px] md:text-[10px] text-justify leading-snug text-gray-700 bg-gray-50 border border-gray-200 p-2 rounded print:border-none print:bg-transparent print:p-0">
                                Para <strong>{currentInvoice.client.name}</strong> con destino a <strong>{currentInvoice.transport.destino}</strong>, 
                                es transportado en el vehículo con placas <strong>{currentInvoice.transport.placa || '___'}</strong> color <strong>{currentInvoice.transport.color || '___'}</strong>, 
                                es conducido por el señor <strong>{currentInvoice.transport.conductor || '___'}</strong>, 
                                identificado con cédula de ciudadanía Nº <strong>{currentInvoice.transport.cedulaConductor || '___'}</strong>.
                            </div>
                        )}

                        {/* PIE Y FIRMAS */}
                        <div className="text-[8px] md:text-[10px] text-justify leading-tight text-gray-600 mb-8 px-2">
                            La presente Factura de Venta es un título valor de conformidad a la Ley 1231 del 17 de 2008 y demás normas pertinentes del C.C.
                        </div>
                        
                        <div className="flex justify-between mt-12 px-4 text-[10px] md:text-xs font-bold text-gray-800 break-inside-avoid">
                            <div className="text-center"><div className="w-32 md:w-48 border-t border-black mb-1"></div>Aceptada</div>
                            <div className="text-center"><div className="w-32 md:w-48 border-t border-black mb-1"></div>Vendedor</div>
                        </div>
                   </div>
                 </div>
             </div>

             {/* FOOTER FIJO CON BOTONES (Se oculta al imprimir) */}
             <div className="flex-none bg-white p-4 border-t border-gray-200 flex flex-col gap-3 print:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
                 <button onClick={() => {
                     let msg = `*VÍSCERAS JR* 🐮\nFactura #${currentInvoice.invoiceNumber}\nCliente: ${currentInvoice.client.name}\nTOTAL: ${formatCurrency(currentInvoice.total)}\n(Ver PDF adjunto para detalles)`;
                     window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                 }} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2 shadow-sm active:scale-95 transition-transform"><Share2 size={20}/> Compartir WhatsApp</button>
                 
                 <button onClick={handlePrint} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2 shadow-sm active:scale-95 transition-transform"><Printer size={20}/> Imprimir / PDF</button>
             </div>
           </div>
        )}

      </main>
    </div>
  );
};

export default App;
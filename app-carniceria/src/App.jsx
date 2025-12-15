import React, { useState, useEffect } from 'react';
import { 
  Save, Share2, Plus, Trash2, History, FileText, ArrowLeft, 
  Truck, CheckCircle, Calculator, MapPin, Navigation, 
  DollarSign, Coffee, Wrench, Fuel, Bed, AlertTriangle, Printer, 
  Users, UserPlus, Edit, UserCog, X, Search, Settings, Map, TrendingUp, Package, Calendar, Clock, MapPinned, PauseCircle, PlayCircle, CreditCard, Banknote, ChevronDown, ChevronUp
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
  "Bofe Cerdo", "corazón de Cerdo", "Carne", "Pata de Res", "Buches", "Tripita", "Entresijos"
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

  // --- NUEVO: ESTADO PARA DATOS DE TRANSPORTE POR DEFECTO ---
  // Esto recuerda la placa y el conductor para no escribirlo siempre
  const [defaultTransport, setDefaultTransport] = useLocalStorage('meatAppTransportDefault', {
    conductor: '', cc: '', placa: ''
  });

  // ESTADOS DE TRABAJO
  const [cart, setCart] = useLocalStorage('meatAppCurrentCartV22', []); 
  const [client, setClient] = useLocalStorage('meatAppCurrentClientV22', { name: '', id: '', address: '', phone: '' }); 
  
  // --- NUEVO: Estado para los datos de transporte de la venta actual ---
  const [transportData, setTransportData] = useState({ 
    destino: '', 
    conductor: defaultTransport.conductor || '', 
    cc: defaultTransport.cc || '', 
    placa: defaultTransport.placa || '' 
  });

  const [pendingSales, setPendingSales] = useLocalStorage('meatAppPendingSalesV22', []);
  const [paymentMethod, setPaymentMethod] = useState('Contado');

  // ESTADOS TEMPORALES
  const [editingClient, setEditingClient] = useState(null);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [expandedTripId, setExpandedTripId] = useState(null);
  
  // Inputs
  const [selectedProduct, setSelectedProduct] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [newExpense, setNewExpense] = useState({ type: '', value: '', note: '' });
  const [newRoute, setNewRoute] = useState({ nombre: '', origen: '', destino: '', distancia: '' });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [cargoItem, setCargoItem] = useState({ product: '', weight: '' });
  const [showConfig, setShowConfig] = useState(false);
  const [tempCounter, setTempCounter] = useState('');
  const [showTransportForm, setShowTransportForm] = useState(false); // Para mostrar/ocultar formulario transporte

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

    // --- NUEVO: VALIDACIÓN LEGAL PARA POLICÍA ---
    // Si faltan datos importantes, preguntamos si está seguro
    if (!transportData.destino || !transportData.conductor || !transportData.placa) {
        if(!window.confirm("⚠️ Faltan datos de transporte (Placa/Conductor/Destino). ¿Desea facturar así? La policía podría molestar.")) {
            setShowTransportForm(true); // Abrimos el formulario automáticamente
            return;
        }
    }

    // Guardamos conductor y placa como "predeterminados" para no escribirlos la próxima vez
    setDefaultTransport({
        conductor: transportData.conductor,
        cc: transportData.cc,
        placa: transportData.placa
    });

    const nextInvoiceNumber = parseInt(invoiceCounter) + 1;
    const now = new Date();
    
    let formattedDueDate = ""; 
    if (paymentMethod === 'Credito') {
        const dueDateObj = new Date(now);
        dueDateObj.setDate(dueDateObj.getDate() + 30); 
        formattedDueDate = dueDateObj.toLocaleDateString('es-CO');
    }

    const saleData = {
      id: Date.now(),
      timestamp: Date.now(),
      date: now.toLocaleDateString('es-CO'),
      dueDate: formattedDueDate,
      time: now.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit', hour12: true}),
      paymentMethod: paymentMethod,
      client: { ...client },
      transport: { ...transportData }, // AQUÍ GUARDAMOS LOS DATOS DEL CAMIÓN
      items: [...cart],
      total: calculateTotalSale(),
      invoiceNumber: `0${nextInvoiceNumber}`
    };

    setSalesHistory([saleData, ...salesHistory]);
    setInvoiceCounter(nextInvoiceNumber);
    setCurrentInvoice(saleData);
    
    setCart([]);
    setClient({ name: '', id: '', address: '', phone: '' });
    
    // Limpiamos solo el destino, mantenemos placa y conductor por si es el mismo viaje
    setTransportData(prev => ({...prev, destino: ''})); 
    
    setPaymentMethod('Contado'); 
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
    if (found) {
        setClient(found);
        // Si el cliente tiene dirección guardada, sugerirla como destino del viaje
        if(found.address && !transportData.destino) {
            setTransportData(prev => ({...prev, destino: found.address}));
        }
    } else {
        setClient({ name: '', id: '', address: '', phone: '' });
    }
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
  
  const addExpense = (type) => { 
      if (!newExpense.value) return alert("Ingresa valor"); 
      setTripExpenses([{ id: Date.now(), type, value: parseFloat(newExpense.value), note: newExpense.note, time: new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'}) }, ...tripExpenses]); 
      setNewExpense({ type: '', value: '', note: '' }); 
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

  // --- FUNCIÓN DE IMPRESIÓN ---
  const handlePrint = () => {
      // Retraso para asegurar renderizado
      setTimeout(() => {
          window.print();
      }, 100);
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
            {/* CONFIGURACIÓN OCULTA */}
            <div className="col-span-2 flex justify-center mt-4">
                <button onClick={() => setShowConfig(!showConfig)} className="text-gray-300 p-2"><Settings size={16}/></button>
            </div>
            {showConfig && (
                <div className="col-span-2 bg-gray-200 p-4 rounded-lg text-center">
                    <p className="text-xs mb-2 font-bold">Ajustar Consecutivo Factura</p>
                    <input type="number" placeholder={invoiceCounter} onChange={(e) => setTempCounter(e.target.value)} className="p-2 rounded border w-24 text-center mr-2"/>
                    <button onClick={updateCounter} className="bg-blue-600 text-white px-4 py-2 rounded text-xs">Guardar</button>
                </div>
            )}
          </div>
        )}

        {/* VISTA: VENDER (POS) CON DATOS DE TRANSPORTE */}
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

            {/* SECCIÓN CLIENTE */}
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
                <input className="flex-1 p-2 border border-gray-300 rounded outline-none font-bold text-gray-700" placeholder="Nombre *" value={client.name} onChange={e => setClient({...client, name: e.target.value})} />
                <button onClick={saveClientFromPOS} className="bg-gray-100 px-3 rounded text-gray-500 hover:text-blue-600 border border-gray-200"><Save size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <input type="number" placeholder="NIT / CC" className="p-2 border border-gray-300 rounded outline-none text-sm" value={client.id} onChange={e => setClient({...client, id: e.target.value})}/>
                 <input type="tel" placeholder="Celular" className="p-2 border border-gray-300 rounded outline-none text-sm" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})}/>
              </div>
            </div>

            {/* --- NUEVO: DATOS DE TRANSPORTE Y DESPACHO --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div 
                    onClick={() => setShowTransportForm(!showTransportForm)}
                    className={`p-3 flex justify-between items-center cursor-pointer ${showTransportForm ? 'bg-blue-50 border-b border-blue-100' : 'bg-white'}`}
                >
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Truck size={14}/> Datos de Despacho (Legal)
                    </h3>
                    {showTransportForm ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                </div>
                
                {showTransportForm && (
                    <div className="p-4 space-y-3 bg-gray-50 animate-in slide-in-from-top duration-200">
                         <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Lugar de Destino (Mercancía)</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded bg-white text-sm" 
                                placeholder="Ej: Supermercado El Centro, Bogotá"
                                value={transportData.destino}
                                onChange={e => setTransportData({...transportData, destino: e.target.value})}
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Placa Vehículo</label>
                                <input 
                                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm uppercase" 
                                    placeholder="AAA-123"
                                    value={transportData.placa}
                                    onChange={e => setTransportData({...transportData, placa: e.target.value.toUpperCase()})}
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">C.C. Conductor</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm" 
                                    placeholder="Cedula"
                                    value={transportData.cc}
                                    onChange={e => setTransportData({...transportData, cc: e.target.value})}
                                />
                             </div>
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre Conductor</label>
                            <input 
                                className="w-full p-2 border border-gray-300 rounded bg-white text-sm" 
                                placeholder="Nombre completo"
                                value={transportData.conductor}
                                onChange={e => setTransportData({...transportData, conductor: e.target.value})}
                            />
                         </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN PRODUCTOS */}
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
                
                {/* SELECTOR DE PAGO */}
                <div className="bg-gray-800 p-2 rounded-lg mb-4 flex gap-2">
                    <button onClick={() => setPaymentMethod('Contado')} className={`flex-1 py-2 rounded font-bold text-xs flex items-center justify-center gap-2 ${paymentMethod === 'Contado' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                        <Banknote size={16}/> CONTADO
                    </button>
                    <button onClick={() => setPaymentMethod('Credito')} className={`flex-1 py-2 rounded font-bold text-xs flex items-center justify-center gap-2 ${paymentMethod === 'Credito' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                        <CreditCard size={16}/> CRÉDITO (30 DÍAS)
                    </button>
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

        {/* VISTA: CLIENTES */}
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

        {/* VISTA: TRIP (VIAJE) */}
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
                   <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1 block">Rumbo a:</span>
                          <h2 className="text-3xl font-black mb-1 flex items-center gap-2">{activeTrip.ruta.destino}</h2>
                          <p className="text-sm text-blue-200 mb-4 flex items-center gap-1"><MapPin size={14}/> Saliendo de: {activeTrip.ruta.origen}</p>
                          <div className="grid grid-cols-2 gap-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                              <div><p className="text-xs text-blue-200 uppercase">Ventas Viaje</p><p className="font-bold text-lg text-green-300">{formatCurrency(getSalesInCurrentTrip())}</p></div>
                              <div><p className="text-xs text-blue-200 uppercase">Gastos Viaje</p><p className="font-bold text-lg text-red-300">{formatCurrency(tripExpenses.reduce((acc, i) => acc + parseFloat(i.value), 0))}</p></div>
                          </div>
                      </div>
                      <Map className="absolute -bottom-4 -right-4 text-white/5 w-40 h-40"/>
                   </div>

                   {/* CARGA / INVENTARIO CAMIÓN */}
                   <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Package size={18}/> Inventario Carga</h3>
                      <div className="flex gap-2 mb-3">
                         <select className="p-2 border rounded text-xs flex-1 bg-white" value={cargoItem.product} onChange={e => setCargoItem({...cargoItem, product: e.target.value})}>
                            <option value="">Producto...</option>
                            {PRODUCTOS_COMUNES.map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                         <input type="number" className="w-20 p-2 border rounded text-xs" placeholder="Kg" value={cargoItem.weight} onChange={e => setCargoItem({...cargoItem, weight: e.target.value})}/>
                         <button onClick={addCargo} className="bg-blue-600 text-white p-2 rounded"><Plus size={16}/></button>
                      </div>
                      <div className="space-y-1">
                          {activeTrip.cargo && activeTrip.cargo.map(c => (
                              <div key={c.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                  <span>{c.product} ({c.weight} kg)</span>
                                  <button onClick={() => removeCargo(c.id)} className="text-red-400"><X size={14}/></button>
                              </div>
                          ))}
                          {(!activeTrip.cargo || activeTrip.cargo.length === 0) && <p className="text-xs text-gray-400 italic">No hay carga registrada.</p>}
                      </div>
                   </div>

                   {/* GASTOS */}
                   <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp size={18}/> Registrar Gasto</h3>
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                         {['Peaje', 'ACPM', 'Comida', 'Hotel', 'Mecánica', 'Otro'].map(t => (
                            <button key={t} onClick={() => setNewExpense({...newExpense, type: t})} className={`px-3 py-1 text-xs rounded-full border ${newExpense.type === t ? 'bg-red-500 text-white border-red-500' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{t}</button>
                         ))}
                      </div>
                      <div className="flex gap-2 mb-3">
                         <input type="number" className="flex-1 p-2 border rounded outline-none" placeholder="Valor ($)" value={newExpense.value} onChange={e => setNewExpense({...newExpense, value: e.target.value})}/>
                         <input className="flex-1 p-2 border rounded outline-none" placeholder="Nota (Opcional)" value={newExpense.note} onChange={e => setNewExpense({...newExpense, note: e.target.value})}/>
                         <button onClick={() => addExpense(newExpense.type || 'Otro')} className="bg-red-500 text-white p-2 rounded shadow-lg"><Plus size={20}/></button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                         {tripExpenses.map(e => (
                             <div key={e.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                 <div className="flex items-center gap-2">
                                     <div className="bg-white p-1 rounded text-red-500">
                                         {e.type === 'ACPM' && <Fuel size={14}/>}
                                         {e.type === 'Comida' && <Coffee size={14}/>}
                                         {e.type === 'Peaje' && <AlertTriangle size={14}/>}
                                         {e.type === 'Mecánica' && <Wrench size={14}/>}
                                         {e.type === 'Hotel' && <Bed size={14}/>}
                                         {e.type === 'Otro' && <DollarSign size={14}/>}
                                     </div>
                                     <div><p className="font-bold">{e.type}</p><p className="text-[10px] text-gray-400">{e.note}</p></div>
                                 </div>
                                 <div className="text-right"><p className="font-bold">{formatCurrency(e.value)}</p><p className="text-[10px] text-gray-400">{e.time}</p></div>
                             </div>
                         ))}
                      </div>
                   </div>

                   <button onClick={endTrip} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2"><CheckCircle/> Finalizar Viaje</button>
                   
                   {/* INTEGRACIÓN WAZE */}
                   <a href={`https://waze.com/ul?q=${activeTrip.ruta.destino}`} target="_blank" className="block w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl border border-blue-100 flex justify-center items-center gap-2"><Navigation size={18}/> Abrir Waze</a>
                </div>
             )}
          </div>
        )}

        {/* VISTA: HISTORY (FACTURAS) */}
        {view === 'history' && (
           <div className="pb-20 animate-in slide-in-from-right duration-200">
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y">
                   {salesHistory.length === 0 ? <p className="p-8 text-center text-gray-400">Sin historial</p> : salesHistory.map(sale => (
                       <div key={sale.id} onClick={() => {setCurrentInvoice(sale); setView('invoice');}} className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                           <div>
                               <p className="font-bold text-gray-800">#{sale.invoiceNumber} - {sale.client.name}</p>
                               <p className="text-xs text-gray-500">{sale.date} • {sale.items.length} items</p>
                           </div>
                           <div className="text-right">
                               <p className="font-bold text-blue-600">{formatCurrency(sale.total)}</p>
                               <button onClick={(e) => deleteInvoice(sale.id, e)} className="text-red-300 p-2 -mr-2"><Trash2 size={16}/></button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* VISTA: TRIP HISTORY (BITÁCORA) */}
        {view === 'trip_history' && (
           <div className="pb-20 animate-in slide-in-from-right duration-200">
               <div className="space-y-4">
                   {tripHistory.length === 0 ? <p className="p-8 text-center text-gray-400">No hay viajes finalizados.</p> : tripHistory.map(trip => (
                       <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                           <div onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)} className="p-4 cursor-pointer hover:bg-gray-50">
                               <div className="flex justify-between items-start mb-2">
                                   <div><h3 className="font-bold text-gray-800 flex items-center gap-2">{trip.ruta.nombre}</h3><p className="text-xs text-gray-500">{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</p></div>
                                   <div className={`text-xs font-bold px-2 py-1 rounded ${((trip.totalSales - trip.totalExpenses) > 0) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                       {((trip.totalSales - trip.totalExpenses) > 0) ? '+ Ganancia' : '- Pérdida'}
                                   </div>
                               </div>
                               <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2 mt-2">
                                   <div><p className="text-gray-400">Ventas</p><p className="font-bold">{formatCurrency(trip.totalSales)}</p></div>
                                   <div><p className="text-gray-400">Gastos</p><p className="font-bold text-red-500">{formatCurrency(trip.totalExpenses)}</p></div>
                                   <div><p className="text-gray-400">Neto</p><p className="font-bold text-green-600">{formatCurrency(trip.totalSales - trip.totalExpenses)}</p></div>
                               </div>
                           </div>
                           {expandedTripId === trip.id && (
                               <div className="bg-gray-50 p-4 border-t border-gray-100 text-xs space-y-2 animate-in slide-in-from-top duration-200">
                                   <p className="font-bold text-gray-500 uppercase mb-2">Detalle de Gastos</p>
                                   {trip.expensesList.length === 0 ? <p className="italic text-gray-400">Sin gastos registrados.</p> : trip.expensesList.map(e => (
                                       <div key={e.id} className="flex justify-between border-b border-gray-200 pb-1"><span>{e.type} <span className="text-gray-400">({e.note})</span></span><span>{formatCurrency(e.value)}</span></div>
                                   ))}
                                   <div className="pt-2 text-center"><button onClick={() => deleteTripFromHistory(trip.id)} className="text-red-500 font-bold flex items-center justify-center gap-1 w-full"><Trash2 size={14}/> Eliminar Registro</button></div>
                               </div>
                           )}
                       </div>
                   ))}
               </div>
           </div>
        )}

        {/* VISTA: WALLET (GANANCIAS) */}
        {view === 'wallet' && (
           <div className="pb-20 animate-in slide-in-from-right duration-200">
               <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg mb-6">
                   <p className="text-sm opacity-80 mb-1">Ganancia Real (Global)</p>
                   <h2 className="text-4xl font-black tracking-tight">{formatCurrency(totalGlobalSales - totalGlobalExpenses)}</h2>
                   <div className="mt-4 flex gap-4 text-xs opacity-90">
                       <div><p>Ventas Totales</p><p className="font-bold text-lg">{formatCurrency(totalGlobalSales)}</p></div>
                       <div className="w-px bg-white/30"></div>
                       <div><p>Gastos Totales</p><p className="font-bold text-lg">{formatCurrency(totalGlobalExpenses)}</p></div>
                   </div>
               </div>
               
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                   <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> Estadísticas Rápidas</h3>
                   <div className="space-y-4">
                       <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Viajes Realizados</span><span className="font-bold">{tripHistory.length}</span></div>
                       <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Facturas Generadas</span><span className="font-bold">{salesHistory.length}</span></div>
                       <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Promedio Venta</span><span className="font-bold">{salesHistory.length > 0 ? formatCurrency(totalGlobalSales / salesHistory.length) : '$0'}</span></div>
                   </div>
               </div>
           </div>
        )}

        {/* --- VISTA: FACTURA FINAL (CON MEJORAS LEGALES Y FIX MEMORIA) --- */}
        {view === 'invoice' && currentInvoice && (
          <div className="bg-white min-h-screen text-xs relative">
            
            {/* Botones de acción (No se imprimen) */}
            <div className="print:hidden p-4 bg-gray-100 flex gap-2 flex-col fixed bottom-0 w-full left-0 z-50 border-t border-gray-300">
               <button onClick={handlePrint} className="bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg text-lg flex justify-center items-center gap-2"><Printer/> IMPRIMIR FACTURA</button>
               <div className="flex gap-2">
                  <button onClick={() => setView('home')} className="flex-1 bg-white border border-gray-300 py-3 rounded-lg font-bold text-gray-600">Volver al Menú</button>
                  {/* BOTÓN DE EMERGENCIA SI SE TRABA */}
                  <button onClick={() => window.location.reload()} className="px-4 bg-red-100 text-red-600 rounded-lg font-bold border border-red-200 text-[10px] text-center">Limpiar<br/>Memoria</button>
               </div>
            </div>

            {/* DISEÑO FACTURA IMPRESA */}
            <div className="p-4 sm:p-8 max-w-[80mm] mx-auto print:max-w-none print:w-full print:p-0">
               {/* ENCABEZADO */}
               <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                  <h1 className="text-2xl font-black italic tracking-tighter">EXPENDIO VÍSCERAS JR</h1>
                  <p className="text-[10px] uppercase">Régimen Simplificado</p>
                  <p className="text-[10px]">NIT: 12.345.678-9 (Ejemplo)</p>
                  <p className="text-[10px]">Calle 123 # 45-67, Neiva</p>
                  <p className="text-[10px]">Tel: 300 123 4567</p>
               </div>

               {/* INFO GENERAL */}
               <div className="flex justify-between mb-4 text-[10px] font-bold">
                  <div>
                    <p>FACTURA DE VENTA</p>
                    <p className="text-lg">#{currentInvoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p>{currentInvoice.date}</p>
                    <p>{currentInvoice.time}</p>
                    <p className={`mt-1 ${currentInvoice.paymentMethod === 'Credito' ? 'text-black font-black border border-black px-1' : ''}`}>{currentInvoice.paymentMethod.toUpperCase()}</p>
                  </div>
               </div>

               {/* --- NUEVO: GRID DE DATOS CLIENTE Y TRANSPORTE --- */}
               <div className="border-2 border-black rounded mb-4 overflow-hidden">
                  <div className="grid grid-cols-2 text-[9px]">
                      {/* COLUMNA CLIENTE */}
                      <div className="p-2 border-r border-black">
                         <p className="font-bold bg-gray-200 -mx-2 -mt-2 px-2 mb-1">DATOS CLIENTE</p>
                         <p className="font-bold uppercase truncate">{currentInvoice.client.name}</p>
                         <p>NIT/CC: {currentInvoice.client.id || 'N/A'}</p>
                         <p>Tel: {currentInvoice.client.phone || 'N/A'}</p>
                         <p className="truncate">{currentInvoice.client.address}</p>
                      </div>
                      
                      {/* COLUMNA TRANSPORTE (LEGAL) */}
                      <div className="p-2">
                         <p className="font-bold bg-gray-200 -mx-2 -mt-2 px-2 mb-1">TRANSPORTADOR</p>
                         <p className="truncate"><span className="font-bold">Cond:</span> {currentInvoice.transport?.conductor || 'Propio'}</p>
                         <p><span className="font-bold">C.C:</span> {currentInvoice.transport?.cc || '-'}</p>
                         <p className="font-bold text-xs mt-1 border border-black inline-block px-1">PLACA: {currentInvoice.transport?.placa || 'N/A'}</p>
                         <p className="mt-1 leading-tight"><span className="font-bold">Destino:</span> {currentInvoice.transport?.destino || 'Local'}</p>
                      </div>
                  </div>
               </div>

               {/* TABLA DE PRODUCTOS */}
               <table className="w-full text-left text-[10px] mb-4">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-1">Cant/Desc</th>
                      <th className="text-right py-1">V.Unit</th>
                      <th className="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium">
                    {currentInvoice.items.map((item) => (
                      <tr key={item.id} className="border-b border-dashed border-gray-200">
                        <td className="py-1">
                          <div className="font-bold">{item.product}</div>
                          <div className="text-[9px] text-gray-500">{item.weight} kg</div>
                        </td>
                        <td className="text-right py-1">{formatCurrency(item.price)}</td>
                        <td className="text-right py-1">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>

               {/* TOTALES */}
               <div className="flex justify-end mb-8">
                  <div className="text-right w-1/2">
                    <div className="flex justify-between py-1"><span className="text-gray-500">Subtotal</span> <span>{formatCurrency(currentInvoice.total)}</span></div>
                    <div className="flex justify-between py-1 border-b border-black"><span className="text-gray-500">Descuento</span> <span>$0</span></div>
                    <div className="flex justify-between py-2 text-lg font-black"><span className="">TOTAL</span> <span>{formatCurrency(currentInvoice.total)}</span></div>
                    {currentInvoice.paymentMethod === 'Credito' && (
                        <div className="text-[9px] font-bold mt-2 text-center border border-black p-1">
                            VENCE: {currentInvoice.dueDate}
                        </div>
                    )}
                  </div>
               </div>
               
               {/* PIE DE PÁGINA */}
               <div className="text-center text-[9px] text-gray-500 mt-8 pb-20 print:pb-0">
                  <p>*** Gracias por su compra ***</p>
                  <p>Sistema desarrollado por Vísceras JR</p>
                  <p>Impreso: {new Date().toLocaleString()}</p>
               </div>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
};

export default App;
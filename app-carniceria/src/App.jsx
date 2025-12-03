import React, { useState, useEffect } from 'react';
import { 
  Save, Share2, Plus, Trash2, History, FileText, ArrowLeft, 
  Truck, CheckCircle, Calculator, MapPin, Navigation, 
  DollarSign, Coffee, Wrench, Fuel, Bed, AlertTriangle, Printer, 
  Users, UserPlus, Edit, UserCog, X, Search, Settings, Map, TrendingUp, Package, Calendar, Clock, MapPinned
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
  "Hígado", "Mondongo", "Bofe", "Corazón", "Ubre", "Malaya", 
  "Chocosuela", "Hueso", "Orejas", "Pezuña", "Tocino", 
  "Bofe Cerdo", "Carne", "Pata de Res", "Buches", "Tripita", "Entresijos"
];

const App = () => {
  // --- ESTADOS ---
  const [view, setView] = useState('home'); 
  const [cart, setCart] = useState([]);
  
  // Datos Persistentes
  const [salesHistory, setSalesHistory] = useLocalStorage('meatAppHistoryV10', []);
  const [tripHistory, setTripHistory] = useLocalStorage('meatAppTripHistoryV10', []); 
  const [savedClients, setSavedClients] = useLocalStorage('meatAppClientsV10', []);
  const [invoiceCounter, setInvoiceCounter] = useLocalStorage('meatAppCounterV10', 60); // Inicia en 60 -> Primera será 61
  const [activeTrip, setActiveTrip] = useLocalStorage('meatAppTripV10', null);
  const [tripExpenses, setTripExpenses] = useLocalStorage('meatAppExpensesV10', []);
  const [savedRoutes, setSavedRoutes] = useLocalStorage('meatAppRoutesV10', [
    { id: 1, nombre: "Ruta Habitual", origen: "Neiva", destino: "Bogotá", distancia: 300 },
    { id: 2, nombre: "Costa", origen: "Bogotá", destino: "Cartagena", distancia: 1050 }
  ]);

  // Formularios
  const [client, setClient] = useState({ name: '', id: '', address: '', phone: '' });
  const [editingClient, setEditingClient] = useState(null);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  
  // Venta
  const [selectedProduct, setSelectedProduct] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');

  // Gasto
  const [newExpense, setNewExpense] = useState({ type: '', value: '', note: '' });

  // Rutas y Carga
  const [newRoute, setNewRoute] = useState({ nombre: '', origen: '', destino: '', distancia: '' });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [cargoItem, setCargoItem] = useState({ product: '', weight: '' });

  // Configuración
  const [showConfig, setShowConfig] = useState(false);
  const [tempCounter, setTempCounter] = useState('');

  // --- CALCULOS FINANCIEROS ---
  const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  const totalGlobalSales = salesHistory.reduce((acc, s) => acc + s.total, 0);
  const currentTripExpensesTotal = tripExpenses.reduce((acc, item) => acc + parseFloat(item.value || 0), 0);
  const historicalTripExpensesTotal = tripHistory.reduce((acc, trip) => acc + (trip.totalExpenses || 0), 0);
  const totalGlobalExpenses = currentTripExpensesTotal + historicalTripExpensesTotal;

  const calculateTotalSalesInTrip = () => {
    if (!activeTrip) return 0;
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
    setWeight(''); setPrice('');
  };

  const handleFinishSale = () => {
    if (cart.length === 0) return alert("Carrito vacío");
    if (!client.name.trim()) return alert("Falta nombre del cliente");

    // LÓGICA DE SECUENCIA: Toma el actual (60) y le suma 1 (61)
    const nextInvoiceNumber = parseInt(invoiceCounter) + 1;
    
    const saleData = {
      id: Date.now(),
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('es-CO'),
      time: new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'}),
      client: { ...client },
      items: [...cart],
      total: calculateTotalSale(),
      invoiceNumber: `0${nextInvoiceNumber}`
    };

    setSalesHistory([saleData, ...salesHistory]);
    setInvoiceCounter(nextInvoiceNumber); // Guarda el 61 para que la próxima sea 62
    setCurrentInvoice(saleData);
    setCart([]);
    setClient({ name: '', id: '', address: '', phone: '' });
    setView('invoice');
  };

  const calculateTotalSale = () => cart.reduce((acc, item) => acc + item.total, 0);

  const handleSelectClient = (e) => {
    const id = parseInt(e.target.value);
    const found = savedClients.find(c => c.internalId === id);
    if (found) setClient(found);
    else setClient({ name: '', id: '', address: '', phone: '' });
  };

  const saveClientFromPOS = () => {
    if (!client.name) return;
    setSavedClients([...savedClients, { ...client, internalId: Date.now() }]);
    alert("Cliente guardado");
  };

  const updateCounter = () => {
    if(tempCounter) {
        setInvoiceCounter(parseInt(tempCounter));
        alert("Contador actualizado. La próxima factura será la #" + (parseInt(tempCounter) + 1));
        setShowConfig(false);
    }
  };

  // --- LÓGICA DE ELIMINAR ---
  const deleteInvoice = (id, e) => {
      e.stopPropagation(); 
      if(window.confirm("¿Estás seguro de ELIMINAR esta factura? Esto afectará las ganancias.")) {
          setSalesHistory(salesHistory.filter(s => s.id !== id));
      }
  };

  const deleteTripFromHistory = (id) => {
      if(window.confirm("¿Borrar este viaje del historial?")) {
          setTripHistory(tripHistory.filter(t => t.id !== id));
      }
  };

  // --- LÓGICA DE VIAJES ---
  const saveNewRoute = () => {
      if(!newRoute.origen || !newRoute.destino) return alert("Origen y Destino obligatorios");
      const nombreFinal = newRoute.nombre || `${newRoute.origen} - ${newRoute.destino}`;
      setSavedRoutes([...savedRoutes, { ...newRoute, nombre: nombreFinal, id: Date.now() }]);
      setNewRoute({ nombre: '', origen: '', destino: '', distancia: '' });
      setShowRouteForm(false);
  };

  const deleteRoute = (id) => {
      if(window.confirm("¿Borrar esta ruta?")) setSavedRoutes(savedRoutes.filter(r => r.id !== id));
  };

  const startTrip = (ruta) => {
    if(activeTrip && !window.confirm("Ya tienes un viaje activo. ¿Quieres reiniciarlo?")) return;
    setActiveTrip({ id: Date.now(), ruta, startDate: new Date(), cargo: [] });
    setTripExpenses([]); 
    setView('trip');
  };

  const addCargo = () => {
    if(!cargoItem.product || !cargoItem.weight) return alert("Selecciona producto y peso");
    const newLoad = [...(activeTrip.cargo || []), { ...cargoItem, id: Date.now() }];
    setActiveTrip({ ...activeTrip, cargo: newLoad });
    setCargoItem({ product: '', weight: '' });
  };

  const removeCargo = (id) => {
    const newLoad = activeTrip.cargo.filter(c => c.id !== id);
    setActiveTrip({ ...activeTrip, cargo: newLoad });
  };

  const addExpense = (type) => {
    if (!newExpense.value) return alert("Ingresa cuánto gastaste");
    setTripExpenses([{ 
       id: Date.now(), 
       type, 
       value: parseFloat(newExpense.value), 
       note: newExpense.note,
       time: new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})
    }, ...tripExpenses]);
    setNewExpense({ type: '', value: '', note: '' });
  };

  const endTrip = () => {
     if(!window.confirm("¿Finalizar viaje? Se guardará en Bitácora.")) return;
     const tripSummary = {
         ...activeTrip,
         endDate: new Date(),
         totalSales: calculateTotalSalesInTrip(),
         totalExpenses: currentTripExpensesTotal,
         expensesList: tripExpenses
     };
     setTripHistory([tripSummary, ...tripHistory]);
     setActiveTrip(null);
     setTripExpenses([]); 
     alert("Viaje finalizado.");
  };

  const getDuration = (start, end) => {
      const diff = new Date(end) - new Date(start);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`;
  };

  // --- RENDERIZADO ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 max-w-lg mx-auto shadow-2xl print:shadow-none print:max-w-none">
      
      {/* HEADER */}
      {view !== 'invoice' && (
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 sticky top-0 z-40 shadow-lg flex justify-between items-center">
           {view === 'home' ? (
             <div><h1 className="font-black text-xl italic tracking-tighter">VÍSCERAS JR.</h1><p className="text-[10px] text-blue-200 uppercase tracking-widest">Sistema Móvil</p></div>
           ) : (
             <button onClick={() => setView('home')} className="flex items-center gap-2 font-bold text-blue-100"><ArrowLeft/> Menú</button>
           )}
           <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20"><Truck size={20} className="text-white"/></div>
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
            <div className="col-span-2 bg-gray-900 rounded-xl p-4 text-white flex justify-between items-center cursor-pointer hover:bg-gray-800" onClick={() => setView('trip_history')}>
               <div className="flex items-center gap-3">
                  <div className="bg-gray-700 p-2 rounded-lg"><MapPinned size={20}/></div>
                  <div><p className="font-bold text-sm">Bitácora de Viajes</p><p className="text-xs text-gray-400">Ver historial de rutas pasadas</p></div>
               </div>
               <ArrowLeft className="rotate-180 text-gray-500" size={18}/>
            </div>
            <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => setView('history')}>
               <div className="flex items-center gap-3">
                  <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><History size={20}/></div>
                  <div><p className="font-bold text-sm text-gray-700">Historial de Facturas</p></div>
               </div>
               <ArrowLeft className="rotate-180 text-gray-400" size={18}/>
            </div>
          </div>
        )}

        {/* VISTA: VENDER (POS) */}
        {view === 'pos' && (
          <div className="pb-20 space-y-4 animate-in slide-in-from-right duration-200">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Users size={14}/> Cliente</h3>
                {savedClients.length > 0 && (
                  <select onChange={handleSelectClient} className="text-xs p-1 bg-blue-50 text-blue-800 rounded border border-blue-200 outline-none">
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
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-3xl font-black">{formatCurrency(calculateTotalSale())}</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm bg-gray-800 p-2 rounded">
                      <div><div className="font-bold">{item.product}</div><div className="text-xs text-gray-400">{item.weight}kg x {formatCurrency(item.price)}</div></div>
                      <div className="flex items-center gap-3"><span className="font-bold">{formatCurrency(item.total)}</span><button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-red-400"><Trash2 size={16}/></button></div>
                    </div>
                  ))}
                </div>
                <button onClick={handleFinishSale} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex justify-center items-center gap-2"><Save size={20}/> FINALIZAR</button>
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

        {/* VISTA: VIAJE */}
        {view === 'trip' && (
          <div className="pb-20 animate-in slide-in-from-right duration-200">
             {!activeTrip ? (
                // --- MODO SELECCIÓN DE VIAJE ---
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
                                          <div>
                                             <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                                <MapPin size={12}/> {r.origen} <ArrowLeft size={12} className="rotate-180"/> {r.destino}
                                             </div>
                                             <div className="text-lg text-blue-900">{r.nombre}</div>
                                          </div>
                                          <span className="text-gray-400 text-xs">{r.distancia}km</span>
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
                // --- MODO VIAJE ACTIVO ---
                <div className="space-y-4">
                   <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                      <div className="relative z-10">
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1 block">Rumbo a:</span>
                          <h2 className="text-3xl font-black mb-1 flex items-center gap-2">{activeTrip.ruta.destino}</h2>
                          <p className="text-sm text-blue-200 mb-4 flex items-center gap-1"><MapPin size={14}/> Saliendo de: {activeTrip.ruta.origen}</p>
                          <div className="grid grid-cols-2 gap-4 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                              <div><p className="text-xs text-blue-200 uppercase">Ventas</p><p className="font-bold text-lg text-green-300">{formatCurrency(calculateTotalSalesInTrip())}</p></div>
                              <div><p className="text-xs text-blue-200 uppercase">Gastos</p><p className="font-bold text-lg text-red-300">{formatCurrency(currentTripExpensesTotal)}</p></div>
                          </div>
                          <div className="flex gap-2 mt-4">
                             <button onClick={() => window.open(`https://waze.com/ul?q=${activeTrip.ruta.destino}`, '_blank')} className="bg-white text-blue-900 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg"><Navigation size={16}/> Waze</button>
                             <button onClick={endTrip} className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm backdrop-blur-sm">Finalizar</button>
                          </div>
                      </div>
                      <Map size={140} className="absolute -bottom-6 -right-6 text-white opacity-10"/>
                   </div>
                   
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

                   <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Plus size={14}/> Registrar Gasto</h3>
                      <div className="flex gap-2 mb-3">
                         <input type="number" placeholder="$ Valor" className="flex-1 text-2xl font-black outline-none border-b border-gray-200 focus:border-blue-500 transition-colors" value={newExpense.value} onChange={e => setNewExpense({...newExpense, value: e.target.value})}/>
                         <input type="text" placeholder="Nota (opcional)" className="flex-1 text-sm border-b border-gray-200 outline-none" value={newExpense.note} onChange={e => setNewExpense({...newExpense, note: e.target.value})}/>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                         {[{l:'ACPM',i:Fuel}, {l:'Peaje',i:MapPin}, {l:'Comida',i:Coffee}, {l:'Hotel',i:Bed}, {l:'Taller',i:Wrench}, {l:'Otro',i:AlertTriangle}].map((x,i) => (
                            <button key={i} onClick={() => addExpense(x.l)} className="flex flex-col items-center p-2 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                              <x.i size={18} className="mb-1 text-gray-500"/><span className="text-[10px] font-bold text-gray-500">{x.l}</span>
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* --- SECCIÓN RESTAURADA: LISTA DE ÚLTIMOS GASTOS EN VIAJE --- */}
                   <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Últimos Gastos del Viaje</h3>
                      {tripExpenses.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No has registrado gastos aún.</p>
                      ) : (
                          <div className="space-y-0 text-sm">
                              {tripExpenses.slice(0, 5).map((expense) => (
                                  <div key={expense.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{expense.type}</span>
                                          <span className="text-xs text-gray-400">{expense.note}</span>
                                      </div>
                                      <div className="text-right">
                                          <span className="font-bold text-red-500 block">-{formatCurrency(expense.value)}</span>
                                          <span className="text-[10px] text-gray-300">{expense.time}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                   </div>

                </div>
             )}
          </div>
        )}

        {/* VISTA: HISTORIAL DE VIAJES */}
        {view === 'trip_history' && (
           <div className="pb-20 space-y-4 animate-in slide-in-from-right duration-200">
               <div className="bg-white p-4 rounded-xl border border-gray-200 mb-2">
                  <h2 className="font-bold text-lg">Bitácora de Viajes</h2>
                  <p className="text-xs text-gray-500">Viajes finalizados y guardados</p>
               </div>
               {tripHistory.map(trip => (
                   <div key={trip.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 relative">
                       <button onClick={() => deleteTripFromHistory(trip.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                       <div className="flex justify-between items-start border-b border-gray-100 pb-2 pr-6">
                           <div>
                               <h3 className="font-black text-blue-900 text-lg">{trip.ruta.destino}</h3>
                               <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> Desde {trip.ruta.origen}</p>
                           </div>
                           <div className="text-right">
                               <p className="text-xs font-bold text-gray-400">{new Date(trip.startDate).toLocaleDateString()}</p>
                               <p className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded inline-block">Duración: {getDuration(trip.startDate, trip.endDate)}</p>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2 text-sm">
                           <div className="bg-green-50 p-2 rounded text-center">
                               <span className="block text-[10px] font-bold text-green-700 uppercase">Ventas</span>
                               <span className="font-bold text-green-800">{formatCurrency(trip.totalSales)}</span>
                           </div>
                           <div className="bg-red-50 p-2 rounded text-center">
                               <span className="block text-[10px] font-bold text-red-700 uppercase">Gastos</span>
                               <span className="font-bold text-red-800">{formatCurrency(trip.totalExpenses)}</span>
                           </div>
                       </div>
                       {trip.cargo && trip.cargo.length > 0 && (
                           <div className="bg-gray-50 p-2 rounded border border-gray-100">
                               <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Carga Transportada:</p>
                               <div className="flex flex-wrap gap-1">{trip.cargo.map((c, i) => (<span key={i} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-600">{c.product} ({c.weight}kg)</span>))}</div>
                           </div>
                       )}
                   </div>
               ))}
           </div>
        )}

        {/* VISTA: HISTORIAL FACTURAS */}
        {view === 'history' && (
           <div className="pb-20 space-y-3 animate-in slide-in-from-right duration-200">
              <div className="bg-white p-4 rounded-xl border border-gray-200 mb-2"><h2 className="font-bold text-lg">Historial de Ventas</h2><p className="text-xs text-gray-500">{salesHistory.length} facturas generadas</p></div>
              {salesHistory.map(sale => (
                 <div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center cursor-pointer relative" onClick={() => {setCurrentInvoice(sale); setView('invoice')}}>
                    <div><div className="font-bold text-gray-800">{sale.client.name}</div><div className="text-xs text-gray-500">{sale.date} • Fact #{sale.invoiceNumber}</div></div>
                    <div className="flex items-center gap-3">
                        <div className="font-black text-gray-900">{formatCurrency(sale.total)}</div>
                        <button onClick={(e) => deleteInvoice(sale.id, e)} className="p-2 text-red-300 hover:text-red-500 z-10"><Trash2 size={18}/></button>
                    </div>
                 </div>
              ))}
           </div>
        )}

        {/* VISTA: BILLETERA */}
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

              {/* --- SECCIÓN RESTAURADA: LISTA DE ÚLTIMOS GASTOS GLOBALES --- */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Últimos Gastos Globales</h3>
                  {tripExpenses.length === 0 && tripHistory.length === 0 ? <p className="text-xs text-gray-400">Sin registros recientes.</p> : (
                    <div className="space-y-2">
                      {[...tripExpenses, ...tripHistory.flatMap(t => t.expensesList || [])]
                        .sort((a,b) => b.id - a.id)
                        .slice(0, 5)
                        .map(g => (
                        <div key={g.id} className="flex justify-between text-sm border-b border-gray-50 last:border-0 pb-2">
                          <div>
                             <span className="font-bold text-gray-700 block">{g.type}</span>
                             <span className="text-[10px] text-gray-400">{g.note || new Date(g.id).toLocaleDateString()}</span>
                          </div>
                          <span className="font-bold text-red-500">-{formatCurrency(g.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 text-gray-500 font-bold text-sm w-full justify-between"><span className="flex items-center gap-2"><Settings size={16}/> Configuración</span><ArrowLeft size={16} className={`transition-transform ${showConfig ? '-rotate-90' : 'rotate-180'}`}/></button>
                  {showConfig && (
                      <div className="bg-gray-50 p-4 rounded-lg mt-4 animate-in slide-in-from-top-2">
                          <p className="text-xs text-gray-600 mb-2">Último consecutivo: <strong>{invoiceCounter}</strong></p>
                          <div className="flex gap-2"><input type="number" placeholder="Nuevo valor" className="p-2 border rounded w-full text-sm" value={tempCounter} onChange={e => setTempCounter(e.target.value)} /><button onClick={updateCounter} className="bg-blue-600 text-white px-4 rounded font-bold text-sm">Guardar</button></div>
                      </div>
                  )}
              </div>
           </div>
        )}

        {/* VISTA: FACTURA */}
        {view === 'invoice' && currentInvoice && (
           <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto animate-in zoom-in duration-200">
              <div className="bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 print:hidden"><button onClick={() => setView('history')} className="flex items-center gap-1 font-bold"><ArrowLeft size={20}/> Volver</button><span className="font-bold">Factura</span><div className="w-8"></div></div>
              <div className="p-4 print:p-0">
                 <div className="bg-white shadow-lg p-6 max-w-md mx-auto print:shadow-none print:w-full print:max-w-none">
                    <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                       <h1 className="text-xl font-black text-blue-900 uppercase print:text-black">Expendio de Vísceras Jr.</h1>
                       <p className="text-xs text-gray-500 font-bold">Rómulo Jimenez Roa</p>
                       <p className="text-xs text-gray-500">NIT: 79.989.335-4</p>
                    </div>
                    <div className="flex justify-between items-end mb-6">
                       <div><p className="font-bold text-gray-800 text-lg">{currentInvoice.client.name}</p><p className="text-xs text-gray-500">{currentInvoice.client.id}</p></div>
                       <div className="text-right"><p className="text-xl font-black text-red-600 print:text-black">#{currentInvoice.invoiceNumber}</p><p className="text-xs text-gray-500">{currentInvoice.date}</p></div>
                    </div>
                    <table className="w-full text-sm mb-6">
                       <thead><tr className="border-b-2 border-gray-800"><th className="text-left py-2">Prod</th><th className="text-center py-2">Kg</th><th className="text-right py-2">Total</th></tr></thead>
                       <tbody className="divide-y divide-gray-100">{currentInvoice.items.map((item, i) => (<tr key={i}><td className="py-2">{item.product}</td><td className="py-2 text-center">{item.weight}</td><td className="py-2 text-right font-bold">{formatCurrency(item.total)}</td></tr>))}</tbody>
                    </table>
                    <div className="flex justify-between items-center border-t-2 border-gray-800 pt-3"><span className="text-xl font-bold text-gray-400">TOTAL</span><span className="text-2xl font-black text-blue-900 print:text-black">{formatCurrency(currentInvoice.total)}</span></div>
                 </div>
              </div>
              <div className="sticky bottom-0 p-4 bg-white border-t border-gray-200 flex flex-col gap-3 print:hidden">
                 <button onClick={() => {
                     let msg = `*VÍSCERAS JR* 🐮\nFactura #${currentInvoice.invoiceNumber}\nCliente: ${currentInvoice.client.name}\n\n*PEDIDO:*\n`;
                     currentInvoice.items.forEach(item => {msg += `- ${item.product}: ${item.weight}kg (${formatCurrency(item.total)})\n`;});
                     msg += `\n*TOTAL: ${formatCurrency(currentInvoice.total)}*`;
                     window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                 }} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2"><Share2 size={20}/> WhatsApp Detallado</button>
                 <button onClick={() => window.print()} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2"><Printer size={20}/> PDF / Imprimir</button>
              </div>
           </div>
        )}

      </main>
    </div>
  );
};

export default App;
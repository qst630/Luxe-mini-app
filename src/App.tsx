import React, { useEffect, useMemo, useState } from "react";

// Minimal Telegram WebApp SDK guard (works in browser preview too)
const tg = (typeof window !== "undefined" && (window as any).Telegram && (window as any).Telegram.WebApp) || null;

// --- Types
interface Product {
  id: string;
  brand: string;
  title: string;
  priceRUB: number;
  img: string;
  category: string; // bags, jewelry, shoes, accessories...
  tags?: string[];
  inStock?: boolean;
  discountPct?: number; // only for Hot Deals
}

interface OrderItem extends Product { qty: number }

type TabKey = "catalog" | "hot" | "orders" | "request";

type ContactMethod = "telegram" | "whatsapp" | "call";

// --- Demo data (RUB)
const demoCatalog: Product[] = [
  { id: "p1", brand: "Hermès", title: "Kelly 20 Sellier", priceRUB: 4100000, img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop", tags:["VIP","Rare"], inStock:true, category:"bags" },
  { id: "p2", brand: "Fendi", title: "Baguette Sequins", priceRUB: 390000, img: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=1200&auto=format&fit=crop", tags:["New"], inStock:true, category:"bags" },
  { id: "p3", brand: "Gucci", title: "Horsebit 1955", priceRUB: 285000, img: "https://images.unsplash.com/photo-1548036324-8a1f9d3b1a02?q=80&w=1200&auto=format&fit=crop", tags:["Classic"], inStock:true, category:"bags" },
  { id: "p4", brand: "Cartier", title: "Love Bracelet", priceRUB: 720000, img: "https://images.unsplash.com/photo-1599643475993-6f2b1a7b3b19?q=80&w=1200&auto=format&fit=crop", tags:["Jewelry"], inStock:true, category:"jewelry" },
];

const demoHot: Product[] = [
  { id: "h1", brand: "Hermès", title: "Birkin 25 Togo", priceRUB: 4300000, img: "https://images.unsplash.com/photo-1616512651851-6d5f2f0dcf65?q=80&w=1200&auto=format&fit=crop", discountPct: 10, inStock:true, category:"bags" },
  { id: "h2", brand: "Chanel", title: "Classic Flap Mini", priceRUB: 620000, img: "https://images.unsplash.com/photo-1543776703-0359126f0615?q=80&w=1200&auto=format&fit=crop", discountPct: 7, inStock:true, category:"bags" },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>("catalog");
  const [cart, setCart] = useState<Record<string, OrderItem>>({});
  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartItems.reduce((s,i)=>s+i.qty,0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((s,i)=>s+i.priceRUB*i.qty,0), [cartItems]);

  // Filters
  const allBrands = useMemo(() => Array.from(new Set([...demoCatalog, ...demoHot].map(p=>p.brand))).sort(), []);
  const allCategories = useMemo(() => Array.from(new Set([...demoCatalog, ...demoHot].map(p=>p.category))).sort(), []);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Contact fields (order)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("telegram");
  const [comment, setComment] = useState("");

  useEffect(() => {
    // Telegram theming & MainButton glue
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.MainButton.setParams({
      text: cartCount ? `Перейти к оформлению (${cartCount})` : "Перейти к оформлению",
      is_visible: cartCount > 0,
    });
    const handler = () => setTab("orders");
    tg.MainButton.onClick(handler);
    return () => tg.MainButton.offClick(handler);
  }, [cartCount]);

  function addToCart(p: Product) {
    setCart(prev => {
      const cur = prev[p.id];
      const qty = (cur?.qty || 0) + 1;
      return { ...prev, [p.id]: { ...p, qty } };
    });
  }
  function removeFromCart(id: string) {
    setCart(prev => {
      const { [id]: _, ...rest } = prev; return rest;
    });
  }
  function changeQty(id: string, delta: number) {
    setCart(prev => {
      const item = prev[id];
      if (!item) return prev;
      const qty = Math.max(1, item.qty + delta);
      return { ...prev, [id]: { ...item, qty } };
    });
  }

  function submitOrder() {
    const payload = {
      type: "order",
      to: "@grad_zakup",
      contact: { name, phone, contactMethod, comment },
      items: cartItems,
      totalRUB: cartTotal,
    };

    if (!name || !phone) {
      if (tg) tg.showAlert("Заполните имя и телефон, пожалуйста.");
      return;
    }

    if (tg) {
      tg.sendData(JSON.stringify(payload));
      tg.showAlert("Заявка отправлена менеджеру. Мы свяжемся с вами лично.");
    } else {
      alert("(Превью) Заявка отправлена:\\n" + JSON.stringify(payload, null, 2));
    }
    setCart({}); setName(""); setPhone(""); setComment(""); setContactMethod("telegram");
    setTab("orders");
  }

  // Apply filters
  const applyFilters = (list: Product[]) => list.filter(p => (
    (brandFilter === "all" || p.brand === brandFilter) &&
    (categoryFilter === "all" || p.category === categoryFilter) &&
    p.inStock !== false
  ));

  const filteredCatalog = applyFilters(demoCatalog);
  const filteredHot = applyFilters(demoHot);

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-stone-900">
      <Header cartCount={cartCount} onOrdersClick={()=>setTab("orders")} onCartClick={()=>setTab("orders")} />

      <Tabs value={tab} onChange={setTab} />

      <FilterBar
        brands={["all", ...allBrands]}
        categories={["all", ...allCategories]}
        brand={brandFilter}
        category={categoryFilter}
        onBrandChange={setBrandFilter}
        onCategoryChange={setCategoryFilter}
      />

      <div className="p-3 pb-24 max-w-3xl mx-auto">
        {tab === "catalog" && (
          <Grid>
            {filteredCatalog.map(p => (
              <Card key={p.id} product={p} onAdd={()=>addToCart(p)} />
            ))}
          </Grid>
        )}

        {tab === "hot" && (
          <Grid>
            {filteredHot.map(p => (
              <Card key={p.id} product={p} onAdd={()=>addToCart(p)} hot />
            ))}
          </Grid>
        )}

        {tab === "orders" && (
          <Orders
            cartItems={cartItems}
            cartTotal={cartTotal}
            changeQty={changeQty}
            removeFromCart={removeFromCart}
            onSubmit={submitOrder}
            name={name} setName={setName}
            phone={phone} setPhone={setPhone}
            contactMethod={contactMethod} setContactMethod={setContactMethod}
            comment={comment} setComment={setComment}
          />
        )}

        {tab === "request" && (
          <RequestForm onSubmit={(payload)=>{
            const enriched = { type:"custom_request", to:"@grad_zakup", payload };
            if (tg) {
              tg.sendData(JSON.stringify(enriched));
              tg.showAlert("Запрос отправлен. Менеджер свяжется с вами лично.");
            } else {
              alert("Запрос отправлен (превью).\\n" + JSON.stringify(enriched, null, 2));
            }
            setTab("orders");
          }} />
        )}
      </div>
    </div>
  );
}

function Header({ cartCount, onOrdersClick, onCartClick }:{ cartCount:number; onOrdersClick:()=>void; onCartClick:()=>void }){
  return (
    <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-[#f6f3ee]/80 bg-[#f6f3ee] border-b border-stone-200">
      <div className="max-w-3xl mx-auto flex items-center gap-3 p-3">
        {/* Logo placeholder */}
        <div className="w-9 h-9 rounded-2xl bg-stone-900 text-[#f6f3ee] grid place-items-center text-sm">LB</div>
        <div className="flex-1 font-semibold text-base">Personal Shopper</div>
        <button onClick={onOrdersClick} className="px-3 py-1.5 rounded-xl border border-stone-300 text-sm">Заказы</button>
        <button onClick={onCartClick} className="relative w-9 h-9 rounded-xl border border-stone-300 grid place-items-center text-lg">
          🛒
          {cartCount>0 && (
            <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-stone-900 text-[#f6f3ee] rounded-full w-5 h-5 grid place-items-center">{cartCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

function Tabs({ value, onChange }:{ value:TabKey; onChange:(t:TabKey)=>void }){
  const items: {key:TabKey; label:string}[] = [
    { key:"catalog", label:"Каталог" },
    { key:"hot", label:"Горячее" },
    { key:"orders", label:"Мои заказы" },
    { key:"request", label:"Подбор" },
  ];
  return (
    <div className="sticky top-[56px] z-20 bg-[#f6f3ee] border-b border-stone-200">
      <div className="max-w-3xl mx-auto flex">
        {items.map(i => (
          <button key={i.key} onClick={()=>onChange(i.key)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${value===i.key?"text-stone-900 border-b-2 border-stone-900":"text-stone-500"}`}>{i.label}</button>
        ))}
      </div>
    </div>
  );
}

function FilterBar({ brands, categories, brand, category, onBrandChange, onCategoryChange }:{
  brands: string[]; categories: string[]; brand: string; category: string;
  onBrandChange: (v:string)=>void; onCategoryChange: (v:string)=>void;
}){
  return (
    <div className="sticky top-[96px] z-10 bg-[#f6f3ee]">
      <div className="max-w-3xl mx-auto grid grid-cols-2 gap-2 p-3 pt-2">
        <select value={brand} onChange={e=>onBrandChange(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm">
          {brands.map(b => <option key={b} value={b}>{b === "all" ? "Все бренды" : b}</option>)}
        </select>
        <select value={category} onChange={e=>onCategoryChange(e.target.value)} className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm">
          {categories.map(c => <option key={c} value={c}>{c === "all" ? "Все категории" : c}</option>)}
        </select>
      </div>
    </div>
  );
}

function Grid({ children }:{ children: React.ReactNode }){
  // 2 columns on mobile for denser layout
  return <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3">{children}</div>;
}

function Card({ product, onAdd, hot }:{ product:Product; onAdd:()=>void; hot?:boolean }){
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-stone-200">
      <div className="aspect-square bg-stone-100 overflow-hidden">
        <img src={product.img} alt={product.title} className="w-full h-full object-cover"/>
      </div>
      <div className="p-2.5">
        <div className="text-[10px] uppercase tracking-wide text-stone-500">{product.brand}</div>
        <div className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.4em]">{product.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="text-[15px] font-semibold">{product.priceRUB.toLocaleString("ru-RU")} ₽</div>
          {hot && product.discountPct && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-[#f6f3ee]">-{product.discountPct}%</span>
          )}
        </div>
        <div className="flex gap-1 mt-2">
          <button onClick={onAdd} className="flex-1 px-3 py-2 rounded-xl bg-stone-900 text-[#f6f3ee] text-xs">В корзину</button>
        </div>
      </div>
    </div>
  );
}

function Orders({ cartItems, cartTotal, changeQty, removeFromCart, onSubmit, name, setName, phone, setPhone, contactMethod, setContactMethod, comment, setComment }:{
  cartItems: OrderItem[];
  cartTotal: number;
  changeQty: (id:string, delta:number)=>void;
  removeFromCart: (id:string)=>void;
  onSubmit: ()=>void;
  name: string; setName: (v:string)=>void;
  phone: string; setPhone: (v:string)=>void;
  contactMethod: ContactMethod; setContactMethod: (v:ContactMethod)=>void;
  comment: string; setComment: (v:string)=>void;
}){
  if (cartItems.length === 0) {
    return (
      <Empty title="Пока пусто" subtitle="Добавьте позиции из каталога или оставьте запрос на подбор." />
    );
  }
  return (
    <div className="space-y-3">
      {cartItems.map(i => (
        <div key={i.id} className="flex gap-3 bg-white border border-stone-200 rounded-2xl p-3">
          <img src={i.img} alt={i.title} className="w-16 h-16 rounded-xl object-cover"/>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase text-stone-500">{i.brand}</div>
            <div className="text-sm font-medium truncate">{i.title}</div>
            <div className="text-sm mt-1">{i.priceRUB.toLocaleString("ru-RU")} ₽</div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={()=>changeQty(i.id,-1)} className="w-7 h-7 rounded-lg border">-</button>
              <div className="w-7 text-center text-sm">{i.qty}</div>
              <button onClick={()=>changeQty(i.id,1)} className="w-7 h-7 rounded-lg border">+</button>
              <button onClick={()=>removeFromCart(i.id)} className="ml-auto text-sm text-stone-500">Удалить</button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded-2xl">
        <div className="text-sm text-stone-600">Итого</div>
        <div className="text-lg font-semibold">{cartTotal.toLocaleString("ru-RU",{minimumFractionDigits:0})} ₽</div>
      </div>

      {/* Contact form for checkout */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3 space-y-3">
        <Field label="Имя" value={name} onChange={setName} placeholder="Как к вам обращаться" />
        <Field label="Телефон" value={phone} onChange={setPhone} placeholder="+7 ..." inputMode="tel" />
        <label className="block">
          <div className="text-sm mb-1 text-stone-600">Предпочтительный способ связи</div>
          <div className="flex gap-2 text-sm">
            <Choice checked={contactMethod==='telegram'} onChange={()=>setContactMethod('telegram')} label="Telegram" />
            <Choice checked={contactMethod==='whatsapp'} onChange={()=>setContactMethod('whatsapp')} label="WhatsApp" />
            <Choice checked={contactMethod==='call'} onChange={()=>setContactMethod('call')} label="Звонок" />
          </div>
        </label>
        <TextArea label="Комментарий к заказу" value={comment} onChange={setComment} placeholder="Пожелания по цвету/срокам/размерам..." />
      </div>

      <button onClick={onSubmit} className="w-full px-4 py-3 rounded-2xl bg-stone-900 text-[#f6f3ee] font-medium">Отправить заявку</button>
    </div>
  );
}

function Choice({ checked, onChange, label }:{ checked:boolean; onChange:()=>void; label:string }){
  return (
    <button type="button" onClick={onChange}
            className={`px-3 py-1.5 rounded-xl border text-sm ${checked?"bg-stone-900 text-[#f6f3ee] border-stone-900":"bg-white text-stone-700 border-stone-300"}`}>
      {label}
    </button>
  );
}

function RequestForm({ onSubmit }:{ onSubmit:(payload:any)=>void }){
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("telegram");

  return (
    <form className="space-y-3" onSubmit={(e)=>{ e.preventDefault(); onSubmit({ brand, model, size, budgetRUB: budget, notes, contact:{name, phone, contactMethod} }); }}>
      <Field label="Бренд" value={brand} onChange={setBrand} placeholder="Hermès / Chanel / Cartier ..."/>
      <Field label="Модель / описание" value={model} onChange={setModel} placeholder="Birkin 25, Togo, цвет Noir"/>
      <Field label="Размер" value={size} onChange={setSize} placeholder="EU 38 / 25 cm / обхват 16 см ..."/>
      <Field label="Бюджет, ₽" value={budget} onChange={setBudget} inputMode="decimal" placeholder="Напр. 400000"/>
      <TextArea label="Пожелания" value={notes} onChange={setNotes} placeholder="Цвет, срок, альтернативы, фото..."/>

      <div className="bg-white border border-stone-200 rounded-2xl p-3 space-y-3">
        <Field label="Имя" value={name} onChange={setName} placeholder="Как к вам обращаться" />
        <Field label="Телефон" value={phone} onChange={setPhone} placeholder="+7 ..." inputMode="tel" />
        <label className="block">
          <div className="text-sm mb-1 text-stone-600">Предпочтительный способ связи</div>
          <div className="flex gap-2 text-sm">
            <Choice checked={contactMethod==='telegram'} onChange={()=>setContactMethod('telegram')} label="Telegram" />
            <Choice checked={contactMethod==='whatsapp'} onChange={()=>setContactMethod('whatsapp')} label="WhatsApp" />
            <Choice checked={contactMethod==='call'} onChange={()=>setContactMethod('call')} label="Звонок" />
          </div>
        </label>
      </div>

      <button type="submit" className="w-full px-4 py-3 rounded-2xl bg-stone-900 text-[#f6f3ee] font-medium">Отправить запрос</button>
      <p className="text-xs text-stone-500">Мы свяжемся с вами лично в Telegram.</p>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }:{
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string; inputMode?:React.HTMLAttributes<HTMLInputElement>["inputMode"];
}){
  return (
    <label className="block">
      <div className="text-sm mb-1 text-stone-600">{label}</div>
      <input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
             inputMode={inputMode}
             className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white placeholder-stone-400 focus:outline-none"/>
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }:{
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string;
}){
  return (
    <label className="block">
      <div className="text-sm mb-1 text-stone-600">{label}</div>
      <textarea value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
                rows={5}
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white placeholder-stone-400 focus:outline-none"/>
    </label>
  );
}

function Empty({ title, subtitle }:{ title:string; subtitle?:string }){
  return (
    <div className="text-center p-12 bg-white border border-stone-200 rounded-2xl">
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-stone-600 mt-1">{subtitle}</div>}
    </div>
  );
}
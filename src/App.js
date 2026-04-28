import React, { useState, useEffect } from 'react';
import { Check, ShoppingBag, ChevronDown, ChevronUp, Trash2, Plus, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';

const OrderSystem = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [cart, setCart] = useState([]);
  const [stage, setStage] = useState('selection');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    loadMenuFromFile('/menu.xlsx');
  }, []);

  const loadMenuFromFile = async (filePath) => {
    try {
      const response = await fetch(filePath);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      
      const menuItems = jsonData.map((row, idx) => ({
        id: idx + 1,
        category: row.Category || row.category || 'General',
        name: row['Item Name'] || row.Item || 'Unknown Item',
        price: parseFloat(row.Price || 0),
        // Added support for a sale price column from Excel
        salePrice: row['Sale Price'] || row.sale_price ? parseFloat(row['Sale Price'] || row.sale_price) : null
      }));

      setCategories([...new Set(menuItems.map(item => item.category))]);
      setItems(menuItems);
      if (menuItems.length > 0) setExpandedCategories({ [menuItems[0].category]: false });
    } catch (e) {
      console.error("Default menu not found.");
    }
  };

  const addToCart = (id) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { id, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const cartItemsWithDetails = cart.map(cItem => {
    const detail = items.find(i => i.id === cItem.id);
    return { ...detail, quantity: cItem.quantity };
  });

  // Calculate total using sale price if available
  const totalPrice = cartItemsWithDetails.reduce((sum, item) => {
    const finalPrice = item.salePrice && item.category === 'Specials' ? item.salePrice : item.price;
    return sum + (finalPrice * item.quantity);
  }, 0);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3-r8XwoT_Ih-TC-sb5AnH9s0gjIwEiey8fEJQPjYuKD4o2eBj2xNZRW_FFRfYYjWpRA/exec";

    try {
      const itemsSummary = cartItemsWithDetails
        .map(item => {
           const p = item.salePrice && item.category === 'Specials' ? item.salePrice : item.price;
           return `${item.name} (x${item.quantity}) - $${(p * item.quantity).toFixed(2)}`;
        })
        .join('\n');

      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          cartItems: cartItemsWithDetails.map(i => ({
            ...i,
            price: i.salePrice && i.category === 'Specials' ? i.salePrice : i.price
          }))
        }),
      });

      setStage('complete');
    } catch (err) {
      setEmailError("Error sending order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fe', fontFamily: 'sans-serif' }}>
      
      {/* STICKY HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '20px 25px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <ShoppingBag size={32} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Bazaar Order</h1>
        </div>

        {stage === 'selection' && (
          <button onClick={() => setStage('confirmation')} disabled={cart.length === 0} style={{ background: '#ffcc00', color: '#333', border: 'none', padding: '12px 24px', borderRadius: '30px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', opacity: cart.length === 0 ? 0.6 : 1 }}>
            <ShoppingBag size={24} />
            <span>REVIEW ORDER & CHECKOUT ({totalItems})</span>
            <span style={{ background: 'rgba(0,0,0,0.1)', padding: '4px 10px', borderRadius: '15px' }}>${totalPrice.toFixed(2)}</span>
          </button>
        )}
      </div>

      <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 15px' }}>
        <div style={{ background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', padding: '30px' }}>
          
          {stage === 'selection' && (
            <div>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: '20px' }}>
                  <div onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))} style={{ background: cat === 'Specials' ? '#fff5f5' : '#f8f9fa', padding: '18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', border: cat === 'Specials' ? '1px solid #feb2b2' : '1px solid #eee' }}>
                    <span style={{ color: cat === 'Specials' ? '#e53e3e' : 'inherit' }}>
                        {cat === 'Specials' ? '🔥 ' + cat : cat}
                    </span>
                    {expandedCategories[cat] ? <ChevronUp /> : <ChevronDown />}
                  </div>

                  {expandedCategories[cat] && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '15px' }}>
                      {items.filter(i => i.category === cat).map(item => {
                        const inCart = cart.find(c => c.id === item.id);
                        const isSpecial = cat === 'Specials' && item.salePrice;

                        return (
                          <div key={item.id} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '12px', background: inCart ? '#f0f7ff' : 'white' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>{item.name}</div>
                            
                            <div style={{ marginBottom: '15px' }}>
                              {isSpecial ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ color: '#e53e3e', textDecoration: 'line-through', fontSize: '0.9rem' }}>
                                    ${item.price.toFixed(2)}
                                  </span>
                                  <span style={{ color: '#38a169', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    ${item.salePrice.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                  ${item.price.toFixed(2)}
                                </span>
                              )}
                            </div>

                            {!inCart ? (
                              <button onClick={() => addToCart(item.id)} style={{ width: '100%', padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Add to Cart</button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa', padding: '5px', borderRadius: '8px', border: '1px solid #667eea' }}>
                                <button onClick={() => updateQuantity(item.id, -1)} style={{ border: 'none', background: '#e2e8f0', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}><Minus size={16}/></button>
                                <span style={{ fontWeight: 'bold', color: '#667eea' }}>{inCart.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} style={{ border: 'none', background: '#e2e8f0', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}><Plus size={16}/></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Logic for Stage 2, 3, 4 remains the same as previous updated versions... */}
          {stage === 'confirmation' && (
             /* Ensure confirmation view also shows the Sale Price if it's a Special */
             <div>
                <h2 style={{ marginTop: 0 }}>Review Your Order</h2>
                {cartItemsWithDetails.map(item => {
                    const finalP = (item.category === 'Specials' && item.salePrice) ? item.salePrice : item.price;
                    return (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f4f7fe' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                <div style={{ color: '#666' }}>{item.quantity} x ${finalP.toFixed(2)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <span style={{ fontWeight: 'bold' }}>${(finalP * item.quantity).toFixed(2)}</span>
                                <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: '#fff0f0', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={20} color="#ff4d4d" /></button>
                            </div>
                        </div>
                    );
                })}
                <div style={{ textAlign: 'right', padding: '30px 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#764ba2' }}>Total: ${totalPrice.toFixed(2)}</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={() => setStage('selection')} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', fontWeight: '600' }}>Add More</button>
                    <button onClick={() => setStage('details')} style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Checkout</button>
                </div>
             </div>
          )}

          {/* ...Details and Complete stages (same as before) */}
        </div>
      </div>
    </div>
  );
};

export default OrderSystem;

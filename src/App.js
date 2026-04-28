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
      }));

      setCategories([...new Set(menuItems.map(item => item.category))]);
      setItems(menuItems);
      if (menuItems.length > 0) setExpandedCategories({ [menuItems[0].category]: true });
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

  const totalPrice = cartItemsWithDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3-r8XwoT_Ih-TC-sb5AnH9s0gjIwEiey8fEJQPjYuKD4o2eBj2xNZRW_FFRfYYjWpRA/exec";

    try {
      // Send data to Google Sheets
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Important for Google Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          cartItems: cartItemsWithDetails
        }),
      });

      // Since 'no-cors' doesn't return a standard response status, 
      // we assume success if no error is thrown
      setStage('complete');
      setCart([]); // Clear cart after success
      
    } catch (err) {
      setEmailError("Failed to save order to the cloud.");
      console.error(err);
    } finally {
      setLoading(false);
    }

    try {
      const itemsSummary = cartItemsWithDetails
        .map(item => `${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');

      const body = new FormData();
      body.append('Name', formData.name);
      body.append('Phone', formData.phone);
      body.append('Address', formData.address);
      body.append('Order_Details', itemsSummary);
      body.append('Total_Price', `$${totalPrice.toFixed(2)}`);

      const response = await fetch('https://formsubmit.co/ajax/bazaarnb2020@gmail.com', {
        method: 'POST',
        body: body,
      });

      if (response.ok) setStage('complete');
      else throw new Error();
    } catch (err) {
      setEmailError("Error sending order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fe', fontFamily: 'sans-serif' }}>
      
      {/* STICKY HEADER */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 1000, 
        background: 'linear-gradient(135deg, #667eea, #764ba2)', 
        color: 'white', 
        padding: '20px 25px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <ShoppingBag size={32} /> {/* Increased Icon Size */}
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Bazaar Order</h1>
        </div>

        {stage === 'selection' && (
          <button 
            onClick={() => setStage('confirmation')}
            disabled={cart.length === 0}
            style={{
              background: '#ffcc00', // Contrasting color for visibility
              color: '#333',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '30px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              opacity: cart.length === 0 ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={24} />
              <span>REVIEW ORDER & CHECKOUT ({totalItems})</span>
            </div>
            <span style={{ background: 'rgba(0,0,0,0.1)', padding: '4px 10px', borderRadius: '15px' }}>
              ${totalPrice.toFixed(2)}
            </span>
          </button>
        )}
      </div>

      <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 15px' }}>
        <div style={{ background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '30px' }}>
          
          {/* STAGE 1: Selection */}
          {stage === 'selection' && (
            <div>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: '20px' }}>
                  <div 
                    onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))}
                    style={{ background: '#f8f9fa', padding: '18px', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', border: '1px solid #eee' }}>
                    {cat} {expandedCategories[cat] ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  {expandedCategories[cat] && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '15px' }}>
                      {items.filter(i => i.category === cat).map(item => {
                        const inCart = cart.find(c => c.id === item.id);
                        return (
                          <div key={item.id} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '12px', background: inCart ? '#f0f7ff' : 'white', boxShadow: inCart ? '0 4px 12px rgba(102, 126, 234, 0.1)' : 'none' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '6px' }}>{item.name}</div>
                            <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px' }}>${item.price.toFixed(2)}</div>
                            {!inCart ? (
                              <button onClick={() => addToCart(item.id)} style={{ width: '100%', padding: '10px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Add to Cart</button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa', padding: '5px', borderRadius: '8px', border: '1px solid #667eea' }}>
                                <button onClick={() => updateQuantity(item.id, -1)} style={{ border: 'none', background: '#e2e8f0', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex' }}><Minus size={16}/></button>
                                <span style={{ fontWeight: 'bold', color: '#667eea', fontSize: '1.1rem' }}>{inCart.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} style={{ border: 'none', background: '#e2e8f0', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex' }}><Plus size={16}/></button>
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

          {/* STAGE 2: Confirmation */}
          {stage === 'confirmation' && (
            <div>
              <h2 style={{ marginTop: 0, borderBottom: '2px solid #f4f7fe', paddingBottom: '15px' }}>Review Your Order</h2>
              {cartItemsWithDetails.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f4f7fe' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</div>
                    <div style={{ color: '#666' }}>{item.quantity} x ${item.price.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: '#fff0f0', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                       <Trash2 size={20} color="#ff4d4d" />
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'right', padding: '30px 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#764ba2' }}>
                Total: ${totalPrice.toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setStage('selection')} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Add More Items</button>
                <button onClick={() => setStage('details')} style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Proceed to Checkout</button>
              </div>
            </div>
          )}

          {/* Other stages (details/complete) remain consistent with the previous version */}
          {stage === 'details' && (
            <form onSubmit={handleSubmitDetails}>
              <h2 style={{ marginTop: 0 }}>Delivery Details</h2>
              {emailError && <div style={{ color: 'red', background: '#fff5f5', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>{emailError}</div>}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Full Name</label>
                <input type="text" required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Phone Number</label>
                <input type="tel" required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Delivery Address</label>
                <textarea required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box', height: '100px', fontFamily: 'inherit' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="button" onClick={() => setStage('confirmation')} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Back to Cart</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
                  {loading ? "Sending Order..." : "Confirm & Send Order"}
                </button>
              </div>
            </form>
          )}

          {stage === 'complete' && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ background: '#4BB543', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                <Check color="white" size={45} />
              </div>
              <h2 style={{ fontSize: '2rem' }}>Order Placed!</h2>
              <p style={{ color: '#666', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto 30px' }}>Thank you, {formData.name}. Your order has been successfully sent. We will process it shortly.</p>
              <button 
                onClick={() => { setStage('selection'); setCart([]); setFormData({name:'', phone:'', address:''}); }} 
                style={{ padding: '15px 40px', background: '#667eea', color: 'white', border: 'none', borderRadius: '35px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
              >
                Start New Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSystem;
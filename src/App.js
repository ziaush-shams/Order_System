import React, { useState, useEffect } from 'react';
import { Check, ShoppingBag, ChevronDown, ChevronUp, Trash2, Plus, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';

const OrderSystem = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [cart, setCart] = useState([]);
  const [stage, setStage] = useState('selection'); // selection, confirmation, details, complete
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Load initial menu
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
      console.error("Default menu not found. Use upload button.");
    }
  };

  // --- Cart Logic ---
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

  // --- Submission Logic ---
  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    setEmailError('');

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
      body.append('_subject', `New Order from ${formData.name}`);

      const response = await fetch('https://formsubmit.co/ajax/bazaarnb2020@gmail.com', {
        method: 'POST',
        body: body,
      });

      if (response.ok) {
        setStage('complete');
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      setEmailError("Could not send order. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fe', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <ShoppingBag size={32} style={{ marginBottom: '10px' }} />
          <h2 style={{ margin: 0 }}>Digital Menu & Ordering</h2>
        </div>

        <div style={{ padding: '30px' }}>
          
          {/* STAGE 1: Selection */}
          {stage === 'selection' && (
            <div>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: '15px' }}>
                  <div 
                    onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))}
                    style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', border: '1px solid #eee' }}>
                    {cat} {expandedCategories[cat] ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  {expandedCategories[cat] && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                      {items.filter(i => i.category === cat).map(item => {
                        const inCart = cart.find(c => c.id === item.id);
                        return (
                          <div key={item.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '10px', background: inCart ? '#f0f7ff' : 'white' }}>
                            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                            <div style={{ color: '#667eea', marginBottom: '10px' }}>${item.price.toFixed(2)}</div>
                            {!inCart ? (
                              <button onClick={() => addToCart(item.id)} style={{ width: '100%', padding: '8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Add to Cart</button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <button onClick={() => updateQuantity(item.id, -1)} style={{ border: 'none', background: '#eee', borderRadius: '4px', padding: '5px' }}><Minus size={14}/></button>
                                <span>{inCart.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} style={{ border: 'none', background: '#eee', borderRadius: '4px', padding: '5px' }}><Plus size={14}/></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setStage('confirmation')} disabled={cart.length === 0} style={{ width: '100%', padding: '15px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '10px', marginTop: '20px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', opacity: cart.length === 0 ? 0.5 : 1 }}>
                View Cart & Checkout (${totalPrice.toFixed(2)})
              </button>
            </div>
          )}

          {/* STAGE 2: Confirmation */}
          {stage === 'confirmation' && (
            <div>
              <h3>Your Cart</h3>
              {cartItemsWithDetails.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span>{item.name} (x{item.quantity})</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                    <Trash2 size={18} color="#ff4d4d" cursor="pointer" onClick={() => removeFromCart(item.id)} />
                  </div>
                </div>
              ))}
              <div style={{ textAlign: 'right', padding: '20px 0', fontSize: '20px', fontWeight: 'bold' }}>Total: ${totalPrice.toFixed(2)}</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStage('selection')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}>Add More</button>
                <button onClick={() => setStage('details')} style={{ flex: 1, padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Enter Details</button>
              </div>
            </div>
          )}

          {/* STAGE 3: Contact Details */}
          {stage === 'details' && (
            <form onSubmit={handleSubmitDetails}>
              <h3>Delivery Details</h3>
              {emailError && <div style={{ color: 'red', marginBottom: '10px' }}>{emailError}</div>}
              <input type="text" placeholder="Full Name" required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="tel" placeholder="Phone Number" required style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <textarea placeholder="Delivery Address" required style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', height: '80px' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setStage('confirmation')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white' }}>Back</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                  {loading ? "Sending..." : "Place Order"}
                </button>
              </div>
            </form>
          )}

          {/* STAGE 4: Success */}
          {stage === 'complete' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ background: '#4BB543', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check color="white" size={32} />
              </div>
              <h2>Order Received!</h2>
              <p>Thank you, {formData.name}. We've sent your order details to the kitchen.</p>
              <button onClick={() => { setStage('selection'); setCart([]); }} style={{ marginTop: '20px', padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px' }}>Start New Order</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default OrderSystem;
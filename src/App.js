import React, { useState, useEffect } from 'react';
import { Check, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init({
  publicKey: 'kDHnV1qJZqL5mF8jK',
});

const OrderSystem = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [stage, setStage] = useState('selection');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Load menu from Excel file on component mount
  useEffect(() => {
    loadMenuFromFile('/menu.xlsx');
  }, []);

  const loadMenuFromFile = async (filePath) => {
    try {
      setFileError('');
      const response = await fetch(filePath);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setFileError('No menu data found in Excel file');
        return;
      }

      // Parse the data
      const menuItems = jsonData.map((row, idx) => ({
        id: idx + 1,
        category: row.Category || row.category || 'Unknown',
        name: row['Item Name'] || row['item name'] || row.Item || 'Unknown',
        price: parseFloat(row.Price || row.price || 0),
      }));

      // Group by category
      const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
      setCategories(uniqueCategories);
      setItems(menuItems);

      // Expand first category by default
      if (uniqueCategories.length > 0) {
        setExpandedCategories({ [uniqueCategories[0]]: true });
      }
    } catch (error) {
      setFileError('Error loading menu file. Make sure menu.xlsx exists in the public folder.');
      console.error('Error loading menu:', error);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleItem = (id) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[id]) {
        delete newItems[id];
      } else {
        newItems[id] = 1;
      }
      return newItems;
    });
  };

  const updateQuantity = (id, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (numQuantity <= 0) {
        delete newItems[id];
      } else {
        newItems[id] = numQuantity;
      }
      return newItems;
    });
  };

  const handleSubmitSelection = () => {
    const selectedCount = Object.keys(selectedItems).length;
    if (selectedCount === 0) {
      alert('Please select at least one item');
      return;
    }
    setStage('confirmation');
  };

  const handleConfirm = () => {
    setStage('details');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitDetails = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const selectedItemsList = items.filter((item) => selectedItems.includes(item.id));
      const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price, 0);

      const itemsList = selectedItemsList
        .map((item) => `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');

      // Send email
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('items', itemsList);
      formDataToSend.append('total_price', totalPrice.toFixed(2));
      formDataToSend.append('order_date', new Date().toLocaleString());
      formDataToSend.append('_subject', `New Order from ${formData.name}`);
      formDataToSend.append('_captcha', 'false');

      const response = await fetch('https://formsubmit.co/bazaarnb2020@gmail.com', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to send order');
      }

      setStage('complete');
    } catch (error) {
      setEmailError('Error sending order. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedItemsList = Object.entries(selectedItems)
    .map(([id, quantity]) => {
      const item = items.find((i) => i.id === parseInt(id));
      return item ? { ...item, quantity } : null;
    })
    .filter(Boolean);

  const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getCategoryItems = (category) => items.filter((item) => item.category === category);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px 30px',
          textAlign: 'center',
        }}>
          <ShoppingBag size={40} style={{ marginBottom: '10px' }} />
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold' }}>
            Place Your Order
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
            {stage === 'selection' && 'Select items from our menu'}
            {stage === 'confirmation' && 'Review your selection'}
            {stage === 'details' && 'Enter your contact information'}
            {stage === 'complete' && 'Order confirmed!'}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 30px' }}>


          {/* Selection Stage */}
          {stage === 'selection' && (
            <div>
              {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                  No menu items loaded. Please wait or upload an Excel file.
                </p>
              ) : (
                <>
                  {categories.map((category) => (
                    <div key={category} style={{ marginBottom: '20px' }}>
                      {/* Category Header */}
                      <div
                        onClick={() => toggleCategory(category)}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '15px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '10px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#764ba2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#667eea';
                        }}
                      >
                        <span>{category} ({getCategoryItems(category).length})</span>
                        {expandedCategories[category] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>

                      {/* Category Items */}
                      {expandedCategories[category] && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '15px',
                          marginBottom: '20px',
                        }}>
                          {getCategoryItems(category).map((item) => {
                            const isSelected = selectedItems[item.id];
                            return (
                              <div
                                key={item.id}
                                style={{
                                  border: isSelected ? '2px solid #667eea' : '2px solid #e0e0e0',
                                  borderRadius: '12px',
                                  padding: '15px',
                                  background: isSelected ? '#f0f4ff' : '#fff',
                                  transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                  <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold', color: '#333' }}>
                                      {item.name}
                                    </h3>
                                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#667eea' }}>
                                      ${item.price.toFixed(2)}
                                    </p>
                                  </div>
                                  <div
                                    onClick={() => toggleItem(item.id)}
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      border: '2px solid #667eea',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: isSelected ? '#667eea' : 'white',
                                      color: 'white',
                                      marginLeft: '10px',
                                      flexShrink: 0,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isSelected && <Check size={16} />}
                                  </div>
                                </div>

                                {isSelected && (
                                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ddd' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666', fontWeight: '600' }}>
                                      Quantity:
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={isSelected}
                                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '2px solid #667eea',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        color: '#667eea',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button
                      onClick={handleSubmitSelection}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '14px 40px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Submit Order ({Object.keys(selectedItems).length} types, {Object.values(selectedItems).reduce((a, b) => a + b, 0)} total items)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirmation Stage */}
          {stage === 'confirmation' && (
            <div>
              <h2 style={{ marginTop: '0', color: '#333' }}>Order Summary</h2>
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                {selectedItemsList.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#333', fontWeight: '500' }}>
                        {item.name}
                      </div>
                      <div style={{ color: '#999', fontSize: '13px', marginTop: '2px' }}>
                        ${item.price.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#667eea', minWidth: '80px', textAlign: 'right' }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '15px 0 0 0',
                  marginTop: '10px',
                  borderTop: '2px solid #667eea',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#667eea',
                }}>
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={() => setStage('selection')}
                  style={{
                    background: '#e0e0e0',
                    color: '#333',
                    border: 'none',
                    padding: '12px 30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#d0d0d0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e0e0e0';
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 40px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Confirm Order
                </button>
              </div>
            </div>
          )}

          {/* Details Stage */}
          {stage === 'details' && (
            <div>
              <h2 style={{ marginTop: '0', color: '#333' }}>Contact Information</h2>
              {emailError && (
                <div style={{
                  background: '#fee',
                  border: '2px solid #f44',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px',
                  color: '#c33',
                  fontWeight: 'bold',
                }}>
                  {emailError}
                </div>
              )}
              <form style={{ maxWidth: '500px', margin: '0 auto' }} onSubmit={(e) => { e.preventDefault(); handleSubmitDetails(); }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontWeight: 'bold',
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      if (!loading) e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontWeight: 'bold',
                  }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      if (!loading) e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontWeight: 'bold',
                  }}>
                    Delivery Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, City, State 12345"
                    rows="4"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s ease',
                      resize: 'vertical',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'auto',
                    }}
                    onFocus={(e) => {
                      if (!loading) e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setStage('confirmation')}
                    disabled={loading}
                    style={{
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      padding: '12px 30px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.background = '#d0d0d0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#e0e0e0';
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 40px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'transform 0.2s ease',
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {loading ? 'Sending Order...' : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Completion Stage */}
          {stage === 'complete' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: '#667eea',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Check size={48} color="white" />
              </div>
              <h2 style={{ color: '#667eea', marginTop: '0' }}>Order Placed Successfully!</h2>
              <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
                Thank you for your order. We'll prepare it right away and deliver it to your address.
              </p>

              <div style={{
                background: '#f9f9f9',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '30px',
                textAlign: 'left',
                maxWidth: '500px',
                margin: '0 auto 30px',
              }}>
                <h3 style={{ color: '#333', marginTop: '0' }}>Order Details</h3>
                <p style={{ color: '#666' }}>
                  <strong>Name:</strong> {formData.name}
                </p>
                <p style={{ color: '#666' }}>
                  <strong>Phone:</strong> {formData.phone}
                </p>
                <p style={{ color: '#666' }}>
                  <strong>Address:</strong> {formData.address}
                </p>
                <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: '15px', marginTop: '15px' }}>
                  <p style={{ color: '#666', marginBottom: '5px' }}>
                    <strong>Items Ordered ({selectedItemsList.length} types, {Object.values(selectedItems).reduce((a, b) => a + b, 0)} total):</strong>
                  </p>
                  {selectedItemsList.map((item) => (
                    <p key={item.id} style={{ color: '#666', margin: '5px 0' }}>
                      • {item.name} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  ))}
                  <p style={{ color: '#667eea', fontWeight: 'bold', marginTop: '10px', fontSize: '16px' }}>
                    Total: ${totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setStage('selection');
                  setSelectedItems([]);
                  setFormData({ name: '', phone: '', address: '' });
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 40px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Place Another Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSystem;
import React, { useState, useEffect } from 'react';
import { Check, ShoppingBag, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init({
  publicKey: 'kDHnV1qJZqL5mF8jK',
});

const OrderSystem = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [stage, setStage] = useState('selection');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [fileError, setFileError] = useState('');

  // Load menu from Excel file on component mount
  useEffect(() => {
    loadMenuFromFile('/menu.xlsx');
  }, []);

  const loadMenuFromFile = async (filePath) => {
    try {
      setFileError('');
      const response = await fetch(filePath);
      const blob = await response.arrayBuffer();
      const workbook = XLSX.read(blob, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        setFileError('No menu data found in Excel file');
        return;
      }

      // Parse the data
      const menuItems = jsonData.map((row, idx) => ({
        id: idx + 1,
        category: row.Category || row.category || 'Unknown',
        name: row['Item Name'] || row['item name'] || row.Item || 'Unknown',
        price: parseFloat(row.Price || row.price || 0),
      }));

      // Group by category
      const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
      setCategories(uniqueCategories);
      setItems(menuItems);

      // Expand first category by default
      if (uniqueCategories.length > 0) {
        setExpandedCategories({ [uniqueCategories[0]]: true });
      }
    } catch (error) {
      setFileError('Error loading menu file. Make sure menu.xlsx exists in the public folder.');
      console.error('Error loading menu:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setFileError('No menu data found in uploaded file');
          return;
        }

        const menuItems = jsonData.map((row, idx) => ({
          id: idx + 1,
          category: row.Category || row.category || 'Unknown',
          name: row['Item Name'] || row['item name'] || row.Item || 'Unknown',
          price: parseFloat(row.Price || row.price || 0),
        }));

        const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
        setCategories(uniqueCategories);
        setItems(menuItems);
        setFileError('');

        if (uniqueCategories.length > 0) {
          setExpandedCategories({ [uniqueCategories[0]]: true });
        }
      } catch (error) {
        setFileError('Error reading Excel file. Please ensure it has "Category", "Item Name", and "Price" columns.');
        console.error('Error parsing file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmitSelection = () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }
    setStage('confirmation');
  };

  const handleConfirm = () => {
    setStage('details');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitDetails = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const selectedItemsList = items.filter((item) => selectedItems.includes(item.id));
      const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price, 0);

      const itemsList = selectedItemsList
        .map((item) => `${item.name} - $${item.price.toFixed(2)}`)
        .join('\n');

      // Send email
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('items', itemsList);
      formDataToSend.append('total_price', totalPrice.toFixed(2));
      formDataToSend.append('order_date', new Date().toLocaleString());
      formDataToSend.append('_subject', `New Order from ${formData.name}`);
      formDataToSend.append('_captcha', 'false');

      const response = await fetch('https://formsubmit.co/bazaarnb2020@gmail.com', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to send order');
      }

      // Save order to Excel file
      await saveOrderToExcel(selectedItemsList, totalPrice);

      setStage('complete');
    } catch (error) {
      setEmailError('Error sending order. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveOrderToExcel = async (selectedItemsList, totalPrice) => {
    try {
      // Create a new workbook for the order
      const wb = XLSX.utils.book_new();

      // Prepare order data
      const orderData = [
        ['ORDER CONFIRMATION'],
        [],
        ['Order Date:', new Date().toLocaleString()],
        [],
        ['CUSTOMER INFORMATION'],
        ['Name:', formData.name],
        ['Phone:', formData.phone],
        ['Address:', formData.address],
        [],
        ['ORDER ITEMS'],
        ['Item Name', 'Price'],
        ...selectedItemsList.map((item) => [item.name, `$${item.price.toFixed(2)}`]),
        [],
        ['TOTAL:', `$${totalPrice.toFixed(2)}`],
      ];

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(orderData);

      // Set column widths
      ws['!cols'] = [{ wch: 30 }, { wch: 15 }];

      // Add to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Order');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `Order_${formData.name.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error saving order to Excel:', error);
      // Don't throw error - order was still sent via email
    }
  };

  const selectedItemsList = items.filter((item) => selectedItems.includes(item.id));
  const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price, 0);

  const getCategoryItems = (category) => items.filter((item) => item.category === category);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px 30px',
          textAlign: 'center',
        }}>
          <ShoppingBag size={40} style={{ marginBottom: '10px' }} />
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold' }}>
            Place Your Order
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
            {stage === 'selection' && 'Select items from our menu'}
            {stage === 'confirmation' && 'Review your selection'}
            {stage === 'details' && 'Enter your contact information'}
            {stage === 'complete' && 'Order confirmed!'}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 30px' }}>
          {/* File Upload (only on selection stage) */}
          {stage === 'selection' && (
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '15px',
                background: '#f0f4ff',
                borderRadius: '8px',
                cursor: 'pointer',
                border: '2px dashed #667eea',
                transition: 'all 0.3s ease',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e8ecff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f0f4ff';
                }}
              >
                <Upload size={20} color="#667eea" />
                <span style={{ color: '#667eea', fontWeight: '600' }}>
                  Upload Menu (Excel File)
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              {fileError && (
                <p style={{ color: '#c33', marginTop: '10px', fontSize: '14px' }}>
                  {fileError}
                </p>
              )}
              {items.length > 0 && (
                <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>
                  ✓ {items.length} items loaded from menu
                </p>
              )}
            </div>
          )}

          {/* Selection Stage */}
          {stage === 'selection' && (
            <div>
              {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                  No menu items loaded. Please wait or upload an Excel file.
                </p>
              ) : (
                <>
                  {categories.map((category) => (
                    <div key={category} style={{ marginBottom: '20px' }}>
                      {/* Category Header */}
                      <div
                        onClick={() => toggleCategory(category)}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '15px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '10px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#764ba2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#667eea';
                        }}
                      >
                        <span>{category} ({getCategoryItems(category).length})</span>
                        {expandedCategories[category] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>

                      {/* Category Items */}
                      {expandedCategories[category] && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '15px',
                          marginBottom: '20px',
                        }}>
                          {getCategoryItems(category).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => toggleItem(item.id)}
                              style={{
                                border: selectedItems.includes(item.id) ? '2px solid #667eea' : '2px solid #e0e0e0',
                                borderRadius: '12px',
                                padding: '15px',
                                cursor: 'pointer',
                                background: selectedItems.includes(item.id) ? '#f0f4ff' : '#fff',
                                transition: 'all 0.3s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'bold', color: '#333' }}>
                                    {item.name}
                                  </h3>
                                  <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#667eea' }}>
                                    ${item.price.toFixed(2)}
                                  </p>
                                </div>
                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    border: '2px solid #667eea',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: selectedItems.includes(item.id) ? '#667eea' : 'white',
                                    color: 'white',
                                    marginLeft: '10px',
                                    flexShrink: 0,
                                  }}
                                >
                                  {selectedItems.includes(item.id) && <Check size={16} />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button
                      onClick={handleSubmitSelection}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '14px 40px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Submit Order ({selectedItems.length} items)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirmation Stage */}
          {stage === 'confirmation' && (
            <div>
              <h2 style={{ marginTop: '0', color: '#333' }}>Order Summary</h2>
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                {selectedItemsList.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid #e0e0e0',
                  }}>
                    <span style={{ color: '#333' }}>{item.name}</span>
                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>${item.price.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '15px 0 0 0',
                  marginTop: '10px',
                  borderTop: '2px solid #667eea',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#667eea',
                }}>
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={() => setStage('selection')}
                  style={{
                    background: '#e0e0e0',
                    color: '#333',
                    border: 'none',
                    padding: '12px 30px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#d0d0d0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e0e0e0';
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 40px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Confirm Order
                </button>
              </div>
            </div>
          )}

          {/* Details Stage */}
          {stage === 'details' && (
            <div>
              <h2 style={{ marginTop: '0', color: '#333' }}>Contact Information</h2>
              {emailError && (
                <div style={{
                  background: '#fee',
                  border: '2px solid #f44',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px',
                  color: '#c33',
                  fontWeight: 'bold',
                }}>
                  {emailError}
                </div>
              )}
              <form style={{ maxWidth: '500px', margin: '0 auto' }} onSubmit={(e) => { e.preventDefault(); handleSubmitDetails(); }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontWeight: 'bold',
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      if (!loading) e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontWeight: 'bold',
                  }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      if (!loading) e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#333',
                    fontWeight: 'bold',
                  }}>
                    Delivery Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main Street, City, State 12345"
                    rows="4"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s ease',
                      resize: 'vertical',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'auto',
                    }}
                    onFocus={(e) => {
                      if (!loading) e.target.style.borderColor = '#667eea';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setStage('confirmation')}
                    disabled={loading}
                    style={{
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      padding: '12px 30px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s ease',
                      opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.background = '#d0d0d0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#e0e0e0';
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 40px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'transform 0.2s ease',
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {loading ? 'Sending Order...' : 'Place Order'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Completion Stage */}
          {stage === 'complete' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: '#667eea',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Check size={48} color="white" />
              </div>
              <h2 style={{ color: '#667eea', marginTop: '0' }}>Order Placed Successfully!</h2>
              <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
                Thank you for your order. We'll prepare it right away and deliver it to your address.
              </p>

              <div style={{
                background: '#f9f9f9',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '30px',
                textAlign: 'left',
                maxWidth: '500px',
                margin: '0 auto 30px',
              }}>
                <h3 style={{ color: '#333', marginTop: '0' }}>Order Details</h3>
                <p style={{ color: '#666' }}>
                  <strong>Name:</strong> {formData.name}
                </p>
                <p style={{ color: '#666' }}>
                  <strong>Phone:</strong> {formData.phone}
                </p>
                <p style={{ color: '#666' }}>
                  <strong>Address:</strong> {formData.address}
                </p>
                <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: '15px', marginTop: '15px' }}>
                  <p style={{ color: '#666', marginBottom: '5px' }}>
                    <strong>Items Ordered ({selectedItemsList.length}):</strong>
                  </p>
                  {selectedItemsList.map((item) => (
                    <p key={item.id} style={{ color: '#666', margin: '5px 0' }}>
                      • {item.name} - ${item.price.toFixed(2)}
                    </p>
                  ))}
                  <p style={{ color: '#667eea', fontWeight: 'bold', marginTop: '10px', fontSize: '16px' }}>
                    Total: ${totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setStage('selection');
                  setSelectedItems([]);
                  setFormData({ name: '', phone: '', address: '' });
                }}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 40px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Place Another Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSystem;

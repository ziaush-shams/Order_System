import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ShoppingBag, ChevronRight, ChevronDown, ArrowLeft, Send, Loader2, Package, MapPin, User, Phone, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';
import './App.css';

emailjs.init({
  publicKey: 'kDHnV1qJZqL5mF8jK',
});

function App() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [stage, setStage] = useState('selection');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [fileError, setFileError] = useState('');
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

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

      const menuItems = jsonData.map((row, idx) => ({
        id: idx + 1,
        category: row.Category || row.category || 'Unknown',
        name: row['Item Name'] || row['item name'] || row.Item || 'Unknown',
        price: parseFloat(row.Price || row.price || 0),
      }));

      const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
      setCategories(uniqueCategories);
      setItems(menuItems);
      setMenuLoaded(true);

      if (uniqueCategories.length > 0) {
        setExpandedCategories({ [uniqueCategories[0]]: true });
      }
    } catch (error) {
      setFileError('Error loading menu. Please check that menu.xlsx is in the public folder.');
      console.error('Error loading menu:', error);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleItem = (id) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = 1;
      }
      return copy;
    });
  };

  const updateQuantity = (id, quantity) => {
    const qty = parseInt(quantity) || 0;
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (qty <= 0) {
        delete copy[id];
      } else {
        copy[id] = qty;
      }
      return copy;
    });
  };

  const handleSubmitSelection = () => {
    if (Object.keys(selectedItems).length === 0) {
      alert('Please select at least one item');
      return;
    }
    setStage('confirmation');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitDetails = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    setEmailError('');

    try {
      const selectedItemsList = Object.keys(selectedItems)
        .map(id => items.find(i => i.id === parseInt(id)))
        .filter(Boolean);

      const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price * selectedItems[item.id], 0);

      const itemsList = selectedItemsList
        .map(item => `${item.name} x${selectedItems[item.id]} - $${(item.price * selectedItems[item.id]).toFixed(2)}`)
        .join('\n');

      const dataToSend = new FormData();
      dataToSend.append('name', formData.name);
      dataToSend.append('phone', formData.phone);
      dataToSend.append('address', formData.address);
      dataToSend.append('items', itemsList);
      dataToSend.append('total_price', totalPrice.toFixed(2));
      dataToSend.append('order_date', new Date().toLocaleString());
      dataToSend.append('_subject', `New Order from ${formData.name}`);
      dataToSend.append('_captcha', 'false');

      const response = await fetch('https://formsubmit.co/bazaarnb2020@gmail.com', {
        method: 'POST',
        body: dataToSend,
      });

      if (!response.ok) throw new Error('Failed to send order');

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
      const item = items.find(i => i.id === parseInt(id));
      return item ? { ...item, quantity } : null;
    })
    .filter(Boolean);

  const totalPrice = selectedItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = Object.values(selectedItems).reduce((a, b) => a + b, 0);
  const selectedCount = Object.keys(selectedItems).length;

  const getCategoryItems = useCallback((category) =>
    items.filter(item => item.category === category), [items]
  );

  // Filtered search results
  const searchResults = searchQuery.trim().length > 0
    ? items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchResultSelect = (id) => {
    toggleItem(id);
    // Expand the category of the selected item
    const item = items.find(i => i.id === id);
    if (item && item.category) {
      setExpandedCategories(prev => ({ ...prev, [item.category]: true }));
    }
  };

  // ─── STAGE: SELECTION ──────────────────────────────────────────
  if (stage === 'selection') {
    return (
      <div className="app-root">
        <div className="app-container">
          {/* Brand */}
          <div className="brand-mark">Bazaar<span className="brand-mark-accent">NB</span></div>

          {/* Header */}
          <header className="app-header">
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              title="Search items (Ctrl+K)"
              aria-label="Search items"
            >
              <Search size={18} />
              <span className="search-trigger-label">Search</span>
              <kbd className="search-trigger-kbd">⌘K</kbd>
            </button>
            <div className="header-center">
              <div className="header-badge">
                <ShoppingBag size={28} />
              </div>
              <h1 className="app-title">Place Your Order</h1>
              <p className="app-subtitle">Select items from our fresh menu</p>
            </div>
          </header>

          {/* Content */}
          <main className="app-main">
            {fileError && (
              <div className="error-banner">
                <span className="error-text">{fileError}</span>
              </div>
            )}

            {!menuLoaded ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Loading menu…</p>
              </div>
            ) : (
              <>
                {/* Category list */}
                {categories.map((category, catIdx) => {
                  const catItems = getCategoryItems(category);
                  const isExpanded = expandedCategories[category];
                  const catSelected = catItems.filter(i => selectedItems[i.id]).length;

                  return (
                    <div key={category} className="category-section" style={{ animationDelay: `${catIdx * 0.04}s` }}>
                      <button
                        className={`category-header ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleCategory(category)}
                        aria-expanded={isExpanded}
                      >
                        <span className="category-name">{category}</span>
                        <span className="category-count">{catItems.length} items</span>
                        {catSelected > 0 && (
                          <span className="category-badge">{catSelected} selected</span>
                        )}
                        <ChevronRight size={18} />
                      </button>

                      {isExpanded && (
                        <div className="items-grid">
                          {catItems.map(item => {
                            const qty = selectedItems[item.id];
                            return (
                              <div
                                key={item.id}
                                className={`item-card ${qty ? 'selected' : ''}`}
                              >
                                <div className="item-info">
                                  <h3 className="item-name">{item.name}</h3>
                                  <span className="item-price">${item.price.toFixed(2)}</span>
                                </div>

                                {qty ? (
                                  <div className="item-actions">
                                    <button
                                      className="qty-btn"
                                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, qty - 1); }}
                                      aria-label="Decrease quantity"
                                    >
                                      −
                                    </button>
                                    <span className="qty-value">{qty}</span>
                                    <button
                                      className="qty-btn"
                                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, qty + 1); }}
                                      aria-label="Increase quantity"
                                    >
                                      +
                                    </button>
                                    <button
                                      className="remove-btn"
                                      onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                                      aria-label="Remove item"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="add-btn"
                                    onClick={() => toggleItem(item.id)}
                                    aria-label={`Add ${item.name}`}
                                  >
                                    <Package size={18} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Bottom bar */}
                {selectedCount > 0 && (
                  <div className="bottom-bar">
                    <div className="bottom-bar-info">
                      <span className="bottom-bar-count">
                        {selectedCount} type{selectedCount !== 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''}
                      </span>
                      <span className="bottom-bar-total">${totalPrice.toFixed(2)}</span>
                    </div>
                    <button
                      className="submit-btn"
                      onClick={handleSubmitSelection}
                    >
                      <span>Continue to Review</span>
                      <ArrowLeft size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Search Overlay */}
          {searchOpen && (
            <div className="search-overlay" onClick={() => setSearchOpen(false)}>
              <div className="search-modal" onClick={(e) => e.stopPropagation()}>
                <div className="search-input-row">
                  <Search size={20} className="search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items or categories…"
                    aria-label="Search items"
                  />
                  <button
                    className="search-close-btn"
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    aria-label="Close search"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="search-results">
                  {searchQuery.trim().length === 0 ? (
                    <div className="search-placeholder">
                      <p>Start typing to search {items.length} items</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="search-empty">
                      <p>No results for "{searchQuery}"</p>
                    </div>
                  ) : (
                    searchResults.map(item => {
                      const qty = selectedItems[item.id];
                      return (
                        <button
                          key={item.id}
                          className={`search-result-item ${qty ? 'selected' : ''}`}
                          onClick={() => handleSearchResultSelect(item.id)}
                        >
                          <div className="search-result-info">
                            <span className="search-result-name">{item.name}</span>
                            <span className="search-result-category">{item.category}</span>
                          </div>
                          <div className="search-result-right">
                            <span className="search-result-price">${item.price.toFixed(2)}</span>
                            {qty ? (
                              <span className="search-result-qty">×{qty}</span>
                            ) : (
                              <span className="search-result-add">+ Add</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── STAGE: CONFIRMATION ───────────────────────────────────────
  if (stage === 'confirmation') {
    return (
      <div className="app-root">
        <div className="app-container">
          {/* Brand */}
          <div className="brand-mark">Bazaar<span className="brand-mark-accent">NB</span></div>

          <header className="app-header">
            <div className="header-badge">
              <ShoppingBag size={28} />
            </div>
            <h1 className="app-title">Review Your Order</h1>
            <p className="app-subtitle">Check everything looks right</p>
          </header>

          <main className="app-main">
            <div className="order-summary">
              {selectedItemsList.map(item => (
                <div key={item.id} className="summary-line">
                  <div className="summary-line-left">
                    <span className="summary-qty">{item.quantity}×</span>
                    <span className="summary-name">{item.name}</span>
                  </div>
                  <span className="summary-line-price">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}

              <div className="summary-total">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="stage-actions">
              <button className="btn btn-secondary" onClick={() => setStage('selection')}>
                <ArrowLeft size={16} />
                <span>Add Items</span>
              </button>
              <button className="btn btn-primary" onClick={() => setStage('details')}>
                <span>Confirm & Continue</span>
                <ArrowLeft size={16} />
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ─── STAGE: DETAILS ────────────────────────────────────────────
  if (stage === 'details') {
    return (
      <div className="app-root">
        <div className="app-container">
          {/* Brand */}
          <div className="brand-mark">Bazaar<span className="brand-mark-accent">NB</span></div>

          <header className="app-header">
            <div className="header-badge">
              <ShoppingBag size={28} />
            </div>
            <h1 className="app-title">Delivery Details</h1>
            <p className="app-subtitle">Where should we deliver?</p>
          </header>

          <main className="app-main">
            {emailError && (
              <div className="error-banner">
                <span className="error-text">{emailError}</span>
              </div>
            )}

            <form
              className="details-form"
              onSubmit={(e) => { e.preventDefault(); handleSubmitDetails(); }}
            >
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <User size={16} />
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="address" className="form-label">
                  <MapPin size={16} />
                  Delivery Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, City, State 12345"
                  rows="4"
                  disabled={loading}
                  required
                />
              </div>

              <div className="stage-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStage('confirmation')}
                  disabled={loading}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Sending Order…</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Place Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    );
  }

  // ─── STAGE: COMPLETE ───────────────────────────────────────────
  return (
    <div className="app-root">
      <div className="app-container">
        {/* Brand */}
        <div className="brand-mark">Bazaar<span className="brand-mark-accent">NB</span></div>

        <header className="app-header">
          <div className="header-badge success">
            <Check size={28} />
          </div>
          <h1 className="app-title">Order Confirmed!</h1>
          <p className="app-subtitle">Thank you for your order</p>
        </header>

        <main className="app-main">
          <div className="complete-card">
            <p className="complete-text">
              We'll prepare your order right away and deliver it to your address.
            </p>

            <div className="order-details">
              <h3>Order Details</h3>
              <div className="detail-row">
                <strong>Name:</strong>
                <span>{formData.name}</span>
              </div>
              <div className="detail-row">
                <strong>Phone:</strong>
                <span>{formData.phone}</span>
              </div>
              <div className="detail-row">
                <strong>Address:</strong>
                <span>{formData.address}</span>
              </div>

              <div className="order-items-section">
                <strong>
                  Items Ordered ({selectedCount} type{selectedCount !== 1 ? 's' : ''}, {totalItems} total)
                </strong>
                {selectedItemsList.map(item => (
                  <div key={item.id} className="detail-item">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="detail-total">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setStage('selection');
                setSelectedItems({});
                setFormData({ name: '', phone: '', address: '' });
              }}
            >
              <ShoppingBag size={16} />
              <span>Place Another Order</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

import React, { useState } from 'react';
import CustomersListing from './modules/Customers/Pages/Listing';
import RolesListing from './modules/Security/Roles/Pages/Listing';
import UsersListing from './modules/Security/Users/Pages/Listing';
import ItemsListing from './modules/Items/Pages/Listing';
import ContainersListing from './modules/Containers/Pages/Listing';

const TABS = [
  { key: 'customers', label: 'Customers', Component: CustomersListing },
  { key: 'roles', label: 'Roles', Component: RolesListing },
  { key: 'users', label: 'Users', Component: UsersListing },
  { key: 'items', label: 'Items', Component: ItemsListing },
  { key: 'containers', label: 'Containers', Component: ContainersListing },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.Component;

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1>Leather POS &amp; Accounting System</h1>

      <nav style={{ display: 'flex', gap: 8, borderBottom: '1px solid #ddd', marginBottom: 24 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #1976d2' : '2px solid transparent',
              background: 'transparent',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>{ActiveComponent && <ActiveComponent />}</main>
    </div>
  );
}

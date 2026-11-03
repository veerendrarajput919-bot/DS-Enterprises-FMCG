import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import TopNav from './components/layout/TopNav';
import Sidebar from './components/layout/Sidebar';
import LoginView from './views/LoginView';

// Module Views
import OverviewTrends from './views/OverviewTrends';
import SalesAnalysis from './views/SalesAnalysis';
import PartyWiseSales from './views/PartyWiseSales';
import RouteBeatAnalysis from './views/RouteBeatAnalysis';
import ItemBrandMatrix from './views/ItemBrandMatrix';
import SalesReports from './views/SalesReports';
import BillManagement from './views/BillManagement';
import OutstandingReceivables from './views/OutstandingReceivables';
import PaymentCollections from './views/PaymentCollections';
import ImsStockProducts from './views/ImsStockProducts';
import OrderPunching from './views/OrderPunching';
import OrderReports from './views/OrderReports';
import StockManagement from './views/StockManagement';
import PurchaseManagement from './views/PurchaseManagement';
import UserManagement from './views/UserManagement';
import RolePermissionManagement from './views/RolePermissionManagement';
import DataImportExport from './views/DataImportExport';
import SettingsView from './views/SettingsView';

const MODULE_TITLES = {
  'overview-trends': 'Overview & Trends',
  'sales-analysis': 'Sales Analysis & Filtering',
  'party-wise': 'Party-Wise Sales',
  'route-beat': 'Route & Beat Analysis',
  'item-brand-matrix': 'Item & Brand Matrix',
  'sales-reports': 'Sales Reports & Analytics',
  'bill-management': 'Bill & Invoice Management',
  'outstanding': 'Outstanding & Receivables Aging',
  'payment-collections': 'Payment Collections',
  'ims-stock': 'IMS Stock & Products',
  'order-punching': 'Order Punching & Spot Billing',
  'order-reports': 'Order Reports & Fulfillment',
  'stock-management': 'Stock Movement & Ledger',
  'purchase-management': 'Purchase Management & Inward',
  'user-management': 'User & Staff Management',
  'role-permissions': 'Role & Permission Management',
  'data-import-export': 'Data Import & Export Engine',
  'settings': 'Enterprise & System Settings'
};

export default function App() {
  const { user, token, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('overview-trends');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-300 text-sm font-semibold tracking-wider">
          Initializing Enterprise System...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <LoginView />;
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'overview-trends':
        return <OverviewTrends />;
      case 'sales-analysis':
        return <SalesAnalysis />;
      case 'party-wise':
        return <PartyWiseSales />;
      case 'route-beat':
        return <RouteBeatAnalysis />;
      case 'item-brand-matrix':
        return <ItemBrandMatrix />;
      case 'sales-reports':
        return <SalesReports />;
      case 'bill-management':
        return <BillManagement />;
      case 'outstanding':
        return <OutstandingReceivables />;
      case 'payment-collections':
        return <PaymentCollections />;
      case 'ims-stock':
        return <ImsStockProducts />;
      case 'order-punching':
        return <OrderPunching onNavigate={setActiveModule} />;
      case 'order-reports':
        return <OrderReports />;
      case 'stock-management':
        return <StockManagement />;
      case 'purchase-management':
        return <PurchaseManagement />;
      case 'user-management':
        return <UserManagement />;
      case 'role-permissions':
        return <RolePermissionManagement />;
      case 'data-import-export':
        return <DataImportExport />;
      case 'settings':
        return <SettingsView />;
      default:
        return <OverviewTrends />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNav
          activeModuleTitle={MODULE_TITLES[activeModule] || 'Dashboard'}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveModule()}
          </div>
        </main>
      </div>
    </div>
  );
}


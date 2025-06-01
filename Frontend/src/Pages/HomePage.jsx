import React, { useState, useEffect } from 'react';
// Import the components
import DayBook from '../components/Home/DayBook';
import Parties from '../components/Home/Parties';
import Sales from '../components/Home/Sales';
import './HomePage.css';
import Purchases from '../components/Home/Purchases';
import Inventory from '../components/Home/Inventory';

/**
 * HomePage component that serves as the main container for the application
 * Manages which view is currently active and passes that to child components
 */
function HomePage({ onNavigate, currentView: propCurrentView }) {
    // Current view state - tracks which component is being displayed
    const [currentView, setCurrentView] = useState('dailySummary');

    // Update internal state when props change
    useEffect(() => {
        if (propCurrentView && propCurrentView !== currentView) {
            console.log('HomePage: Updating view from props:', propCurrentView);
            setCurrentView(propCurrentView);
        }
    }, [propCurrentView]);

    // Handle navigation changes, potentially propagating up to parent
    const handleNavigation = (page) => {
        setCurrentView(page);
        if (onNavigate) {
            onNavigate(page);
        }
    };

    // Render the appropriate component based on the current view
    const renderContent = () => {
        switch (currentView) {
            case 'dailySummary':
                return <DayBook view={currentView} onNavigate={handleNavigation} />;
            case 'transactions':
                return <DayBook view={currentView} onNavigate={handleNavigation} />;
            case 'cashAndBank':
                return <DayBook view={currentView} onNavigate={handleNavigation} />;
            case 'parties':
                return <Parties onNavigate={handleNavigation} />;
            case 'allSales':
            case 'invoices':
            case 'createInvoice':
            case 'creditNotes':
                return <Sales view={currentView} onNavigate={handleNavigation} />;
            case 'allPurchases':
            case 'createPurchase':
            case 'purchaseOrders':
                return <Purchases view={currentView} onNavigate={handleNavigation} />;
            case 'products':
                return <div className="placeholder-content">Products & Services</div>;
            // Fix the inventory routing - add all inventory-related cases
            case 'inventory':
            case 'allProducts':
            case 'lowStock':
            case 'stockMovement':
                return <Inventory view={currentView} onNavigate={handleNavigation} />;
            case 'insights':
                return <div className="placeholder-content">Insights Dashboard</div>;
            case 'reports':
                return <div className="placeholder-content">Reports & Analytics</div>;
            case 'settings':
                return <div className="placeholder-content">Settings</div>;
            default:
                return <DayBook view="dailySummary" onNavigate={handleNavigation} />;
        }
    };

    return (
        <div className="homepage-container">
            {renderContent()}
        </div>
    );
}

export default HomePage;
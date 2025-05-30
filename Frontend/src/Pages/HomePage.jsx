import React, { useState, useEffect } from 'react';
// Import the components
import DayBook from '../components/Home/DayBook';
import Parties from '../components/Home/Parties';
import Sales from '../components/Home/Sales';
import './HomePage.css';

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

        // Main sections
        switch (currentView) {
            case 'dailySummary':
            case 'transactions':
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
                return <div className="placeholder-content">Purchases view: {currentView}</div>;
            case 'products':
                return <div className="placeholder-content">Products & Services</div>;
            case 'inventory':
                return <div className="placeholder-content">Inventory</div>;
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
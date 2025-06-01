// Frontend/src/components/Home/Sales/hooks/useProducts.js
import { useState, useEffect } from 'react';

export const useProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load sample products (replace with actual inventory API call)
        const sampleProducts = [
            {
                id: 1,
                name: 'Laptop Dell Inspiron 15',
                sku: 'DELL-INS-15-001',
                category: 'Electronics',
                price: 45000,
                gstRate: 18,
                unit: 'piece',
                stock: 25,
                description: 'Dell Inspiron 15 3000 Series Laptop'
            },
            {
                id: 2,
                name: 'Samsung Galaxy S23',
                sku: 'SAM-GAL-S23-001',
                category: 'Electronics',
                price: 75000,
                gstRate: 18,
                unit: 'piece',
                stock: 15,
                description: 'Samsung Galaxy S23 128GB'
            },
            {
                id: 3,
                name: 'Office Chair Executive',
                sku: 'OFC-CHR-EXE-001',
                category: 'Furniture',
                price: 8500,
                gstRate: 12,
                unit: 'piece',
                stock: 40,
                description: 'Executive Office Chair with Lumbar Support'
            },
            {
                id: 4,
                name: 'Wireless Mouse Logitech',
                sku: 'LOG-MOU-WL-001',
                category: 'Electronics',
                price: 1200,
                gstRate: 18,
                unit: 'piece',
                stock: 100,
                description: 'Logitech Wireless Mouse MX Master 3'
            },
            {
                id: 5,
                name: 'Notebook A4 200 Pages',
                sku: 'NB-A4-200-001',
                category: 'Stationery',
                price: 150,
                gstRate: 12,
                unit: 'piece',
                stock: 500,
                description: 'A4 Size Spiral Notebook 200 Pages'
            },
            {
                id: 6,
                name: 'Consultation Service',
                sku: 'SVC-CONS-001',
                category: 'Service',
                price: 2000,
                gstRate: 18,
                unit: 'hour',
                stock: null, // Services don't have stock
                description: 'Business Consultation Service per hour'
            }
        ];
        setProducts(sampleProducts);
    }, []);

    const searchProducts = (query) => {
        if (!query.trim()) return [];

        return products.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.sku.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions
    };

    const getProductById = (id) => {
        return products.find(product => product.id === id);
    };

    return {
        products,
        loading,
        searchProducts,
        getProductById
    };
};
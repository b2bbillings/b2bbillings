import React from 'react';
import AddCompanyForm from './AddCompanyForm';

// Simple test component to verify AddCompanyForm works independently
const TestAddCompany = () => {
  console.log("🧪 TestAddCompany component rendered");
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>🧪 Add Company Form Test</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        This is a direct test of the AddCompanyForm component to verify it works properly.
      </p>
      
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <AddCompanyForm onClose={() => alert('Form close requested!')} />
      </div>
    </div>
  );
};

export default TestAddCompany;
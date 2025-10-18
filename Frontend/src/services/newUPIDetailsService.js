const mockUPIs = [];

const getUPIDetails = async (companyId, query = {}) => {
  // Replace with real API call (fetch/axios) to your backend
  return {
    success: true,
    data: mockUPIs,
    message: 'Fetched UPI details (mock)'
  };
};

const createUPI = async (companyId, payload) => {
  const newItem = { _id: Date.now().toString(), ...payload, createdAt: new Date().toISOString() };
  mockUPIs.push(newItem);
  return { success: true, data: newItem };
};

const updateUPI = async (companyId, id, payload) => {
  const idx = mockUPIs.findIndex(u => u._id === id);
  if (idx === -1) return { success: false, message: 'Not found' };
  mockUPIs[idx] = { ...mockUPIs[idx], ...payload, updatedAt: new Date().toISOString() };
  return { success: true, data: mockUPIs[idx] };
};

const deleteUPI = async (companyId, id) => {
  const idx = mockUPIs.findIndex(u => u._id === id);
  if (idx === -1) return { success: false, message: 'Not found' };
  const removed = mockUPIs.splice(idx, 1)[0];
  return { success: true, data: removed };
};

export default {
  getUPIDetails,
  createUPI,
  updateUPI,
  deleteUPI,
};
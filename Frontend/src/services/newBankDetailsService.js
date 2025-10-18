const mockBanks = [];

const getBankDetails = async (companyId, query = {}) => {
  // Replace with real API call (fetch/axios) to your backend
  return {
    success: true,
    data: mockBanks,
    message: 'Fetched bank details (mock)'
  };
};

const createBank = async (companyId, payload) => {
  const newItem = { _id: Date.now().toString(), ...payload, createdAt: new Date().toISOString() };
  mockBanks.push(newItem);
  return { success: true, data: newItem };
};

export default {
  getBankDetails,
  createBank,
  // add update/delete as needed
};
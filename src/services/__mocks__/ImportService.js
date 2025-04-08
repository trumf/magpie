// Mock for ImportService
const ImportService = {
  initialize: jest.fn().mockResolvedValue(true),
  processFiles: jest.fn().mockResolvedValue([]),
};

export default ImportService;

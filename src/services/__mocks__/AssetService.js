// Mock for AssetService
const AssetService = {
  initialize: jest.fn().mockResolvedValue(true),
  loadAsset: jest.fn().mockResolvedValue(null),
  saveAsset: jest.fn().mockResolvedValue(true),
  deleteAsset: jest.fn().mockResolvedValue(true),
  listAssets: jest.fn().mockResolvedValue([]),
};

export default AssetService;

export const getAssetService = jest.fn().mockResolvedValue(AssetService);

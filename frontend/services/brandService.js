import { apiRequest } from './apiClient';

export const DEFAULT_BRAND_ID = 1;

export const brandService = {
  async getAllBrands() {
    return apiRequest('/brands');
  },

  async getBrandById(brandId = DEFAULT_BRAND_ID) {
    return apiRequest(`/brands/${brandId}`);
  },

  async getCreatorBrandProfile(brandId = null) {
    const myBrands = await this.getMyBrands().catch(() => []);
    if (Array.isArray(myBrands) && myBrands.length > 0) {
      return myBrands[0];
    }

    return brandId ? this.getBrandById(brandId).catch(() => null) : null;
  },

  async getMyBrands() {
    return apiRequest('/brands/me', { authRequired: true });
  },

  async hasCreatorBrand() {
    const brands = await this.getMyBrands().catch(() => []);
    return Array.isArray(brands) && brands.length > 0;
  },

  async createBrand(payload) {
    return apiRequest('/brands', {
      method: 'POST',
      authRequired: true,
      body: payload,
    });
  },
};

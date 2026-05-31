// API configuration
const API_BASE_URL = 'http://localhost:4000/api';

class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }

    // ==================== CATEGORIES ====================
    
    async getCategories(search = null) {
        let endpoint = '/categories';
        if (search) {
            endpoint += `?search=${encodeURIComponent(search)}`;
        }
        return this.request(endpoint);
    }

    async getCategoryById(categoryId) {
        return this.request(`/categories/${categoryId}`);
    }

    async createCategory(category) {
        return this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(category),
        });
    }

    async updateCategory(categoryId, category) {
        return this.request(`/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify(category),
        });
    }

    async deleteCategory(categoryId) {
        return this.request(`/categories/${categoryId}`, {
            method: 'DELETE',
        });
    }

    // ==================== INTENTS ====================

    async getIntents(filters = {}) {
        let endpoint = '/intents';
        const params = new URLSearchParams();

        if (filters.search) {
            params.append('search', filters.search);
        }
        if (filters.categoryId) {
            params.append('category_id', filters.categoryId);
        }
        if (filters.priority) {
            params.append('priority', filters.priority);
        }

        const queryString = params.toString();
        if (queryString) {
            endpoint += `?${queryString}`;
        }

        return this.request(endpoint);
    }

    async getIntentById(intentId) {
        return this.request(`/intents/${intentId}`);
    }

    async getIntentsByCategory(categoryId) {
        return this.request(`/categories/${categoryId}/intents`);
    }

    async createIntent(intent) {
        return this.request('/intents', {
            method: 'POST',
            body: JSON.stringify(intent),
        });
    }

    async updateIntent(intentId, intent) {
        return this.request(`/intents/${intentId}`, {
            method: 'PUT',
            body: JSON.stringify(intent),
        });
    }

    async deleteIntent(intentId) {
        return this.request(`/intents/${intentId}`, {
            method: 'DELETE',
        });
    }

    // ==================== MAPS ====================

    async getCities() {
        return this.request('/cities');
    }

    async createCity(name) {
        return this.request('/cities', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async getDistricts(cityId = null) {
        const params = cityId ? `?city_id=${cityId}` : '';
        return this.request(`/districts${params}`);
    }

    async createDistrict(name, cityId, lname = null) {
        const body = { name, city: parseInt(cityId) };
        if (lname) body.lname = lname;
        return this.request('/districts', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async getStreets(districtId = null, cityId = null) {
        const params = new URLSearchParams();
        if (districtId) params.append('district_id', districtId);
        else if (cityId) params.append('city_id', cityId);
        const qs = params.toString();
        return this.request(`/streets${qs ? '?' + qs : ''}`);
    }

    async createStreet(name, districtId, cityId, type = null) {
        const body = { name, district_id: parseInt(districtId), city_id: parseInt(cityId) };
        if (type) body.type = type;
        return this.request('/streets', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
}

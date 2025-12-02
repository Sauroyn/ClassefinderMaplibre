/**
 * API Client for backend communication
 * Handles all HTTP requests to the backend server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Helper to convert old config name (e.g., "Le Mans univ multi.json") to slug
 * Used for localStorage migration from static files to API
 */
export function configNameToSlug(name: string): string {
  // Remove .json extension if present
  const withoutExt = name.replace(/\.json$/i, '');
  // Convert to slug: lowercase, replace spaces with hyphens
  return withoutExt
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .trim();
}

// Types
export interface ConfigListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigData extends ConfigListItem {
  data: any; // The actual config JSON
}

export interface GeoJSONListItem {
  id: string;
  path: string;
  name: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeoJSONData extends GeoJSONListItem {
  data: GeoJSON.FeatureCollection;
}

// Configs API
export const configsAPI = {
  async list(): Promise<ConfigListItem[]> {
    const response = await fetch(`${API_BASE_URL}/configs`);
    if (!response.ok) throw new Error('Failed to fetch configs');
    return response.json();
  },

  async get(slug: string): Promise<ConfigData> {
    const response = await fetch(`${API_BASE_URL}/configs/${slug}`);
    if (!response.ok) throw new Error(`Failed to fetch config: ${slug}`);
    return response.json();
  },

  async create(name: string, slug: string, data: any): Promise<ConfigData> {
    const response = await fetch(`${API_BASE_URL}/configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, data })
    });
    if (!response.ok) throw new Error('Failed to create config');
    return response.json();
  },

  async update(slug: string, updates: Partial<{ name: string; slug: string; data: any }>): Promise<ConfigData> {
    const response = await fetch(`${API_BASE_URL}/configs/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update config');
    return response.json();
  },

  async delete(slug: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/configs/${slug}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete config');
  }
};

// GeoJSON API
export const geojsonAPI = {
  async list(folder?: string): Promise<GeoJSONListItem[]> {
    const url = folder 
      ? `${API_BASE_URL}/geojson?folder=${encodeURIComponent(folder)}`
      : `${API_BASE_URL}/geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch geojson list');
    return response.json();
  },

  async get(id: string): Promise<GeoJSONData> {
    const response = await fetch(`${API_BASE_URL}/geojson/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch geojson: ${id}`);
    return response.json();
  },

  async getByPath(path: string): Promise<GeoJSONData> {
    const response = await fetch(`${API_BASE_URL}/geojson/by-path/${path}`);
    if (!response.ok) throw new Error(`Failed to fetch geojson by path: ${path}`);
    return response.json();
  },

  async create(path: string, name: string, folder: string, data: GeoJSON.FeatureCollection): Promise<GeoJSONData> {
    const response = await fetch(`${API_BASE_URL}/geojson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name, folder, data })
    });
    if (!response.ok) throw new Error('Failed to create geojson');
    return response.json();
  },

  async update(id: string, updates: Partial<{ path: string; name: string; folder: string; data: GeoJSON.FeatureCollection }>): Promise<GeoJSONData> {
    const response = await fetch(`${API_BASE_URL}/geojson/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update geojson');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/geojson/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete geojson');
  }
};

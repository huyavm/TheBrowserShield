const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const PROFILES_FILE = path.join(__dirname, '../data/profiles.json');

class ProfileService {
    constructor() {
        this.profiles = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the service by loading profiles from file
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadProfiles();
            this.initialized = true;
            logger.info('ProfileService initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize ProfileService:', error);
            // Initialize with empty profiles if file doesn't exist
            this.profiles = new Map();
            this.initialized = true;
        }
    }

    /**
     * Load profiles from JSON file
     */
    async loadProfiles() {
        try {
            const data = await fs.readFile(PROFILES_FILE, 'utf8');
            const profilesArray = JSON.parse(data);
            
            this.profiles.clear();
            profilesArray.forEach(profile => {
                this.profiles.set(profile.id, profile);
            });
            
            logger.info(`Loaded ${this.profiles.size} profiles`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('Profiles file not found, starting with empty profiles');
                await this.saveProfiles(); // Create the file
            } else {
                throw error;
            }
        }
    }

    /**
     * Save profiles to JSON file
     */
    async saveProfiles() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(PROFILES_FILE);
            await fs.mkdir(dataDir, { recursive: true });
            
            const profilesArray = Array.from(this.profiles.values());
            await fs.writeFile(PROFILES_FILE, JSON.stringify(profilesArray, null, 2));
            logger.info(`Saved ${profilesArray.length} profiles to file`);
        } catch (error) {
            logger.error('Failed to save profiles:', error);
            throw error;
        }
    }

    /**
     * Create a new profile
     * @param {Object} profileData - Profile data
     * @returns {Object} Created profile
     */
    async createProfile(profileData) {
        await this.initialize();
        
        const profile = {
            id: uuidv4(),
            name: profileData.name,
            userAgent: profileData.userAgent || this.getRandomUserAgent(),
            timezone: profileData.timezone || 'America/New_York',
            proxy: profileData.proxy || null,
            viewport: profileData.viewport || { width: 1366, height: 768 },
            spoofFingerprint: profileData.spoofFingerprint !== false, // Default to true
            defaultHeadless: profileData.defaultHeadless ?? false, // Default to false (visible mode)
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validate profile data
        this.validateProfile(profile);
        
        this.profiles.set(profile.id, profile);
        await this.saveProfiles();
        
        logger.info(`Created profile: ${profile.name} (${profile.id})`);
        return profile;
    }

    /**
     * Get all profiles
     * @returns {Array} Array of profiles
     */
    async getAllProfiles() {
        await this.initialize();
        return Array.from(this.profiles.values());
    }

    /**
     * Get profile by ID
     * @param {string} id - Profile ID
     * @returns {Object|null} Profile or null if not found
     */
    async getProfile(id) {
        await this.initialize();
        return this.profiles.get(id) || null;
    }

    /**
     * Update profile
     * @param {string} id - Profile ID
     * @param {Object} updateData - Data to update
     * @returns {Object|null} Updated profile or null if not found
     */
    async updateProfile(id, updateData) {
        await this.initialize();
        
        const profile = this.profiles.get(id);
        if (!profile) return null;
        
        const updatedProfile = {
            ...profile,
            ...updateData,
            id: profile.id, // Prevent ID change
            createdAt: profile.createdAt, // Prevent creation date change
            updatedAt: new Date().toISOString()
        };
        
        this.validateProfile(updatedProfile);
        
        this.profiles.set(id, updatedProfile);
        await this.saveProfiles();
        
        logger.info(`Updated profile: ${updatedProfile.name} (${id})`);
        return updatedProfile;
    }

    /**
     * Delete profile
     * @param {string} id - Profile ID
     * @returns {boolean} True if deleted, false if not found
     */
    async deleteProfile(id) {
        await this.initialize();
        
        const profile = this.profiles.get(id);
        if (!profile) return false;
        
        this.profiles.delete(id);
        await this.saveProfiles();
        
        logger.info(`Deleted profile: ${profile.name} (${id})`);
        return true;
    }

    /**
     * Validate profile data
     * @param {Object} profile - Profile to validate
     */
    validateProfile(profile) {
        if (!profile.name || typeof profile.name !== 'string') {
            throw new Error('Profile name is required and must be a string');
        }
        
        if (profile.viewport) {
            if (!profile.viewport.width || !profile.viewport.height) {
                throw new Error('Viewport width and height are required');
            }
            if (profile.viewport.width < 100 || profile.viewport.height < 100) {
                throw new Error('Viewport dimensions must be at least 100x100');
            }
        }
        
        if (profile.proxy) {
            if (!profile.proxy.host || !profile.proxy.port) {
                throw new Error('Proxy host and port are required when proxy is specified');
            }
            if (!['http', 'https', 'socks4', 'socks5'].includes(profile.proxy.type)) {
                profile.proxy.type = 'http'; // Default to http
            }
        }
        
        // Validate defaultHeadless if provided
        if (profile.defaultHeadless !== undefined && typeof profile.defaultHeadless !== 'boolean') {
            throw new Error('defaultHeadless must be a boolean');
        }
    }

    /**
     * Get a random user agent
     * @returns {string} Random user agent string
     */
    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }
}

module.exports = new ProfileService();

/**
 * Enhanced Anti-Detection Suite
 * Comprehensive browser fingerprinting protection and stealth techniques
 */

class AntiDetectionSuite {
    /**
     * Apply all anti-detection measures to page
     * @param {Object} page - Puppeteer page instance
     * @param {Object} profile - Profile configuration
     */
    static async apply(page, profile) {
        await Promise.all([
            this.hideWebDriver(page),
            this.injectChrome(page),
            this.cleanSeleniumTraces(page),
            this.spoofPlugins(page),
            this.fixBrokenImageDimensions(page),
            this.spoofCanvas(page),
            this.spoofWebRTC(page),
            this.spoofAudioContext(page),
            this.spoofWebGL(page),
            this.spoofTimezone(page, profile.timezone),
            this.spoofLanguages(page, profile.languages || ['en-US', 'en']),
            this.spoofScreen(page, profile.screen),
            this.spoofHardware(page, profile.hardware),
            this.spoofPerformanceTiming(page),
            this.spoofBehavioralPatterns(page),
            this.spoofFontFingerprinting(page)
        ]);
    }

    /**
     * Hide navigator.webdriver property - CRITICAL for bot detection
     */
    static async hideWebDriver(page) {
        await page.evaluateOnNewDocument(() => {
            // Method 1: Delete from prototype chain first
            const proto = Object.getPrototypeOf(navigator);
            if ('webdriver' in proto) {
                delete proto.webdriver;
            }
            
            // Method 2: Redefine property to return undefined
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                set: () => {},
                configurable: true,
                enumerable: false
            });
            
            // Method 3: Override Object.getOwnPropertyDescriptor for navigator.webdriver
            const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
            Object.getOwnPropertyDescriptor = function(obj, prop) {
                if (obj === navigator && prop === 'webdriver') {
                    return undefined;
                }
                return originalGetOwnPropertyDescriptor.call(this, obj, prop);
            };
            
            // Method 4: Override 'in' operator behavior via Proxy (for lodash _.has check)
            // This is tricky - we need to intercept property checks
            const originalHasOwnProperty = Object.prototype.hasOwnProperty;
            Object.prototype.hasOwnProperty = function(prop) {
                if (prop === 'webdriver' && this === navigator) {
                    return false;
                }
                return originalHasOwnProperty.call(this, prop);
            };
            
            // Method 5: Override Object.keys to exclude webdriver
            const originalKeys = Object.keys;
            Object.keys = function(obj) {
                const keys = originalKeys.call(this, obj);
                if (obj === navigator) {
                    return keys.filter(k => k !== 'webdriver');
                }
                return keys;
            };
            
            // Method 6: Override Object.getOwnPropertyNames
            const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
            Object.getOwnPropertyNames = function(obj) {
                const names = originalGetOwnPropertyNames.call(this, obj);
                if (obj === navigator) {
                    return names.filter(n => n !== 'webdriver');
                }
                return names;
            };
        });
    }

    /**
     * Inject window.chrome object - Required for Chrome detection
     */
    static async injectChrome(page) {
        await page.evaluateOnNewDocument(() => {
            // Create realistic chrome object
            window.chrome = {
                app: {
                    isInstalled: false,
                    InstallState: {
                        DISABLED: 'disabled',
                        INSTALLED: 'installed',
                        NOT_INSTALLED: 'not_installed'
                    },
                    RunningState: {
                        CANNOT_RUN: 'cannot_run',
                        READY_TO_RUN: 'ready_to_run',
                        RUNNING: 'running'
                    },
                    getDetails: function() { return null; },
                    getIsInstalled: function() { return false; },
                    installState: function(callback) { 
                        if (callback) callback('not_installed'); 
                    },
                    runningState: function() { return 'cannot_run'; }
                },
                csi: function() {
                    return {
                        onloadT: Date.now(),
                        pageT: Date.now() - performance.timing.navigationStart,
                        startE: performance.timing.navigationStart,
                        tran: 15
                    };
                },
                loadTimes: function() {
                    return {
                        commitLoadTime: Date.now() / 1000,
                        connectionInfo: 'http/1.1',
                        finishDocumentLoadTime: Date.now() / 1000,
                        finishLoadTime: Date.now() / 1000,
                        firstPaintAfterLoadTime: 0,
                        firstPaintTime: Date.now() / 1000,
                        navigationType: 'Other',
                        npnNegotiatedProtocol: 'unknown',
                        requestTime: Date.now() / 1000,
                        startLoadTime: Date.now() / 1000,
                        wasAlternateProtocolAvailable: false,
                        wasFetchedViaSpdy: false,
                        wasNpnNegotiated: false
                    };
                },
                runtime: {
                    OnInstalledReason: {
                        CHROME_UPDATE: 'chrome_update',
                        INSTALL: 'install',
                        SHARED_MODULE_UPDATE: 'shared_module_update',
                        UPDATE: 'update'
                    },
                    OnRestartRequiredReason: {
                        APP_UPDATE: 'app_update',
                        OS_UPDATE: 'os_update',
                        PERIODIC: 'periodic'
                    },
                    PlatformArch: {
                        ARM: 'arm',
                        ARM64: 'arm64',
                        MIPS: 'mips',
                        MIPS64: 'mips64',
                        X86_32: 'x86-32',
                        X86_64: 'x86-64'
                    },
                    PlatformNaclArch: {
                        ARM: 'arm',
                        MIPS: 'mips',
                        MIPS64: 'mips64',
                        X86_32: 'x86-32',
                        X86_64: 'x86-64'
                    },
                    PlatformOs: {
                        ANDROID: 'android',
                        CROS: 'cros',
                        LINUX: 'linux',
                        MAC: 'mac',
                        OPENBSD: 'openbsd',
                        WIN: 'win'
                    },
                    RequestUpdateCheckStatus: {
                        NO_UPDATE: 'no_update',
                        THROTTLED: 'throttled',
                        UPDATE_AVAILABLE: 'update_available'
                    },
                    connect: function() { return {}; },
                    sendMessage: function() {}
                }
            };
        });
    }

    /**
     * Clean all Selenium/WebDriver traces from document
     */
    static async cleanSeleniumTraces(page) {
        await page.evaluateOnNewDocument(() => {
            // List of all known Selenium/WebDriver detection keys
            const documentDetectionKeys = [
                '__webdriver_evaluate',
                '__selenium_evaluate',
                '__webdriver_script_function',
                '__webdriver_script_func',
                '__webdriver_script_fn',
                '__fxdriver_evaluate',
                '__driver_unwrapped',
                '__webdriver_unwrapped',
                '__driver_evaluate',
                '__selenium_unwrapped',
                '__fxdriver_unwrapped',
                'webdriver',
                '_Selenium_IDE_Recorder',
                '_selenium',
                'calledSelenium',
                '_WEBDRIVER_ELEM_CACHE',
                'ChromeDriverw',
                'driver-evaluate',
                'webdriver-evaluate',
                'selenium-evaluate',
                'webdriverCommand',
                'webdriver-evaluate-response',
                '__webdriverFunc',
                '__lastWatirAlert',
                '__lastWatirConfirm',
                '__lastWatirPrompt',
                '$chrome_asyncScriptInfo',
                '$cdc_asdjflasutopfhvcZLmcfl_',
                '__$webdriverAsyncExecutor'
            ];

            const windowDetectionKeys = [
                '_phantom',
                '__nightmare',
                '_selenium',
                'callPhantom',
                'callSelenium',
                '_Selenium_IDE_Recorder'
            ];

            // Prevent these properties from being added in the first place
            const blockProperty = (obj, keys) => {
                keys.forEach(key => {
                    try {
                        Object.defineProperty(obj, key, {
                            get: () => undefined,
                            set: () => {},
                            configurable: false,
                            enumerable: false
                        });
                    } catch (e) {}
                });
            };

            // Block on window
            blockProperty(window, windowDetectionKeys);
            
            // Block on document
            blockProperty(document, documentDetectionKeys);

            // Override getAttribute to hide selenium/webdriver/driver attributes
            const originalGetAttribute = Element.prototype.getAttribute;
            Element.prototype.getAttribute = function(name) {
                if (['selenium', 'webdriver', 'driver'].includes(name.toLowerCase())) {
                    return null;
                }
                return originalGetAttribute.call(this, name);
            };

            // Override external.toString to hide Sequentum
            try {
                if (window.external) {
                    Object.defineProperty(window.external, 'toString', {
                        value: function() { return '[object External]'; },
                        writable: false,
                        configurable: false
                    });
                }
            } catch (e) {}

            // Block $cdc_ pattern properties using Proxy on document
            // This catches dynamically added properties
            const handler = {
                get: function(target, prop) {
                    if (typeof prop === 'string' && (prop.match(/^\$[a-z]dc_/) || prop.match(/^cdc_/))) {
                        return undefined;
                    }
                    return Reflect.get(target, prop);
                },
                has: function(target, prop) {
                    if (typeof prop === 'string' && (prop.match(/^\$[a-z]dc_/) || prop.match(/^cdc_/))) {
                        return false;
                    }
                    return Reflect.has(target, prop);
                }
            };
            
            // Note: We can't proxy document directly, but we can intercept property access
            const originalDocumentKeys = Object.keys;
            Object.keys = function(obj) {
                const keys = originalDocumentKeys.call(this, obj);
                if (obj === document) {
                    return keys.filter(k => !k.match(/^\$[a-z]dc_/) && !k.match(/^cdc_/));
                }
                return keys;
            };
        });
    }

    /**
     * Spoof plugins to appear as real browser
     */
    static async spoofPlugins(page) {
        await page.evaluateOnNewDocument(() => {
            // Create realistic plugin array
            const pluginData = [
                {
                    name: 'Chrome PDF Plugin',
                    description: 'Portable Document Format',
                    filename: 'internal-pdf-viewer',
                    mimeTypes: [
                        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
                    ]
                },
                {
                    name: 'Chrome PDF Viewer',
                    description: '',
                    filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                    mimeTypes: [
                        { type: 'application/pdf', suffixes: 'pdf', description: '' }
                    ]
                },
                {
                    name: 'Native Client',
                    description: '',
                    filename: 'internal-nacl-plugin',
                    mimeTypes: [
                        { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
                        { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' }
                    ]
                }
            ];

            // Create mock Plugin class
            function MockPlugin(data) {
                this.name = data.name;
                this.description = data.description;
                this.filename = data.filename;
                this.length = data.mimeTypes.length;
                
                data.mimeTypes.forEach((mime, index) => {
                    this[index] = {
                        type: mime.type,
                        suffixes: mime.suffixes,
                        description: mime.description,
                        enabledPlugin: this
                    };
                });
            }
            
            MockPlugin.prototype.item = function(index) {
                return this[index] || null;
            };
            
            MockPlugin.prototype.namedItem = function(name) {
                for (let i = 0; i < this.length; i++) {
                    if (this[i].type === name) return this[i];
                }
                return null;
            };
            
            MockPlugin.prototype.toString = function() {
                return '[object Plugin]';
            };

            // Create mock PluginArray
            const mockPlugins = pluginData.map(data => new MockPlugin(data));
            
            const pluginArray = {
                length: mockPlugins.length,
                item: function(index) {
                    return mockPlugins[index] || null;
                },
                namedItem: function(name) {
                    return mockPlugins.find(p => p.name === name) || null;
                },
                refresh: function() {}
            };
            
            mockPlugins.forEach((plugin, index) => {
                pluginArray[index] = plugin;
            });

            // Make it instanceof PluginArray
            Object.setPrototypeOf(pluginArray, PluginArray.prototype);

            Object.defineProperty(navigator, 'plugins', {
                get: () => pluginArray,
                configurable: true
            });
        });
    }

    /**
     * Fix broken image dimensions (should return non-zero for broken images)
     */
    static async fixBrokenImageDimensions(page) {
        await page.evaluateOnNewDocument(() => {
            // Override Image to return proper dimensions for broken images
            const originalImage = window.Image;
            window.Image = function(width, height) {
                const img = new originalImage(width, height);
                
                // Store original naturalWidth/naturalHeight getters
                const originalNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');
                const originalNaturalHeight = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalHeight');
                
                // Override for broken images to return 16x16 (Chrome default)
                Object.defineProperty(img, 'width', {
                    get: function() {
                        if (!this.complete || this.naturalWidth === 0) {
                            return 16;
                        }
                        return this.naturalWidth;
                    },
                    configurable: true
                });
                
                Object.defineProperty(img, 'height', {
                    get: function() {
                        if (!this.complete || this.naturalHeight === 0) {
                            return 16;
                        }
                        return this.naturalHeight;
                    },
                    configurable: true
                });
                
                return img;
            };
            window.Image.prototype = originalImage.prototype;
        });
    }

    /**
     * Canvas fingerprinting protection with noise injection
     */
    static async spoofCanvas(page) {
        await page.evaluateOnNewDocument(() => {
            const getContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type, attributes) {
                if (type === '2d') {
                    const context = getContext.call(this, type, attributes);
                    const getImageData = context.getImageData;
                    
                    context.getImageData = function(x, y, w, h) {
                        const imageData = getImageData.call(this, x, y, w, h);
                        
                        // Add subtle noise to prevent fingerprinting
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            const noise = Math.floor(Math.random() * 3) - 1;
                            imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
                            imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
                            imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
                        }
                        return imageData;
                    };
                    
                    // Spoof canvas text rendering
                    const fillText = context.fillText;
                    context.fillText = function(text, x, y, maxWidth) {
                        // Add tiny offset to prevent text fingerprinting
                        const offsetX = Math.random() * 0.1 - 0.05;
                        const offsetY = Math.random() * 0.1 - 0.05;
                        return fillText.call(this, text, x + offsetX, y + offsetY, maxWidth);
                    };
                    
                    return context;
                }
                return getContext.call(this, type, attributes);
            };
        });
    }

    /**
     * WebRTC IP leak protection
     */
    static async spoofWebRTC(page) {
        await page.evaluateOnNewDocument(() => {
            if (typeof RTCPeerConnection !== 'undefined') {
                const originalRTCPeerConnection = RTCPeerConnection;
                
                window.RTCPeerConnection = function(...args) {
                    const pc = new originalRTCPeerConnection(...args);
                    
                    // Block local IP gathering
                    const originalCreateOffer = pc.createOffer;
                    pc.createOffer = function(options) {
                        const offer = originalCreateOffer.call(this, options);
                        return offer.then(description => {
                            description.sdp = description.sdp.replace(/c=IN IP4 .*?\r\n/g, 'c=IN IP4 0.0.0.0\r\n');
                            return description;
                        });
                    };
                    
                    return pc;
                };
                
                // Also block WebRTC completely if needed
                navigator.getUserMedia = undefined;
                navigator.webkitGetUserMedia = undefined;
                navigator.mozGetUserMedia = undefined;
                navigator.mediaDevices = {
                    getUserMedia: () => Promise.reject(new Error('Permission denied'))
                };
            }
        });
    }

    /**
     * Audio context fingerprinting protection
     */
    static async spoofAudioContext(page) {
        await page.evaluateOnNewDocument(() => {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
                AudioContext.prototype.createAnalyser = function() {
                    const analyser = originalCreateAnalyser.call(this);
                    const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
                    const originalGetByteFrequencyData = analyser.getByteFrequencyData;
                    
                    analyser.getFloatFrequencyData = function(array) {
                        originalGetFloatFrequencyData.call(this, array);
                        // Add noise to frequency data
                        for (let i = 0; i < array.length; i++) {
                            array[i] += Math.random() * 0.1 - 0.05;
                        }
                    };
                    
                    analyser.getByteFrequencyData = function(array) {
                        originalGetByteFrequencyData.call(this, array);
                        // Add noise to byte frequency data
                        for (let i = 0; i < array.length; i++) {
                            array[i] = Math.max(0, Math.min(255, array[i] + Math.floor(Math.random() * 3) - 1));
                        }
                    };
                    
                    return analyser;
                };
            }
        });
    }

    /**
     * WebGL fingerprinting protection
     */
    static async spoofWebGL(page) {
        await page.evaluateOnNewDocument(() => {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                // Randomize WebGL parameters to prevent fingerprinting
                if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
                    const vendors = ['Intel Inc.', 'AMD', 'NVIDIA Corporation'];
                    return vendors[Math.floor(Math.random() * vendors.length)];
                }
                if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
                    const renderers = [
                        'Intel Iris OpenGL Engine',
                        'AMD Radeon Graphics',
                        'NVIDIA GeForce GTX'
                    ];
                    return renderers[Math.floor(Math.random() * renderers.length)];
                }
                if (parameter === 7938) { // MAX_TEXTURE_SIZE
                    return Math.pow(2, 13 + Math.floor(Math.random() * 3)); // 8192, 16384, or 32768
                }
                return getParameter.call(this, parameter);
            };

            // Also handle WebGL2
            if (typeof WebGL2RenderingContext !== 'undefined') {
                const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
                WebGL2RenderingContext.prototype.getParameter = function(parameter) {
                    if (parameter === 37445 || parameter === 37446 || parameter === 7938) {
                        return WebGLRenderingContext.prototype.getParameter.call(this, parameter);
                    }
                    return getParameter2.call(this, parameter);
                };
            }
        });
    }

    /**
     * Timezone spoofing
     */
    static async spoofTimezone(page, timezone) {
        if (timezone) {
            await page.evaluateOnNewDocument((tz) => {
                // Override Date timezone methods
                const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
                Date.prototype.getTimezoneOffset = function() {
                    // Calculate offset based on specified timezone
                    const date = new Date();
                    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
                    const targetTime = new Date(utc + (getTimezoneOffsetForZone(tz) * 60000));
                    return -getTimezoneOffsetForZone(tz);
                };

                function getTimezoneOffsetForZone(timezone) {
                    const offsets = {
                        'America/New_York': -300,
                        'America/Los_Angeles': -480,
                        'Europe/London': 0,
                        'Europe/Paris': 60,
                        'Asia/Tokyo': 540,
                        'Asia/Shanghai': 480
                    };
                    return offsets[timezone] || 0;
                }
            }, timezone);
        }
    }

    /**
     * Language preferences spoofing
     */
    static async spoofLanguages(page, languages) {
        await page.evaluateOnNewDocument((langs) => {
            Object.defineProperty(navigator, 'languages', {
                get: () => langs
            });
            Object.defineProperty(navigator, 'language', {
                get: () => langs[0]
            });
        }, languages);
    }

    /**
     * Screen resolution spoofing
     */
    static async spoofScreen(page, screenConfig) {
        if (screenConfig) {
            await page.evaluateOnNewDocument((config) => {
                Object.defineProperty(screen, 'width', { value: config.width || 1920 });
                Object.defineProperty(screen, 'height', { value: config.height || 1080 });
                Object.defineProperty(screen, 'availWidth', { value: config.width || 1920 });
                Object.defineProperty(screen, 'availHeight', { value: (config.height || 1080) - 40 });
                Object.defineProperty(screen, 'colorDepth', { value: config.colorDepth || 24 });
                Object.defineProperty(screen, 'pixelDepth', { value: config.pixelDepth || 24 });
            }, screenConfig);
        }
    }

    /**
     * Hardware fingerprinting protection
     */
    static async spoofHardware(page, hardwareConfig) {
        await page.evaluateOnNewDocument((config) => {
            // Spoof CPU cores
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => config?.cores || (Math.floor(Math.random() * 8) + 2)
            });

            // Spoof memory (deviceMemory)
            if ('deviceMemory' in navigator) {
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => config?.memory || [2, 4, 8][Math.floor(Math.random() * 3)]
                });
            }

            // Spoof platform
            Object.defineProperty(navigator, 'platform', {
                get: () => config?.platform || ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)]
            });
        }, hardwareConfig);
    }

    /**
     * Performance timing manipulation
     */
    static async spoofPerformanceTiming(page) {
        await page.evaluateOnNewDocument(() => {
            const originalPerformance = window.performance;
            const timingKeys = [
                'navigationStart', 'unloadEventStart', 'unloadEventEnd',
                'redirectStart', 'redirectEnd', 'fetchStart', 'domainLookupStart',
                'domainLookupEnd', 'connectStart', 'connectEnd', 'secureConnectionStart',
                'requestStart', 'responseStart', 'responseEnd', 'domLoading',
                'domInteractive', 'domContentLoadedEventStart', 'domContentLoadedEventEnd',
                'domComplete', 'loadEventStart', 'loadEventEnd'
            ];

            Object.defineProperty(window, 'performance', {
                value: {
                    ...originalPerformance,
                    timing: new Proxy(originalPerformance.timing, {
                        get(target, prop) {
                            if (timingKeys.includes(prop)) {
                                const originalValue = target[prop];
                                // Add random variance (±50ms)
                                const variance = Math.floor(Math.random() * 100) - 50;
                                return originalValue + variance;
                            }
                            return target[prop];
                        }
                    })
                }
            });
        });
    }

    /**
     * Behavioral patterns simulation
     */
    static async spoofBehavioralPatterns(page) {
        await page.evaluateOnNewDocument(() => {
            // Human-like mouse movement simulation
            let mouseX = 0, mouseY = 0;
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type === 'mousemove' && typeof listener === 'function') {
                    const humanLikeListener = (event) => {
                        // Add slight tremor to mouse coordinates
                        const tremor = 0.5;
                        event.clientX += (Math.random() - 0.5) * tremor;
                        event.clientY += (Math.random() - 0.5) * tremor;
                        
                        mouseX = event.clientX;
                        mouseY = event.clientY;
                        
                        listener(event);
                    };
                    return originalAddEventListener.call(this, type, humanLikeListener, options);
                }
                return originalAddEventListener.call(this, type, listener, options);
            };

            // Random keystroke timing
            const originalKeyEvent = KeyboardEvent;
            window.KeyboardEvent = function(type, eventInitDict) {
                if (eventInitDict && type.includes('key')) {
                    // Add human-like timing variation
                    eventInitDict.timeStamp = Date.now() + Math.random() * 10;
                }
                return new originalKeyEvent(type, eventInitDict);
            };
        });
    }

    /**
     * Font fingerprinting protection
     */
    static async spoofFontFingerprinting(page) {
        await page.evaluateOnNewDocument(() => {
            // Override font measurement methods
            const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
            CanvasRenderingContext2D.prototype.measureText = function(text) {
                const metrics = originalMeasureText.call(this, text);
                // Add slight variation to font measurements
                const variance = 0.1;
                return {
                    width: metrics.width + (Math.random() - 0.5) * variance,
                    actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
                    actualBoundingBoxRight: metrics.actualBoundingBoxRight,
                    fontBoundingBoxAscent: metrics.fontBoundingBoxAscent,
                    fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
                    actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
                    actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
                    emHeightAscent: metrics.emHeightAscent,
                    emHeightDescent: metrics.emHeightDescent,
                    hangingBaseline: metrics.hangingBaseline,
                    alphabeticBaseline: metrics.alphabeticBaseline,
                    ideographicBaseline: metrics.ideographicBaseline
                };
            };
        });
    }
}

module.exports = AntiDetectionSuite;
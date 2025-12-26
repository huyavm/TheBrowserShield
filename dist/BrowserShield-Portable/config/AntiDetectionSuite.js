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
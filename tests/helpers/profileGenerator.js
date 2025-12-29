/**
 * Profile Generator - Fast-check arbitraries for ProfileService and ProfileRepository testing
 * Feature: profile-service-testing
 * Validates: Requirements 6.1, 6.2
 */
const fc = require('fast-check');

// Arbitrary cho valid profile name (non-empty string)
const validProfileName = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// Arbitrary cho valid viewport (dimensions >= 100)
const validViewport = fc.record({
  width: fc.integer({ min: 100, max: 3840 }),
  height: fc.integer({ min: 100, max: 2160 })
});

// Arbitrary cho invalid viewport (dimensions < 100)
const invalidViewport = fc.oneof(
  fc.record({
    width: fc.integer({ min: 1, max: 99 }),
    height: fc.integer({ min: 100, max: 2160 })
  }),
  fc.record({
    width: fc.integer({ min: 100, max: 3840 }),
    height: fc.integer({ min: 1, max: 99 })
  }),
  fc.record({
    width: fc.integer({ min: 1, max: 99 }),
    height: fc.integer({ min: 1, max: 99 })
  })
);

// Arbitrary cho valid proxy host
const validProxyHost = fc.oneof(
  fc.ipV4(),
  fc.domain()
);

// Arbitrary cho valid proxy
const validProxy = fc.record({
  host: validProxyHost,
  port: fc.integer({ min: 1, max: 65535 }),
  type: fc.constantFrom('http', 'https', 'socks4', 'socks5')
});

// Arbitrary cho invalid proxy (missing host or port)
const invalidProxy = fc.oneof(
  fc.record({ host: validProxyHost }), // missing port
  fc.record({ port: fc.integer({ min: 1, max: 65535 }) }), // missing host
  fc.record({}) // missing both
);

// Arbitrary cho valid timezone
const validTimezone = fc.constantFrom(
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
);

// Arbitrary cho valid user agent
const validUserAgent = fc.constantFrom(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);

// Arbitrary cho valid profile data (ProfileService)
const validProfileData = fc.record({
  name: validProfileName,
  userAgent: fc.option(validUserAgent, { nil: undefined }),
  timezone: fc.option(validTimezone, { nil: undefined }),
  viewport: fc.option(validViewport, { nil: undefined }),
  proxy: fc.option(validProxy, { nil: undefined }),
  defaultHeadless: fc.option(fc.boolean(), { nil: undefined })
}).map(data => {
  // Remove undefined values
  const result = { name: data.name };
  if (data.userAgent !== undefined) result.userAgent = data.userAgent;
  if (data.timezone !== undefined) result.timezone = data.timezone;
  if (data.viewport !== undefined) result.viewport = data.viewport;
  if (data.proxy !== undefined) result.proxy = data.proxy;
  if (data.defaultHeadless !== undefined) result.defaultHeadless = data.defaultHeadless;
  return result;
});

// Arbitrary cho valid profile data với tất cả fields (ProfileRepository)
const validRepositoryProfileData = fc.record({
  name: validProfileName,
  userAgent: fc.option(validUserAgent, { nil: undefined }),
  timezone: fc.option(validTimezone, { nil: undefined }),
  viewport: fc.option(validViewport, { nil: undefined }),
  proxy: fc.option(validProxy, { nil: undefined }),
  stealthConfig: fc.option(fc.constant({}), { nil: undefined }),
  hardwareConfig: fc.option(fc.constant({}), { nil: undefined }),
  screenConfig: fc.option(fc.constant({}), { nil: undefined }),
  languages: fc.option(fc.constant(['en-US', 'en']), { nil: undefined }),
  autoNavigateUrl: fc.option(fc.webUrl(), { nil: undefined })
}).map(data => {
  const result = { name: data.name };
  if (data.userAgent !== undefined) result.userAgent = data.userAgent;
  if (data.timezone !== undefined) result.timezone = data.timezone;
  if (data.viewport !== undefined) result.viewport = data.viewport;
  if (data.proxy !== undefined) result.proxy = data.proxy;
  if (data.stealthConfig !== undefined) result.stealthConfig = data.stealthConfig;
  if (data.hardwareConfig !== undefined) result.hardwareConfig = data.hardwareConfig;
  if (data.screenConfig !== undefined) result.screenConfig = data.screenConfig;
  if (data.languages !== undefined) result.languages = data.languages;
  if (data.autoNavigateUrl !== undefined) result.autoNavigateUrl = data.autoNavigateUrl;
  return result;
});

// Arbitrary cho invalid profile name
const invalidProfileName = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n'),
  fc.constant(null),
  fc.constant(undefined),
  fc.integer(),
  fc.constant([]),
  fc.constant({})
);

// Arbitrary cho special characters (for JSON round-trip testing)
const specialCharacterString = fc.string({ minLength: 1, maxLength: 50 })
  .chain(base => fc.constantFrom(
    base + '🎉🚀',
    base + '"quotes"',
    base + "'single'",
    base + '\n\t\r',
    base + '\\backslash\\',
    base + '<html>&amp;</html>',
    base + '中文字符',
    base + 'émojis: 😀🎯'
  ));

// Arbitrary cho profile với special characters
const profileWithSpecialChars = fc.record({
  name: specialCharacterString,
  userAgent: fc.option(specialCharacterString, { nil: undefined }),
  timezone: validTimezone
}).map(data => {
  const result = { name: data.name };
  if (data.userAgent !== undefined) result.userAgent = data.userAgent;
  result.timezone = data.timezone;
  return result;
});

module.exports = {
  validProfileName,
  validViewport,
  invalidViewport,
  validProxy,
  invalidProxy,
  validTimezone,
  validUserAgent,
  validProfileData,
  validRepositoryProfileData,
  invalidProfileName,
  specialCharacterString,
  profileWithSpecialChars
};

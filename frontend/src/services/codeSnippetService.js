/**
 * Code Snippet Service for Icon & Web Assets Generator
 */

/**
 * Generates copyable HTML snippet for head tags.
 * @returns {string}
 */
export function generateHtmlHeadSnippet() {
  return `<!-- Favicon and App Icons -->
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
<link rel="icon" type="image/png" sizes="64x64" href="/favicon-64x64.png">
<link rel="icon" type="image/png" sizes="128x128" href="/favicon-128x128.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" href="/favicon.ico">
<link rel="manifest" href="/manifest.webmanifest">

<!-- Open Graph / Social Sharing -->
<meta property="og:image" content="/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/og-image.png">`;
}

/**
 * Generates Web App Manifest JSON string.
 * @param {string} [appName='My App']
 * @returns {string}
 */
export function generateManifestSnippet(appName = 'My Application') {
  const manifest = {
    name: appName,
    short_name: appName.split(' ')[0] || 'App',
    description: 'Web Application created with FileCooks Web Assets Generator',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/logo192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/logo512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  return JSON.stringify(manifest, null, 2);
}

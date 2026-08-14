import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more.
   */
  csp: {
    /**
     * The API only ever answers JSON, so a CSP has little to constrain. It is
     * enabled anyway as a cheap backstop: should a route ever return HTML —
     * an error page, a future preview — nothing in it may load or execute.
     */
    enabled: true,

    /**
     * Deny everything. Widen only for a route that genuinely serves a page.
     */
    directives: {
      defaultSrc: [`'none'`],
      frameAncestors: [`'none'`],
      baseUri: [`'none'`],
      formAction: [`'none'`],
    },

    /**
     * Report violations without blocking resources.
     */
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more.
   */
  csrf: {
    /**
     * Left off deliberately, and it is not an oversight.
     *
     * CSRF protects flows where the browser attaches credentials on its own —
     * cookies. This API authenticates with a Bearer token that a client has
     * to attach explicitly, so a cross-site request carries no credentials
     * and has nothing to forge.
     *
     * ⚠️ Turn this on the day any route accepts cookie-based authentication.
     */
    enabled: false,

    /**
     * Route patterns to exclude from CSRF checks.
     * Useful for external webhooks or API endpoints.
     */
    exceptRoutes: [],

    /**
     * Expose an encrypted XSRF-TOKEN cookie for frontend HTTP clients.
     */
    enableXsrfCookie: true,

    /**
     * HTTP methods protected by CSRF validation.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iframes.
   */
  xFrame: {
    /**
     * Enable the X-Frame-Options header.
     */
    enabled: true,

    /**
     * Block all framing attempts. Default value is DENY.
     */
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS.
   */
  hsts: {
    /**
     * Enable the Strict-Transport-Security header.
     */
    enabled: true,

    /**
     * HSTS policy duration remembered by browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing content types and rely only
   * on the response content-type header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },
})

export default shieldConfig

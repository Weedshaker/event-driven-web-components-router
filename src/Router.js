// @ts-check

/** @typedef {{
      name: string,
      path: string,
      regExp: RegExp,
      component?: HTMLElement
    }} Route
 */

 /** @typedef {{
  info: Promise<{ route: Route, location: string, rendered: boolean } | TypeError>
}} RouteEventDetail
*/

/* global self */
/* global HTMLElement */
/* global location */
/* global customElements */
/* global CustomEvent */

/**
 * As a controller, this component becomes a router
 *
 * @export
 * @class Router
 * @attribute {
 *  {hash|slash|null} [mode=null(null === hash && slash)] hash works out of the box but slash routing requires the web server to use the same entry file (see package.json serve command) as well as a link which shall route the slash must posses the attribute "route", see example at index.html.
 *  {Route[]} [routes=[preset]]
 *  {string} [route='route'] Route Event Name
 * }
 */
export default class Router extends HTMLElement {
  /**
   * Creates an instance of Router
   *
   * @param {Route[]} routes
   */
  constructor (routes = [
    {
      name: 'e-home',
      path: './example/Home.js',
      regExp: /^[#]{0,1}\/$/
    },
    {
      name: 'e-login',
      path: './example/Login.js',
      regExp: /^[#]{0,1}\/login/
    },
    {
      name: 'e-register',
      path: './example/Register.js',
      regExp: /^[#]{0,1}\/register/
    },
    {
      name: 'e-settings',
      path: './example/Settings.js',
      regExp: /^[#]{0,1}\/settings/
    },
    {
      name: 'e-editor',
      path: './example/Editor.js',
      regExp: /^[#]{0,1}\/editor/
    },
    {
      name: 'e-article',
      path: './example/Article.js',
      regExp: /^[#]{0,1}\/article/
    },
    {
      name: 'e-profile',
      path: './example/Profile.js',
      regExp: /^[#]{0,1}\/profile/
    }
  ]) {
    super()

    /** @type {Route[]} */
    this.routes = (this.getAttribute('routes') ? Router.parseAttribute(this.getAttribute('routes')) || routes : routes).map(route => {
      if (typeof route.regExp === 'string') route.regExp = new RegExp(route.regExp.replace(/^\/|\/$/g, ''))
      return route
    })

    /**
     * Listens to hash changes and forwards the new hash to route
     */
    this.hashChangeListener = event => this.route(location.hash, false, location.href.includes(event.newURL))
    /**
     * Listens to clicks and forwards the new href to route
     */
    this.clickListener = event => {
      if (!event || !event.target || !event.target.getAttribute('href') || !event.target.hasAttribute('route')) return
      event.preventDefault()
      self.history.pushState({ pageTitle: document.title }, '', event.target.getAttribute('href'))
      this.route(event.target.getAttribute('href'), false, location.href.includes(event.target.getAttribute('href')))
    }
    this.popstateListener = event => {
      if (!location.hash) this.route(location.pathname, false, location.href.includes(location.pathname))
    }
  }

  connectedCallback () {
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'hash') self.addEventListener('hashchange', this.hashChangeListener)
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'slash') {
      self.addEventListener('popstate', this.popstateListener)
      document.body.addEventListener('click', this.clickListener)
    }
    if (location.hash && (!this.hasAttribute('mode') || this.getAttribute('mode') === 'hash')) {
      this.route(this.routes.some(route => route.regExp.test(location.hash)) ? location.hash : '#/', true)
    } else if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'slash') {
      this.route(this.routes.some(route => route.regExp.test(location.pathname)) ? location.pathname : '/', true)
    }
  }

  disconnectedCallback () {
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'hash') self.removeEventListener('hashchange', this.hashChangeListener)
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'slash') {
      self.removeEventListener('popstate', this.popstateListener)
      document.body.removeEventListener('click', this.clickListener)
    }
  }

  /**
   * route to the desired hash/domain
   *
   * @param {string} hash
   * @param {boolean} [replace = false]
   * @param {boolean} [isUrlEqual = true]
   * @return {void | string}
   */
  route (hash, replace = false, isUrlEqual = true) {
    if (!hash) return
    // escape on route call which is not set by hashchange event and trigger it here, if needed
    if (hash.includes('#') && location.hash !== hash) {
      if (replace) return location.replace(hash)
      return (location.hash = hash)
    }
    let route
    // find the correct route or do nothing
    if ((route = this.routes.find(route => route.regExp.test(hash)))) {
      // reuse route.component, if already set, otherwise import and define custom element
      this.dispatchEvent(new CustomEvent(this.getAttribute('route') || 'route', {
        /** @type {RouteEventDetail} */
        detail: {
          info: (route.component
            ? Promise.resolve(route.component)
            : import(route.path).then(module => {
            // don't define already existing customElements
              if (!customElements.get(route.name)) customElements.define(route.name, module.default)
              // save it to route object for reuse. grab child if it already exists.
              return (route.component = this.children && this.children[0] && this.children[0].tagName === route.name.toUpperCase() ? this.children[0] : document.createElement(route.name))
            })).then(component => {
            let rendered = false
            if ((rendered = this.shouldComponentRender(route.name, isUrlEqual))) this.render(component)
            return { route, location: hash, rendered }
            // @ts-ignore
          }).catch(error => {
            // force re-fetching at browser level incase it was offline at time of fetch
            route.path = `${route.path.replace(/\?.*/, '')}?${Date.now()}`
            // @ts-ignore
            return console.warn('Router did not find:', route, error) || error
          })
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
    }
  }

  /**
   * evaluates if a render is necessary
   *
   * @param {string} name
   * @param {boolean} [isUrlEqual = true]
   * @return {boolean}
   */
  shouldComponentRender (name, isUrlEqual = true) {
    if (!this.children || !this.children.length) return true
    return !isUrlEqual || this.children[0].tagName !== name.toUpperCase()
  }

  /**
   * renders the page
   *
   * @param {HTMLElement} component
   * @return {void}
   */
  render (component) {
    // clear previous content
    this.innerHTML = ''
    this.appendChild(component)
  }

  /**
   * Helper function to parse object strings within attributes
   * return object if JSON parsable or null
   *
   * @static
   * @param {string} attribute
   * @return {any | null}
   */
  static parseAttribute (attribute) {
    if (!attribute || typeof attribute !== 'string') return null
    try {
      return JSON.parse(attribute.replace(/'/g, '"')) || null
    } catch (e) {
      return null
    }
  }
}

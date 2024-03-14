// @ts-check

/** @typedef {{
      name: string,
      path: string,
      regExp: RegExp | RegExp[],
      attributes?: {key: any}
      component?: HTMLElement,
      components?: Map<string, HTMLElement>,
      scrollIntoView?: boolean,
      createNew?: boolean | string
    }} Route
 */

/** @typedef {{
  info: Promise<{ route: Route, location: string, rendered: boolean, transition: any } | TypeError>
}} RouteEventDetail
*/

/** @typedef {{
  component: HTMLElement
}} PreRouteEventDetail
*/

/* global self */
/* global HTMLElement */
/* global location */
/* global decodeURIComponent */
/* global customElements */
/* global CustomEvent */

/**
 * As a controller, this component becomes a router
 *
 * @export
 * @class Router
 * @attribute {
 *  {hash|search|slash|null} [mode=null(null === hash && slash)] hash works out of the box but slash routing requires the web server to use the same entry file (see package.json serve command) as well as a link which shall route the slash must posses the attribute "route", see example at index.html.
 *  {Route[]} [routes=[preset]]
 *  {string} [route='route'] Route Event Name
 *  {string} [pre-route='pre-route'] pre route Event Name
 *  {string} [resume='resume'] Initial routing to last visited url if this attribute is present
 * }
 */
export default class Router extends HTMLElement {
  /**
   * Creates an instance of Router
   *
   * @param {Route[]} routes
   * @param {boolean} [hide = false]
   */
  constructor (routes = [
    {
      name: 'e-home',
      path: './example/Home.js',
      regExp: /[#=]{1}\/$/
    },
    {
      name: 'e-login',
      path: './example/Login.js',
      regExp: /[#=]{1}\/login/
    },
    {
      name: 'e-register',
      path: './example/Register.js',
      regExp: /[#=]{1}\/register/
    },
    {
      name: 'e-settings',
      path: './example/Settings.js',
      regExp: /[#=]{1}\/settings/
    },
    {
      name: 'e-editor',
      path: './example/Editor.js',
      regExp: /[#=]{1}\/editor/
    },
    {
      name: 'e-article',
      path: './example/Article.js',
      regExp: /[#=]{1}\/article/
    },
    {
      name: 'e-profile',
      path: './example/Profile.js',
      regExp: /[#=]{1}\/profile/
    }
  ], hide = false) {
    super()

    /** @type {Route[]} */
    // @ts-ignore
    this.routes = (this.hasAttribute('routes') ? Router.parseAttribute(this.getAttribute('routes')) || routes : routes).map(route => {
      route.regExp = Router.newRegExp(route.regExp)
      return route
    })
    this.hide = this.hasAttribute('hide') ? this.getAttribute('hide') === 'true' : hide
    if (this.hide) {
      const style = document.createElement('style')
      const selector = this.hasAttribute('id') ? `#${this.getAttribute('id')}` : this.nodeName
      style.innerHTML = /* css */`
        ${selector} {
          display: grid !important;
          width: 100% !important;
          align-items: start;
          justify-items: start;
        }
        ${selector} > * {
          grid-column: 1;
          grid-row: 1;
        }
      `
      this.appendChild(style)
    }

    /**
     * Listens to hash changes and forwards the new hash to route
     */
    this.hashChangeListener = event => {
      this.resetLocation()
      this.route(this.location.hash, false, this.location.href.includes(event.newURL))
    }
    /**
     * Listens to clicks and forwards the new href to route
     */
    this.clickListener = event => {
      if (!event || typeof event.composedPath !== 'function') return
      const target = event.composedPath().find(node => node.tagName === 'A')
      if (!target || !target.getAttribute('href') || !target.hasAttribute('route')) return
      event.preventDefault()
      self.history.pushState({ ...history.state, pageTitle: document.title }, '', target.getAttribute('href').substring(0, 1) === '?'
        ? `${this.location.origin}/${target.getAttribute('href')}`
        : target.getAttribute('href')
      )
      this.resetLocation()
      this.route(target.getAttribute('href'), false, this.location.href.includes(target.getAttribute('href')))
    }
    /**
     * Listens to history navigation and forwards the new hash to route
     */
    this.popstateListener = event => {
      this.resetLocation()
      // hash changes are already going through the hashChangeListener
      if (!this.location.hash) this.route(this.location.search || this.location.pathname, false, false)
    }
    /**
     * Listens to history pushState and forwards the new hash to route
     * https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
     */
    const handler = {
      apply:
      /**
       * @param {(state: any, unused: '', url: URL)=>void} target
       * @param {History} thisArg
       * @param {[state: any, unused: '', url: URL]} argArray
       */
      (target, thisArg, argArray) => {
        const oldLocationSearch = this.location.search || this.location.pathname
        const newLocationSearch = (new URL(argArray[2])).search
        const result = target.apply(thisArg, argArray)
        this.resetLocation()
        this.route(this.location.search || this.location.pathname, false, oldLocationSearch === newLocationSearch)
        return result
      }
    }
    self.history.pushState = new Proxy(self.history.pushState, handler)
    self.history.replaceState = new Proxy(self.history.replaceState, handler)
  }

  connectedCallback () {
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'hash') self.addEventListener('hashchange', this.hashChangeListener)
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'slash' || this.getAttribute('mode') === 'search') {
      self.addEventListener('popstate', this.popstateListener)
      document.body.addEventListener('click', this.clickListener)
    }
    this.resetLocation()
    let resumeHref
    const mode = (this.location.hash && !this.hasAttribute('mode')) || this.getAttribute('mode') === 'hash'
      ? {key: 'hash', defaultRoute: '#/'}
      : (this.location.search && !this.hasAttribute('mode')) || this.getAttribute('mode') === 'search'
      ? {key: 'search', defaultRoute: '=/'}
      : !this.hasAttribute('mode') || this.getAttribute('mode') === 'slash'
      ? {key: 'pathname', defaultRoute: '/'}
      : null
    const hasRoute = mode && this.routes.some(route => Router.regExpTest(route.regExp, this.location[mode.key]))
    if (hasRoute) {
      this.route(this.location[mode.key], true)
    } else if (this.hasAttribute('resume') && (resumeHref = localStorage.getItem(`router-${this.getAttribute('resume') || 'resume'}`))) {
      self.history.replaceState(history.state, document.title, resumeHref)
    } else if (mode) {
      this.route(mode.defaultRoute, true)
    }
  }

  disconnectedCallback () {
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'hash') self.removeEventListener('hashchange', this.hashChangeListener)
    if (!this.hasAttribute('mode') || this.getAttribute('mode') === 'slash' || this.getAttribute('mode') === 'search') {
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
    if (hash.includes('#') && this.location.hash !== hash) {
      if (replace) return location.replace(hash)
      return (location.hash = hash)
    }
    let route
    // find the correct route or do nothing
    if ((route = this.routes.find(route => Router.regExpTest(route.regExp, hash)))) {
      let info
      // grab child if it already exists
      if (!route.createNew && route.component) {
        info = Promise.resolve(route.component)
      } else {
        const key = typeof route.createNew === 'string'
          // when the route.createNew can not be found, define index as a placeholder to be later picked up by the route.createNew value when set
          ? (new URL(this.location.href)).searchParams.get(route.createNew) || 'index'
          : this.location.href
        // grab child if it already exists
        if (route.createNew && route.components && route.components.has(key)) {
          info = Promise.resolve(route.component = route.components.get(key))
        } else {
          // import the child if it is the first route to it
          info = import(route.path).then(module => {
            // don't define already existing customElements
            if (!customElements.get(route.name)) customElements.define(route.name, module.default)
            // save it to route object for reuse
            if (route.createNew) {
              if (route.components) {
                route.component = route.components.set(key, new module.default()).get(key) // eslint-disable-line
              } else {
                route.components = new Map([[key, (route.component = new module.default())]]) // eslint-disable-line
              }
            } else {
              route.component = this.children && this.children[0] && this.children[0].tagName === route.name.toUpperCase() ? this.children[0] : new module.default() // eslint-disable-line
            }
            if (typeof route.attributes === 'object') {
              for (const key in route.attributes) {
                route.component.setAttribute(key, route.attributes[key] || '')
              }
            }
            return route.component // eslint-disable-line
          })
        }
      }
      info = info.then(component => {
        let rendered = false
        let transition = null
        if ((rendered = this.shouldComponentRender(route.name, isUrlEqual))) {
          // @ts-ignore
          if (document.startViewTransition) {
            // @ts-ignore
            transition = document.startViewTransition(() => Promise.resolve(this.render(component))) // https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
          } else {
            this.render(component)
          }
        }
        if (route.scrollIntoView) component.scrollIntoView()
        return { route, location: hash, rendered, transition }
        // @ts-ignore
      }).catch(error => {
        // force re-fetching at browser level incase it was offline at time of fetch
        route.path = `${route.path.replace(/\?.*/, '')}?${Date.now()}`
        // @ts-ignore
        return console.warn('Router did not find:', route, error) || error
      })
      // reuse route.component, if already set, otherwise import and define custom element
      this.dispatchEvent(new CustomEvent(this.getAttribute('route') || 'route', {
        /** @type {RouteEventDetail} */
        detail: {
          info
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
      if (this.hasAttribute('resume')) localStorage.setItem(`router-${this.getAttribute('resume') || 'resume'}`, this.location.href)
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
    return this.hide || !isUrlEqual || this.children[0].tagName !== name.toUpperCase()
  }

  /**
   * renders the page
   *
   * @param {HTMLElement} component
   * @param {boolean} [hide = this.hide]
   * @return {void}
   */
  render (component, hide = this.hide) {
    // reuse route.component, if already set, otherwise import and define custom element
    this.dispatchEvent(new CustomEvent(this.getAttribute('pre-route') || 'pre-route', {
      /** @type {PreRouteEventDetail} */
      detail: {
        component
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
    if (hide) {
      let isComponentInChildren = false
      Array.from(this.children).forEach(
        /**
         * @param {any} node
         * @return {void}
         */
        node => {
          if (!node.getAttribute('slot')) {
            if (component === node) {
              isComponentInChildren = true
              // @ts-ignore
              if (component.hidden && typeof component.connectedCallback === 'function') component.connectedCallback()
              component.hidden = false
            } else {
              if (typeof node.disconnectedCallback === 'function') node.disconnectedCallback()
              node.hidden = true
            }
          }
        }
      )
      if (!isComponentInChildren) this.appendChild(component)
    } else if (component !== this.children[0]) {
      // clear previous content
      this.innerHTML = ''
      this.appendChild(component)
    }
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

  /**
   * Create a new Regular Expression
   *
   * @static
   * @param {string|string[]} regExps
   * @return {RegExp[]}
   */
  static newRegExp (regExps) {
    if (!Array.isArray(regExps)) regExps = [regExps]
    return regExps.filter(regExp => typeof regExp === 'string').map(regExp => new RegExp(regExp.replace(/^\/|\/$/g, '')))
  }

  /**
   * Test a Regular Expression
   *
   * @static
   * @param {RegExp|RegExp[]} regExps
   * @param {string} testString
   * @return {boolean}
   */
  static regExpTest (regExps, testString) {
    if (!Array.isArray(regExps)) regExps = [regExps]
    return regExps.some(regExp => regExp.test(testString))
  }

  resetLocation () {
    this._location = null
  }

  /**
   * decodeURIComponent the whole global location object
   *
   * @return {Location}
   */
  get location () {
    // @ts-ignore
    return this._location || (this._location = Object.keys(location).reduce((acc, curr) => Object.assign(acc, { [curr]: decodeURIComponent(location[curr]) }), {}))
  }
}

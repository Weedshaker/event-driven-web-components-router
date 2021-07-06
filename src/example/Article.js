// @ts-check

/* global HTMLElement */

export default class Article extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Article connected ${this.connectedCount}`
    this.connectedCount++
  }
}

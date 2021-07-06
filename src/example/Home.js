// @ts-check

/* global HTMLElement */

export default class Home extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Home connected ${this.connectedCount}`
    this.connectedCount++
  }
}

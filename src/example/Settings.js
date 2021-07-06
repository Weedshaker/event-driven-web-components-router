// @ts-check

/* global HTMLElement */

export default class Settings extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Settings connected ${this.connectedCount}`
    this.connectedCount++
  }
}

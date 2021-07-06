// @ts-check

/* global HTMLElement */

export default class Register extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Register connected ${this.connectedCount}`
    this.connectedCount++
  }
}

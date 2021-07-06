// @ts-check

/* global HTMLElement */

export default class Login extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Login connected ${this.connectedCount}`
    this.connectedCount++
  }
}

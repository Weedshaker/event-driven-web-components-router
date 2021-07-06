// @ts-check

/* global HTMLElement */

export default class Profile extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Profile connected ${this.connectedCount}`
    this.connectedCount++
  }
}

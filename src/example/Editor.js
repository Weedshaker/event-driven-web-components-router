// @ts-check

/* global HTMLElement */

export default class Editor extends HTMLElement {
  constructor () {
    super()

    this.connectedCount = 1
  }

  connectedCallback () {
    this.innerHTML = `Editor connected ${this.connectedCount}`
    this.connectedCount++
  }
}

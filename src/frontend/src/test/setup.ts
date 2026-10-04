import '@testing-library/jest-dom/vitest'

// jsdom implements <dialog> without showModal and close; the app's dialogs need both.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
}

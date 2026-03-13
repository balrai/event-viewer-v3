export default class ExtensionLoader {
  constructor() {
    this.activateExtension();
  }
  setupExternalInterface() {
    // To be implemented by subclasses
  }
  activateExtension() {
    console.log("Activating extension:", this.constructor.name);
    this.setupExternalInterface();
  }
}

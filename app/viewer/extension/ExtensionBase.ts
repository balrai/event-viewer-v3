export default class ExtensionBase {
  extName: string;
  name: string;
  state = {};
  config = {};
  extSettingsEnabled = false;

  constructor(extName: string) {
    this.extName = extName;
    this.name = extName.toLowerCase();
  }

  dispatchExtensionEvent(type: string, detail: any) {
    window.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail
      })
    );
    window.dispatchEvent(
      new CustomEvent("nova.extension.event", {
        bubbles: true,
        detail: {
          type,
          detail
        }
      })
    );
  }

  initExtSettings() {
    // if (this.extSettingsEnabled) {
    //   console.log("api req ext setting => ", this.getExtSettings(this.extName));
    //   this.getExtSettings(this.extName).then((data) => {
    //     console.log("data => ", data);
    //     this.config = data;
    //     if (data.externalCssUrl) {
    //       this.insertExternalCss(data.externalCssUrl);
    //     }
    //     if (data.customDefaultCss) {
    //       this.insertCss(data.customDefaultCss);
    //     }
    //     if (data.customLocalizedCss) {
    //       this.insertCss(data.customLocalizedCss);
    //     }
    //   });
    // }
  }

  //   getExtSettings(extRecordType, locale) {
  //     return this.api.getExtensionSettings(extRecordType, locale);
  //   }

  //   insertCss(css) {
  //     const head = document.head || document.getElementsByTagName("head")[0];
  //     const style = document.createElement("style");
  //     console.log("css => ", css);
  //     head.appendChild(style);
  //     style.type = "text/css";
  //     if (style.styleSheet) {
  //       // This is required for IE8 and below.
  //       style.styleSheet.cssText = css;
  //     } else {
  //       style.appendChild(document.createTextNode(css));
  //     }
  //   }

  //   insertExternalCss(url) {
  //     const head = document.head || document.getElementsByTagName("head")[0];
  //     const link = document.createElement("link");
  //     head.appendChild(link);
  //     link.rel = "stylesheet";
  //     link.href = url;
  //   }

  //   waitFor(conditionFn) {
  //     let interval = null;
  //     let evaluate = (resolve) => {
  //       if (conditionFn()) {
  //         clearInterval(interval);
  //         resolve();
  //         return true;
  //       }
  //       return false;
  //     };
  //     return new Promise((resolve) => {
  //       evaluate(resolve);
  //       interval = setInterval(() => {
  //         evaluate(resolve);
  //       }, 100);
  //     });
  //   }
}

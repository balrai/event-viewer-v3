export class IPathResolutionHandler {
    nextHandler;

    async handle(gatewayEvent, event, authPreset, path, locale, accessToken, rehearsal) {
        if (!this.canHandle(authPreset)) {
            if (this.nextHandler) {
                return this.nextHandler.handle(gatewayEvent, event, authPreset, path, locale, accessToken, rehearsal);
            } else {
                throw new Error(`No handler found for: ${authPreset}`);
            }
        } else {
            return this._handle(gatewayEvent, event, path, locale, accessToken, rehearsal);
        }
    }

    /**
     * Attaches a handler to the last available nope, and then returns the root node.
     * @returns IPathResolutionHandler
     */
    setNext(nextHandler) {
        let currHandler = this;
        while (currHandler.nextHandler) {
            currHandler = currHandler.nextHandler;
        }
        currHandler.nextHandler = nextHandler;
        return this;
    }

    /**
     * @abstract
     * @returns Promise<PathResolutionResult>
     */
    async _handle(gatewayEvent, event, path, locale, accessToken) {
        throw new Error("Not Implemented!");
    }

    /**
     * @abstract
     * @returns boolean
     */
    canHandle(authPreset) {
        throw new Error("Not Implemented!");
    }
}

/**
 * @typedef {Object} ResolutionData
 * @property {any} session
 * @property {string} templateId
 * @property {string} recordType
 * @property {string} recordId
 * @property {string} locale
 * @property {any} userSession
 */
/**
 * @typedef {Object} ErrorResponse
 * @property {string} error
 * @property {string} message
 */
export class PathResolutionResult {
    /**
     * @type {boolean}
     */
    success;
    /**
     * @type {ResolutionData}
     */
    data;
    /**
     * @type {ErrorResponse}
     */
    error;

    /**
     * @param success
     * @param data
     * @param error {ErrorResponse}
     * @param path
     */
    constructor(success, data, error, path = null) {
        this.success = success;
        this.data = data;
        this.error = error;
        this.path = path;
    }

    static Session(session, templateId, userSession = null) {
        return new PathResolutionResult(true, {
            session,
            recordType: "Webpage",
            recordId: session.webpageId,
            templateId,
            userSession
        }, null, "Session");
    }

    static TemplateOnly(templateId, userSession = null) {
        return new PathResolutionResult(true, {
            templateId,
            userSession
        }, null);
    }

    static Webpage(webpage, userSession = null) {
        return new PathResolutionResult(true, {
            recordType: "Webpage",
            recordId: webpage.webpageId,
            templateId: webpage.templateId,
            userSession
        }, null);
    }

    static showStatusWebpage(session = null, webpage, userSession = null, path) {
        return new PathResolutionResult(true, {
            session,
            recordType: "Webpage",
            recordId: webpage.webpageId,
            templateId: webpage.templateId,
            userSession
        }, null, path);
    }

}

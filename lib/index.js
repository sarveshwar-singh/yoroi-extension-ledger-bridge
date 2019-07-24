import EventEmitter from 'events'; // https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#examples
// https://github.com/satoshilabs/slips/blob/master/slip-0044.md

const HARDENED = 0x80000000;
const PURPOSE = 44;
const COIN_TYPE = 1815; // Cardano

const BRIDGE_URL = 'https://sarveshwar-singh.github.io/yoroi-extension-ledger-bridge-webauthn';
export const YOROI_LEDGER_BRIDGE_TARGET_NAME = 'YOROI-LEDGER-BRIDGE';
export const ConnectionTypeValue = Object.freeze({
  WEB_AUTHN: 'webauthn',
  U2F: 'u2f'
});
export class LedgerBridge extends EventEmitter {
  /**
   * Use `bridgeOverride` to use this library with your own website
   * 
   * @param {*} connectionType 'webauthn' | 'u2f'
   * @param {*} bridgeOverride 
   */
  constructor(config) {
    super();
    this.connectionType = config && config.connectionType || ConnectionTypeValue.WEB_AUTHN;
    const bridgeURL = config && config.bridgeOverride || BRIDGE_URL;
    this.bridgeUrl = `${bridgeURL}?${this.connectionType}`;

    this._setupTarget();
  }

  _setupTarget() {
    switch (this.connectionType) {
      case ConnectionTypeValue.U2F:
        const iframe = document.createElement('iframe');
        iframe.src = this.bridgeUrl;
        iframe.id = YOROI_LEDGER_BRIDGE_TARGET_NAME;

        if (document.head) {
          document.head.appendChild(iframe);
        }

        this.iframe = iframe;
        break;

      case ConnectionTypeValue.WEB_AUTHN:
        this.targetWindow = window.open(this.bridgeUrl);
        break;

      default:
        console.error('[YOROI-LB-CONNECTOR]:: Un-supported Transport protocol');
        throw new Error('[YOROI-LB-CONNECTOR]:: Un-supported Transport protocol');
    }
  }

  isBridgeReady() {
    return new Promise((resolve, reject) => {
      this._sendMessage({
        action: 'is-ready',
        params: {}
      }, ({
        success,
        payload
      }) => {
        if (success) {
          console.debug('[YOROI-LB-CONNECTOR]:: Ledger Bridge is completely loaded');
          resolve(true);
        } else {
          reject(new Error(_prepareError(payload)));
        }
      });
    });
  }

  dispose() {
    const element = document.getElementById(YOROI_LEDGER_BRIDGE_TARGET_NAME);

    if (element instanceof HTMLIFrameElement) {
      element.remove();
    }

    if (this.targetWindow) {
      this.targetWindow.close();
    }
  } // ==============================
  //   Interface with Cardano app
  // ==============================


  getVersion() {
    return new Promise((resolve, reject) => {
      this._sendMessage({
        action: 'ledger-get-version',
        params: {}
      }, ({
        success,
        payload
      }) => {
        if (success) {
          resolve(payload);
        } else {
          reject(new Error(_prepareError(payload)));
        }
      });
    });
  }

  getExtendedPublicKey(hdPath) {
    return new Promise((resolve, reject) => {
      this._sendMessage({
        action: 'ledger-get-extended-public-key',
        params: {
          hdPath
        }
      }, ({
        success,
        payload
      }) => {
        if (success) {
          resolve(payload);
        } else {
          reject(new Error(_prepareError(payload)));
        }
      });
    });
  }

  deriveAddress(hdPath) {
    return new Promise((resolve, reject) => {
      this._sendMessage({
        action: 'ledger-derive-address',
        params: {
          hdPath
        }
      }, ({
        success,
        payload
      }) => {
        if (success) {
          resolve(payload);
        } else {
          reject(new Error(_prepareError(payload)));
        }
      });
    });
  }

  showAddress(hdPath) {
    return new Promise((resolve, reject) => {
      this._sendMessage({
        action: 'ledger-show-address',
        params: {
          hdPath
        }
      }, ({
        success,
        payload
      }) => {
        if (success) {
          resolve(payload);
        } else {
          reject(new Error(_prepareError(payload)));
        }
      });
    });
  }

  signTransaction(inputs, outputs) {
    return new Promise((resolve, reject) => {
      this._sendMessage({
        action: 'ledger-sign-transaction',
        params: {
          inputs,
          outputs
        }
      }, ({
        success,
        payload
      }) => {
        if (success) {
          resolve(payload);
        } else {
          reject(new Error(_prepareError(payload)));
        }
      });
    });
  }

  _sendMessage(msg, cb) {
    msg.target = YOROI_LEDGER_BRIDGE_TARGET_NAME;
    console.debug(`[YOROI-LB-CONNECTOR]::_sendMessage::${this.connectionType}::${msg.action}`);

    switch (this.connectionType) {
      case ConnectionTypeValue.U2F:
        this.iframe.contentWindow.postMessage(msg, '*');
        break;

      case ConnectionTypeValue.WEB_AUTHN:
        this.targetWindow.postMessage(msg, this.bridgeUrl);
        break;

      default:
        throw new Error('[YOROI-LB-CONNECTOR]:: Un-supported Transport protocol');
    }

    window.addEventListener('message', ({
      origin,
      data
    }) => {
      if (origin !== _getOrigin(this.bridgeUrl)) {
        throw new Error(`[YOROI-LB-CONNECTOR]::_sendMessage::${this.connectionType}::${msg.action}::${data.action}:: Unknown origin: ${origin}`);
      }

      console.debug(`[YOROI-LB-CONNECTOR]::_sendMessage::${this.connectionType}::${msg.action}::${data.action}`);

      if (data && data.action && data.action === `${msg.action}-reply`) {
        cb(data);
      } else {
        throw new Error(`[YOROI-LB-CONNECTOR]::_sendMessage::${this.connectionType}::${msg.action}::${data.action}:: unexpected replay`);
      }
    });
  }

} // ================
//   Bridge Setup
// ================

function _getOrigin(bridgeUrl) {
  const tmp = bridgeUrl.split('/');
  tmp.splice(-1, 1);
  return tmp.join('/');
} // ====================
//   Helper Functions
// ====================


function _prepareError(payload) {
  return payload && payload.error ? payload.error : 'SOMETHING_UNEXPECTED_HAPPENED';
}
/**
 * Get the Bip44 path required to specify an address
 *
 * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#examples
 * Ledger (according to current security rules) denies any derivation path which does not start with
 *  `[HD+44, HD+1815, HD+(account), chain, address]`
 * 
 * @param {*} account account index eg: { 0 = first account , 1 = second account ...}
 * @param {*} chain 0 = external or 1 = change
 * @param {*} address address index eg: { 0 = first address , 1 = second address ...}
 */


export function makeCardanoBIP44Path(account, chain, address) {
  return [HARDENED + PURPOSE, HARDENED + COIN_TYPE, HARDENED + account, chain, address];
}
/**
 * Get the Bip44 path required to create an account
 *
 * See BIP44 for explanation
 * https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki#examples
 * Ledger (according to current security rules) denies any derivation path which does not start with
 *  `[HD+44, HD+1815, HD+(account)]`
 */

export function makeCardanoAccountBIP44Path(account) {
  return [HARDENED + PURPOSE, HARDENED + COIN_TYPE, HARDENED + account];
}
export function toDerivationPathString(derivationPath) {
  return `m/${derivationPath.map(item => item % HARDENED + (item >= HARDENED ? "'" : '')).join('/')}`;
}
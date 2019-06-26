// @flow

import YoroiLedgerBridge from './yoroi-ledger-bridge';
import { version } from '../package.json';

let bridge;

const get_param = window.location.search.substr(1);

const init = async () => {
  console.info(`[YOROI-LB] Version: ${version}`);
  try {
    // let transportGenerator;
    // if (get_param === 'webusb') {
    //   const TransportUSB = require('@ledgerhq/hw-transport-webusb').default;
    //   transportGenerator = async () => {
    //     const tp = await TransportUSB.create();
    //     return tp;
    //   }
    // } else {
    //   const TransportU2F = require('@ledgerhq/hw-transport-u2f').default;
    //   transportGenerator = () => TransportU2F.create();
    // }
    bridge = new YoroiLedgerBridge();

    window.onload = function(e) { 
      const button = document.getElementById("versionButton");
      if (!button) {
        return;
      }
      button.addEventListener('click', async () => logConnectedDeviceVersion());
    }

    if (bridge) {
      onSuccess(bridge);
    } else {
      onError()
    }
  } catch(error) {
    onError(error);
  }
}

const onSuccess = async (bridge) => {
  console.info('[YOROI-LB] initialized...');
}

const onError = (error) => {
  console.error(`[YOROI-LB] ERROR: initialization failed!!!\n${JSON.stringify(error, null, 2)}`);
}

/**
 * Test Ledger connection : Console Log Connected Device Version
 */
const logConnectedDeviceVersion = async () => {
  try {
    const deviceVersion = await bridge.getConnectedDeviceVersion();
    console.info('[YOROI-LB] Connected Ledger device version: '
      + JSON.stringify(deviceVersion, null , 2));
  } catch (error) {
    console.error(error);
    console.info('[YOROI-LB] '
      + 'Is your Ledger Nano S device connected to your system\'s USB port?');
  }
}

init();

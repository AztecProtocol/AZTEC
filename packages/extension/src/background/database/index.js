import Dexie from 'dexie';
import {
    networkDbPrefix,
} from '~/config/database';

const dbs = {};
const registerModelsCallbacks = [];

const ensureDB = (networkId) => {
    if (!dbs[networkId]) {
        const db = new Dexie(`${networkDbPrefix}_${networkId}`);

        dbs[networkId] = db;

        registerModelsCallbacks.forEach(registerCallback => registerCallback(db));
    }
};


export const getDB = (networkId) => {
    ensureDB(networkId);
    return dbs[networkId];
};

export const storedNetworks = () => Object.keys(dbs);

export const registerModel = (registerCallback) => {
    registerModelsCallbacks.push(registerCallback);
};

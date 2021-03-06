const { trustedAccount } = require('./utils/signer');
const { OK_200, NOT_FOUND_404, BAD_400 } = require('./helpers/responses');
const { validateRequestData, registerContracts, refreshPendingTxs, validateNetworkId, getNetworkConfig } = require('./helpers');
const { getParameters } = require('./utils/event');
const web3Service = require('./services/Web3Service');
const { errorLog } = require('./utils/log');
const dbConnection = require('./database/helpers/connection');
const db = require('./database');
const { balance, getDappInfo } = require('./utils/dapp');

const initializeDB = ({ networkId }) => {
    dbConnection.init({
        networkId,
    });
    const {
        models: { init: initModels },
    } = db;
    initModels();
};

const initializeWeb3Service = ({ networkId }) => {
    const account = trustedAccount(networkId);
    const network = getNetworkConfig(networkId);
    web3Service.init({
        providerURL: network.infuraProviderUrl,
        account,
    });
    registerContracts();
};

const initialize = ({ networkId, authorizationRequired }) => {
    if (authorizationRequired) {
        initializeDB({
            networkId,
        });
    }
    initializeWeb3Service({
        networkId,
    });
};

const authorizedHasFreeTransactions = async ({ networkId, apiKey }) => {
    const { id: dappId } = await getDappInfo({
        apiKey,
    });

    await refreshPendingTxs({
        dappId,
        networkId,
    });
    const countFreeTransactions = await balance({
        dappId,
    });

    return {
        error: null,
        result: {
            hasFreeTransactions: countFreeTransactions > 0,
        },
    };
};

const unauthorizedHasFreeTransactions = async () => {
    return {
        error: null,
        result: {
            hasFreeTransactions: true,
        },
    };
};

const responseOptions = (origin) => ({
    headers: {
        'Access-Control-Allow-Origin': origin,
    },
});

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.balanceHandler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return NOT_FOUND_404();
    }
    const {
        path: { apiKey, networkId },
        headers: { origin },
    } = getParameters(event) || {};

    try {
        const { isValid, authorizationRequired, error: networkError } = validateNetworkId(networkId);
        if (!isValid) {
            return networkError;
        }

        initialize({
            networkId,
            authorizationRequired,
        });

        const { error: validationError } = await validateRequestData({
            apiKey: {
                isRequired: authorizationRequired,
                value: apiKey,
            },
            origin: {
                isRequired: authorizationRequired,
                value: origin,
            },
            data: {
                isRequired: false,
            },
            networkId: {
                isRequired: true,
                value: networkId,
            },
        });
        if (validationError) {
            return validationError;
        }

        let resp;
        if (authorizationRequired) {
            resp = await authorizedHasFreeTransactions({
                networkId,
                apiKey,
            });
        } else {
            resp = await unauthorizedHasFreeTransactions();
        }
        const { error: freeTransactionsError, result } = resp;
        if (freeTransactionsError) {
            return freeTransactionsError;
        }
        const options = responseOptions(origin);
        return OK_200(result, options);
    } catch (e) {
        errorLog(e);
        return BAD_400({
            message: e.message,
        });
    }
};

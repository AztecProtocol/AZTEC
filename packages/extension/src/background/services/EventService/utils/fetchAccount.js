import Web3Service from '~background/services/Web3Service';
import {
    AZTECAccountRegistryConfig,
} from '~background/config/contracts'
 

export const fetchAccount = async({
    address,
    networkId,
} = {}) => {
    if (!address) {
        return {
            error: new Error("'address' cannot be empty in fetchAccount"),
            account: null,
        };
    };

    if (!networkId) {
        return {
            error: new Error("'networkId' cannot be empty in fetchAccount"),
            account: null,
        };
    }

    const eventName = AZTECAccountRegistryConfig.events.registerExtension;

    const options = {
        filter: {
            account: address,
        },
        fromBlock: 'earliest', 
        toBlock: 'latest',
    };

    try {
        //TODO: Add possibility to load form different networks
        const data = await Web3Service
            .useContract(AZTECAccountRegistryConfig.name)
            .events(eventName)
            .where(options);

        const accounts = data.map(({
            blockNumber,
            returnValues: {
                linkedPublicKey,
                registeredAt,
            }
        }) => ({
            address,
            blockNumber,
            linkedPublicKey,
            registeredAt,
        }));

        const account = accounts.length ? accounts[accounts.length - 1] : null;

        return {
            error: null,
            account: account
        };

    } catch (error) {

        return {
            error,
            account: null
        }
    };
}

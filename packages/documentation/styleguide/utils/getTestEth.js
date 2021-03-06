import EthCrypto from 'eth-crypto';
import { GSNProvider } from '@openzeppelin/gsn-provider';
import Web3Service from './web3service';
import EthFaucet from '../../build/contracts/EthFaucet.json';
import { INFURA_API_KEY, SIGNING_PROVIDER, AZTEC_API_KEY } from '../constants/keys';

const web3Service = new Web3Service();

const getTestEth = async (iframeLog) => {
    // use console.info here so we can log results;
    //
    iframeLog.info('Requesting 0.1 ETH from Faucet');
    await web3Service.init();
    web3Service.registerInterface(EthFaucet, {
        name: 'EthFaucet',
    });
    const {
        account: { address },
        networkId,
    } = web3Service;

    const lastFetch = await web3Service
        .useContract('EthFaucet')
        .at('0x82eeb5989e4d9D37950755aE252c3003540F0624')
        .method('faucetMapping')
        .call(address);
    if (lastFetch + 24 * 60 * 60 > Date.now() / 1000) {
        iframeLog.error('You can only request 0.1ETH every 24 hours from the faucet again');
        return;
    }

    iframeLog.info('Request valid signing via GSN');

    // generate a random account
    const tempAccount = EthCrypto.createIdentity();
    const providerUrl = `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`;
    const signUrl = `${SIGNING_PROVIDER}/Stage/${networkId}/${AZTEC_API_KEY}`;
    const gsnProvider = new GSNProvider(providerUrl, {
        pollInterval: 1 * 1000,
        signKey: tempAccount.privateKey,
        approveFunction: async ({ ...data }) => {
            const response = await window.fetch(signUrl, {
                method: 'POST', // *GET, POST, PUT, DELETE, etc.
                mode: 'cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    'Content-Type': 'application/json',
                    // 'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: JSON.stringify({ data }), // body data type must match "Content-Type" header
            });
            const {
                data: { approvalData },
            } = await response.json();

            return approvalData;
        },
    });

    iframeLog.info('Relaying signed tx');
    try {
        const receipt = await web3Service
            .useContract('EthFaucet')
            .at('0x82eeb5989e4d9D37950755aE252c3003540F0624')
            .method('requestTestEth')
            .useGSN({
                signingInfo: tempAccount,
                gsnProvider,
            })
            .send(address);

        iframeLog.info('Eth Faucet Transaction confirmed', receipt);
        iframeLog.info(`View on EtherScan https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`);
    } catch (err) {
        iframeLog.error(err);
    }
};
export default getTestEth;

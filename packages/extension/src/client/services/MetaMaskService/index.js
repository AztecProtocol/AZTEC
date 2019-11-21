import ethSigUtil from 'eth-sig-util';
import EthCrypto from 'eth-crypto';
import Web3Service from '~/client/services/Web3Service';
import registerExtension from './registerExtension';
import signNote from './signNote';
import batchSignNotes from './batchSignNotes';

const handleAction = async (action, params) => {
    let response = {};
    const { address } = Web3Service.account;

    switch (action) {
        case 'metamask.register.extension': {
            const eip712Data = registerExtension(params);
            const method = 'eth_signTypedData_v3';
            const { result } = await Web3Service.sendAsync({
                method,
                params: [address, eip712Data],
                from: address,
            });

            const publicKey = ethSigUtil.extractPublicKey({
                data: eip712Data,
                sig: result,
            });
            const compressedPublicKey = EthCrypto.publicKey.compress(
                publicKey.slice(2),
            );

            response = {
                signature: result,
                publicKey: `0x${compressedPublicKey}`,
            };
            break;
        }
        case 'metamask.ace.publicApprove': {
            // we only need to do this if the proof sender is the user
            // TODO the wallet contract or any contract will be responsible for this
            const {
                assetAddress,
                amount,
                proofHash,
            } = params;

            await Web3Service
                .useContract('ACE')
                .method('publicApprove')
                .send(
                    assetAddress,
                    proofHash,
                    amount,
                );
            break;
        }
        case 'metamask.eip712.signNotes': {
            const {
                assetAddress,
                noteHashes,
                challenge,
                sender,
            } = params;
            const signatures = (await Promise.all(noteHashes.map(async (noteHash) => {
                const noteSchema = signNote({
                    assetAddress,
                    noteHash,
                    challenge,
                    sender,
                });
                const method = 'eth_signTypedData_v3';
                return Web3Service.sendAsync({
                    method,
                    params: [address, noteSchema],
                    from: address,
                });
            }))).map(({ result }) => result);

            response = {
                signatures,
            };
            break;
        }
        case 'metamask.eip712.batchSignNotes': {
            const {
                assetAddress,
                noteHashes,
                sender,
            } = params;
            console.log({ sender });

            const spenderApprovals = noteHashes.map(() => true);
            console.log({ spenderApprovals });

            const noteSchema = batchSignNotes({
                assetAddress,
                noteHashes,
                spenderApprovals,
                spender: sender,
            });
            console.log({ noteSchema });
            const method = 'eth_signTypedData_v4';
            const { result } = await Web3Service.sendAsync({
                method,
                params: [address, noteSchema],
                from: address,
            });


            response = {
                signature: result,
            };
            break;
        }
        case 'metamask.zkAsset.updateNoteMetadata': {
            const {
                noteHash,
                assetAddress,
                metadata,
            } = params;
            await Web3Service
                .useContract('ZkAsset')
                .at(assetAddress)
                .method('updateNoteMetaData')
                .send(
                    noteHash,
                    metadata,
                );
            break;
        }
        case 'metamask.zkAsset.confidentialTransfer': {
            const {
                assetAddress,
                proofData,
                signatures,
            } = params;
            await Web3Service
                .useContract('ZkAsset')
                .at(assetAddress)
                .method('confidentialTransfer')
                .send(
                    proofData,
                    signatures,
                );
            break;
        }
        case 'metamask.aztec.registerAZTECExtension': {
            const {
                linkedPublicKey,
                spendingPublicKey,
                signature,
            } = params;
            await Web3Service
                .useContract('AZTECAccountRegistry')
                .method('registerAZTECExtension')
                .send(
                    address,
                    linkedPublicKey,
                    spendingPublicKey,
                    signature,
                );
            break;
        }
        default:
    }

    return response;
};

export default async function MetaMaskService(query) {
    let response;
    let error;
    try {
        const {
            action,
            params,
        } = query.data;
        response = await handleAction(action, params);
        ({
            error,
        } = response || {});
    } catch (e) {
        error = e;
    }

    return {
        ...query,
        response: {
            ...response,
            error,
            success: !error,
        },
    };
}
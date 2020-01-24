/* global artifacts, contract, expect */
const { JoinSplitProof, ProofUtils } = require('aztec.js');
const secp256k1 = require('@aztec/secp256k1');
const truffleAssert = require('truffle-assertions');
const { randomHex } = require('web3-utils');

const ACE = artifacts.require('./ACE');
const ERC20Mintable = artifacts.require('ERC20Mintable');
const ZkAsset = artifacts.require('ZkAssetOwnable');
const TestAccountMapping = artifacts.require('./test/TestAccountMapping');

const { generateOutputNotes, generateDepositProofInputs } = require('../helpers/AccountRegistry');

contract('Account registry - relayer functionality', (accounts) => {
    const [userAddress, anotherUserAddress, senderAddress] = accounts;
    const initialAmount = 100;
    let ace;
    let erc20;
    let zkAsset;
    let registryContract;

    beforeEach(async () => {
        ace = await ACE.deployed();
        erc20 = await ERC20Mintable.new({ from: senderAddress });
        await erc20.mint(userAddress, initialAmount, { from: senderAddress });
        await erc20.mint(anotherUserAddress, initialAmount, { from: senderAddress });

        zkAsset = await ZkAsset.new(ace.address, erc20.address, 1, {
            from: senderAddress,
        });

        const trustedGSNSignerAddress = randomHex(20);
        registryContract = await TestAccountMapping.new(ace.address, trustedGSNSignerAddress);
    });

    it("should deposit to ZkAsset on user's behalf", async () => {
        const { inputNotes, outputNotes, publicValue, depositAmount } = await generateDepositProofInputs();

        const depositProof = new JoinSplitProof(
            inputNotes,
            outputNotes,
            registryContract.address,
            publicValue,
            registryContract.address,
        );

        await erc20.approve(registryContract.address, depositAmount, { from: userAddress });
        await erc20.approve(registryContract.address, depositAmount, { from: anotherUserAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const proofData = depositProof.encodeABI(zkAsset.address);
        const proofHash = depositProof.hash;
        await registryContract.deposit(zkAsset.address, userAddress, proofHash, proofData, depositAmount, { from: userAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount - depositAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(depositAmount);

        await Promise.all(
            outputNotes.map(async (note) => {
                const { status, noteOwner } = await ace.getNote(zkAsset.address, note.noteHash);
                expect(status.toNumber()).to.equal(1);
                expect(noteOwner).to.equal(userAddress);
            }),
        );
    });

    it('should allow to deposit notes belonging to another user', async () => {
        const { inputNotes, outputNotes, publicValue, depositAmount } = await generateDepositProofInputs();

        const depositProof = new JoinSplitProof(
            inputNotes,
            outputNotes,
            registryContract.address,
            publicValue,
            registryContract.address,
        );

        await erc20.approve(registryContract.address, depositAmount, { from: userAddress });
        await erc20.approve(registryContract.address, depositAmount, { from: anotherUserAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const proofData = depositProof.encodeABI(zkAsset.address);
        const proofHash = depositProof.hash;
        await registryContract.deposit(zkAsset.address, anotherUserAddress, proofHash, proofData, depositAmount, {
            from: anotherUserAddress,
        });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount - depositAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(depositAmount);

        await Promise.all(
            outputNotes.map(async (note) => {
                const { status, noteOwner } = await ace.getNote(zkAsset.address, note.noteHash);
                expect(status.toNumber()).to.equal(1);
                expect(noteOwner).to.equal(userAddress);
            }),
        );
    });

    it("should send deposit using the owner's alias address", async () => {
        const { inputNotes, outputNotes, publicValue, depositAmount } = await generateDepositProofInputs();

        const depositProof = new JoinSplitProof(
            inputNotes,
            outputNotes,
            registryContract.address,
            publicValue,
            registryContract.address,
        );

        await erc20.approve(registryContract.address, depositAmount, { from: userAddress });

        await erc20.approve(registryContract.address, depositAmount, { from: anotherUserAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const proofData = depositProof.encodeABI(zkAsset.address);
        const proofHash = depositProof.hash;

        const depositParams = [zkAsset.address, userAddress, proofHash, proofData, depositAmount];

        await truffleAssert.reverts(
            registryContract.deposit(zkAsset.address, anotherUserAddress, proofHash, proofData, depositAmount, {
                from: userAddress,
            }),
            "VM Exception while processing transaction: revert Sender has no permission to deposit on owner's behalf",
        );

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);

        await registryContract.setAccountAliasMapping(userAddress, anotherUserAddress);

        await registryContract.deposit(...depositParams, { from: anotherUserAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount - depositAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(depositAmount);

        const [note] = outputNotes;
        const { status, noteOwner } = await ace.getNote(zkAsset.address, note.noteHash);
        expect(status.toNumber()).to.equal(1);
        expect(noteOwner).to.equal(userAddress);
    });

    it("should not affect user's balance if proof is invalid", async () => {
        const { inputNotes, outputNotes, publicValue, depositAmount } = await generateDepositProofInputs();

        const depositProof = new JoinSplitProof(
            inputNotes,
            outputNotes,
            registryContract.address,
            publicValue,
            registryContract.address,
        );

        const wrongSenderProof = new JoinSplitProof(inputNotes, outputNotes, registryContract.address, publicValue, userAddress);

        const wrongOwnerProof = new JoinSplitProof(inputNotes, outputNotes, userAddress, publicValue, registryContract.address);

        const extraOutputNotes = await generateOutputNotes([10]);
        const moreOutputNotes = [...outputNotes, ...extraOutputNotes];
        const morePublicValue = ProofUtils.getPublicValue(
            [],
            moreOutputNotes.map((note) => note.k),
        );
        const moreValueProof = new JoinSplitProof(
            inputNotes,
            moreOutputNotes,
            registryContract.address,
            morePublicValue,
            registryContract.address,
        );

        await erc20.approve(registryContract.address, depositAmount, { from: userAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const correctProofHash = depositProof.hash;
        const correctProofData = depositProof.encodeABI(zkAsset.address);

        const failedTransactions = [wrongSenderProof, wrongOwnerProof, moreValueProof].reduce((transactions, invalidProof) => {
            const invalidProofHash = invalidProof.hash;
            const invalidProofData = invalidProof.encodeABI(zkAsset.address);

            const moreTransactions = [
                {
                    proofHash: invalidProofHash,
                    proofData: correctProofData,
                },
                {
                    proofHash: correctProofHash,
                    proofData: invalidProofData,
                },
                {
                    proofHash: invalidProofHash,
                    proofData: invalidProofData,
                },
            ].map(async ({ proofHash, proofData }) => {
                let error = null;
                try {
                    await registryContract.deposit(zkAsset.address, proofHash, proofData, depositAmount, { from: userAddress });
                } catch (e) {
                    error = e;
                }
                expect(error).to.not.equal(null);
            });
            return transactions.concat(moreTransactions);
        }, []);

        await Promise.all(failedTransactions);

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const [note] = outputNotes;
        let noNoteError = null;
        try {
            await ace.getNote(zkAsset.address, note.noteHash);
        } catch (e) {
            noNoteError = e;
        }
        expect(noNoteError).to.not.equal(null);
    });

    it("should not deposit from other user's account", async () => {
        const { inputNotes, outputNotes, publicValue, depositAmount } = await generateDepositProofInputs();

        const depositProof = new JoinSplitProof(
            inputNotes,
            outputNotes,
            registryContract.address,
            publicValue,
            registryContract.address,
        );

        await erc20.approve(registryContract.address, depositAmount, { from: userAddress });

        await erc20.approve(registryContract.address, depositAmount, { from: anotherUserAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const proofData = depositProof.encodeABI(zkAsset.address);
        const proofHash = depositProof.hash;

        await truffleAssert.reverts(
            registryContract.deposit(zkAsset.address, anotherUserAddress, proofHash, proofData, depositAmount, {
                from: userAddress,
            }),
            "VM Exception while processing transaction: revert Sender has no permission to deposit on owner's behalf",
        );

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);
    });

    it("should not deposit notes belonging to non-owner when sending the transaction using the owner's alias address", async () => {
        const stranger = secp256k1.generateAccount();
        const { inputNotes, outputNotes, publicValue, depositAmount } = await generateDepositProofInputs({
            publicKey: stranger.publicKey,
        });

        const depositProof = new JoinSplitProof(
            inputNotes,
            outputNotes,
            registryContract.address,
            publicValue,
            registryContract.address,
        );

        await erc20.approve(registryContract.address, depositAmount, { from: userAddress });

        await erc20.approve(registryContract.address, depositAmount, { from: anotherUserAddress });

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);

        const proofData = depositProof.encodeABI(zkAsset.address);
        const proofHash = depositProof.hash;

        const depositParams = [zkAsset.address, userAddress, proofHash, proofData, depositAmount];

        await registryContract.setAccountAliasMapping(userAddress, anotherUserAddress);

        await truffleAssert.reverts(
            registryContract.deposit(...depositParams, { from: anotherUserAddress }),
            'VM Exception while processing transaction: revert Cannot deposit note to other account if sender is not the same as owner',
        );

        expect((await erc20.balanceOf(userAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(anotherUserAddress)).toNumber()).to.equal(initialAmount);
        expect((await erc20.balanceOf(registryContract.address)).toNumber()).to.equal(0);
        expect((await erc20.balanceOf(ace.address)).toNumber()).to.equal(0);
    });
});
/* eslint-disable max-len */
/* global artifacts, expect, contract, beforeEach, web3, it:true */
const BN = require('bn.js');

const {
    // eslint-disable-next-line no-unused-vars
    p,
    pRed,
    toAffine,
} = require('../js_snippets/bn128_reference');

// eslint-disable-next-line no-unused-vars
const { generatePointData, referenceCurve } = require('../js_snippets/utils');

const Weierstrudel = artifacts.require('Weierstrudel');
const Monty = artifacts.require('Monty');
const WeierstrudelCaller = artifacts.require('WeierstrudelCaller');

const inputVectors = [{
    input: '2bd3e6d0f3b142924f5ca7b49ce5b9d54c4703d7ae5648e61d02268b1a0a9fb721611ce0a6af85915e2f1d70300909ce2e49dfad4a4619c8390cae66cefdb20400000000000000000000000000000000000000000000000011138ce750fa15c2',
    expected: '070a8d6a982153cae4be29d434e8faef8a47b274a053f5a4ee2a6c9c13c31e5c031b8ce914eba3a9ffb989f9cdd5b0f01943074bf4f0f315690ec3cec6981afc',
    name: 'chfast1',
}, {
    input: '070a8d6a982153cae4be29d434e8faef8a47b274a053f5a4ee2a6c9c13c31e5c031b8ce914eba3a9ffb989f9cdd5b0f01943074bf4f0f315690ec3cec6981afc30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd46',
    expected: '025a6f4181d2b4ea8b724290ffb40156eb0adb514c688556eb79cdea0752c2bb2eff3f31dea215f1eb86023a133a996eb6300b44da664d64251d05381bb8a02e',
    name: 'chfast2',
}, {
    input: '025a6f4181d2b4ea8b724290ffb40156eb0adb514c688556eb79cdea0752c2bb2eff3f31dea215f1eb86023a133a996eb6300b44da664d64251d05381bb8a02e183227397098d014dc2822db40c0ac2ecbc0b548b438e5469e10460b6c3e7ea3',
    expected: '14789d0d4a730b354403b5fac948113739e276c23e0258d8596ee72f9cd9d3230af18a63153e0ec25ff9f2951dd3fa90ed0197bfef6e2a1a62b5095b9d2b4a27',
    name: 'chfast3',
}, {
    input: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe31a2f3c951f6dadcc7ee9007dff81504b0fcd6d7cf59996efdc33d92bf7f9f8f6ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    expected: '2cde5879ba6f13c0b5aa4ef627f159a3347df9722efce88a9afbb20b763b4c411aa7e43076f6aee272755a7f9b84832e71559ba0d2e0b17d5f9f01755e5b0d11',
    name: 'cdetrio1',
}, {
    input: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe31a2f3c951f6dadcc7ee9007dff81504b0fcd6d7cf59996efdc33d92bf7f9f8f630644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000',
    expected: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe3163511ddc1c3f25d396745388200081287b3fd1472d8339d5fecb2eae0830451',
    name: 'cdetrio2',
    noBenchmark: true,
}, {
    input: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe31a2f3c951f6dadcc7ee9007dff81504b0fcd6d7cf59996efdc33d92bf7f9f8f60000000000000000000000000000000100000000000000000000000000000000',
    expected: '1051acb0700ec6d42a88215852d582efbaef31529b6fcbc3277b5c1b300f5cf0135b2394bb45ab04b8bd7611bd2dfe1de6a4e6e2ccea1ea1955f577cd66af85b',
    name: 'cdetrio3',
    noBenchmark: true,
}, {
    input: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe31a2f3c951f6dadcc7ee9007dff81504b0fcd6d7cf59996efdc33d92bf7f9f8f60000000000000000000000000000000000000000000000000000000000000009',
    expected: '1dbad7d39dbc56379f78fac1bca147dc8e66de1b9d183c7b167351bfe0aeab742cd757d51289cd8dbd0acf9e673ad67d0f0a89f912af47ed1be53664f5692575',
    name: 'cdetrio4',
    noBenchmark: true,
}, {
    input: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe31a2f3c951f6dadcc7ee9007dff81504b0fcd6d7cf59996efdc33d92bf7f9f8f60000000000000000000000000000000000000000000000000000000000000001',
    expected: '1a87b0584ce92f4593d161480614f2989035225609f08058ccfa3d0f940febe31a2f3c951f6dadcc7ee9007dff81504b0fcd6d7cf59996efdc33d92bf7f9f8f6',
    name: 'cdetrio5',
    noBenchmark: true,
}, {
    input: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa901e0559bacb160664764a357af8a9fe70baa9258e0b959273ffc5718c6d4cc7cffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    expected: '29e587aadd7c06722aabba753017c093f70ba7eb1f1c0104ec0564e7e3e21f6022b1143f6a41008e7755c71c3d00b6b915d386de21783ef590486d8afa8453b1',
    name: 'cdetrio6',
}, {
    input: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa901e0559bacb160664764a357af8a9fe70baa9258e0b959273ffc5718c6d4cc7c30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000',
    expected: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa92e83f8d734803fc370eba25ed1f6b8768bd6d83887b87165fc2434fe11a830cb',
    name: 'cdetrio7',
    noBenchmark: true,
}, {
    input: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa901e0559bacb160664764a357af8a9fe70baa9258e0b959273ffc5718c6d4cc7c0000000000000000000000000000000100000000000000000000000000000000',
    expected: '221a3577763877920d0d14a91cd59b9479f83b87a653bb41f82a3f6f120cea7c2752c7f64cdd7f0e494bff7b60419f242210f2026ed2ec70f89f78a4c56a1f15',
    name: 'cdetrio8',
    noBenchmark: true,
}, {
    input: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa901e0559bacb160664764a357af8a9fe70baa9258e0b959273ffc5718c6d4cc7c0000000000000000000000000000000000000000000000000000000000000009',
    expected: '228e687a379ba154554040f8821f4e41ee2be287c201aa9c3bc02c9dd12f1e691e0fd6ee672d04cfd924ed8fdc7ba5f2d06c53c1edc30f65f2af5a5b97f0a76a',
    name: 'cdetrio9',
    noBenchmark: true,
}, {
    input: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa901e0559bacb160664764a357af8a9fe70baa9258e0b959273ffc5718c6d4cc7c0000000000000000000000000000000000000000000000000000000000000001',
    expected: '17c139df0efee0f766bc0204762b774362e4ded88953a39ce849a8a7fa163fa901e0559bacb160664764a357af8a9fe70baa9258e0b959273ffc5718c6d4cc7c',
    name: 'cdetrio10',
    noBenchmark: true,
}, {
    input: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b869073a5ffcc6fc7a28c30723d6e58ce577356982d65b833a5a5c15bf9024b43d98ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    expected: '00a1a234d08efaa2616607e31eca1980128b00b415c845ff25bba3afcb81dc00242077290ed33906aeb8e42fd98c41bcb9057ba03421af3f2d08cfc441186024',
    name: 'cdetrio11',
}, {
    input: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b869073a5ffcc6fc7a28c30723d6e58ce577356982d65b833a5a5c15bf9024b43d9830644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000',
    expected: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b8692929ee761a352600f54921df9bf472e66217e7bb0cee9032e00acc86b3c8bfaf',
    name: 'cdetrio12',
    noBenchmark: true,
}, {
    input: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b869073a5ffcc6fc7a28c30723d6e58ce577356982d65b833a5a5c15bf9024b43d980000000000000000000000000000000100000000000000000000000000000000',
    expected: '1071b63011e8c222c5a771dfa03c2e11aac9666dd097f2c620852c3951a4376a2f46fe2f73e1cf310a168d56baa5575a8319389d7bfa6b29ee2d908305791434',
    name: 'cdetrio13',
    noBenchmark: true,
}, {
    input: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b869073a5ffcc6fc7a28c30723d6e58ce577356982d65b833a5a5c15bf9024b43d980000000000000000000000000000000000000000000000000000000000000009',
    expected: '19f75b9dd68c080a688774a6213f131e3052bd353a304a189d7a2ee367e3c2582612f545fb9fc89fde80fd81c68fc7dcb27fea5fc124eeda69433cf5c46d2d7f',
    name: 'cdetrio14',
    noBenchmark: true,
}, {
    input: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b869073a5ffcc6fc7a28c30723d6e58ce577356982d65b833a5a5c15bf9024b43d980000000000000000000000000000000000000000000000000000000000000001',
    expected: '039730ea8dff1254c0fee9c0ea777d29a9c710b7e616683f194f18c43b43b869073a5ffcc6fc7a28c30723d6e58ce577356982d65b833a5a5c15bf9024b43d98',
    name: 'cdetrio15',
    noBenchmark: true,
}];

const golangVectors = inputVectors.map(({ input, expected }) => {
    const x = new BN(expected.slice(0, 64), 16);
    const y = new BN(expected.slice(64, 128), 16);
    return {
        calldata: `0x${input}`,
        expected: { x, y },
    };
});

function decodeJacobianResult(output) {
    const result = web3.eth.abi.decodeParameter('bytes32[3]', output);
    const x = new BN(result[0].slice(2), 16).toRed(pRed);
    const y = new BN(result[1].slice(2), 16).toRed(pRed);
    const z = new BN(result[2].slice(2), 16).toRed(pRed);
    return toAffine({ x, y, z });
}


function decodeAffineResult(output) {
    const result = web3.eth.abi.decodeParameter('uint[2]', output);
    const x = new BN(result[0], 10).toRed(pRed);
    const y = new BN(result[1], 10).toRed(pRed);
    return { x, y };
}

contract('Weierstrudel contract tests', (accounts) => {
    beforeEach(async () => {
    });

    let weierstrudel;
    let monty;
    let weierstrudelCaller;
    before(async () => {
        weierstrudel = await Weierstrudel.new();
        monty = await Monty.new();
        WeierstrudelCaller.link('WeierstrudelStub', weierstrudel.address);
        WeierstrudelCaller.link('MontyStub', monty.address);
        weierstrudelCaller = await WeierstrudelCaller.new();
    });

    it('Weierstrudel contract is deployed', async () => {
        const result = await weierstrudel.address;
        expect(result.length > 0).to.equal(true);
    });

    it('Weierstrudel performs scalar multiplication for 1-15 points', async () => {
        const transactionData = [...new Array(15)].map((_, i) => {
            return generatePointData(i + 1);
        });
        const transactions = transactionData.map(({ calldata }) => {
            return web3.eth.call({
                from: accounts[0],
                to: weierstrudel.address,
                data: `0x${calldata.toString('hex')}`,
            });
        });
        const resultData = await Promise.all(transactions);
        resultData.forEach((output, i) => {
            const result = decodeJacobianResult(output);
            const { expected } = transactionData[i];
            expect(result.x.fromRed().eq(expected.x.fromRed())).to.equal(true);
            expect(result.y.fromRed().eq(expected.y.fromRed())).to.equal(true);
        });
    }).timeout(100000);


    it('Weierstrudel performs scalar multiplication for 1-15 points and Monty normalizes to affine', async () => {
        const transactionData = [...new Array(15)].map((_, i) => {
            return generatePointData(i + 1);
        });
        const transactions = transactionData.map(({ calldata }) => {
            return web3.eth.call({
                from: accounts[0],
                to: weierstrudel.address,
                data: `0x${calldata.toString('hex')}`,
            });
        });
        const weierstrudelResultData = await Promise.all(transactions);

        const montyTransactions = weierstrudelResultData.map((output) => {
            return web3.eth.call({
                from: accounts[0],
                to: monty.address,
                data: output,
            });
        });

        const resultData = await Promise.all(montyTransactions);

        resultData.forEach((output, i) => {
            const result = decodeAffineResult(output);
            const { expected } = transactionData[i];
            expect(result.x.fromRed().eq(expected.x.fromRed())).to.equal(true);
            expect(result.y.fromRed().eq(expected.y.fromRed())).to.equal(true);
        });
    }).timeout(100000);

    it('Weierstrudel caller succeeds in comparing Weierstrudel with precompile', async () => {
        const result = await weierstrudelCaller.ecTest();
        expect(result).to.equal(true);
    });

    it('Golang test vectors all pass', async () => {
        const transactions = golangVectors.map(({ calldata }) => {
            return web3.eth.call({
                from: accounts[0],
                to: weierstrudel.address,
                data: calldata,
            });
        });
        const resultData = await Promise.all(transactions);
        resultData.forEach((output, i) => {
            const result = decodeJacobianResult(output);
            expect(output.length).to.equal(194);
            const { expected } = golangVectors[i];
            expect(result.x.fromRed().toString(16)).to.equal(expected.x.toString(16));
            expect(result.y.fromRed().toString(16)).to.equal(expected.y.toString(16));
        });
    }).timeout(10000);
});

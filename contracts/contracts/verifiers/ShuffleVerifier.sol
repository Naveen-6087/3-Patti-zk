// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import "./HonkBase.sol";

library ShuffleVerificationKey {
    function loadVerificationKey() internal pure returns (Honk.VerificationKey memory) {
        Honk.VerificationKey memory vk = Honk.VerificationKey({
            circuitSize: uint256(4096),
            logCircuitSize: uint256(12),
            publicInputsSize: uint256(0),
            ql: Honk.G1Point({ 
               x: uint256(0x0b39d651aa71db88cfd284cc405c49fb86698a22c8b366d1893b3bef784abf22),
               y: uint256(0x25f77eb4396f95a339be032b6177371beb19e7011a01cfd5902ae0c02bf205cc)
            }),
            qr: Honk.G1Point({ 
               x: uint256(0x06323a0121a2d57b7dfeca2acd0a67e7b7d6cf2fe9ef872d7a35002c9cf3a54e),
               y: uint256(0x07ae11ec71feb98b2a67ae17c4046c4dcd9aff044230eabd93d3f689be6aca7e)
            }),
            qo: Honk.G1Point({ 
               x: uint256(0x12a065c9cf534df35048a479ad07b681b2b3439166fd31e7951e18f6b393374a),
               y: uint256(0x0f1b319b3e51326bfd0a618bd65de4cfb1eadfc4447711612be16b2bd7e58a29)
            }),
            q4: Honk.G1Point({ 
               x: uint256(0x281e9a9c0e37ef7d633f4d3dc08940d1685fa89939a38b634e4111ab9ad4a827),
               y: uint256(0x16663cc41e07a398a571a7c936c3cc4a171a77c5a5ff62667a1c77bef28f7a44)
            }),
            qm: Honk.G1Point({ 
               x: uint256(0x1a677e1f0ce6872e5074493c9fa1cc27d5d980ffcfbcd6f22b05f5b3c43209f8),
               y: uint256(0x2755134df55fc92aee2edbe265d2e1d6611442c581d06604e2dcff3c8031a998)
            }),
            qc: Honk.G1Point({ 
               x: uint256(0x127f302b91fd2c0f2a3475a57013734110f28b33051f60a8498a7c99ee8922fa),
               y: uint256(0x25fd6c5cf5d452a12a67737ae1d702a8bb1d619648d41957f30afb4a6bfe6bda)
            }),
            qArith: Honk.G1Point({ 
               x: uint256(0x0c116d98df057700b01c4a217b5d8ee7f4eaad04efee421acf753a5d4a806e46),
               y: uint256(0x009441eb0984775d04e870581464583b65249c55c1a6eb23a6433c41c7687f0d)
            }),
            qDeltaRange: Honk.G1Point({ 
               x: uint256(0x1b91fca28c14cd4499bdd2ea914bb771673b2256da75115024f54eae0f391916),
               y: uint256(0x1cd68d67f6e5d95c49ca317f06f5c8ac2ab165f2475d10ae97abf0682c66141a)
            }),
            qElliptic: Honk.G1Point({ 
               x: uint256(0x0504b1cbb7cc4a5a9ec4571a36b680d3aa750ffd39447a3ac76088e07d2fb0a3),
               y: uint256(0x290e3e4e4c2608c0bdaabffff3674fe2816b69489f480bacb938708c2a5d61f9)
            }),
            qAux: Honk.G1Point({ 
               x: uint256(0x0c95c4363e39c15d543bcce682c17c39ac9703fda928816ca7a220e3dbff27e1),
               y: uint256(0x01f4da34cc29069630d70f63e664fc64d0872109db55b6852d66aff43ac92acc)
            }),
            qLookup: Honk.G1Point({ 
               x: uint256(0x1d64341216e323f076ac53aa06192392677f44b67b6947dd6a0a1490fb32a083),
               y: uint256(0x28d02cea9cc379ace2ae8779011e247ddc4213ef69895a8e634f425844107141)
            }),
            qPoseidon2External: Honk.G1Point({ 
               x: uint256(0x06143a7303e7f8bd9c5dcd686340f9eb2878d37cfbee2f471d9f019a7ee02a31),
               y: uint256(0x07e6dd0e0715b00dea0c0ab3a9eabe28e20eb1a8aff0fb0b3bf1861274949680)
            }),
            qPoseidon2Internal: Honk.G1Point({ 
               x: uint256(0x1757e758804838402d391a2aa905a6b8e7330f729dd58fd77f7fffbc066f8f8b),
               y: uint256(0x26b20ca5d4e8c57b914d766f5494dded9ae347a6886c003aac93c399c4587a54)
            }),
            s1: Honk.G1Point({ 
               x: uint256(0x2bf5a5cad9af756452824d5f3f75e3a1b1416f0754d32d3744ae0f8e9ccf8548),
               y: uint256(0x0e30f7264fb665cc9d87a9f9bd55c322bc10c746fd9576eae03bfab377fa81ea)
            }),
            s2: Honk.G1Point({ 
               x: uint256(0x082a28cc00a227fe64128f51f2e66eec4bf2abd0da11aec8bfd6a5634f7e24dc),
               y: uint256(0x1ac9dd977ca5309993eff38c3789cf923eb67f7504cd2d8f68ce97efef78c80c)
            }),
            s3: Honk.G1Point({ 
               x: uint256(0x17e7614e56af13a4c3a82122bf7e3135c7d854e9f11c4cd2cc47ef797ded5364),
               y: uint256(0x0a01c45f02b37053b477fff17c6fb7f728e50fae026e0ebc9973a71dab8c57e6)
            }),
            s4: Honk.G1Point({ 
               x: uint256(0x26c9db4c447a69e614b8be2727c6b9be2e4bb489b659980bed26bd32c274dc09),
               y: uint256(0x12f1a1898f3574efc9a771584c543f6869b486928c6e48e2b55cef2017082eb0)
            }),
            t1: Honk.G1Point({ 
               x: uint256(0x1bf7da4add7c858eb94b75f2e78fbd89c84f5fa43824a0d5534173872ee099c2),
               y: uint256(0x1b35fa2a35673699ee1cb260d9e6c4be79b26d488c26dc2531194e43c8f747ea)
            }),
            t2: Honk.G1Point({ 
               x: uint256(0x16bf79791869cec464180d5322eeaaef18fed6dc10c3e64e314c04d85c3faece),
               y: uint256(0x2e2ec6341669b5b975e25e465af5d9e40533d5ac173554df19daed27f66c36ff)
            }),
            t3: Honk.G1Point({ 
               x: uint256(0x150253026f1b985165783c2f4ee1df612c826dda543d06d34711b965730ab69e),
               y: uint256(0x0c4062ebcca21d81273b9c58d64447e4ee4d55effa8cbc8fdbd6a76bc3092264)
            }),
            t4: Honk.G1Point({ 
               x: uint256(0x159f2541ce446c6d59ea3f06be91ec9f47c9c82f3e4fd10696511efaff4121fa),
               y: uint256(0x15f873b33ec9467e1f0c4fb3a0b59a6fcd6f3480515f1ff5506c48f0c521f00f)
            }),
            id1: Honk.G1Point({ 
               x: uint256(0x1d80b521a86484f45967e625e8b7b42e5fd66892d6e1a51589d324c8417758bf),
               y: uint256(0x127f658cbef2660e5100907e533ecb82b2e3b94f8a80121f85e9614de87c13a4)
            }),
            id2: Honk.G1Point({ 
               x: uint256(0x0b4729951f34cb788ce504be8f1d6a776f03f42fa63a16b6909a657e13601c1e),
               y: uint256(0x2ed11737f1a81a0a4393738586b1c50e6ac3ef05d1c9423b335a5e005c331b43)
            }),
            id3: Honk.G1Point({ 
               x: uint256(0x1fbf9371345a4b059f87fea8ef54e7c3c7cb010e66ccd177fb661840bd047a7c),
               y: uint256(0x1d0b648aa75d0796f511c7215a5114ac90015b369fc822cddc9e3ec65acb1e4b)
            }),
            id4: Honk.G1Point({ 
               x: uint256(0x0eda1e45a580b375b2d62ce37d12c622d6fb65e746bf9b6ce8055a8b9d6eee0e),
               y: uint256(0x2bffd2a01366cf46283dd6f361ed0c175e94f981c0cc951095c61493e4adece9)
            }),
            lagrangeFirst: Honk.G1Point({ 
               x: uint256(0x0000000000000000000000000000000000000000000000000000000000000001),
               y: uint256(0x0000000000000000000000000000000000000000000000000000000000000002)
            }),
            lagrangeLast: Honk.G1Point({ 
               x: uint256(0x03b6c6bb814f1a38e8c9800435c442885766a9a9592d9ac61098ca810a45bed8),
               y: uint256(0x1c7ae5327a859a24f4d03523406a4ed84b8290247a56dc76dafc9c0bca72e02c)
            })
        });
        return vk;
    }
}

contract ShuffleVerifier is BaseHonkVerifier(4096, 12, 0) {
    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
        return ShuffleVerificationKey.loadVerificationKey();
    }
}

// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import "./HonkBase.sol";

library ShowVerificationKey {
    function loadVerificationKey() internal pure returns (Honk.VerificationKey memory) {
        Honk.VerificationKey memory vk = Honk.VerificationKey({
            circuitSize: uint256(32768),
            logCircuitSize: uint256(15),
            publicInputsSize: uint256(11),
            ql: Honk.G1Point({ 
               x: uint256(0x0f32088141c755283bcd8d44f1bc29875fdaff6050045f1efc68afd1606d80cf),
               y: uint256(0x268c2d556994f66361998e51fecee922baa214677f57d8263fce50d6e1060f19)
            }),
            qr: Honk.G1Point({ 
               x: uint256(0x2d8e9bb02284d7a5092bf8164b1a6d7962460b9db4a164454c81753e2950fd9e),
               y: uint256(0x0a8bbad007c6888c40673c68b6c9e1085dfb6591b53c58dd5bbb07e41c94bee1)
            }),
            qo: Honk.G1Point({ 
               x: uint256(0x1e916d700cbde0317f853aec9d63d8b084e4fe397ee129abdb3b963f8291602f),
               y: uint256(0x078a7f2e9b6c060ca473de5fc4cb0d9dd0cc6a00b2acc043297b745888569aa3)
            }),
            q4: Honk.G1Point({ 
               x: uint256(0x1b2834398f146d502f1bcc4c66f2d573786d24679a41d4c812684540fef604e7),
               y: uint256(0x21f7db22cbab53c1060e298e5e8f87805f732e00949a59e4a68c82319c4314eb)
            }),
            qm: Honk.G1Point({ 
               x: uint256(0x228492313e6969780c5a9146f5c3a3229484e9dac0238df2516c19e50d3f0653),
               y: uint256(0x27ab434f739fd2c48e80048fa66b19d06d9b6cad474e17fda95da939c2a60c39)
            }),
            qc: Honk.G1Point({ 
               x: uint256(0x15442285f29c4ecfa5960a639937e99cc0c1c9e7468b9e8c4da8a67e96084c5b),
               y: uint256(0x23ae8fe50a517a367d808b7500f9f6897beccadf4e459758f6bbdd26c304f00a)
            }),
            qArith: Honk.G1Point({ 
               x: uint256(0x088d9f553759ddbbee1dd970479053f74ed8c42d4ad488c22efe574f910fc668),
               y: uint256(0x085b87a4a545e78aaf74e19737d294174627accaab596534868db01545584e55)
            }),
            qDeltaRange: Honk.G1Point({ 
               x: uint256(0x0d81cd0b677b9a35fc24c4123c50dc9ce71f106a624217a5ce721d96cd722e6b),
               y: uint256(0x1e46f84664b2634cd5e58eb30634d0b435339d30490864662523ff49e9a45530)
            }),
            qElliptic: Honk.G1Point({ 
               x: uint256(0x0fa444dc961af47cae574d100d192685fc97fabe9c2fdcd221928c7e3bef4d37),
               y: uint256(0x271e562ca3c4fc4c6ea76b5ebb159083c52bef1982924c86da822f2d042693b2)
            }),
            qAux: Honk.G1Point({ 
               x: uint256(0x13b99a697e91cc8c6404b53fd431064e381175762a98fc806ea22e11dc4462ac),
               y: uint256(0x19b01937818df9d1977866ef0582131006eda7768d194f81eedabf14a02fca46)
            }),
            qLookup: Honk.G1Point({ 
               x: uint256(0x0aac38c754a731645650eabdba88b8b49722ec761ed64df74ae15d5121535823),
               y: uint256(0x0d9a7d1350ddfe51c549c11e1b245c64674a67492cd5365d7ec754477c48f421)
            }),
            qPoseidon2External: Honk.G1Point({ 
               x: uint256(0x18ebef3c7515b87fcdf7b38cf5ab25b2699a57a7d0ba6500030ac512c930fe29),
               y: uint256(0x29891bbab445fb70f4a900f028573458951b0cae0388ff5b75606d5a542b34db)
            }),
            qPoseidon2Internal: Honk.G1Point({ 
               x: uint256(0x03d0fa607e1adc897a105703a66979813ff6d6aa10c2fd6ba71e40af3f0edcfb),
               y: uint256(0x1eabfac8e1c5de28bef8cee7639d18dc9f1b2cd7ad5bc9b991cf61f57f18139f)
            }),
            s1: Honk.G1Point({ 
               x: uint256(0x18556b9050d613e50a6782c6d270b29a19748b39c8df7c37bbf1c2d2b6a71b45),
               y: uint256(0x0a7f101ec3ad6da24045dc37abeddbd95d28cc5fa435eefcec52a85dade30995)
            }),
            s2: Honk.G1Point({ 
               x: uint256(0x062dc5acce7857751189f9f26e5db554f83cd25c4de94830c11a2f04f514608b),
               y: uint256(0x0ddf906d3544a6697c57343a438a113ba2bdba7a61f3e7bf57da838d8a244a58)
            }),
            s3: Honk.G1Point({ 
               x: uint256(0x1ab6ecf33a711217a47afbede37fb31089a3e9136a7fb6e7264f10bbf1de640b),
               y: uint256(0x1a043503b215a99b593e40949941c7108ef41302c803c4adff9d5a8903b31bd6)
            }),
            s4: Honk.G1Point({ 
               x: uint256(0x10b99b3bab58453d1de597884d79d376702e47c81990a8a37ed057739174cb4d),
               y: uint256(0x08bc4b4632adce589d9e54e616df3fc14de4d1c81e50b5ac264bc5c418e21a00)
            }),
            t1: Honk.G1Point({ 
               x: uint256(0x281cf421f75fa4fc5b1f06bc83305298b874be6e5878e18a23ad0489c6cf72fd),
               y: uint256(0x1d286018ff004680f5892c5d11e5f09010ce39e84cf17de6efce03d732aaf064)
            }),
            t2: Honk.G1Point({ 
               x: uint256(0x200c2622a9680cc374739e6e30670cae8afe31741f5f07d393a06e404f2ff4db),
               y: uint256(0x125421bff1c2d470f8baff59df7c5cc0bbb879cd1f6142eda31256a23ef98382)
            }),
            t3: Honk.G1Point({ 
               x: uint256(0x1d037fb110f0ff2e418cf5ea89bc59bd99e9adc334e4046770d0d11d5a5a2903),
               y: uint256(0x0858dacc9228dee8788763d42a518fe93d8c4697b5a804066f1f1625b55afe4a)
            }),
            t4: Honk.G1Point({ 
               x: uint256(0x2b16260cc0d1cf2f62776132710a9802e9b89d7a415725d5dfa601a5cb627df2),
               y: uint256(0x0902f87807ee8c1c924588dc8bc5185a389be963a4e64a339f019178661bd552)
            }),
            id1: Honk.G1Point({ 
               x: uint256(0x2b370091c3169459dca9b2344ab052f77222e09af69c5c9444e560bf7ab7df4c),
               y: uint256(0x0fb377c5c8ba148a83bbc30accdd611de0835567a3fdc6d46e3dfe525e8b8dfc)
            }),
            id2: Honk.G1Point({ 
               x: uint256(0x203e7eb1cb03eeb8d3924ba2399a1aae17f76ad872fe3a592ae0052d0903e52a),
               y: uint256(0x0d91ea6c07207a7cf32a792b79de734d9e4b7951b84d269e1592d18edadee163)
            }),
            id3: Honk.G1Point({ 
               x: uint256(0x25b5dd70203ba07505d427b4c36865caeadc379b15c533fc07bc1e8884142756),
               y: uint256(0x1a61db2aff7dc0eab5d4f9faeb7052303b81a84d69a9aa20346c0fb1806de1d8)
            }),
            id4: Honk.G1Point({ 
               x: uint256(0x27ca66be501a2ea0c9ba3680d9dab8e22b6f811699a267d7acbad10f0e4bcb89),
               y: uint256(0x12bd97c5475cd72254f2160e81bdab5824dc5c6046a67100d27ed80d5a162813)
            }),
            lagrangeFirst: Honk.G1Point({ 
               x: uint256(0x0000000000000000000000000000000000000000000000000000000000000001),
               y: uint256(0x0000000000000000000000000000000000000000000000000000000000000002)
            }),
            lagrangeLast: Honk.G1Point({ 
               x: uint256(0x218244722bd8b6155dc66e65b699d22937f561127cbd67cba0629c0c8b521893),
               y: uint256(0x003b49accfd00b29c10b8149f95739597b973b61cebb6dd3127916478b420603)
            })
        });
        return vk;
    }
}

contract ShowVerifier is BaseHonkVerifier(32768, 15, 11) {
    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
        return ShowVerificationKey.loadVerificationKey();
    }
}

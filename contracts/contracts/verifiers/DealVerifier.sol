// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import "./HonkBase.sol";

library DealVerificationKey {
    function loadVerificationKey() internal pure returns (Honk.VerificationKey memory) {
        Honk.VerificationKey memory vk = Honk.VerificationKey({
            circuitSize: uint256(32768),
            logCircuitSize: uint256(15),
            publicInputsSize: uint256(2),
            ql: Honk.G1Point({ 
               x: uint256(0x1dbcb5763af2945a53f68ebcd92b65b6222985f0b2333b36cdfbf4c7b3ed6d5a),
               y: uint256(0x1b2ef99299b14788d8c69d0c4356aea7f753e5b60b2cf04028eaf7883f4bd72d)
            }),
            qr: Honk.G1Point({ 
               x: uint256(0x0dff04d0be9ebbd8d9f45904cb3c54d2b52a4d26c7aaf8e15c43381040c61dc0),
               y: uint256(0x1915cbf46cf93b14c01c463069f7f7a5048de583bd5d7632fa091a6dbc6a3023)
            }),
            qo: Honk.G1Point({ 
               x: uint256(0x138a2a2855203724da6004b4ca465444f6238ca7defe610d2adad2e429e38cdc),
               y: uint256(0x046f85894f88a02d66e5808563397f84635d36325335d9b239f6cf073cce7e08)
            }),
            q4: Honk.G1Point({ 
               x: uint256(0x0c3a33473dd87a904a84146d416213999313f1260ceb78b3a3bebda257ae4fa5),
               y: uint256(0x2bc403584c50e687efbceb6383a418ed13de0d8af3ba077271b2c4f49d3d15d5)
            }),
            qm: Honk.G1Point({ 
               x: uint256(0x08fcbc73b323e14e794ae3d7f2b4fc3ee9d43f444fc4a9644192065ac5337122),
               y: uint256(0x19e6625cb62e71802e13fd6fbade9d611c13a1d5a64a1e6f74732a57e269fb3d)
            }),
            qc: Honk.G1Point({ 
               x: uint256(0x2e6fa81716868fbff3836b6a9475f39075904bd5b42f42bc590d19f5c710cb7a),
               y: uint256(0x19431f66a9c82c5de9f6f9b4fb87612f0066c03febae910efc0f6c91e59b6248)
            }),
            qArith: Honk.G1Point({ 
               x: uint256(0x0728b4f155bf343dd1ea5b52a4559c9989b2f0b8175505b6bb5c6db4645da80f),
               y: uint256(0x1aa128f2be7878c5e9f978241189d34de6081427f8de318e0fba998425010547)
            }),
            qDeltaRange: Honk.G1Point({ 
               x: uint256(0x16be07cfd2895a6a161f4a1233807db3d17be3e891f2ba47b4e345f3a25cbb0d),
               y: uint256(0x22c58e600f3ef14279e54a460152321cd351781a4287f7d40584415df981abf6)
            }),
            qElliptic: Honk.G1Point({ 
               x: uint256(0x1e6d9fbad554bacf7cf1aa8033c852b7e605518390d5e3128789bcdccf9212ca),
               y: uint256(0x0093900344a9f99b5f5a8a4b225e2bccdd13a6462df54949501e47eca73920bb)
            }),
            qAux: Honk.G1Point({ 
               x: uint256(0x27631b82776ec5148d1ac73a60d39aa9cea0f0cbc27d2fff5721a763240ece4a),
               y: uint256(0x213acc450ab3c40ed4e9dfeea5f8c7b58e9b6e39f8ca338b0682fd2f7c4bcb10)
            }),
            qLookup: Honk.G1Point({ 
               x: uint256(0x0a67c54933d27c6467f91f1c7b3633acebbc17827bb1cb51360da401dbf89a87),
               y: uint256(0x1d09c2015e000e3afcf9b4f8546e3eb0198f9c6a175cd393ba63eddede7521d5)
            }),
            qPoseidon2External: Honk.G1Point({ 
               x: uint256(0x0c4da3dfe4c56beb3b953cecd5464a6341ace7650438521700f246f477b8b921),
               y: uint256(0x25ea3a361522bbbce1d357da1f413bff821dc2c5455b50662194bad113bfac74)
            }),
            qPoseidon2Internal: Honk.G1Point({ 
               x: uint256(0x2365d00ab624314e05d1336906d710ef611e2b8cb931b16280e7177a9e4160f3),
               y: uint256(0x21c2e73b471b31da8d6a7284e175c9e3ec5a9d4882d7c73f0d6f553b5b0e1649)
            }),
            s1: Honk.G1Point({ 
               x: uint256(0x185e7c9acac91126048b83164878c153faf5dfdd00315c98b083b3e6e04fcae9),
               y: uint256(0x0aefd1fca1e28eb65f164098630425f525aec405fe9c08da1fec30e597e5678b)
            }),
            s2: Honk.G1Point({ 
               x: uint256(0x1b7b6b79fa16aa562a768e1c3044efe791a442359bc77beff613a04f0b72801f),
               y: uint256(0x0878d345a8f7e83e2b90c24e885448c19c06f52dc4240ab39d3f1eeaf91784a5)
            }),
            s3: Honk.G1Point({ 
               x: uint256(0x0c994cc8cbc82744e36a96b028d2e8a2ed7c9afaf220d417f586321dfb1ab450),
               y: uint256(0x1de0116ed00fd402a607decfe2fbb882c5d5d7f40876b80c44ef0e379410bc66)
            }),
            s4: Honk.G1Point({ 
               x: uint256(0x1cc34fb8818aadcd82ee44a5dade3bd350b1de20d4899443c460b32b1565ded7),
               y: uint256(0x0489e06814f240068e2c72b4bbca61f1ba00a9ea0f4d650d242a303398c2f879)
            }),
            t1: Honk.G1Point({ 
               x: uint256(0x1c40f7f908afe1edd3fed5febdbbeac1e3c908abe9b7a0898f677bc0984162ed),
               y: uint256(0x1fc28379b16463ffeb417c0996a5f840b001e4d9b6c7d388ae7a1570e6c29271)
            }),
            t2: Honk.G1Point({ 
               x: uint256(0x1df060fb46dd35b08f1b51e7ca69fa0072078d75ae3d9354e2347d9cbe423f0e),
               y: uint256(0x02b75b5996baf8582e01c7d56cee6cd263cbf6879b8172b03d573bc15c4ef6aa)
            }),
            t3: Honk.G1Point({ 
               x: uint256(0x0672f1d1ba534ba64287ff130a67c7018d52919e38bee100e0f31d20f60583d5),
               y: uint256(0x13e76bb6b436c27de0e243f4a53deb9571576f29d3260d03837a3790d8475ea5)
            }),
            t4: Honk.G1Point({ 
               x: uint256(0x25e494575b95e35ab4e0caa416fde113c293244ebab71d043f1ebcc8c6a35af7),
               y: uint256(0x1b9f98e3820f58ad3eb9d212d061d0dce5de4ba70099c32c5f6c1010d69e2048)
            }),
            id1: Honk.G1Point({ 
               x: uint256(0x255c4393155e6ca89627806b9d9b77cca1bae8d14f6c848fce33de8c9b264188),
               y: uint256(0x2933c0ce71b99bbc2409fbbe33a87c699d32d1f18d3074d36225534b3e375a61)
            }),
            id2: Honk.G1Point({ 
               x: uint256(0x16c86290cb74e8b5be0dd2ae899d62845c25dd4029aa44ecba595a5907caed68),
               y: uint256(0x0bef6d0bf770d16703d44ed9d73a29449a55f36cd636edcd12af1645b8031f29)
            }),
            id3: Honk.G1Point({ 
               x: uint256(0x0507f462c150d1da40ce887a6c702d1abc54c03c62f4ff0f97cae7aa3daf4678),
               y: uint256(0x1f82e0dc46eb2e7e5f397c5d8af2309db51dba52e07584ab4eb15f1e2481d594)
            }),
            id4: Honk.G1Point({ 
               x: uint256(0x0e916d7abae073469f0224dabdd56edcbad2a1fd99fdbe47246c9ef1b8fb6805),
               y: uint256(0x05432526f992524c5872dbf21feb4683dae0d0c4480442caf8a0069cd7487cef)
            }),
            lagrangeFirst: Honk.G1Point({ 
               x: uint256(0x0000000000000000000000000000000000000000000000000000000000000001),
               y: uint256(0x0000000000000000000000000000000000000000000000000000000000000002)
            }),
            lagrangeLast: Honk.G1Point({ 
               x: uint256(0x2e37e5bcd0ffeec16f560f196d865d97d32b0a881b72e69349d8f5a045478d1f),
               y: uint256(0x2509fc34add41ffc82539a1fc867667c77faab91d95351830c0779ccdfaf521e)
            })
        });
        return vk;
    }
}

contract DealVerifier is BaseHonkVerifier(32768, 15, 2) {
    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
        return DealVerificationKey.loadVerificationKey();
    }
}

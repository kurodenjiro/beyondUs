require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const CRONOS_TESTNET_RPC = "https://evm-t3.cronos.org";
const PRIVATE_KEY = process.env.CRONOS_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        cronos_testnet: {
            url: CRONOS_TESTNET_RPC,
            accounts: [PRIVATE_KEY],
            chainId: 338,
        },
    },
};

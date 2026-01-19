const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const Factory = await hre.ethers.getContractFactory("UsBeyondFactory");
    const factory = await Factory.deploy();

    await factory.waitForDeployment();

    const address = await factory.getAddress();
    console.log("UsBeyondFactory deployed to:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

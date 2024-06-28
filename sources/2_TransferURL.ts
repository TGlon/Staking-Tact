import { Address, beginCell, contractAddress, toNano, Cell, TonClient4, JettonMaster, TonClient } from "ton";
// import { ContractSystem, testAddress } from "ton-emulator";
// import { buildOnchainMetadata } from "./utils/jetton-helpers";
import { printAddress, printHeader, printDeploy, printWrite, printURL_Address } from "./utils/print";
import { deploy } from "./utils/deploy";

import { StakingContract, storeTokenTransfer } from "./output/SampleJetton_StakingContract";

let deploy_address = Address.parse("0QB56RbbrikjhcKVegAfhExt9_RjOeDiyzaN2_IwtLEALhgm"); // The deployer wallet address from mnemonics

(async () => {
    const client = new TonClient4({
        endpoint: "https://sandbox-v4.tonhubapi.com",
    });

    // Get Staking Contract
    let jetton_masterWallet = Address.parse("kQApClTLLRtxIvASOpjvXfOInGVI_n8vvAo9T7tcmQTHyaDZ"); // 🔴 Change to your own

    let staking_init = await StakingContract.init(jetton_masterWallet, deploy_address, 15000n);
    let stakingContract_address = contractAddress(0, staking_init);

    // 🔴🔴🔴 The Wallet Address that preparing to send the Jetton for staking!
    let the_wallet_that_will_call_the_URL = Address.parse("0QB56RbbrikjhcKVegAfhExt9_RjOeDiyzaN2_IwtLEALhgm");

    let client_jettonMaster = client.open(await new JettonMaster(jetton_masterWallet));
    let jetton_wallet = await client_jettonMaster.getWalletAddress(the_wallet_that_will_call_the_URL);

    console.log("================================================================");
    // let emptyCell = new Cell();
    let packed_stake = beginCell().storeUint(300, 64).endCell();
    let deployAmount = toNano("0.35");
    let packed = beginCell()
        .store(
            storeTokenTransfer({
                $$type: "TokenTransfer",
                queryId: 0n,
                amount: toNano("500"),
                destination: stakingContract_address,
                response_destination: the_wallet_that_will_call_the_URL,
                custom_payload: null,
                forward_ton_amount: toNano("0.075"),
                forward_payload: packed_stake, // TimeStamp
            })
        )
        .endCell();

    printHeader("Write Contract");
    console.log("💎Sending To: " + the_wallet_that_will_call_the_URL + "\n |'s ✨ JettonWallet");
    printAddress(jetton_wallet);

    // printDeploy(staking_init, deployAmount, packed);
    // await deploy(staking_init, deployAmount, packed);
    // printWrite(staking_init, deployAmount, packed)
    printURL_Address(jetton_wallet, deployAmount, packed); // Get this wallet's Jetton Wallet, with this packed countent
})();

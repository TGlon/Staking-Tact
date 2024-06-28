import {
    Address,
    beginCell,
    contractAddress,
    toNano,
    TonClient4,
    internal,
    JettonMaster,
    fromNano,
    WalletContractV4,TonClient
} from "ton";
import { deploy } from "./utils/deploy";
import { printAddress, printDeploy, printHeader, printSeparator } from "./utils/print";
import { mnemonicToPrivateKey } from "ton-crypto";
import { StakingContract, storeTokenTransfer, storeTokenNotification } from "./output/SampleJetton_StakingContract";
import * as dotenv from "dotenv";
dotenv.config();

(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    // const client4 = new TonClient({
    //     endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC?api_key=a69144368c0811648a36446710aee333bf2b616ac46f1d325b841008fb346b1a",
    // });
    const client4 = new TonClient4({
        endpoint: "https://sandbox-v4.tonhubapi.com", // Test_net::
    });

    let mnemonics = (process.env.mnemonics || "").toString(); // 🔴 Change to your own

    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0; //we are working in basechain.
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    let deployer_wallet_contract = client4.open(deployer_wallet);
    // console.log("deployer_wallet_contract", deployer_wallet_contract);
    
    let jettonMaster_address = Address.parse("kQApClTLLRtxIvASOpjvXfOInGVI_n8vvAo9T7tcmQTHyaDZ"); // 🔴 Jetton Root, the token Address you want to support

    let staking_init = await StakingContract.init(jettonMaster_address, deployer_wallet.address, 15000n);
    let stakingContract_address = contractAddress(workchain, staking_init);
    console.log("stakingContract_address", stakingContract_address);
    
    let packed_stake = beginCell().storeUint(300, 64).endCell();
    let packed = beginCell()
        .store(
            storeTokenTransfer({
                $$type: "TokenTransfer",
                queryId: 0n,
                amount: toNano("13.333333"), // using toNano to convert to human readable unit
                destination: stakingContract_address,
                response_destination: deployer_wallet_contract.address, // Original Owner, aka. First Minter's Jetton Wallet
                custom_payload: null,
                forward_ton_amount: toNano("0.0333"), // Important! Need have tiny amount TONcoin to pass through
                forward_payload: packed_stake,
            })
        )
        .endCell();

    let deployAmount = toNano("0.3");
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("seqno", seqno);
    
    let balance: bigint = await deployer_wallet_contract.getBalance();
    console.log("balance", balance);
    

    let client_for_jetton = client4.open(await new JettonMaster(jettonMaster_address));
    let deployer_jetton_wallet = await client_for_jetton.getWalletAddress(deployer_wallet.address);
    console.log("🛠️ Calling To Deployer's JettonWallet:\n" + deployer_jetton_wallet + "\n");

    printSeparator();
    console.log("🛠️ Deployer: " + deployer_wallet_contract.address + " sending Txs");
    console.log("🔴 Deployer's JettonWallet:");
    console.log(deployer_jetton_wallet + "(for this jetton token)");
    console.log("");
    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON\n\n");
    printSeparator();

    let staking_contract_jetton_wallet = await client_for_jetton.getWalletAddress(stakingContract_address);
    console.log("🟡 StakingContract: " + stakingContract_address);
    console.log("🟡 Receive Jetton, JettonWallet=> \n" + staking_contract_jetton_wallet);

    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: deployer_jetton_wallet,
                value: deployAmount,
                bounce: true,
                body: packed,
            }),
        ],
    });

})();

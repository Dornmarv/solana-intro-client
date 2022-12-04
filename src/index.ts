import * as Web3 from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';
const PROGRAM_ID = new Web3.PublicKey("ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa");
const PROGRAM_DATA_PUBLIC_KEY = new Web3.PublicKey("Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod");
dotenv.config();

async function airdropSolIfNeeded(signer:Web3.Keypair, connection: Web3.Connection) {
    const balance =  await connection.getBalance(signer.publicKey);
    console.log('Current balance is', balance / Web3.LAMPORTS_PER_SOL + ' SOL');

    // 1 sol should be enough for almost anything you wanna do
    if (balance / Web3.LAMPORTS_PER_SOL < 1) {
      console.log('Airdropping 1 sol....');
      const airdropSignature = await connection.requestAirdrop(
        signer.publicKey,
        Web3.LAMPORTS_PER_SOL
      );

      const latestBlockHash = await connection.getLatestBlockhash();

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature
      });
      
      const newBalance = await connection.getBalance(signer.publicKey);
      console.log('New Balance is', balance / Web3.LAMPORTS_PER_SOL  + ' SOL')

    }
    
}

async function initializeKeypair(connection: Web3.Connection): Promise<Web3.Keypair> {
    if (!process.env.PRIVATE_KEY) {
        console.log('Generating new keypair... 🗝️');
        const signer = Web3.Keypair.generate();

        console.log('Creating .env file');
        fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

        await airdropSolIfNeeded(signer, connection);

        return signer;

    }

    const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[];
    const secretKey = Uint8Array.from(secret);
    const keypairFromSecret = Web3.Keypair.fromSecretKey(secretKey);
    await airdropSolIfNeeded(keypairFromSecret, connection);
    return keypairFromSecret;
}

async function pingProgram(connection:Web3.Connection, payer:Web3.Keypair) {
    const transaction = new Web3.Transaction()
    const instruction = new Web3.TransactionInstruction({
        //Instructions need 3 things

        // 1. The public keys of all the accounts the instruction will read/write
        keys: [
            {
                pubkey: PROGRAM_DATA_PUBLIC_KEY,
                isSigner: false,
                isWritable: true
            }
        ],
        
        // 2. The ID of the program the instruction would be sent to
        programId: PROGRAM_ID

        // 3. Data - In this case, there is none 
    })

    transaction.add(instruction)
    const transactionSignature = await Web3.sendAndConfirmTransaction(connection, transaction, [payer]);

    console.log(`Transaction https://solscan.io/tx/${transactionSignature}?cluster=devnet`)
    
}

async function transferSol(connection:Web3.Connection, recipientAddress: string, payer: Web3.Keypair, amount: any) {
    const transaction = new Web3.Transaction()
    const instruction = Web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: new Web3.PublicKey(recipientAddress),
        lamports: amount * Web3.LAMPORTS_PER_SOL
    })

    transaction.add(instruction)
    const transactionSignature = await Web3.sendAndConfirmTransaction(connection, transaction, [payer])
    console.log(`You can view your transaction here https://solscan.io/tx/${transactionSignature}?cluster=devnet`)
}

async function main() {
    const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'));
    const signer = await initializeKeypair(connection);

    console.log("Public key:", signer.publicKey.toBase58());
   // await pingProgram(connection, signer);
   await transferSol(connection, 'BKk6QPPMAh7rRRq8RS1sgXvcTbMjdBxjKjTiCkoK3uiK', signer, 0.1)
}

main()
    .then(() => {
        console.log("Finished successfully")
        process.exit(0)
    })
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })

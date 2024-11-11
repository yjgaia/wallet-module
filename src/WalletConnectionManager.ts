import { Store } from "@common-module/app";
import { EventContainer } from "@common-module/ts";
import { JsonRpcSigner } from "ethers";
import UniversalWalletConnector from "./UniversalWalletConnector.js";

class WalletConnectionManager extends EventContainer<{
  connectionChanged: () => void;
}> {
  private store = new Store("wallet-connection-manager");

  public get connectedWallet() {
    return this.store.get<string>("connectedWallet");
  }

  public get connectedAddress() {
    return this.store.get<string>("connectedAddress");
  }

  public get isConnected() {
    return !!this.connectedWallet && !!this.connectedAddress;
  }

  public addConnectionInfo(walletId: string, walletAddress: string) {
    this.store.setPermanent("connectedWallet", walletId);
    this.store.setPermanent("connectedAddress", walletAddress);
    this.emit("connectionChanged");
  }

  public async disconnect() {
    this.store.remove("connectedWallet");
    this.store.remove("connectedAddress");
    this.emit("connectionChanged");
  }

  public async getBalance() {
    if (!this.isConnected) throw new Error("Not connected");

    const provider = await UniversalWalletConnector.getProvider(
      this.connectedWallet!,
    );

    return await provider.getBalance(this.connectedAddress!);
  }

  public async addChain(chainName: string) {
    if (!this.isConnected) throw new Error("Not connected");

    const walletId = this.connectedWallet!;
    await UniversalWalletConnector.addChain(walletId, chainName);
  }

  public async getSigner(targetChainName: string): Promise<JsonRpcSigner> {
    if (!this.isConnected) throw new Error("Not connected");

    const walletAddress = await UniversalWalletConnector.connect(
      this.connectedWallet!,
    );

    if (walletAddress === undefined) throw new Error("No accounts found");
    if (!this.connectedAddress || walletAddress !== this.connectedAddress) {
      throw new Error("Connected wallet address does not match");
    }

    let provider = await UniversalWalletConnector.getProvider(
      this.connectedWallet!,
    );
    let chainName = (await provider.getNetwork()).name;

    // switch chain if necessary
    if (chainName !== targetChainName) {
      await UniversalWalletConnector.switchChain(
        this.connectedWallet!,
        targetChainName,
      );

      // re-fetch provider and chain name
      provider = await UniversalWalletConnector.getProvider(
        this.connectedWallet!,
      );
      chainName = (await provider.getNetwork()).name;
    }

    if (chainName !== targetChainName) {
      throw new Error("Connected chain does not match");
    }

    return new JsonRpcSigner(provider, walletAddress);
  }
}

export default new WalletConnectionManager();

import { EventContainerV2, Store } from "@common-module/app";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import ChainInfo from "./ChainInfo.js";
import WalletLoginPopup from "./WalletLoginPopup.js";
import CoinbaseWallet from "./wallets/CoinbaseWallet.js";
import MetaMask from "./wallets/MetaMask.js";
import Wallet from "./wallets/Wallet.js";
import WalletConnect from "./wallets/WalletConnect.js";

class WalletService extends EventContainerV2<{
  addressChanged: (address: string) => void;
}> {
  private store = new Store("walletServiceStore");
  private wallets: { [walletId: string]: Wallet } = {
    "walletconnect": WalletConnect,
    "metamask": MetaMask,
    "coinbase-wallet": CoinbaseWallet,
  };
  private tryLogin = async () => await new WalletLoginPopup().wait();

  public init(options: {
    name: string;
    icon: string;
    description: string;
    chains: { [name: string]: ChainInfo };
    walletConnectProjectId: string;
  }) {
    for (const wallet of Object.values(this.wallets)) {
      wallet.init(options);
    }
  }

  public openWallet() {
    if (!this.loggedInWallet) throw new Error("Not logged in");
    this.wallets[this.loggedInWallet].open();
  }

  private async connect(walletId: string): Promise<BrowserProvider> {
    const wallet = this.wallets[walletId];
    if (!wallet) throw new Error(`Wallet ${walletId} not found`);
    return await wallet.connect();
  }

  public async disconnect() {
    for (const wallet of Object.values(this.wallets)) {
      await wallet.disconnect();
    }
  }

  public get loggedInWallet(): string | undefined {
    return this.store.get("loggedInWallet");
  }

  public get loggedInAddress(): string | undefined {
    return this.store.get("loggedInAddress");
  }

  public get loggedIn(): boolean {
    return !!this.loggedInAddress;
  }

  public async login() {
    const walletId = await this.tryLogin();
    const provider = await this.connect(walletId);
    const walletAddress: string | undefined = (await provider.listAccounts())[0]
      ?.address;
    if (walletAddress) {
      if (walletAddress !== this.loggedInAddress) {
        this.emit("addressChanged", walletAddress);
      }
      this.store.set("loggedInWallet", walletId);
      this.store.set("loggedInAddress", walletAddress);
    }
  }

  public async logout() {
    this.store.delete("loggedInWallet");
    this.store.delete("loggedInAddress");
    await this.disconnect();
  }

  public async getSigner(targetChainId: number): Promise<JsonRpcSigner> {
    if (!this.loggedInWallet) throw new Error("Not logged in");
    const provider = await this.connect(this.loggedInWallet);

    const walletAddress: string | undefined = (await provider.listAccounts())[0]
      ?.address;
    if (!walletAddress || walletAddress !== this.loggedInAddress) {
      throw new Error("Wallet address mismatch");
    }

    let currentChainId = Number((await provider.getNetwork()).chainId);
    if (currentChainId !== targetChainId) {
      await this.wallets[this.loggedInWallet].switchChain(targetChainId);
    }
    currentChainId = Number((await provider.getNetwork()).chainId);
    if (currentChainId !== targetChainId) {
      throw new Error("Failed to switch chain");
    }

    return provider.getSigner();
  }
}

export default new WalletService();

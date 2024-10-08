import { CoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import { StringUtils } from "@common-module/ts";
import { BrowserProvider, Eip1193Provider, toBeHex } from "ethers";
import WalletConnector, {
  ChainInfo,
  WalletConnectorOptions,
} from "./WalletConnector.js";

class CoinbaseWalletConnector implements WalletConnector {
  private _eip1193Provider: Eip1193Provider | undefined;

  private get eip1193Provider() {
    if (!this._eip1193Provider) {
      throw new Error("Coinbase Wallet not initialized");
    }
    return this._eip1193Provider;
  }

  public init(options: WalletConnectorOptions) {
    this._eip1193Provider = new CoinbaseWalletSDK({
      appName: options.name,
      appLogoUrl: options.icon,
    }).makeWeb3Provider();
  }

  public checkDisplayMode(): "modal" | "extension" {
    return "modal";
  }

  public async connect() {
    await this.eip1193Provider.request({ method: "eth_requestAccounts" });
    return new BrowserProvider(this.eip1193Provider);
  }

  public async disconnect() {}

  public async addChain(chain: ChainInfo) {
    await this.eip1193Provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: toBeHex(chain.id).replace(/^0x0+/, "0x"),
        chainName: StringUtils.capitalize(chain.name),
        blockExplorerUrls: [chain.explorerUrl],
        nativeCurrency: { symbol: chain.symbol, decimals: 18 },
        rpcUrls: [chain.rpc],
      }],
    });
  }
}

export default new CoinbaseWalletConnector();

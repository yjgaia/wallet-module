import { CoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import { StringUtils } from "@common-module/ts";
import { BrowserProvider, toBeHex } from "ethers";
class CoinbaseWalletConnector {
    _eip1193Provider;
    get eip1193Provider() {
        if (!this._eip1193Provider) {
            throw new Error("Coinbase Wallet not initialized");
        }
        return this._eip1193Provider;
    }
    init(options) {
        this._eip1193Provider = new CoinbaseWalletSDK({
            appName: options.name,
            appLogoUrl: options.icon,
        }).makeWeb3Provider();
    }
    checkDisplayMode() {
        return "modal";
    }
    async connect() {
        await this.eip1193Provider.request({ method: "eth_requestAccounts" });
        return new BrowserProvider(this.eip1193Provider);
    }
    async disconnect() { }
    async addChain(chain) {
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
//# sourceMappingURL=CoinbaseWalletConnector.js.map
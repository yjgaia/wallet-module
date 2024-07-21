import { BrowserInfo, Confirm } from "@common-module/app";
import {
  BaseContract,
  Contract as EthersContract,
  ContractTransactionResponse,
  Interface,
  InterfaceAbi,
  JsonRpcProvider,
} from "ethers";
import ChainInfo from "./ChainInfo.js";
import WalletService from "./WalletService.js";

export default abstract class Contract<CT extends BaseContract> {
  private chain!: ChainInfo;
  private address!: string;
  private provider!: JsonRpcProvider;

  protected viewContract!: CT;

  constructor(private abi: Interface | InterfaceAbi) {}

  public init(chain: ChainInfo, address: string) {
    this.chain = chain;
    this.address = address;
    this.viewContract = new EthersContract(
      address,
      this.abi,
      this.provider = new JsonRpcProvider(chain.rpc),
    ) as any;
  }

  protected async wait(
    run: (contract: CT) => Promise<ContractTransactionResponse>,
  ) {
    try {
      // fix for MetaMask bug on mobile
      if (
        BrowserInfo.isMobileDevice &&
        WalletService.loggedInWallet === "metamask"
      ) {
        new Confirm({
          title: "Transaction Request",
          message: "Please confirm the transaction in MetaMask",
        }, () => WalletService.openWallet());
      }

      const contract = new EthersContract(
        this.address,
        this.abi,
        await WalletService.getSigner(this.chain.id),
      );
      const tx = await run(contract as any);
      const checkReceipt = async () => {
        while (true) {
          const receipt = await this.provider.getTransactionReceipt(tx.hash);
          if (receipt?.blockNumber && receipt.status === 1) return;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      };
      await Promise.race([checkReceipt(), tx.wait()]);
    } catch (e: any) {
      console.error(e);

      // fix for MetaMask bug on mobile
      if (e.message?.includes("MetaMask is not connected/installed,")) {
        await WalletService.disconnect();
        await this.wait(run); // retry
      } else throw e;
    }
  }
}

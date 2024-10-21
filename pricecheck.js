const ethers = require("ethers");
require('log-timestamp');
const retry = require("async-retry");
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const bscnode = 'wss://bsc-ws-node.nariox.org:443';

const tokens = require('./tokens.js');
purchaseAmount = ethers.utils.parseUnits(tokens.purchaseAmount, 'ether');

var index1;
var index2;
if(tokens.pair[1].toLowerCase() > tokens.pair[0].toLowerCase()) {
	index1 = 1;
	index2 = 0;
}else {
	index1 = 0;
	index2 = 1;
}
let pingTimeout = null;
let keepAliveInterval = null;
let provider;
let wallet;
let account;
let routeraddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
let privatekey = ''
let grasshopper;

provider = new ethers.providers.WebSocketProvider(bscnode);
wallet = new ethers.Wallet(privatekey);
account = wallet.connect(provider);
router = new ethers.Contract(routeraddress, pcsAbi, account);

console.log('Checking BNB price');
const decimal_stable = 1000000000000000000;
const bnb_decimal = 1000000000000000000;

const factory = new ethers.Contract(
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    [
      "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    ],
    account
  );
  
const tokencontract = new ethers.Contract(
	  tokens.pair[1],
	  [
		"function balanceOf(address account) external view returns (uint256)",
		"function decimals() view returns (uint8)",
		"function allowance(address owner, address spender) external view returns (uint)",
		"function approve(address _spender, uint256 _value) public returns (bool success)",
		"function name() external pure returns (string memory)",
		"function symbol() external view returns (string memory)",
	  ],
	  account
	);
async function get_reserve(pair){
	const pair_contract = new ethers.Contract(
	  pair,
	  [
		"function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
	  ],
	  account
	);
	const reserves = await pair_contract.getReserves();
	return reserves;
}




async function get_pricebnb(){
	tokenreserves = await get_reserve('0x58f876857a02d6762e0101bb5c46a8c1ed44dc16');
	bnbprice = (tokenreserves[1] / 10 ** 18) / (tokenreserves[0] / 10 ** 18);
	return bnbprice;
}


async function get_pricetoken(token1, token2){
	bnbprice = await get_pricebnb();
	const tokenpair = await factory.getPair(token1, token2);
	tokenreserves = await get_reserve(tokenpair);
	tokendecimal = await tokencontract.decimals();
	tokenpriceinbnb = (tokenreserves[index2] / 10 ** 18) / (tokenreserves[index1] / 10 ** tokendecimal);
	newprice = bnbprice * tokenpriceinbnb;
	return newprice;
}

async function buy_signal(){
	pair = await factory.getPair(tokens.pair[1], '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
	b = true;
	p = true;
	while(p) {
		tokenpair = await factory.getPair(tokens.pair[1], tokens.pair[0]);
		if(tokenpair === "0x0000000000000000000000000000000000000000"){
			console.log('Wait for Pair');
		}else{
			console.log(tokenpair);
			p = false;
		}
	}
	while(b){
		reserve = await get_reserve(pair);
		reserve1 = (reserve[1] / 10 ** 18)
		if(reserve1 > 0){
			b = false;
			await buy();
		}else {
			console.log('Current Liquidity: ' + reserve1 + ' Waiting for Liquidity');
		}
	}
	
}
async function sell(token1, token2, stoploss, tstop){ 
	tstop = -20;
	allowance = await tokencontract.allowance('0xAaF7c4D2558d6D6C2F86a55ff42F401D93F3C365', routeraddress);
    if (allowance._hex === "0x00") {
        tx = await tokencontract.approve(
        routeraddress,
        ethers.constants.MaxUint256
      );
      console.log("Approved for sale");
      console.log("Your txHash: " + tx.hash);
    } else {
      console.log(" already approved for sale");
    }
	tokenprice = await get_pricetoken(token1, token2);
	bnbprice = await get_pricebnb();
	buyprice = bnbprice * tokens.buyAmount;
	balance1 = await tokencontract.balanceOf('0xAaF7c4D2558d6D6C2F86a55ff42F401D93F3C365');
	tokendecimal = await tokencontract.decimals();
	balance = balance1 / 10 ** tokendecimal;
	console.log(balance);
	ath = tokenprice;
	nsell = true;
	prevprice = tokenprice;
	sellingpoint = buyprice * tokens.sellx;
	twox = buyprice * tokens.sellx;
	threex = buyprice * 3;
	fourx = buyprice * 4;
	while(nsell){
		if(balance1 <= 0) {
			balance1 = await tokencontract.balanceOf('0xAaF7c4D2558d6D6C2F86a55ff42F401D93F3C365');
			balance = balance1 / 10 ** tokendecimal;
		}
		tokenprice = await get_pricetoken(token1, token2);
		if(ath < tokenprice){
			ath = tokenprice;
			up = true;
		}else {
			up = false;
		}
		
		if(up == true) {
			pricemovefrmath = ((ath - tokenprice) / tokenprice) * 100;
		}else{
			pricemovefrmath = ((tokenprice - ath) / tokenprice) * 100;
		}
		
		if(prevprice < tokenprice){
			up == true;
		}else{
			up == false;
		}
		
		if(up == true) {
			pricemove = ((prevprice - tokenprice) / tokenprice) * 100;
		}else{
			pricemove = ((tokenprice - prevprice) / tokenprice) * 100;
		}
		balanceprice = tokenprice * balance;
		console.log('ATH: $' + ath.toFixed(20) + ' | CP: $' + tokenprice.toFixed(20) + ' | MFA: ' + pricemovefrmath + ' | PM: ' + pricemove + ' | Balance: $' + balanceprice.toFixed(2));
		if(balanceprice >= twox && balanceprice < threex && tstop == -20){
			tstop = -20;
		}else if(balanceprice > threex && balanceprice < fourx && tstop > -40){
			tstop = -30;
		}else if(balanceprice >= fourx){
			tstop = -40;
		}
		console.log(tstop);
		if(tokens.autosell == 1){
			if(pricemovefrmath < tstop && sellingpoint < balanceprice){
				 nsell = false;
				 sellAmount = ethers.utils.parseUnits(balance.toString(), tokendecimal.toString());
				 amountOutMin = 0;
				 const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
				   balance1,
				   amountOutMin,
				  [tokens.pair[1], tokens.pair[0]],
				  tokens.receiveraccount,
				  Date.now() + 1000 * tokens.deadline,
				  {
					gasLimit: tokens.gasLimit,
					gasPrice: ethers.utils.parseUnits(tokens.gasPrice, "gwei"),
				  }
				);
				console.log("Your Sell txHash: " + tx.hash);
			}
		}
		prevprice = tokenprice;
	}
}
const run = async () => {
	if(tokens.buy == 1){
		await buy_signal();
	}
	bnbprice = await get_pricebnb();
	console.log('BNB PRICE: $' + bnbprice);
	tokenprice = await get_pricetoken(tokens.pair[1], '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
	console.log('Token Price: $' + tokenprice.toFixed(20));
	await sell(tokens.pair[1], '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 0, 0);
	console.log('ngek');
}

async function buy(){
	const tx = await retry(
    async () => {
      const amountOutMin = 0; // I don't like this but it works
      let buyConfirmation = await router.swapExactETHForTokens(
        amountOutMin,
        tokens.pair,
        '0xAaF7c4D2558d6D6C2F86a55ff42F401D93F3C365',
        Date.now() + 1000 * tokens.deadline,
        {
          value: purchaseAmount,
          gasLimit: tokens.gasLimit,
          gasPrice: ethers.utils.parseUnits(tokens.gasPrice, "gwei"),
        }
      );
      return buyConfirmation;
    },
    {
      retries: tokens.buyRetries,
      minTimeout: tokens.retryMinTimeout,
      maxTimeout: tokens.retryMaxTimeout,
      onRetry: (err, number) => {
        console.log("Buy Failed - Retrying", number);
        console.log("Error", err);
        if (number === tokens.buyRetries) {
          console.log("Sniping has failed...");
          process.exit();
        }
      },
    }
  );
  console.log("Your [pending] txHash: " + tx.hash);
}
run();

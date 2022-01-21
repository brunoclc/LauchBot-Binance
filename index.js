require('dotenv-safe').config();

const api = require('./api');
const nodeSchedule = require('node-schedule');
const WebSocket = require('ws');
const ws = new WebSocket("wss://stream.binance.com:9443/ws/!bookTicker");

//escolha o symbol que vai monitorar - set the symbol to monitor

const ASSET = 'LOKA';
const BASE = 'USDT'
const SYMBOL = ASSET + BASE;
//escolha o percentual de lucratividade mínimo - set the profit percent
const profit = 2;
//escolha quanto quer comprar - set the quantity to buy
const buyQty = 100;
//Data do agendamento
const date = new Date(2022, 0, 20, 09, 00, 0)

//Percentual do pico para venda
const percent = 92
//Offset de tempo para início da venda (s)
let timer = 15;

//não mexa nestas variáveis
let quantity = 0;
let buyPrice = 0;
let isBought = false;
let wallet = {};
let saldoAsset = {};
let saldoBase = {};
let printStatus = {};
let timerStarted = false;
let SellTime = 0;
let maxPrice = 0
let lastPrice = 0
let printError = {}

let pSymbol = ''
let pAsk = ''
let pBid = ''
let pBuyPrice = ''
let pQty = ''
let pNotional = ''
let pTargetPrice = ''
let pMaxPrice = ''
let pLastPrice = ''
let pOrder = {}


setInterval(async () => {

    wallet = await api.balance()

    saldoAsset = wallet.balances.find(b => b.asset === ASSET).free
    saldoBase = wallet.balances.find(b => b.asset === BASE).free

    if (timerStarted) {
        timer --
        if (timer < 5 || Number.isInteger(timer % 5) )console.log(timer)
    }

    print({'Symbol': pSymbol, 'Best ask': pAsk, 'Best bid': pBid, 'Buy Price': pBuyPrice, 'Qty': pQty, 'Notional': pNotional,
        'Target Price': pTargetPrice, 'Max Price': pMaxPrice, 'Last Price': pLastPrice});

}, 1000) 

setInterval(() => {

    if (pAsk > 0 && pAsk !== '' && !isBought){

        isBought = true;

        compra()

    } else if(!isBought) console.log ('Aguardando primeiros dados do stream...')

}, 100);

function print(data){
let printTemp = {...data, ...pOrder, 'saldo' : saldoAsset, 'Erro' : printError}
    process.stdout.write('\033c');
    //console.log(JSON.stringify(printStatus))
    console.log(printTemp)
        
    //if(isBought) console.log(pOrder);

}

async function compra () {
    
    console.log('Iniciada compra...');
    //const order = await api.newQuoteOrder(SYMBOL, buyQty);
    const order = await api.newOrder(SYMBOL, buyQty);    

    pOrder = order

    if (order.status === 'FILLED'){
        quantity = parseFloat(order.executedQty);
        buyPrice = parseFloat(order.fills[0].price);
        console.log('Finalizada compra...');
        timerStarted = true

    }

    else if(!order.status && !printError ){
        printError = ({'Erro':'Compra não preenchida...','STATUS:' : order.status})
        
    }else{

        if (!printError) printError = ({'Erro' : 'Erro, ordem não executada!'})
    }

}


const job = nodeSchedule.scheduleJob(date, () => {
    
    isBought = true;

    compra()

})

ws.on('error', (err) => {
    console.log('WS Error');
    console.error(err);
})

ws.onmessage = async (event) => {

    try {

        const obj = JSON.parse(event.data);

        if (obj.s === SYMBOL) {

            if(obj.a > maxPrice) maxPrice = obj.b
            lastPrice = obj.b

            pSymbol = obj.s
            pAsk = obj.a
            pBid = obj.b
            pBuyPrice = buyPrice
            pQty = quantity
            pNotional = buyPrice * quantity
            pTargetPrice = ((maxPrice * percent) / 100)
            pMaxPrice = maxPrice
            pLastPrice = lastPrice

            if (!isBought) {
                
                return;
            }
            //else if (quantity > 0 && parseFloat(obj.b) > (buyPrice * profit)) {
            else if (quantity > 0 && timer <= SellTime && lastPrice <= ((maxPrice * percent) / 100) && lastPrice >= (buyPrice * profit)) {
                timer = timer --
                console.log('Iniciada venda...')
                const order = await api.newOrder(SYMBOL, parseFloat(saldoAsset).toFixed(1), 0, 'SELL', 'MARKET');
                if (order.status !== 'FILLED'){
                    
                    console.log(order);
                }
                else
                    console.log(order);
                    console.log(`Vendido em ${new Date()} por ${BASE} ${order.fills[0].price}`);
                    console.log('Finalizada venda...')
                    process.exit(1);
            }
        }

    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

}
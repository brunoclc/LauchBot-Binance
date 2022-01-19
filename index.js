require('dotenv-safe').config();

const api = require('./api');
const nodeSchedule = require('node-schedule');
const WebSocket = require('ws');
const ws = new WebSocket("wss://stream.binance.com:9443/ws/!bookTicker");

//escolha o symbol que vai monitorar - set the symbol to monitor
const SYMBOL = 'BNBBUSD';
const ASSET = 'BNB';
//escolha o percentual de lucratividade - set the profit percent
const profit = 1.01;
//escolha quanto quer comprar - set the quantity to buy
const buyQty = 1;
//Data do agendamento
const date = new Date(2022, 0, 19, 18, 01, 10)

//não mexa nestas variáveis
let quantity = 0;
let buyPrice = 0;
let isBought = false;
let wallet = {};
let saldo = {};
let printStatus = {};


setInterval(async () => {

    wallet = await api.balance()

    saldo = wallet.balances.find(b => b.asset === ASSET).free

    console.log(saldo)

}, 1000) 


const job = nodeSchedule.scheduleJob(date, async () => {
    
    isBought = true;
    //const order = await api.newQuoteOrder(SYMBOL, buyQty);
    const order = await api.newOrder(SYMBOL, buyQty, );
                
    console.log(order);

    if (order.status === 'FILLED'){
        quantity = parseFloat(order.executedQty);
        buyPrice = parseFloat(order.fills[0].price);
    }

    else{
        console.log('Ordem não preenchida...')
        console.log('STATUS: ' + order.status)
    }

})

ws.on('error', (err) => {
    console.log('WS Error');
    console.error(err);
})

ws.onmessage = async (event) => {

    try {

        const obj = JSON.parse(event.data);

        if (obj.s === SYMBOL) {
            process.stdout.write('\033c');
            console.log(`Symbol: ${obj.s}`);
            console.log(`Best ask: ${obj.a}`);
            console.log(`Best bid: ${obj.b}`);
            console.log(`Buy Price: ${buyPrice}`);
            console.log(`Qty: ${quantity}`);
            console.log(`Notional: ${buyPrice * quantity}`);
            console.log(`Target Price: ${buyPrice * profit}`);

            console.log(wallet)

            if (!isBought) {
                
                return;
            }
            else if (quantity > 0 && parseFloat(obj.b) > (buyPrice * profit)) {
                const order = await api.newOrder(SYMBOL, quantity, 0, 'SELL', 'MARKET');
                if (order.status !== 'FILLED')
                    console.log(order);
                else
                    console.log(`Sold at ${new Date()} by ${order.fills[0].price}`);
                process.exit(1);
            }
        }

    } catch (err) {
        console.error(err);
        process.exit(1);
    }

}
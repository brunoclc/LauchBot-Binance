const axios = require('axios');
const queryString = require('querystring');
const Binance = require('node-binance-api');
const crypto = require('crypto');
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;
const apiUrl = process.env.API_URL;

async function newQuoteOrder(symbol, quoteOrderQty) {
    const data = { symbol, side: 'BUY', type: 'MARKET', quoteOrderQty };
    return privateCall('/v3/order', data, 'POST');
}

async function newOrder(symbol, quantity, price, side = 'BUY', type = 'MARKET') {
    const data = { symbol, side, type, quantity };

    if (price) data.price = parseInt(price);
    if (type === 'LIMIT') data.timeInForce = 'GTC';

    return privateCall('/v3/order', data, 'POST');
}

async function balance(){
    return privateCall('/v3/account');
}

async function privateCall(path, data = {}, method = 'GET') {
    if (!apiKey || !apiSecret)
        throw new Error('Preencha corretamente sua API KEY e SECRET KEY');

    const timestamp = Date.now();
    const recvWindow = 5000;//máximo permitido, default 5000

    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(`${queryString.stringify({ ...data, timestamp, recvWindow })}`)
        .digest('hex');

    const newData = { ...data, timestamp, recvWindow, signature };
    const qs = `?${queryString.stringify(newData)}`;

    try {
        const result = await axios({
            method,
            url: `${apiUrl}${path}${qs}`,
            headers: { 'X-MBX-APIKEY': apiKey }
        });
        return result.data;

    } catch (err) {

        console.log('Erro na operação: ' + err.message);
        console.log('Dados da requisição:');
        console.log('Path: ' + path);
        console.log('Data: ' + JSON.stringify(data));
        console.log('NewData: ' + JSON.stringify(newData));
        console.log('Method: ' + method);
        console.log('TimeStamp: ' + timestamp);
        console.log('Signature: ' + signature);

    }

}


module.exports = { newOrder, newQuoteOrder, balance }
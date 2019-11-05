const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.bearService = functions.https.onRequest((request, response) => {
    if(request.method == "GET") {
        console.log('request.query : ${JSON.stringify(request.query)}')
        if (request.query['hub.mode'] === 'subscribe' &&
        request.query['hub.verify_token'] === "VERIFIED_TOKEN_BEAR") {
            console.log("Validating webhook");
            response.status(200).send(request.query['hub.challenge']);
        }
        else {
            console.error("Failed validation. Make sure the validation tokens match.");
            response.sendStatus(403);
        }
    } else if(request.method == "POST") {
        var data = request.body;
        if (data.object === 'page') {
            data.entry.forEach(entry => {
                var pageID = entry.id;
                var timeOfEvent = entry.time;
                console.log('entry : ${JSON.stringify(entry)}')
                entry.messaging.forEach(event => {
                    if (event.message) {
                        receivedMessage(event)
                    } else {
                        console.log("Webhook received unknown event: ", event)
                    }
                })       
            })
            response.sendStatus(200)
        }
    }
});


exports.createUser = functions.firestore
    .document('players/{userId}/activities/{activityId}')
    .onCreate((snap, context) => {
      let response = Promise.resolve(0);

      // Get an object representing the document
      // e.g. {'name': 'Marie', 'age': 66}
      const newValue = snap.data();

      // access a particular field as you would any JS property
      const name = newValue.name;
      console.log(`${JSON.stringify(newValue)}`)
      sendTextMessage('2101775493257821', `Player ${newValue.name} got ${newValue.score} score.`);
      return 0;
      // return sendTextMessage('111084997001209', 'Player ${newValue.name} got ${newValue.score} score.');
      // perform desired operations ...
    });

function receivedMessage(event) {
    let senderID = event.sender.id
    let recipientID = event.recipient.id
    let timeOfMessage = event.timestamp
    let message = event.message

    //ถ้าข้อความมาแล้ว log ตรงนี้จะเห็นข้อความเลยครับ
    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage)
    console.log(JSON.stringify(message))
    let messageId = message.mid
    let messageText = message.text
    let messageAttachments = message.attachments

    if (messageText) {
        //ส่วนนี้ใช้ Switch case มาทำ rule-base คือดักคำมาทำงานแตกต่างกันไป
        //เรียกได้ว่าเป็นวิธีที่ basic และง่ายสุดในการทำบอทก็ว่าได้ 555
        if (messageText.toLowerCase()) {
            if (messageText.search('hello') >= 0) {
                greeting(senderID)
            } else {
                sendTextMessage(senderID, messageText)
            }
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function greeting(recipientId) {
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "Hello"
        }
    }
    callSendAPI(messageData)
}

function sendTextMessage(recipientId, messageText) {
    //จัดข้อความที่จะส่งกลับในรูปแบบ object ตามที่ Messenger กำหนด
    console.log("recipientId:", recipientId);
    let messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText//,
            //metadata: "DEVELOPER_DEFINED_METADATA"
        }
    }
    callSendAPI(messageData)
}

const axios = require('axios')
function callSendAPI(messageData) {
    console.log(`message data : ${JSON.stringify(messageData)}`);
    return axios({
        method: 'POST',
        url: 'https://graph.facebook.com/v2.6/me/messages',
        params: {
            'access_token': 'EAAB9fIH7JVYBAINO86lEZArfEXbbXmDRafjrjZBJQt8YhCzf58SxTeXPxvNEMIZBZBSa1TcQmhuu8v6uBPLeO1h86qAsxzhTTJqAaSPNuC5VRsnkEsxXzYOoXUFdngrki0grGB9NwL1O0MgMuIYJPqbmszPpEpWjDFxahHwJa5uScsKgiy9u'
        },
        data: messageData
    })
    .then(response => {
        if (response.status == 200) {
            let body = response.data
            let recipientId = body.recipient_id;
            let messageId = body.message_id;
            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s", 
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s", 
                    recipientId);
            }
        }
        else {
            console.error("Failed calling Send API", response.status,
                response.statusText, response.data.error);
         }
    })
    .catch(error => {
        console.log(`error : ${error}`)
        console.log('axios send message failed');
    })
}
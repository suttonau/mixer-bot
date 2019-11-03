import { ACCESS_TOKEN } from './keys'
const Mixer = require('@mixer/client-node')
const ws = require('ws')

let userInfo

const client = new Mixer.Client(new Mixer.DefaultRequestRunner())

/**
 * With OAuth we don't need to log in, the OAuth Provider will attach
 * the required information to all request after this callbundleRenderer.renderToStream 
 */
client.use(new Mixer.OAuthProvider(client, {
  tokens: { 
    access: ACCESS_TOKEN,
    expires: Date.now() + (365 * 24 * 60 * 60 * 1000)
  },
}))

// Gets user that the Access Token we provided above belongs to
client.request('GET', 'users/current')
.then(resp => {
  console.log(resp.body)
  // Stores logged in user's details
  userInfo = resp.body

  // Returns a promise 
  return new Mixer.ChatService(client).join(resp.body.channel.id)
})
.then(resp => {
  const body = resp.body
  console.log(body)
  // Connect to chat
  return createChatSocket(userInfo.id, userInfo.channel, body.endpoints, body.authkey)
})
.catch(err => {
  console.error('Something went wrong')
  console.error(err)
})

/**
 * @function         createChatSocket()
 * @description      Creates chat socket and sets up listeners for chat events.
 * @param {number}   [userId] The user to authenticate as
 * @param {number}   [channelId] The channel id to join
 * @param {string[]} [endpoints] An array of endpoints to connect to
 * @param {string}   [authkey] An authentication key to connect with
 * @returns          {Promise.<>}
 */
function createChatSocket (userId, channelId, endpoints, authkey) {
  const socket = new Mixer.Socket(ws, endpoints).boot()

  // Greet Users
  socket.on('UserJoin', data => {
    socket.call('msg', [`Hi ${data.username}, welcome to my channel!`])
  })

  // React to the !ping command
  socket.on('ChatMessage', data => {
    if (data.message.message[0].data.toLowerCase().startsWith('!ping')) {
      socket.call('msg', [`@${data.user_name} PONG`])
      console.log(`Ponged ${data.user_name}`)
    }
  })


  // Handle errors
  socket.on('error', error => {
    console.error('Socket error')
    console.error(error)
  })

  return socket.auth(channelId, userId, authkey)
  .then(() => {
      console.log('Login successful');
      return socket.call('msg', ['Hi! I\'m SuttonDeathBot! Write !ping and I will pong back!']);
  })
}

import net from "node:net";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const chatLogStream = fs.createWriteStream(path.join(__dirname, "chat.log"));

/* goal:
Enhance your server to be able to handle the following commands from clients. In all cases you should log the result to server.log.

/w, /username, /kick, /clientList

/w - Sends a whisper to another connected client. For example: ‘/w Guest3 Hi’ Should send a message to Guest3 only.
Your server should send an informative error message if the command fails for any reason (incorrect number of inputs, invalid username, trying to whisper themselves etc.)
If there is no error then a private message containing the whisper sender’s name as well as the whispered message should be sent to the indicated user

/username - Updates the username of the client that sent the command. For example, if Guest2 sends ‘/username john’ then Guest2’s username should be updated to ‘john’
Your server should send an informative error message if the command fails for any reason (incorrect number of inputs, username already in use, the new username is the same as the old username, etc)
If there is no error then a message should be broadcast to all users informing them of the name change. You should also send a specialized message to the user that updated their username informing them that the name change was successful.

/kick - Kicks another connected client, as long as the supplied admin password is correct. (You can just store an adminPassword variable in memory on your server for now.) For example ‘/kick Guest3 supersecretpw’ should kick Guest3 from the chat
Your server should send an informative error message if the command fails for any reason (incorrect number of inputs, incorrect admin password, trying to kick themselves, invalid username to kick, etc)
If there is no error then a private message should be sent to the kicked user informing them that they have been kicked from the chat. They should then be removed from the server. A message should be broadcast to all other users informing them that the kicked user left the chat.

/clientlist - sends a list of all connected client names.
*/

let clients = [];
let id = 0;

const removeClient = (removeId) => {
  clients = clients.filter((c) => c.id !== removeId);
  sendToAllClients(`client ${removeId} disconnected`);
};

const sendToAllClients = (message) => {
  clients.forEach((client) => {
    client.write(message);
  });
};

const saveMessage = (message) => {
  chatLogStream.write(`${message}\n`);
};

const extractCommand = (message) => {
  const args = message.slice(1).split(" "); // Remove "/" and split by spaces

  switch (args[0]) {
    case "w": {
      // whisper
      break;
    }
    default: {
      return null;
    }
  }
};

const whisper = (sender, target, message) => {
  const parsedTarget = parseInt(target);
  let targetClient = null;

  if (!isNaN(parsedTarget)) {
    target = parsedTarget;
  }
  console.log(target);

  if (sender.id === target) {
    sender.write("you can't whisper yourself");
    return;
  }
  if (sender.name === target) {
    sender.write(
      "you can't whisper yourself, or you have the same name as someone else"
    );
    return;
  }
};

const server = net
  .createServer((client) => {
    client.id = id;
    client.name = id;
    client.removed = false;
    id++;

    client.on("end", () => {
      if (!client.removed) {
        const message = `client ${client.id} disconnected`;
        console.log(message);
        saveMessage(message);

        removeClient(client.id);
        client.removed = true;
      }
    });

    client.on("close", (hadError) => {
      if (!client.removed) {
        const message = `client ${client.id} disconnected with error?: ${hadError}`;
        console.log(message);
        saveMessage(message);

        removeClient(client.id);
        client.removed = true;
      }
    });

    client.on("error", (err) => {
      if (!client.removed) {
        const message = `client ${client.id} exited with error: ${err}`;
        console.error(message);
        saveMessage(message);

        removeClient(client.id);
        client.removed = true;
      }
    });

    client.on("data", (data) => {
      data = data.toString("utf8");

      if (data[0] !== "/") {
        saveMessage(`client ${client.id}: ${data}`);

        clients.forEach((c) => {
          if (c.id !== client.id) {
            c.write(`${client.id}: ${data}`);
          }
        });
      } else {
        const command = extractCommand(data);
        console.log(`user entered command: ${command}`);
      }
    });

    const joinMessage = `client ${client.id} has connected`;
    console.log(joinMessage);

    saveMessage(joinMessage);

    client.write(
      `welcome to the server, your id is ${client.id}, use the console to send messages, exit via "exit"`
    );

    clients.push(client);
  })
  .listen(3000, () => {
    console.log("server listening on port 3000");
  });

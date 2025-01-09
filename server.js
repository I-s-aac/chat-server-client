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

const removeClient = (client) => {
  sendToAllClients(`${client.name} disconnected`);
  clients = clients.filter((c) => c.id !== client.id);
};

const sendToAllClients = (message) => {
  clients.forEach((client) => {
    client.write(message);
  });
};

const saveMessage = (message) => {
  chatLogStream.write(`${message}\n`);
};

const doCommand = (sender, message) => {
  const args = message.slice(1).split(" "); // Remove "/" and split by spaces
  switch (args[0]) {
    case "w": {
      whisper(sender, args[1], ...args.slice(2));
      break;
    }
    case "username": {
      changeUsername(sender, args);
      break;
    }
    case "kick": {
      kick(sender /* additional stuff */);
      break;
    }
    case "clientlist": {
      listClientsTo(sender);
      break;
    }
    default: {
      sender.write("unknown command");
      saveMessage(`name: ${sender.name}, id: ${sender.id} sent an invalid command: ${message}`)
      break;
    }
  }
};

const whisper = (sender, target, message) => {
  const parsedTarget = parseInt(target);

  if (!isNaN(parsedTarget)) {
    target = parsedTarget;
  }

  if (sender.name === target || sender.id === target) {
    sender.write(
      "you can't whisper yourself, or you have the same name as someone else"
    );
    saveMessage(
      `name: ${sender.name} id: ${sender.id} failed to whisper to ${target}`
    );
    return;
  }

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    if (client.id === target || client.name === target) {
      client.write(message);
      saveMessage(message);
      return;
    }
  }
};

const changeUsername = (sender, args) => {
  const newUsername = args[1] || "";

  if (args.length === 1) {
    // no username entered
    sender.write("new username wasn't entered");
    saveMessage(
      `name: ${sender.name} id: ${sender.id} failed to change their username to "${newUsername}" because it was not entered`
    );
    return;
  }
  if (newUsername === "") {
    // no username entered
    sender.write("username is blank");
    saveMessage(
      `name: ${sender.name} id: ${sender.id} failed to change their username to "${newUsername}" because it was blank`
    );
    return;
  }
  if (args.length > 2) {
    // username can't contain spaces
    sender.write("new username can't contain spaces");
    saveMessage(
      `name: ${sender.name} id: ${sender.id} failed to change their username to "${newUsername}" because it contained spaces.`
    );
    return;
  }

  if (newUsername === sender.name) {
    // client has the same username as they are trying to change it to
    sender.write("new username is the same as previous username");
    saveMessage(
      `name: ${sender.name} id: ${sender.id} failed to change their username to "${newUsername}" because it was the same as their previous username`
    );
    return;
  }
  for (let i = 0; i < clients.length; i++) {
    console.log(newUsername, clients[i].name);
    if (clients[i].name === newUsername) {
      // username conflict
      sender.write("new username is already in use");
      saveMessage(
        `name: ${sender.name} id: ${sender.id} failed to change their username to "${newUsername}" because it conflicted`
      );
      return;
    }
  }
  // and now after all the checks, can actually change the username
  const changeMessage = `client with name ${sender.name} and id ${sender.id} changed their username to ${newUsername}`;
  sender.name = newUsername;
  sendToAllClients(changeMessage);
  saveMessage(changeMessage);
};

const kick = (sender, target, password) => {
  const invalidPassword = true;
  if (invalidPassword) {
    // tell user password is invalid
    return;
  }
  const targetDoesNotExist = true;
  if (targetDoesNotExist) {
    // tell user no client exists with username or id x
    return;
  }
};

const listClientsTo = (sender) => {
  let message = "client list:\n";

  for (let i = 0; i < clients.length; i++) {
    const target = clients[i];
    message += `name: ${target.name}, id: ${target.id}`;
    if (target.id === sender.id && target.name === sender.name) {
      message += ` (you)`;
    }
    message += "\n";
  }

  sender.write(message);
  saveMessage(`name: ${sender.name}, id: ${sender.id} requested client list`);
};

const server = net
  .createServer((client) => {
    if (id > clients.length) id = clients.length;
    // recursive function to make sure new clients don't have the same id or username as currnent clients
    const ensureUniqueId = () => {
      for (let i = 0; i < clients.length; i++) {
        const c = clients[i];
        if (id === c.id || id === c.name) {
          id++;
          ensureUniqueId();
        }
      }
      return id;
    };

    client.id = ensureUniqueId();
    client.name = client.id.toString();
    client.removed = false;

    client.on("end", () => {
      if (!client.removed) {
        const message = `name: ${client.name}, id: ${client.id} disconnected`;
        console.log(message);
        saveMessage(message);

        removeClient(client);
        client.removed = true;
      }
    });

    client.on("close", (hadError) => {
      if (!client.removed) {
        const message = `name: ${client.name}, id: ${client.id} disconnected with error?: ${hadError}`;
        console.log(message);
        saveMessage(message);

        removeClient(client);
        client.removed = true;
      }
    });

    client.on("error", (err) => {
      if (!client.removed) {
        const message = `name: ${client.name}, id: ${client.id} exited with error: ${err}`;
        console.error(message);
        saveMessage(message);

        removeClient(client);
        client.removed = true;
      }
    });

    client.on("data", (data) => {
      data = data.toString("utf8");

      if (data[0] === "/") {
        doCommand(client, data);
      } else {
        saveMessage(`name: ${client.name}, id: ${client.id}, message: ${data}`);

        clients.forEach((c) => {
          if (c.id !== client.id) {
            c.write(`${client.name}: ${data}`);
          }
        });
      }
    });

    const joinMessage = `${client.name} has connected`;
    console.log(joinMessage);

    saveMessage(joinMessage);

    client.write(
      `welcome to the server, your id and username is ${client.name}\nvalid commands:\nexit\n/w otherUsernameOrId message content\n/username yourNewUsername\n/kick otherClientIdOrUsername adminPassword\n/clientlist`
    );

    clients.push(client);
  })
  .listen(3000, () => {
    console.log("server listening on port 3000");
  });

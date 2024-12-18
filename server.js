import net from "node:net";
import * as fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const chatLogStream = fs.createWriteStream(path.join(__dirname, "chat.log"));

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

const server = net
  .createServer((client) => {
    client.id = id;
    client.removed = false;
    id++;

    client.on("end", () => {
      if (!client.removed) {
        const message = `client ${client.id} disconnected`;
        console.log(message);
        chatLogStream.write(`${message}\n`);

        removeClient(client.id);
        client.removed = true;
      }
    });

    client.on("close", (hadError) => {
      if (!client.removed) {
        const message = `client ${client.id} disconnected with error?: ${hadError}`;
        console.log(message);
        chatLogStream.write(`${message}\n`);

        removeClient(client.id);
        client.removed = true;
      }
    });

    client.on("error", (err) => {
      if (!client.removed) {
        const message = `client ${client.id} exited with error: ${err}`;
        console.error(message);
        chatLogStream.write(`${message}\n`);

        removeClient(client.id);
        client.removed = true;
      }
    });

    client.on("data", (data) => {
      data = data.toString("utf8");

      chatLogStream.write(`client ${client.id}: ${data}\n`);

      clients.forEach((c) => {
        if (c.id !== client.id) {
          c.write(`${client.id}: ${data}`);
        }
      });
    });

    const joinMessage = `client ${client.id} has connected`;
    console.log(joinMessage);

    chatLogStream.write(`${joinMessage}\n`);
    client.write(
      `welcome to the server, your id is ${client.id}, use the console to send messages, exit via "exit"`
    );

    clients.push(client);
  })
  .listen(3000, () => {
    console.log("server listening on port 3000");
  });

import net from "node:net";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  // output: process.stdout,
  terminal: false,
});

// requires ip address if server is running on a different machine
const client = net.createConnection({ port: 3000 }, () => {
  console.log("connected");
});

client.setEncoding("utf8");

client.on("data", (data) => {
  // console.log("server:", data);
  console.log(data);
});

const doQuestion = () => {
  rl.question("", async (answer) => {
    if (answer.trim().toLowerCase() === "exit") {
      console.log("exiting...");
      client.end();
      rl.close();
    } else {
      client.write(answer);
      doQuestion();
    }
  });
};

setTimeout(() => {
  doQuestion();
}, 1000);

const { response } = require("express");
const express = require("express");
const { v4: uuidV4 } = require("uuid");

const app = express();
app.use(express.json());

const customers = [];

// Middleware
function verifyIfExistsAcountCPF(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: "Customer not found!" });
  }

  req.customer = customer;

  return next();
}

function getBalance(statement) {
  return statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    }
    return acc - operation.amount;
  }, 0);
}

app.post("/account", (req, res) => {
  const { cpf, name } = req.body;
  const id = uuidV4();

  const customerAlredyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlredyExists) {
    return res.status(400).json({ error: "Customer alredy exists!" });
  }

  customers.push({ cpf, name, id, statement: [] });

  res.status(201).send();
});

app.put("/account", verifyIfExistsAcountCPF, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(201).send();
});

app.get("/account", verifyIfExistsAcountCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer);
});

app.delete("/account", verifyIfExistsAcountCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.json(customers);
});

app.get("/statement", verifyIfExistsAcountCPF, (req, res) => {
  const { customer } = req;

  res.json(customer.statement);
});

app.get("/statement/date", verifyIfExistsAcountCPF, (req, res) => {
  const { date } = req.query;
  const { customer } = req;

  const dateFormat = new Date(date + " 00:00");

  const statementFiltered = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() === dateFormat.toDateString()
  );

  return res.json({ statement: statementFiltered });
});

app.post("/deposit", verifyIfExistsAcountCPF, (req, res) => {
  const { amount, description } = req.body;
  const { customer } = req;

  const statement = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statement);

  res.status(201).send();
});

app.post("/withdraw", verifyIfExistsAcountCPF, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: "Insuficient funds!!" });
  }

  const statement = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statement);

  res.status(200).send();
});

app.get("/balance", verifyIfExistsAcountCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.json(balance);
});

app.listen(3333, () => console.log("Server Started"));

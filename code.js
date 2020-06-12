var token = "<BotTokenHERE>";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webApp = "<Google WebApp code here>";

var ssId = "<Google Excel Spreadsheet ID here>";
var ss = SpreadsheetApp.openById(ssId);
var activeSheet;

function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webApp;
  var response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function sendMessage(id, text) {
  var url = telegramUrl + "/sendMessage?chat_id=" + id + "&text=" + text;
  var response = UrlFetchApp.fetch(url);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var msg = data.message.text;
  var id = data.message.from.id;

  //currently only allow my telegram id to use the bot
  //can be expanded to an array of allowed ids
  if (id == 425258574) {
    setActiveSheet(id);

    handleCommands(id, msg);
  } else {
    sendMessage(id, "You are not allowed to use this bot!");
  }
}

//sets active sheet to be the current month/year.
//if sheet does not exist (e.g. new month/year), create new sheet
function setActiveSheet(id) {
  var dateString = formatDate("check");

  activeSheet = ss.getSheetByName(dateString);

  if (!activeSheet) {
    var template = ss.getSheetByName("Layout");
    template.copyTo(ss).setName(dateString);
    sendMessage(
      id,
      "Its a new month/year! New sheet " + dateString + " created!"
    );
    activeSheet = ss.getSheetByName(dateString);
  }
}

//returns two styles for date, day/month/year (for items) or month/year (for spreadsheet name)
function formatDate(style) {
  var now = new Date();
  var month = now.getMonth() + 1;
  var year = now.getFullYear();
  var day = now.getDate();

  if (month == 13) {
    month = 1;
    year += 1;
  }

  if (style == "format") return day + "/" + month;
  else if (style == "check") return month + "/" + year;
}

//wrapper function for all commands
function handleCommands(id, msg) {
  if (msg == "budget" || msg == "Budget" || msg == "/budget") {
    handleBudgetCommand(id);
    return;
  }

  if (msg == "expenses" || msg == "Expenses" || msg == "/expenses") {
    handleExpensesCommand(id);
    return;
  }

  if (msg == "balance" || msg == "Balance" || msg == "/balance") {
    handleBalanceCommand(id);
    return;
  }

  if (msg == "list" || msg == "List" || msg == "/list") {
    handleListCommand(id);
    return;
  }

  splitMessage(id, msg);
}

//handles response for budget command
function handleBudgetCommand(id) {
  var bud = activeSheet.getDataRange().getCell(2, 2).getValue();
  sendMessage(id, "Budget for the month is : $" + bud);
}

//handles response for expenses command
function handleExpensesCommand(id) {
  var exp = activeSheet.getDataRange().getCell(3, 2).getValue();
  sendMessage(id, "Expenses for the month is : $" + exp);
}

//handles response for balance command
function handleBalanceCommand(id) {
  var bal = activeSheet.getDataRange().getCell(4, 2).getValue();
  sendMessage(id, "Balance left for the month is : $" + bal);

  if (bal <= 0) sendMessage(id, "No more money liao");
  else if (bal < 50) sendMessage(id, "Going no more money liao");
}

function handleListCommand(id) {
  var entries = activeSheet.getDataRange().getCell(2, 6).getValue();
  var values = activeSheet.getRange(7, 1, entries, 3).getValues();

  var str = "List of expenses this month - %0A";

  for (var i = 0; i < values.length; i++) {
    str +=
      "%0A" + values[i][0] + "   %7C " + values[i][1] + " - $" + values[i][2];
  }

  var exp = activeSheet.getDataRange().getCell(3, 2).getValue();
  str += "%0A===========================%0AExpenses for the month: $" + exp;

  sendMessage(id, str);
}

//split the message received to check for the add command
function splitMessage(id, msg) {
  var item = msg.split(" ");

  if (item[0] == "add" || item[0] == "Add") {
    handleAddCommand(id, item);
    return;
  } else {
    sendMessage(id, "Invalid command. To add item, type add [item] [price]");
  }
}

//method to add item to active spreadsheet
function handleAddCommand(id, item) {
  var size = item.length;

  var price = item[size - 1];

  //checking if price is a float/int, if it isn't, reject.
  if (!/^[0-9]+(\.)?[0-9]*$/.test(price)) {
    sendMessage(id, "Invalid price, please try again!");
    return;
  }

  var name = "";

  //starts at 1 as index 0 is the command 'add'
  for (var i = 1; i <= size - 2; i++) {
    name += " " + item[i];
  }

  activeSheet.appendRow([formatDate("format"), name, price]);

  //format date cell to plain text, cause date messes up the formatting every time
  var entries = activeSheet.getDataRange().getCell(2, 6).getValue();

  //+6 as 1st entry is on row 7, 2nd entry is on row 8, etc..
  var cell = activeSheet.getDataRange().getCell(entries + 6, 1);
  cell.setNumberFormat("@");

  sendMessage(id, "Item" + name + " costing $" + price + " added to expenses!");

  handleBalanceCommand(id);
}

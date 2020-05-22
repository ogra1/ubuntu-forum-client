const ipc = require('electron').ipcRenderer;

var myVar = setInterval(myTimer, 20000);

function myTimer() {
  var url = window.location.protocol + '//' + window.location.hostname + '/session/current.json'
  console.log(url)
  fetch(url)
    .then(res => res.json())
    .then((json) => {
        ipc.send('unread', json.current_user.unread_notifications);
    });
}

const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const gpio = require('rpi-gpio');
const requestIp = require('request-ip');
const db = require('node-localdb');

const debug = true;

const ethalon_token = process.env.BACKDOOR_ETHALON_TOKEN;
const ethalon_team_id = process.env.BACKDOOR_ETHALON_TEAM_ID;
const port = process.env.BACKDOOR_PORT || 8081;

// CAFE, SMOKE, SORTIR
const gpios = [11, 13, 15];
const gpios_ready_states = [false, false, false];

const logfile = '/home/pi/doorway/log.txt';
const users = db('/home/pi/doorway/users.json');
const inputString = '';

function init_door(i) {
  gpio.setup(gpios[i], gpio.DIR_OUT, gpio.EDGE_NONE, () => {
    gpios_ready_states[i] = true;
    console.log('GPIO ready state', gpios_ready_states[i]);
  });
}

function gpio_init() {
  gpio.destroy(() => {
    console.log('All pins unexported.');
    for (let i = 0; i < gpios.length; i++) {
      gpios_ready_states[i] = false;
      init_door(i);
    }
  });
}
gpio_init();

function add_user(user_id, user_name, callback) {
  users.findOne({ userid: user_id }).then((u) => {
    if (u) {
      let access_txt = '';
      if (u.access) { access_txt = ', access allowed'; } else { access_txt = ', access denied, ask boss to get an access.'; }

      let admin_txt = '';
      if (u.admin) { admin_txt = ', admin'; }

      callback([false, `User already exist${access_txt}${admin_txt}.`]);
    } else {
      users.insert({ userid: user_id, username: user_name, access: false, admin: false }).then((au) => {
        console.log(`Added user: ${au}`);
        callback([true, `You added as ${au.username}`]);
      });
    }
  });
}

function access_allowed(data, db_callback) {
  let result = 0;
  if (data.token == ethalon_token && data.team_id == ethalon_team_id) {
    result = 1;
  }
  users.findOne({ userid: data.user_id }).then((u) => {
    if (u) {
      if (u.access) {
        result = 2;
        if (u.admin) {
          result = 3;
        }
      }
    }
    console.log(result);
    db_callback(result);
  });
}

function list_users(db_callback) {
  users.find({}).then((us) => {
    let result = '';
    for (let i = 0; i < us.length; i++) {
      const access_txt = us[i].access ? ' allowed' : ' disabled';
      const admin_txt = us[i].admin ? ' admin' : '';
      result += `${us[i].userid}: ${us[i].username}${access_txt}${admin_txt}\n`;
    }
    console.log(result);
    db_callback([true, result]);
  });
}

function user_permissions(params, db_callback) {
  user_id = params.user_id;
  users.findOne({ userid: user_id }).then((u) => {
    if (u) {
      let user_name = u.username;
      if (typeof (params.user_name) !== 'undefined') {
        user_name = params.user_name;
      }
      let access = u.access;
      if (typeof (params.access) !== 'undefined') {
        access = params.access;
      }
      let admin = u.admin;
      if (typeof (params.admin) !== 'undefined') {
        admin = params.admin;
      }

      users.remove({ userid: user_id }).then((ru) => {
        users.insert({ userid: user_id, username: user_name, access, admin }).then((au) => {
          console.log('User was changed: ', au);
          let access_txt = '';
          if (access != u.access) {
            access_txt = access ? ' now allowed to open doors' : ' now prohibited to open doors';
          }
          let admin_txt = '';
          if (admin != u.admin) {
            admin_txt = admin ? ' now admin' : ' now not admin';
          }
          if (access_txt == '' && admin_txt == '') {
            admin_txt = ': nothing to change. Everything is up to date';
          }
          db_callback([true, `${user_name + access_txt + admin_txt}.`]);
        });
      });
    } else {
      db_callback([true, "Such user doesn't exist."]);
    }
  });
}

function process_request(data, IP, request, callback) {
  access_allowed(data, (result) => {
    if (result >= 2) {
      log_opener(`IP: ${IP} user_id: ${data.user_id}; parsed command: ${data.command}; auth result: authorized; request.url: ${request.url}`);
      if (data.command == '/door_cafe' || data.command == '/t') {
        open_door(0);
        callback([true, 'Opening CAFE side door']);
      } else if (data.command == '/door_smoke' || data.command == '/y') {
        open_door(1);
        callback([true, 'Opening SMOKE side door']);
      } else if (data.command == '/door_sortir' || data.command == '/u') {
        open_door(2);
        callback([true, 'Opening SORTIR side door']);
      } else if (data.command == '/door_update_my_name') {
        user_permissions({ user_id: data.user_id, user_name: data.user_name }, callback);
      } else if (data.command == '/da_list_users') {
        if (result == 3) {
          list_users(callback);
        } else {
          callback([false, 'You are not admin, access denied.']);
        }
      } else if (data.command == '/da_grant_permissions') {
        if (result == 3) {
          user_permissions({ user_id: data.text, access: true }, callback);
        } else {
          callback([false, 'You are not admin, access denied.']);
        }
      } else if (data.command == '/da_revoke_permissions') {
        if (result == 3) {
        user_permissions({ user_id: data.text, access: false }, callback);
      } else {
        callback([false, 'You are not admin, access denied.']);
      }
      } else if (data.command == '/da_make_admin') {
      if (result == 3) {
      user_permissions({ user_id: data.text, admin: true }, callback);
    } else {
      callback([false, 'You are not admin, access denied.']);
    }
    } else if (data.command == '/da_disrank_admin') {
    if (result == 3) {
    user_permissions({ user_id: data.text, admin: false }, callback);
  } else {
    callback([false, 'You are not admin, access denied.']);
  }
  } else {
    if (debug) { console.log('wrong command'); }
    log_opener(`IP: ${IP} user_id: ${data.user_id}; parsed command: ${data.command}; auth result: authorized, wrong command; request.url: ${request.url}`);
    callback([false, 'wrong command']);
  }
    } else if (result == 1 && data.command == '/door_give_me_access') {
      add_user(data.user_id, data.user_name, callback);
    } else {
      if (debug) { console.log('not authorized'); }
      log_opener(data.user_id, data.command, 'not authorized', IP);
      callback([false, 'not authorized']);
    }
  });
  console.log('', data);
}

function open_door(door_id) {
  console.log('open door ', gpios_ready_states, door_id);
  if (gpios_ready_states[door_id]) {
    gpio.write(gpios[door_id], 1, (err) => {
      if (err) {
        console.log('Error on GPIO write 1: ', err.message);
      }
      console.log(`Asking to open door #${door_id}`);

      setTimeout(() => {
        gpio.write(gpios[door_id], 0, (err) => {
          if (err) {
            console.log('Error on GPIO write 0: ', err.message);
          }
        });
      }, 200);
    });
  } else {
    console.log(`GPIO port #${gpios[door_id]} isn't ready to operate.`);
  }
}

function log_opener(line) {
  const time = (new Date()).toLocaleTimeString();
  fs.appendFile(logfile, `${time} ${line}\n`, (err) => {
    if (err) throw err;
  });
  if (debug) {
    console.log(`${time}: ${line}`);
  }
}

http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });

  if (request.method == 'POST') {
    let body = '';
    request.on('data', (data) => {
      body += data;
    });
    request.on('end', () => {
      const obj = qs.parse(body);
      if (debug) { console.log(obj); }
      const IP = requestIp.getClientIp(request);
      process_request(obj, IP, request, (result) => {
        if (result[0]) {
          response.end(result[1]);
        } else {
          response.end(':pashak:');
        }
      });
    });
  } else {
    response.end('nothing');
  }
}).listen(port, '127.0.0.1');

console.log(`Server running at port ${port}; Token: ${ethalon_token} Team ID: ${ethalon_team_id}.`);
log_opener(`Server running at port ${port}; Token: ${ethalon_token} Team ID: ${ethalon_team_id}.`);

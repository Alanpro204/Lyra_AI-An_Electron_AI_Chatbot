import { app, BrowserWindow, Tray, Menu, globalShortcut, shell, webContents } from 'electron'
import path from 'node:path'
import express from 'express';
import bodyParser from 'body-parser';
import { OpenAI } from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import Store from 'electron-store';
import os from 'os';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const __dirname = path.resolve();

const store = new Store();

if (!store.has("variables")) {
  store.set("variables", {
    API_KEY_GROQ: "",
    OPENAI_API_KEY: "",
    PROXY: "",
    GOOGLE_API_KEY: ""
  })
}
var variables = {};
var proxyAgent = null;

function getVariables() {
  variables = store.get("variables")
  setProxy();
}
getVariables()

function setVariables(openAiKey, groqKey, geminiKey, proxyAddress) {
  store.set("variables", {
    API_KEY_GROQ: groqKey,
    OPENAI_API_KEY: openAiKey,
    PROXY: proxyAddress,
    GOOGLE_API_KEY: geminiKey
  })
  getVariables()
}

// Configura la aplicación Express
const express_app = express();
express_app.use(bodyParser.json({ limit: '100mb' })); // Puedes ajustar el tamaño aquí
express_app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));


express_app.use(bodyParser.json());

function setProxy() {
  if (variables.PROXY != "") {
    proxyAgent = new HttpsProxyAgent(variables.PROXY);
  }else{
    proxyAgent = null;
  }
  console.log(variables.PROXY != "")
}

var mainWindow;
//console.log(proxyUrl);

express_app.get('/get-keys', async (req, res) => {
  res.json(variables)
});

express_app.post('/set-keys', async (req, res) => {
  const body = req.body;
  setVariables(body.OPENAI_API_KEY, body.API_KEY_GROQ, body.GOOGLE_API_KEY, body.PROXY);
  res.json({ status: "done" })
});

express_app.get('/screenshot', async (req, res) => {
  mainWindow.hide();
  screenshot({ filename: 'screenshot.png' })
    .then((imgPath) => {
      mainWindow.show();
      res.sendFile(imgPath);
    })
    .catch((err) => {
      mainWindow.show();
      console.error('Error taking screenshot:', err);
    });
});

express_app.get('/get_chat_list', async (req, res) => {
  var list = store.get('chat_list', []);
  var ret = [];
  for (var i = 0; i < list.length; i++) {
    var val = {
      uuid: list[i],
      msgs: store.get('chat_' + list[i], [])
    }
    ret.push(val);
  }
  res.json(ret);
})

express_app.post('/save_chat', async (req, res) => {
  const body = req.body;
  store.delete('chat_' + body.uuid);
  store.set('chat_' + body.uuid, body.chat);
  if (!store.get('chat_list', []).includes(body.uuid)) {
    var list = store.get('chat_list', []);
    list.push(body.uuid);
    store.delete('chat_list');
    store.set('chat_list', list);
  }
  res.json({ status: "done" });
});

express_app.post('/remove_chat', async (req, res) => {
  const body = req.body;
  store.delete('chat_' + body.uuid);
  if (store.get('chat_list', []).includes(body.uuid)) {
    var list = store.get('chat_list', []);
    list = list.filter(item => item !== body.uuid);
    store.delete('chat_list');
    store.set('chat_list', list);
  }
  res.json({ status: "done" });
});

express_app.get('/get_user_info', async (req, res) => {
  res.json({ user: os.userInfo() });
})

// Configura el cliente de OpenAI
express_app.post('/updateConfig', async (req, res) => {
  const body = req.body;
  store.delete('model');
  store.set('model', body.model);
  res.json({ status: "done" });
})

express_app.get('/getConfig', async (req, res) => {
  const model = store.get('model');
  res.json({ model: model });
})

express_app.post('/sendMessage', async (req, res) => {
  const { messages, model, source } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  var api;
  if (source == "google") {
    var google;
    do {
      if (proxyAgent != null) {
        google = new OpenAI({
          apiKey: variables.GOOGLE_API_KEY, // Asegúrate de configurar tu API key en las variables de entorno
          baseURL: "https://generativelanguage.googleapis.com/v1beta/",
          fetch: (url, options) => fetch(url, { ...options, agent: proxyAgent, timeout: 5000 }),
        });
      } else {
        google = new OpenAI({
          apiKey: variables.GOOGLE_API_KEY, // Asegúrate de configurar tu API key en las variables de entorno
          baseURL: "https://generativelanguage.googleapis.com/v1beta/"
        });
      }
    } while (google.chat == undefined);
    api = google;
  }
  if (source == "openai") {
    var openai;
    do {
      if (proxyAgent != null) {
        openai = new OpenAI({
          apiKey: variables.OPENAI_API_KEY, // Asegúrate de configurar tu API key en las variables de entorno
          baseURL: "https://api.openai.com/v1",
          fetch: (url, options) => fetch(url, { ...options, agent: proxyAgent, timeout: 5000 }),
        });
      } else {
        openai = new OpenAI({
          apiKey: variables.OPENAI_API_KEY, // Asegúrate de configurar tu API key en las variables de entorno
          baseURL: "https://api.openai.com/v1"
        });
      }
    } while (openai.chat == undefined);
    api = openai;
  }
  if (source == "groq") {
    var groq;
    do {
      if (proxyAgent != null) {
        console.log("con proxy")
        groq = new OpenAI({
          apiKey: variables.API_KEY_GROQ, // Asegúrate de configurar tu API key en las variables de entorno
          baseURL: "https://api.groq.com/openai/v1",
          fetch: (url, options) => fetch(url, { ...options, agent: proxyAgent, timeout: 5000 }),
        });
      }else{
        console.log("sin proxy")
        groq = new OpenAI({
          apiKey: variables.API_KEY_GROQ, // Asegúrate de configurar tu API key en las variables de entorno
          baseURL: "https://api.groq.com/openai/v1"
        });
      }
    } while (groq.chat == undefined)
    api = groq;
  }

  try {
    var msgs = [];
    if (source == "groq") {
      msgs.push(
        {
          role: "system",
          content: "cuando respondas una formula matematica, tienes que devolverla en formato LaTex y rodeada de $$, por ejemplo: para \"X*3\", tiene que ser: \"$$ X*3 $$\""
        }
      )
    } else {
      msgs.push(
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "cuando respondas una formula matematica, tienes que devolverla en formato LaTex y rodeada de $$, por ejemplo: para \"X*3\", tiene que ser: \"$$ X*3 $$\""
            }
          ]
        }
      )
    }

    for (var i = 0; i < messages.length; i++) {
      var msg = {
        role: messages[i].role,
        content: messages[i].real_content
      }
      msgs.push(msg);
    }
    var playground = {
      model: model,
      messages: msgs,
      stream: true
    }
    //console.log(playground);

    const response = await api.chat.completions.create(playground);
    for await (const part of response) {
      const content = part.choices[0].delta.content;
      if (content) {
        // Enviar la parte de la respuesta al cliente
        res.write(`${content}`);
      }
    }
    //res.write('event: end\ndata: Fin de la transmisión\n\n');
    res.end();
    //res.json({ response: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Ocurrió un error' });
    res.end();
  }
  res.end();

});

express_app.listen(7070, () => {
  console.log('Servidor en ejecución en http://localhost:7070');
});

async function awaitWithTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout exceeded')), timeoutMs)
    )
  ]);
}
Menu.setApplicationMenu(null);
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    fullscreen: true,
    resizable: false,
    icon: "vistas/main/imgs/icon.png",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('vistas/main/index.html')

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // config.fileProtocol is my custom file protocol
    if (url.startsWith("http") || url.startsWith("https")) {
      shell.openExternal(url);
      return { action: 'deny' };
    } else {
      return { action: 'allow' };
    }
    // open url in a browser and prevent default
  });

  /*mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide(); // Oculta la ventana al minimizarla
  });*/

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide(); // Oculta la ventana al cerrar
    }
  });

  var tray = new Tray('resources/app/vistas/main/imgs/icon.png'); // Asegúrate de tener un ícono en tu proyecto
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar',
      click: () => mainWindow.show()
    },
    {
      label: 'Salir',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Mi aplicación');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });

  globalShortcut.register('Alt+Space', () => {
    //globalShortcut.register('CommandOrControl+Shift+X', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.webContents.executeJavaScript(`document.body.classList.add('fade-in');`);
      // Remover la clase después de que la animación termine, si es necesario
      setTimeout(() => {
        mainWindow.webContents.executeJavaScript(`document.body.classList.remove('fade-in');`);
      }, 400); // Asegúrate que el tiempo coincida con la duración de la animación
    }
  });
  // Open the DevTools.
  /*mainWindow.hide();*/

  //mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.